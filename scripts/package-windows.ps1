$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.IO.Compression.FileSystem

if ($env:OS -ne "Windows_NT") {
  throw "The portable package can only be built on Windows."
}

$architecture = (& node -p "process.arch").Trim()
if ($LASTEXITCODE -ne 0 -or $architecture -ne "x64") {
  throw "A 64-bit Node.js runtime is required to build the Windows x64 package."
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$package = Get-Content (Join-Path $repoRoot "package.json") -Raw | ConvertFrom-Json
$artifactRoot = Join-Path $repoRoot "artifacts"
$stageRoot = Join-Path $artifactRoot "4NGEL-Portable-Windows-x64"
$zipPath = Join-Path $artifactRoot "4NGEL-Portable-Windows-x64-v$($package.version).zip"
$tempRoot = Join-Path $env:TEMP ("4ngel-portable-" + [guid]::NewGuid().ToString("N"))
$toolsRoot = Join-Path $stageRoot "tools"
$licensesRoot = Join-Path $stageRoot "licenses"
$completed = $false

function Get-LatestGitHubRelease([string]$Repository) {
  $headers = @{
    Accept = "application/vnd.github+json"
    "User-Agent" = "4NGEL-portable-packager"
  }
  return Invoke-RestMethod -Uri "https://api.github.com/repos/$Repository/releases/latest" -Headers $headers
}

function Get-Sha256Hash([string]$Path) {
  $stream = [System.IO.File]::OpenRead($Path)
  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  try {
    return [BitConverter]::ToString($sha256.ComputeHash($stream)).Replace("-", "").ToLowerInvariant()
  } finally {
    $sha256.Dispose()
    $stream.Dispose()
  }
}

function Expand-ZipArchive([string]$ArchivePath, [string]$DestinationPath) {
  New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null
  [System.IO.Compression.ZipFile]::ExtractToDirectory($ArchivePath, $DestinationPath)
}

function Save-VerifiedGitHubAsset($Release, [string]$AssetName, [string]$Destination) {
  $asset = $Release.assets | Where-Object { $_.name -eq $AssetName } | Select-Object -First 1
  if (-not $asset -or -not $asset.browser_download_url -or -not $asset.digest) {
    throw "The release $($Release.tag_name) does not provide a downloadable SHA-256 digest for $AssetName."
  }

  Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $Destination -UseBasicParsing
  $expectedHash = ($asset.digest -replace "^sha256:", "").ToLowerInvariant()
  $actualHash = Get-Sha256Hash $Destination
  if ($actualHash -ne $expectedHash) {
    throw "SHA-256 verification failed for $AssetName."
  }

  return $asset
}

try {
  if (-not (Test-Path (Join-Path $repoRoot "dist\cli.js"))) {
    throw "Build files are missing. Run npm run build first."
  }

  New-Item -ItemType Directory -Path $artifactRoot -Force | Out-Null
  if (Test-Path -LiteralPath $stageRoot) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
  }
  if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
  }
  New-Item -ItemType Directory -Path $toolsRoot, $licensesRoot, $tempRoot -Force | Out-Null

  foreach ($file in @(
    "dist",
    "4ngel.bat",
    "4NGEL-Striped-Tech-Logo.ico",
    "package.json",
    "package-lock.json",
    "README.md",
    "LICENSE",
    "THIRD-PARTY-NOTICES.md"
  )) {
    Copy-Item -Path (Join-Path $repoRoot $file) -Destination $stageRoot -Recurse -Force
  }
  & powershell -NoProfile -ExecutionPolicy Bypass `
    -File (Join-Path $repoRoot "scripts\build-portable-launcher.ps1") `
    -SourcePath (Join-Path $repoRoot "scripts\portable-launcher.cs") `
    -IconPath (Join-Path $stageRoot "4NGEL-Striped-Tech-Logo.ico") `
    -OutputPath (Join-Path $stageRoot "4NGEL.exe")
  if ($LASTEXITCODE -ne 0) {
    throw "Building the portable launcher failed."
  }

  Push-Location $stageRoot
  try {
    & npm ci --omit=dev --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
      throw "Installing production dependencies into the portable package failed."
    }
  } finally {
    Pop-Location
  }

  $nodeIndex = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json"
  $nodeRelease = $nodeIndex |
    Where-Object { $_.version -match "^v24\.\d+\.\d+$" -and $_.lts -and $_.files -contains "win-x64-zip" } |
    Select-Object -First 1
  if (-not $nodeRelease) {
    throw "Could not find a stable Node.js 24 Windows x64 release."
  }

  $nodeZipName = "node-$($nodeRelease.version)-win-x64.zip"
  $nodeZipPath = Join-Path $tempRoot $nodeZipName
  $nodeBaseUri = "https://nodejs.org/dist/$($nodeRelease.version)"
  Invoke-WebRequest -Uri "$nodeBaseUri/$nodeZipName" -OutFile $nodeZipPath -UseBasicParsing
  $checksumsPath = Join-Path $tempRoot "SHASUMS256.txt"
  Invoke-WebRequest -Uri "$nodeBaseUri/SHASUMS256.txt" -OutFile $checksumsPath -UseBasicParsing
  $escapedZipName = [regex]::Escape($nodeZipName)
  $checksumLine = Get-Content $checksumsPath |
    Where-Object { $_ -match "^(?<hash>[0-9a-fA-F]{64})\s+\*?$escapedZipName$" } |
    Select-Object -First 1
  if (-not $checksumLine) {
    throw "The Node.js release checksum file does not list $nodeZipName."
  }
  $expectedNodeHash = [regex]::Match($checksumLine, "^[0-9a-fA-F]{64}").Value.ToLowerInvariant()
  $actualNodeHash = Get-Sha256Hash $nodeZipPath
  if ($actualNodeHash -ne $expectedNodeHash) {
    throw "SHA-256 verification failed for $nodeZipName."
  }

  $nodeExtractRoot = Join-Path $tempRoot "node"
  Expand-ZipArchive $nodeZipPath $nodeExtractRoot
  $nodeDirectory = Join-Path $nodeExtractRoot "node-$($nodeRelease.version)-win-x64"
  Copy-Item (Join-Path $nodeDirectory "node.exe") (Join-Path $stageRoot "node.exe")
  Invoke-WebRequest `
    -Uri "https://raw.githubusercontent.com/nodejs/node/$($nodeRelease.version)/LICENSE" `
    -OutFile (Join-Path $licensesRoot "node-LICENSE.txt") `
    -UseBasicParsing

  $ytDlpRelease = Get-LatestGitHubRelease "yt-dlp/yt-dlp"
  Save-VerifiedGitHubAsset $ytDlpRelease "yt-dlp.exe" (Join-Path $toolsRoot "yt-dlp.exe") | Out-Null
  Invoke-WebRequest `
    -Uri "https://raw.githubusercontent.com/yt-dlp/yt-dlp/$($ytDlpRelease.tag_name)/LICENSE" `
    -OutFile (Join-Path $licensesRoot "yt-dlp-LICENSE") `
    -UseBasicParsing

  $denoRelease = Get-LatestGitHubRelease "denoland/deno"
  $denoZipPath = Join-Path $tempRoot "deno-windows-x64.zip"
  Save-VerifiedGitHubAsset $denoRelease "deno-x86_64-pc-windows-msvc.zip" $denoZipPath | Out-Null
  $denoExtractRoot = Join-Path $tempRoot "deno"
  Expand-ZipArchive $denoZipPath $denoExtractRoot
  $denoExecutable = Get-ChildItem -Path $denoExtractRoot -Filter "deno.exe" -Recurse |
    Select-Object -First 1
  if (-not $denoExecutable) {
    throw "The Deno release archive did not contain deno.exe."
  }
  Copy-Item $denoExecutable.FullName (Join-Path $toolsRoot "deno.exe")
  Invoke-WebRequest `
    -Uri "https://raw.githubusercontent.com/denoland/deno/$($denoRelease.tag_name)/LICENSE.md" `
    -OutFile (Join-Path $licensesRoot "deno-LICENSE.md") `
    -UseBasicParsing

  $ffmpegPackage = Join-Path $stageRoot "node_modules\ffmpeg-static"
  foreach ($file in @("ffmpeg.exe.LICENSE", "ffmpeg.exe.README")) {
    $source = Join-Path $ffmpegPackage $file
    if (-not (Test-Path $source)) {
      throw "The FFmpeg distribution notice $file was not installed."
    }
    Copy-Item $source (Join-Path $licensesRoot $file)
  }

  $ffmpegReadme = Get-Content (Join-Path $licensesRoot "ffmpeg.exe.README")
  $ffmpegVersionLine = $ffmpegReadme | Where-Object { $_ -match "^Version:\s*" } | Select-Object -First 1
  $ffmpegVersion = if ($ffmpegVersionLine) { $ffmpegVersionLine -replace "^Version:\s*", "" } else { "see FFmpeg build notice" }
  $runtimeManifest = [ordered]@{
    appVersion = $package.version
    architecture = "x64"
    platform = "windows"
    node = $nodeRelease.version
    ytDlp = $ytDlpRelease.tag_name
    deno = $denoRelease.tag_name
    ffmpeg = $ffmpegVersion
  }
  $runtimeManifest |
    ConvertTo-Json |
    Set-Content -Path (Join-Path $stageRoot "portable-runtime.json") -Encoding UTF8

  Compress-Archive -Path (Join-Path $stageRoot "*") -DestinationPath $zipPath -CompressionLevel Optimal
  $completed = $true
  Write-Output "Portable package created: $zipPath"
  Write-Output "Node.js $($nodeRelease.version); yt-dlp $($ytDlpRelease.tag_name); Deno $($denoRelease.tag_name); FFmpeg $ffmpegVersion"
} finally {
  if (Test-Path -LiteralPath $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
  }
  if ($completed -and (Test-Path -LiteralPath $stageRoot)) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
  }
}
