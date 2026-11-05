import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "İlk görevini ekle" }),
  ).toBeVisible();
});
test("captures, schedules, edits, completes and persists a task", async ({
  page,
}) => {
  await page.getByRole("button", { name: "İlk görevini ekle" }).click();
  await page.getByLabel("Başlık *").fill("C# async/await");
  await page.getByLabel("Planlanan başlangıç").fill("2026-11-05T14:00");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Görevler" })
    .click();
  await expect(page.getByText("C# async/await", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tamamla: C# async/await" }).click();
  await expect(
    page.getByRole("button", { name: "Geri al: C# async/await" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Geri al: C# async/await" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Geri al: C# async/await" }).click();
  await page
    .getByRole("button", { name: "Düzenle", exact: true })
    .first()
    .click();
  await page.getByLabel("Başlık *").fill("CancellationToken");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet", exact: true })
    .click();
  await expect(
    page.getByText("CancellationToken", { exact: true }),
  ).toBeVisible();
});
test("creates a project, a linked task, and a milestone", async ({ page }) => {
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Projeler" })
    .click();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Yeni ekle", exact: true })
    .first()
    .click();
  await page.getByLabel("Başlık *").fill("Unity Learning");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet" })
    .click();
  await page.getByRole("button", { name: /Unity Learning.*Yazılım/ }).click();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Yeni ekle", exact: true })
    .last()
    .click();
  await page.getByLabel("Başlık *").fill("State machine");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet" })
    .click();
  await expect(page.getByText("State machine", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Kilometre taşları", exact: true })
    .click();
  await page
    .locator("section")
    .filter({
      has: page.getByRole("heading", {
        name: "Kilometre taşları",
        exact: true,
      }),
    })
    .getByRole("button", { name: "Yeni ekle", exact: true })
    .click();
  await page.getByLabel("Başlık *").fill("First prototype");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet" })
    .click();
  await expect(
    page.getByText("First prototype", { exact: true }),
  ).toBeVisible();
});
test("captures a note, autosaves edits, converts it to a task", async ({
  page,
}) => {
  await page
    .getByRole("textbox", { name: "Aklımdakiler" })
    .fill("A new game idea");
  await page.getByRole("button", { name: "Notu yakala" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Fikirler & notlar" })
    .click();
  await expect(
    page.getByRole("heading", { name: "A new game idea" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Not", exact: true })
    .fill("A puzzle about time");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Görevler" })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Fikirler & notlar" })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Not", exact: true }),
  ).toHaveValue("A puzzle about time");
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Not", exact: true }),
  ).toHaveValue("A puzzle about time");
  await page.getByRole("button", { name: "Göreve dönüştür" }).click();
  await expect(page.getByLabel("Başlık *")).toHaveValue("A new game idea");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet" })
    .click();
});
test("registers a genuine ChatGPT shortcut and a manual Codex reference", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Yeni ekle ChatGPT sohbetleri", exact: true })
    .click();
  await page.getByLabel("Başlık *").fill("C# Review");
  await page
    .getByLabel("HTTPS bağlantısı *")
    .fill("https://chatgpt.com/c/00000000-0000-4000-8000-000000000001");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet" })
    .click();
  await expect(page.getByRole("link", { name: "C# Review" })).toHaveAttribute(
    "href",
    "https://chatgpt.com/c/00000000-0000-4000-8000-000000000001",
  );
  await page
    .getByRole("button", { name: "Yeni ekle Codex çalışma alanı", exact: true })
    .click();
  await page.getByLabel("Başlık *").fill("LifeOS development");
  await page.getByLabel("Oturum referansı *").fill("manual-local-reference");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet" })
    .click();
  await expect(
    page.getByRole("button", {
      name: /LifeOS development manual-local-reference/,
    }),
  ).toBeVisible();
});
test("creates independent recurring occurrences", async ({ page }) => {
  await page.getByRole("button", { name: "İlk görevini ekle" }).click();
  await page.getByLabel("Başlık *").fill("Daily study");
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(new Date());
  await page.getByLabel("Planlanan başlangıç").fill(date + "T14:00");
  await page.getByLabel("Tekrar", { exact: true }).selectOption("daily");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet" })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Görevler" })
    .click();
  await expect(
    page.getByRole("button", { name: "Tamamla: Daily study" }),
  ).toHaveCount(35);
  await page
    .getByRole("button", { name: "Tamamla: Daily study" })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Tamamla: Daily study" }),
  ).toHaveCount(34);
});
test("checks a habit and restores the log after reload", async ({ page }) => {
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Rutinler" })
    .click();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Yeni ekle", exact: true })
    .first()
    .click();
  await page.getByLabel("Başlık *").fill("Read");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet" })
    .click();
  await page.getByRole("button", { name: "Bugünü işaretle" }).click();
  await expect(
    page.getByRole("button", { name: "Bugün tamamlandı" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Bugün tamamlandı" }),
  ).toBeVisible();
});
test("supports offline capture and reopens persisted focus state", async ({
  page,
  context,
}) => {
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Odak", exact: true })
    .click();
  await page.getByRole("button", { name: "Başlat", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Duraklat", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Duraklat", exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.keyboard.press("Control+Shift+A");
  await page.getByLabel("Başlık *").fill("Offline task");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet" })
    .click();
  await context.setOffline(false);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Görevler" })
    .click();
  await expect(page.getByText("Offline task", { exact: true })).toBeVisible();
});
test("mobile layout has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Paneli daralt" }).last().click();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: "docs/screenshots/mobile.png",
    fullPage: true,
  });
});
test("dashboard is an honest empty state and has no browser errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.reload();
  await expect(
    page.getByRole("button", { name: "İlk görevini ekle" }),
  ).toBeVisible();
  await expect(page.getByText("0 kalan görev")).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/dashboard.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("persists a reminder and supports snoozing and rescheduling", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Hatırlatmalar", exact: true })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Yeni ekle", exact: true })
    .click();
  await page.getByLabel("Başlık *").fill("Reminder acceptance");
  await page.getByLabel("Hatırlatma zamanı *").fill("2026-11-06T14:00");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet" })
    .click();
  await page
    .getByRole("button", { name: "Hatırlatmalar", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("dialog").getByText("Reminder acceptance", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Ertele", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Düzenle", exact: true })
    .click();
  await page.getByLabel("Hatırlatma zamanı *").fill("2026-11-07T15:00");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet" })
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: "Hatırlatmalar", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("dialog").getByText("2026-11-07", { exact: true }),
  ).toBeVisible();
});
test("manages career follow-ups and interaction history", async ({ page }) => {
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Kariyer", exact: true })
    .click();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Yeni ekle", exact: true })
    .first()
    .click();
  await page.getByLabel("Başlık *").fill("Acceptance contact");
  await page.getByLabel("Şirket", { exact: true }).fill("Test company");
  await page.getByLabel("Takip tarihi").fill("2026-11-08");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet" })
    .click();
  await page.getByRole("button", { name: "Görüşme ekle" }).click();
  await page.getByLabel("Başlık *").fill("Follow-up notes");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet" })
    .click();
  await expect(
    page.getByText("Follow-up notes", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Acceptance contact", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Follow-up notes", { exact: true }),
  ).toBeVisible();
});
test("saves timezone settings under the stable settings identity", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Ayarlar", exact: true })
    .first()
    .click();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Düzenle", exact: true })
    .first()
    .click();
  await page.getByLabel("Saat dilimi *").fill("Europe/London");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet" })
    .click();
  await page.reload();
  await expect(
    page.getByRole("definition").filter({ hasText: "Europe/London" }),
  ).toBeVisible();
});

test("preserves a local note draft when another tab edits the same note", async ({
  page,
  context,
}) => {
  await page
    .getByRole("textbox", { name: "Aklımdakiler" })
    .fill("Conflict note");
  await page.getByRole("button", { name: "Notu yakala" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Fikirler & notlar" })
    .click();
  const second = await context.newPage();
  await second.goto("/#ideas");
  await expect(
    second.getByRole("heading", { name: "Conflict note", exact: true }),
  ).toBeVisible();
  await second
    .getByRole("main")
    .getByRole("button", { name: "Düzenle", exact: true })
    .click();
  await second
    .getByRole("dialog")
    .getByRole("textbox", { name: "Not", exact: true })
    .fill("Remote tab version");
  await page
    .getByRole("textbox", { name: "Not", exact: true })
    .fill("Local draft survives");
  // Submit the already-prepared remote form without blurring the local editor.
  await second
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet" })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(second.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Not", exact: true }),
  ).toHaveValue("Local draft survives");
  await expect(
    page.getByText(
      "Not başka bir yerde değişti. Yeni sürüm ve buradaki taslağın korunuyor.",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Taslağı ayrı bir not olarak kaydet" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Conflict note (taslak)", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("article")
      .filter({
        has: page.getByRole("heading", { name: "Conflict note", exact: true }),
      })
      .getByRole("textbox", { name: "Not", exact: true }),
  ).toHaveValue("Remote tab version");
  await second.close();
});
