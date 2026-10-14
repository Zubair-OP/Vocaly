import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/outputs?*", (route) => route.fulfill({ json: { outputs: [] } }));
  await page.route("https://img.youtube.com/**", (route) => route.abort());
});

test("mobile voice settings expand without losing the chosen style", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/voices", route => route.fulfill({ json: { voices: { ur: [{ id: "ur-PK-UzmaNeural", name: "Uzma" }] } } }));
  await page.goto("/new");
  await expect(page.getByLabel("Narration style", { exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: /Voice settings/ }).click();
  await page.getByLabel("Narration style", { exact: true }).click();
  await page.getByRole("option", { name: "Calm", exact: true }).click();
  await page.getByRole("button", { name: /Hide voice settings/ }).click();
  await expect(page.getByRole("button", { name: /Voice settings.*calm/ })).toBeVisible();
  await page.getByRole("button", { name: /Voice settings/ }).click();
  await expect(page.getByLabel("Narration style", { exact: true })).toContainText("Calm");
});

test("ten languages, preview and narration style reach the API", async ({ page }) => {
  await page.route("**/api/voices", (route) => route.fulfill({ json: { voices: { ur: [{ id: "ur-PK-UzmaNeural", name: "Uzma" }], fr: [{ id: "fr-FR-DeniseNeural", name: "Denise" }] } } }));
  await page.route("**/api/voice-preview", async (route) => {
    expect(route.request().postDataJSON()).toEqual({ target_language: "fr", voice: "fr-FR-DeniseNeural", narration_style: "motivational" });
    await route.fulfill({ json: { audio_url: "/preview.mp3" } });
  });
  await page.route("**/preview.mp3", (route) => route.fulfill({ contentType: "audio/mpeg", body: Buffer.alloc(0) }));
  await page.goto("/new");
  await page.getByLabel("To (target)", { exact: true }).click();
  await expect(page.getByRole("option")).toHaveCount(10);
  await page.getByRole("option", { name: "French", exact: true }).click();
  await page.getByLabel("Narration style", { exact: true }).click();
  await page.getByRole("option", { name: "Motivational", exact: true }).click();
  await page.getByRole("button", { name: "Preview voice", exact: true }).click();
  await expect(page.getByRole("group", { name: "Voice preview", exact: true }).locator("audio")).toHaveAttribute("src", "/preview.mp3");
  await page.getByLabel("Narration style", { exact: true }).click();
  await page.getByRole("option", { name: "Calm", exact: true }).click();
  await expect(page.getByLabel("Voice preview", { exact: true })).toHaveCount(0);
});
