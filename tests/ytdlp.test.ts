import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

const originalHome = process.env.HOME;
const originalUserProfile = process.env.USERPROFILE;
const testHome = await mkdtemp(join(tmpdir(), "4ngel-tests-"));
process.env.HOME = testHome;
process.env.USERPROFILE = testHome;

const { buildChoices, ensureYtDlp } = await import("../src/lib/ytdlp.js");

after(async () => {
  if (originalHome === undefined) delete process.env.HOME;
  else process.env.HOME = originalHome;
  if (originalUserProfile === undefined) delete process.env.USERPROFILE;
  else process.env.USERPROFILE = originalUserProfile;
  await rm(testHome, { recursive: true, force: true });
});

test("buildChoices falls back to the best available video when formats are missing", () => {
  const choices = buildChoices({ title: "Video", formats: [] });

  assert.deepEqual(choices, [
    {
      label: "Best available",
      args: ["-f", "bv*+ba/b"],
      kind: "video",
    },
  ]);
});

test("buildChoices lists the eight highest video resolutions and an MP3 option", () => {
  const videoFormats = [144, 240, 360, 480, 540, 720, 900, 960, 1080].map((height) => ({
    format_id: `${height}p`,
    ext: "mp4",
    vcodec: "avc1",
    acodec: "none",
    height,
  }));
  const choices = buildChoices({
    title: "Video",
    formats: [
      ...videoFormats,
      {
        format_id: "audio",
        ext: "m4a",
        vcodec: "none",
        acodec: "mp4a",
        abr: 128,
      },
    ],
  });
  const videoChoices = choices.filter((choice) => choice.kind === "video");

  assert.deepEqual(videoChoices.map((choice) => choice.height), [
    1080, 960, 900, 720, 540, 480, 360, 240,
  ]);
  assert.equal(choices.at(-1)?.isAudioOnly, true);
  assert.deepEqual(choices.at(-1)?.args, [
    "-f", "ba/b", "-x", "--audio-format", "mp3", "--audio-quality", "0",
  ]);
});

test("ensureYtDlp copies the bundled executable to its managed location", async () => {
  const binDir = join(testHome, ".config", "4ngel", "bin");
  await mkdir(binDir, { recursive: true });
  await writeFile(
    join(binDir, "yt-dlp-update-check.json"),
    JSON.stringify({ checkedAt: Date.now(), succeeded: true }),
    "utf-8"
  );

  const originalBundledPath = process.env.ANGEL_BUNDLED_YTDLP;
  process.env.ANGEL_BUNDLED_YTDLP = process.execPath;
  try {
    const managedPath = await ensureYtDlp();
    const expectedPath = join(
      binDir,
      process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp"
    );

    assert.equal(managedPath, expectedPath);
    assert.equal(
      execFileSync(managedPath, ["--version"], { encoding: "utf-8" }).trim(),
      `v${process.versions.node}`
    );
  } finally {
    if (originalBundledPath === undefined) delete process.env.ANGEL_BUNDLED_YTDLP;
    else process.env.ANGEL_BUNDLED_YTDLP = originalBundledPath;
  }
});
