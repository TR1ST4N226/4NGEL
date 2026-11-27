import assert from "node:assert/strict";
import { test } from "node:test";
import { buildChoices } from "../src/lib/ytdlp.js";

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
