import { test, expect, type Page, type Route } from "@playwright/test";

function speechLikeWav() {
  const sampleRate = 16000;
  const samples = sampleRate * 10;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF"); buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8); buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36); buffer.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index++) {
    const time = index / sampleRate;
    const level = time < 4 ? 0.02 : 0.65;
    const envelope = 0.75 + 0.25 * Math.sin(time * 17);
    buffer.writeInt16LE(Math.round(Math.sin(time * Math.PI * 440) * level * envelope * 32767), 44 + index * 2);
  }
  return buffer;
}

const outputs = ["First dub", "Second dub"].map((title, index) => ({
  id: String(index), title, videoId: "dQw4w9WgXcQ", sourceLanguage: "en", targetLanguage: "ur",
  voice: "ur-PK-UzmaNeural", originalTranscript: "Hello", translatedText: "Translation",
  audioUrl: `/track-${index}.wav`, createdAt: "2026-10-05T12:00:00Z", status: "completed",
}));

async function serveAudio(route: Route) {
  const body = speechLikeWav();
  const range = route.request().headers().range?.match(/bytes=(\d+)-(\d*)/);
  const start = range ? Number(range[1]) : 0;
  const end = range?.[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
  await route.fulfill({
    status: range ? 206 : 200,
    contentType: "audio/wav",
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(end - start + 1),
      ...(range ? { "Content-Range": `bytes ${start}-${end}/${body.length}` } : {}),
    },
    body: body.subarray(start, end + 1),
  });
}

async function setup(page: Page) {
  await page.route("https://img.youtube.com/**", route => route.abort());
  await page.route("**/api/outputs?*", route => route.fulfill({ json: { outputs } }));
  await page.route("**/track-*.wav", serveAudio);
  await page.goto("/outputs");
  await expect(page.getByRole("slider", { name: "Seek audio" })).toBeEnabled();
}

test("saved outputs display real media durations in the library", async ({ page }) => {
  await setup(page);
  await expect(page.locator('table [aria-label="Audio duration"]').first()).toHaveText("0:10");
  await expect(page.locator('table [aria-label="Audio duration"]').nth(1)).toHaveText("0:10");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('article [aria-label="Audio duration"]').first()).toBeVisible();
  await expect(page.locator('article [aria-label="Audio duration"]').first()).toHaveText("0:10");
});

test("hero plays real media and switching languages removes the old player", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.route("**/api/voices", route => route.fulfill({ json: { voices: { en: [{ id: "en-voice", name: "English" }], ur: [{ id: "ur-voice", name: "Urdu" }] }, preview_text: { en: "Hello", ur: "Urdu sample" } } }));
  await page.route("**/api/voice-preview", route => route.fulfill({ json: { audio_url: "/track-hero.wav" } }));
  await page.route("**/track-*.wav", serveAudio);
  await page.goto("/");
  await page.getByRole("button", { name: "Hear English", exact: true }).click();
  const player = page.getByRole("group", { name: "English hero voice preview", exact: true });
  await expect.poll(() => player.locator("audio").evaluate((a: HTMLAudioElement) => a.currentTime)).toBeGreaterThan(0);
  await expect.poll(() => page.locator('.cinematic-console').evaluate(el => el.getBoundingClientRect().bottom)).toBeLessThanOrEqual(768);
  await player.getByRole("button", { name: "Pause audio", exact: true }).click();
  await expect.poll(() => player.locator("audio").evaluate((a: HTMLAudioElement) => a.paused)).toBe(true);
  await page.getByRole("group", { name: "Preview a language", exact: true }).getByRole("radio", { name: "UR Urdu" }).check();
  await expect(player).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Hear Urdu", exact: true })).toBeEnabled();
});

test("waveform reacts to real loudness, freezes on pause, and respects reduced motion", async ({ page }) => {
  await setup(page);
  const canvas = page.locator(".audio-waveform canvas");
  const audio = page.locator("audio");
  const paintedPixels = () => canvas.evaluate((element: HTMLCanvasElement) => {
    const pixels = element.getContext("2d")!.getImageData(0, 0, element.width, element.height).data;
    let count = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 100) count++;
    return count;
  });
  await page.getByRole("button", { name: "Play audio", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause audio", exact: true })).toBeVisible();
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThan(0.5);
  const quiet = await paintedPixels();
  const seek = page.getByRole("slider", { name: "Seek audio" });
  await seek.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThan(5);
  await expect.poll(paintedPixels).toBeGreaterThan(quiet * 1.4);
  await page.screenshot({ path: "test-results/reactive-audio-player.png", fullPage: true });
  await page.getByRole("button", { name: "Pause audio", exact: true }).click();
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.paused)).toBe(true);
  const paused = await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL());
  await page.waitForTimeout(200);
  expect(await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL())).toBe(paused);
  const staticPixels = await paintedPixels();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Play audio", exact: true }).click();
  await page.waitForTimeout(300);
  expect(await paintedPixels()).toBe(staticPixels);
});

test("shared controls change speed, mute, rewind, and reset when switching sources", async ({ page }) => {
  await setup(page);
  const audio = page.locator("audio");
  await page.getByRole("combobox", { name: "Playback speed" }).click();
  await page.getByRole("option", { name: /^1\.25/ }).click();
  expect(await audio.evaluate((el: HTMLAudioElement) => el.playbackRate)).toBe(1.25);
  await page.getByRole("button", { name: "Mute audio", exact: true }).click();
  expect(await audio.evaluate((el: HTMLAudioElement) => el.muted)).toBe(true);
  await page.getByRole("button", { name: "Unmute audio", exact: true }).click();
  expect(await audio.evaluate((el: HTMLAudioElement) => el.muted)).toBe(false);
  await page.getByRole("slider", { name: "Seek audio" }).focus();
  await page.keyboard.press("ArrowRight");
  expect(await audio.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThan(4.9);
  await page.getByRole("button", { name: "Rewind 15 seconds" }).click();
  expect(await audio.evaluate((el: HTMLAudioElement) => el.currentTime)).toBe(0);
  await page.getByRole("button", { name: "Play First dub", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause audio", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Second dub", exact: true }).click();
  await expect(page.getByRole("group", { name: "Audio for Second dub" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play audio", exact: true })).toBeVisible();
  expect(await audio.evaluate((el: HTMLAudioElement) => el.paused)).toBe(true);
  expect(await audio.evaluate((el: HTMLAudioElement) => el.playbackRate)).toBe(1);
  await page.getByRole("button", { name: "Play Second dub", exact: true }).click();
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.paused)).toBe(false);
});

test("unavailable media can be retried without a broken player", async ({ page }) => {
  await page.route("https://img.youtube.com/**", route => route.abort());
  await page.route("**/api/outputs?*", route => route.fulfill({ json: { outputs } }));
  await page.route("**/track-*.wav", route => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.goto("/outputs");
  await expect(page.getByRole("alert")).toContainText("could not be loaded");
  await page.route("**/track-*.wav", serveAudio);
  await page.getByRole("button", { name: "Play audio", exact: true }).click();
  await expect.poll(() => page.locator("audio").evaluate((el: HTMLAudioElement) => el.paused)).toBe(false);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
