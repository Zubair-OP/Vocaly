import { test, expect } from "@playwright/test";

for (const width of [320, 375, 768, 1024, 1440]) {
  test(`landing layout and studio navigation at ${width}px`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/voices", (route) => route.fulfill({ json: { voices: {}, reference_voice: { available: false, languages: [] } } }));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("One video.A worldof voices.");
    for (const id of ["features", "how-it-works", "product", "demo", "use-cases"]) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    }
    // Visit every reveal before the full-page capture, including the final CTA.
    for (const reveal of await page.locator(".landing-reveal").all()) {
      await reveal.scrollIntoViewIfNeeded();
      await expect(reveal).toHaveCSS("opacity", "1");
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(page.locator(".cinematic-image")).toBeVisible();
    expect(await page.locator(".cinematic-image").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBeTruthy();
    await page.screenshot({ path: `test-results/landing-${width}.png`, fullPage: true });
    await page.screenshot({ path: `test-results/landing-hero-${width}.png` });
    await page.getByRole("link", { name: "Start dubbing", exact: true }).click();
    await expect(page).toHaveURL(/\/new$/);
    await expect(page.getByRole("heading", { name: "Give your video a new voice.", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Create a dub", exact: true })).toHaveAttribute("aria-current", "page");
    expect(errors).toEqual([]);
  });
}

test("language examples update with keyboard and animation can pause", async ({ page }) => {
  await page.goto("/");
  const hero = page.getByRole("group", { name: "Preview a language" });
  await hero.getByRole("radio", { name: "UR Urdu" }).check();
  await expect(page.locator('.cinematic-caption p[lang="ur"]')).toHaveAttribute("dir", "rtl");
  await hero.getByRole("radio", { name: "UR Urdu" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(hero.getByRole("radio", { name: "ES Spanish" })).toBeChecked();
  await page.getByRole("button", { name: "Pause cinematic animation" }).click();
  await expect(page.locator(".cinematic-hero")).toHaveAttribute("data-paused", "true");
  const all = page.getByRole("group", { name: "Explore all languages" });
  await expect(all.getByRole("radio")).toHaveCount(10);
  await all.getByRole("radio", { name: "JA Japanese" }).check();
  await expect(page.locator('.voice-demo-expanded .voice-translation p')).toHaveAttribute("lang", "ja");
  await page.getByRole("button", { name: "Pause waveform animation" }).click();
  await expect(page.locator(".voice-demo")).toHaveAttribute("data-animated", "false");
});

test("mobile menu traps focus, closes on escape, and follows section links", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Open menu" });
  await toggle.click();
  await expect(page.getByRole("dialog", { name: "Site navigation" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Mobile landing navigation" }).getByRole("link").first()).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("button", { name: "Close menu" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page.getByRole("navigation", { name: "Mobile landing navigation" }).getByRole("link", { name: "Use cases" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("#use-cases")).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
});

test("reduced motion keeps content visible without continuous animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(await page.locator(".hero-copy").evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  expect(await page.locator(".landing-wave > span").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  expect(await page.locator("html").evaluate((el) => getComputedStyle(el).scrollBehavior)).toBe("auto");
  expect(await page.locator(".cinematic-image").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
});

test("desktop anchors animate the scroll and stop below the floating header", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "smooth");
  const samples = await page.evaluate(async () => {
    const positions: number[] = [];
    document.querySelector<HTMLAnchorElement>('.landing-desktop-links a[href="#use-cases"]')!.click();
    for (let frame = 0; frame < 100; frame++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      positions.push(window.scrollY);
    }
    return positions;
  });
  expect(new Set(samples.map(Math.round)).size).toBeGreaterThan(6);
  await expect(page).toHaveURL(/#use-cases$/);
  await expect.poll(() => page.locator("#use-cases").evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBe(115);
  await expect(page.getByRole("navigation", { name: "Landing navigation" }).getByRole("link", { name: "Use cases" })).toHaveAttribute("aria-current", "location");
  await page.getByRole("link", { name: "Open Studio", exact: true }).first().click();
  await expect(page.locator("html")).not.toHaveClass(/vocally-landing/);
});

test("visual workflow and audience controls change the displayed scene", async ({ page }) => {
  await page.goto("/");
  const chapters = page.getByRole("group", { name: "Explore dubbing steps" });
  await chapters.getByRole("radio", { name: /Take it further/ }).check();
  await expect(page.locator(".process-stage")).toHaveAttribute("data-step", "2");
  await expect(page.locator(".process-film-shell")).toHaveAttribute("data-playing", "false");
  const audiences = page.getByRole("group", { name: "Who is Vocally for?" });
  await audiences.getByRole("radio", { name: "Teams" }).check();
  await expect(page.locator(".audience-cinema-stage")).toHaveAttribute("data-audience", "teams");
  await expect(page.locator(".audience-cinema-caption")).toContainText("Your message, across markets.");
});
