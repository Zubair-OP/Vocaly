import { test, expect, type Page } from "@playwright/test";

for (const width of [375, 1440]) {
  test(`delete output removes its player, transcript and URL at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mock(page);
    await page.route("**/api/outputs?*", route => route.fulfill({ json: { outputs: [outputs[0]] } }));
    await page.route("**/api/outputs/0", route => {
      expect(route.request().method()).toBe("DELETE");
      return route.fulfill({ json: { status: "deleted", id: "0" } });
    });
    await page.goto("/outputs?id=0");
    await page.getByRole("button", { name: "Delete " + outputs[0].title, exact: true }).click();
    await expect(page.getByText("No outputs to show")).toBeVisible();
    await expect(page.locator("audio")).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Transcript", exact: true })).toBeDisabled();
    await expect(page).toHaveURL(/\/outputs$/);
    const notification = page.locator('[data-sonner-toast][data-type="success"]');
    await expect(notification).toContainText("Audio deleted");
    await expect(notification).toContainText("Transcript and saved details cleared");
    await expect(page.locator('[data-sonner-toaster]')).toHaveAttribute("data-x-position", "right");
    await expect(notification).toHaveCount(0, { timeout: 7000 });
  });
}

test("delete failure retains output and allows retry", async ({ page }) => {
  await mock(page);
  await page.route("**/api/outputs/0", route => route.fulfill({ status: 503, json: { detail: { message: "Audio could not be removed. Retry deletion." } } }));
  await page.goto("/outputs?id=0");
  const button = page.getByRole("button", { name: "Delete " + outputs[0].title, exact: true });
  await button.click();
  await expect(page.getByRole("alert")).toHaveText("Audio could not be removed. Retry deletion.");
  await expect(button).toBeEnabled();
  await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);
  await expect(page.locator("audio")).toHaveAttribute("src", "/sample.wav");
  await page.route("**/api/outputs/0", route => route.fulfill({ json: { status: "deleted", id: "0" } }));
  await button.click();
  await expect(button).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
const outputs = Array.from({ length: 10 }, (_, i) => ({
  id: String(i),
  videoId: "dQw4w9WgXcQ",
  title:
    i === 0 ? "A thoughtful approach to creative work" : "Language lesson " + i,
  sourceLanguage: "en",
  targetLanguage: "ur",
  voice: "ur-PK-UzmaNeural",
  originalTranscript: "Make time for focused work every day.",
  translatedText: "Translated transcript preview.",
  audioUrl: "/sample.wav",
  createdAt: "2026-10-04T08:00:00Z",
  status: i === 9 ? "error" : "completed",
}));
async function mock(page: Page) {
  await page.route("**/api/voices", (route) => route.fulfill({ json: { voices: { ur: [{ id: "ur-PK-UzmaNeural", name: "Uzma" }], ar: [{ id: "ar-SA-ZariyahNeural", name: "Zariyah" }] }, reference_voice: { available: false, languages: [] } } }));
  await page.route("https://img.youtube.com/**", (route) => route.abort());
  await page.route("**/api/outputs?*", (route) =>
    route.fulfill({ json: { outputs } }),
  );
  await page.route("**/api/outputs/0", (route) =>
    route.fulfill({ json: outputs[0] }),
  );
  await page.route("**/sample.wav", (route) => {
    const data = Buffer.alloc(160044);
    data.write("RIFF");
    data.writeUInt32LE(data.length - 8, 4);
    data.write("WAVEfmt ", 8);
    data.writeUInt32LE(16, 16);
    data.writeUInt16LE(1, 20);
    data.writeUInt16LE(1, 22);
    data.writeUInt32LE(8000, 24);
    data.writeUInt32LE(16000, 28);
    data.writeUInt16LE(2, 32);
    data.writeUInt16LE(16, 34);
    data.write("data", 36);
    data.writeUInt32LE(data.length - 44, 40);
    return route.fulfill({ contentType: "audio/wav", body: data });
  });
}
for (const width of [320, 375, 768, 1024, 1280, 1440])
  test("responsive workspace " + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await mock(page);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/new");
    await expect(
      page.getByRole("heading", { name: "Give your video a new voice.", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Current dub setup")).toHaveCount(0);
    await expect(page.getByRole("article", { name: "Source video preview" })).toHaveCount(0);
    await expect(page.getByRole("banner")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Recent outputs" })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Outputs" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: "test-results/quick-dub-" + width + ".png",
      fullPage: true,
    });
    await page.goto("/outputs");
    await expect(
      page.getByRole("heading", { name: "Outputs", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download WAV", exact: true }),
    ).toBeEnabled();
    await expect(page.getByLabel("Audio for " + outputs[0].title)).toBeInViewport({ ratio: 1 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: "test-results/outputs-" + width + ".png",
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
test("validation, language selection, generation and error recovery", async ({
  page,
}) => {
  await mock(page);
  await page.goto("/new");
  await page
    .getByRole("button", { name: "Generate audio" })
    .click();
  await expect(page.getByRole("alert")).toContainText("valid YouTube");
  await page.getByLabel("YouTube URL").fill("https://youtu.be/dQw4w9WgXcQ");
  await expect(page.getByRole("article", { name: "Source video preview" })).toBeVisible();
  await page.getByLabel("To (target)", { exact: true }).click();
  await page.getByRole("option", { name: "Arabic", exact: true }).click();
  await expect(page.getByLabel("Voice", { exact: true })).toContainText(
    "Zariyah",
  );
  await page.route("**/api/fetch-transcript", (route) =>
    route.fulfill({
      json: {
        video_id: "dQw4w9WgXcQ",
        title: "Example",
        source_language: "hi",
        segments: [{ text: "hello", start: 0, duration: 1 }],
      },
    }),
  );
  await page.route("**/api/generate", (route) =>
    route.fulfill({ status: 500, json: { detail: "Private backend error" } }),
  );
  await page
    .getByRole("button", { name: "Generate audio" })
    .click();
  await expect(page.getByRole("alert")).toContainText("could not");
  await page.waitForTimeout(1800);
  await expect(page.getByRole("alert")).toBeVisible();
  await page.route("**/api/generate", (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      source_language: "hi",
      target_language: "ar",
      voice: "ar-SA-ZariyahNeural",
    });
    return route.fulfill({ json: { status: "completed", output: outputs[0] } });
  });
  await page
    .getByRole("button", { name: "Generate audio" })
    .click();
  await expect(page).toHaveURL(/outputs/);
});
test("filters, keyboard tabs, pagination and actual playback", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mock(page);
  await page.goto("/outputs");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2 of 2", { exact: false })).toBeVisible();
  await page.getByRole("tab", { name: "Failed", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Language lesson 9", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "All outputs" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Ready", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByLabel("Filter outputs by title or language")
    .fill("thoughtful");
  await expect(page.getByText("1 output | Page 1 of 1")).toBeVisible();
  await page
    .getByRole("button", {
      name: "Play A thoughtful approach to creative work",
      exact: true,
    })
    .click();
  await expect
    .poll(() =>
      page.locator("audio").evaluate((el: HTMLAudioElement) => el.paused),
    )
    .toBe(false);
  await page.getByRole("combobox", { name: "Playback speed" }).click();
  await page.getByRole("option", { name: /^1\.5/ }).click();
  expect(
    await page
      .locator("audio")
      .evaluate((el: HTMLAudioElement) => el.playbackRate),
  ).toBe(1.5);
  await page.getByRole("tab", { name: "Transcript", exact: true }).click();
  await expect(page.getByText("Translated transcript preview.", { exact: true })).toBeVisible();
  await expect.poll(() => page.locator("audio").evaluate((el: HTMLAudioElement) => el.paused)).toBe(false);
  await page.getByRole("tab", { name: "Compare", exact: true }).click();
  await expect(page.getByText("Make time for focused work every day.", { exact: true })).toBeVisible();
  await expect(page.getByText("Translated transcript preview.", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Audio library", exact: true }).click();
  await page
    .getByLabel("Filter outputs by title or language")
    .fill("not-found");
  await expect(page.getByText("No outputs to show")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByText("10 outputs | Page 1 of 2")).toBeVisible();
});
test("empty, failed load, retry, status route and missing page", async ({
  page,
}) => {
  await page.route("**/api/outputs?*", (route) =>
    route.fulfill({ status: 500, json: { detail: "secret" } }),
  );
  await page.goto("/outputs");
  await expect(
    page.getByText("We could not load your outputs.", { exact: false }),
  ).toBeVisible();
  await page.route("**/api/outputs?*", (route) =>
    route.fulfill({ json: { outputs: [] } }),
  );
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText("No outputs to show")).toBeVisible();
  await mock(page);
  await page.goto("/dub/0/progress");
  await expect(
    page.getByRole("heading", { name: "Your audio is ready" }),
  ).toBeVisible();
  await page.goto("/processing");
  await expect(
    page.getByRole("heading", { name: "Start with a video" }),
  ).toBeVisible();
  await page.goto("/missing");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
});

test("long Urdu transcripts stay readable with playback in view", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mock(page);
  const translatedText = "یہ آپ کی آواز کا ترجمہ ہے۔ ہر لفظ کو واضح انداز میں سنیں۔\n\n".repeat(80) + "اختتام";
  await page.route("**/api/outputs?*", (route) => route.fulfill({ json: {
    outputs: [{ ...outputs[0], translatedText, originalTranscript: "Make time for focused work every day.\n\n".repeat(80) + "End of transcript." }],
  } }));
  await page.goto("/outputs?id=0");
  const player = page.getByLabel("Audio for " + outputs[0].title);
  await expect(player).toBeInViewport({ ratio: 1 });
  await page.getByRole("tab", { name: "Transcript", exact: true }).click();
  await page.getByRole("tab", { name: "Compare", exact: true }).click();
  const translation = page.getByRole("region", { name: "Translation · Urdu text", exact: true });
  await expect(translation.locator("p")).toHaveAttribute("dir", "auto");
  await expect(translation.locator("p")).toHaveAttribute("lang", "ur");
  expect(await translation.locator("p").evaluate(el => getComputedStyle(el).direction)).toBe("rtl");
  await translation.focus();
  await page.keyboard.press("Control+End");
  await expect.poll(() => translation.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await expect(player).toBeInViewport({ ratio: 1 });
  await expect(translation).toContainText("اختتام");
  await page.screenshot({ path: "test-results/transcript-compare.png", fullPage: true });
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Create a dub" }).click();
  await page.getByRole("button", { name: "Generate audio", exact: true }).scrollIntoViewIfNeeded();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Outputs" }).click();
  await expect(player).toBeInViewport({ ratio: 1 });
});

for (const width of [375, 1440]) {
  test("generation progress reflects requests without layout jumps " + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await mock(page);
    let finishTranscript!: () => void;
    let finishAudio!: () => void;
    const transcriptGate = new Promise<void>(resolve => { finishTranscript = resolve; });
    const audioGate = new Promise<void>(resolve => { finishAudio = resolve; });
    await page.route("**/api/fetch-transcript", async route => {
      await transcriptGate;
      await route.fulfill({ json: { video_id: "dQw4w9WgXcQ", title: outputs[0].title, source_language: "en", segments: [{ text: "Hello", start: 0, duration: 2 }] } });
    });
    await page.route("**/api/generate", async route => {
      await audioGate;
      await route.fulfill({ json: { status: "completed", output: outputs[0] } });
    });
    try {
      await page.goto("/new");
      await page.getByLabel("YouTube URL").fill("https://youtu.be/dQw4w9WgXcQ");
      await page.getByRole("button", { name: "Generate audio", exact: true }).scrollIntoViewIfNeeded();
      const dock = page.locator(".generation-dock");
      const original = await dock.evaluate(el => ({ top: el.getBoundingClientRect().top + scrollY, height: el.getBoundingClientRect().height }));
      await page.getByRole("button", { name: "Generate audio", exact: true }).click();
      const transcript = page.getByRole("progressbar", { name: "Fetch transcript", exact: true });
      const audio = page.getByRole("progressbar", { name: "Translate & create audio", exact: true });
      await expect(transcript).toHaveAttribute("data-state", "indeterminate");
      await expect(transcript).not.toHaveAttribute("aria-valuenow");
      await expect(audio).toHaveAttribute("aria-valuenow", "0");
      await expect(page.getByLabel("YouTube URL", { exact: true })).toBeDisabled();
      await page.screenshot({ path: "test-results/generating-transcript-" + width + ".png", fullPage: true });
      finishTranscript();
      await expect(transcript).toHaveAttribute("aria-valuenow", "100");
      await expect(audio).toHaveAttribute("data-state", "indeterminate");
      await page.waitForTimeout(1800);
      await expect(audio).not.toHaveAttribute("aria-valuenow");
      const processing = await dock.evaluate(el => ({ top: el.getBoundingClientRect().top + scrollY, height: el.getBoundingClientRect().height }));
      expect(Math.abs(processing.top - original.top)).toBeLessThan(2);
      expect(Math.abs(processing.height - original.height)).toBeLessThan(2);
      await page.screenshot({ path: "test-results/generating-audio-" + width + ".png", fullPage: true });
      await page.emulateMedia({ reducedMotion: "reduce" });
      expect(await audio.locator(".progress-activity").evaluate(el => getComputedStyle(el).animationName)).toBe("none");
      finishAudio();
      await expect(audio).toHaveAttribute("aria-valuenow", "100");
      await expect(page).toHaveURL(/outputs\?id=0/);
    } finally {
      finishTranscript();
      finishAudio();
    }
  });
}
