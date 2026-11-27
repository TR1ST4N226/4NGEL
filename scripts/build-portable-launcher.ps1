param(
  [Parameter(Mandatory = $true)]
  [string]$SourcePath,
  [Parameter(Mandatory = $true)]
  [string]$IconPath,
  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

$ErrorActionPreference = "Stop"
$compilerPaths = @(
  (Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"),
  (Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe")
)
$compiler = $compilerPaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $compiler) {
  throw "The .NET Framework C# compiler is required to build the Windows launcher."
}

& $compiler /nologo /target:exe "/win32icon:$IconPath" "/out:$OutputPath" $SourcePath
if ($LASTEXITCODE -ne 0) {
  throw "The C# compiler could not build the Windows launcher."
}
