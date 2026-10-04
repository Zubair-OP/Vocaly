import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/outputs?*", (route) => route.fulfill({ json: { outputs: [] } }));
  await page.route("https://img.youtube.com/**", (route) => route.abort());
});

test("ten languages, preview and narration style reach the API", async ({ page }) => {
  await page.route("**/api/voices", (route) => route.fulfill({ json: { voices: { ur: [{ id: "ur-PK-UzmaNeural", name: "Uzma" }], fr: [{ id: "fr-FR-DeniseNeural", name: "Denise" }] }, reference_voice: { available: false, languages: [] } } }));
  await page.route("**/api/voice-preview", async (route) => {
    expect(route.request().postDataJSON()).toEqual({ target_language: "fr", voice: "fr-FR-DeniseNeural", narration_style: "motivational" });
    await route.fulfill({ json: { audio_url: "/preview.mp3" } });
  });
  await page.route("**/preview.mp3", (route) => route.fulfill({ contentType: "audio/mpeg", body: Buffer.alloc(0) }));
  await page.goto("/");
  await page.getByLabel("To (target)", { exact: true }).click();
  await expect(page.getByRole("option")).toHaveCount(10);
  await page.getByRole("option", { name: "French", exact: true }).click();
  await page.getByLabel("Narration style", { exact: true }).click();
  await page.getByRole("option", { name: "Motivational", exact: true }).click();
  await page.getByRole("button", { name: "Preview voice", exact: true }).click();
  await expect(page.getByLabel("Voice preview", { exact: true })).toHaveAttribute("src", "/preview.mp3");
  await page.getByLabel("Narration style", { exact: true }).click();
  await page.getByRole("option", { name: "Calm", exact: true }).click();
  await expect(page.getByLabel("Voice preview", { exact: true })).toHaveCount(0);
});

test("reference mode requires upload and speaker permission", async ({ page }) => {
  await page.route("**/api/voices", (route) => route.fulfill({ json: { voices: { ur: [{ id: "ur-PK-UzmaNeural", name: "Uzma" }], en: [{ id: "en-US-GuyNeural", name: "Guy" }] }, reference_voice: { available: true, languages: ["en"] } } }));
  await page.goto("/");
  await page.getByLabel("Speech mode", { exact: true }).click();
  await page.getByRole("option", { name: "Reference voice (experimental)", exact: true }).click();
  await expect(page.getByLabel("Speaker reference WAV", { exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Choose another target language");
  await page.getByLabel("To (target)", { exact: true }).click();
  await page.getByRole("option", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: "Fetch Transcript & Generate Audio", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("confirm speaker permission");
});

test("reference upload and generation complete through the form", async ({ page }) => {
  await page.route("**/api/voices", (route) => route.fulfill({ json: { voices: { ur: [{ id: "ur-PK-UzmaNeural", name: "Uzma" }], en: [{ id: "en-US-GuyNeural", name: "Guy" }] }, reference_voice: { available: true, languages: ["en"] } } }));
  await page.route("**/api/fetch-transcript", (route) => route.fulfill({ json: { video_id: "abcdefghijk", title: "Test video", source_language: "en", segments: [{ text: "Hello", start: 0, duration: 2 }] } }));
  await page.route("**/api/speaker-reference", (route) => {
    expect(route.request().headers()["content-type"]).toBe("audio/wav");
    expect(route.request().postDataBuffer()?.length).toBeGreaterThan(0);
    return route.fulfill({ json: { reference_id: "a".repeat(32) } });
  });
  await page.route("**/api/generate", (route) => {
    const payload = route.request().postDataJSON();
    expect(payload.speech_mode).toBe("reference");
    expect(payload.speaker_consent).toBe(true);
    expect(payload.reference_id).toBe("a".repeat(32));
    expect(payload.target_language).toBe("en");
    return route.fulfill({ json: { status: "completed", audio_url: "/reference.wav", translated_text: "Hello", job_id: "test", output: {} } });
  });
  await page.goto("/");
  await page.getByLabel("YouTube URL").fill("https://youtu.be/abcdefghijk");
  await page.getByLabel("To (target)", { exact: true }).click();
  await page.getByRole("option", { name: "English", exact: true }).click();
  await page.getByLabel("Speech mode", { exact: true }).click();
  await page.getByRole("option", { name: "Reference voice (experimental)", exact: true }).click();
  await page.getByLabel("Speaker reference WAV", { exact: true }).setInputFiles({ name: "speaker.wav", mimeType: "audio/wav", buffer: Buffer.from("test reference") });
  await page.getByRole("checkbox", { name: "I have the speaker’s permission to use this voice." }).check();
  await page.getByRole("button", { name: "Fetch Transcript & Generate Audio", exact: true }).click();
  await expect(page).toHaveURL(/\/outputs$/);
});
