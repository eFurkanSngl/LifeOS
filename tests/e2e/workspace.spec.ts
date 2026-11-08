import { test, expect } from "@playwright/test";
test("persists both themes and exposes learning and conversations in the workspace", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "İlk görevini ekle" }),
  ).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("lifeos-v1", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const tx = db.transaction("records", "readwrite");
    for (const data of [
      {
        title: "ALGORİTMALAR · PDF",
        taskKind: "pdf",
        courseCode: "BIL113U",
        totalUnits: 8,
        completedUnits: 2,
      },
      {
        title: "Algoritmalar canlı ders",
        taskKind: "lesson",
        scheduledAt: "2030-01-11T17:00:00.000Z",
        duration: 60,
        status: "planned",
      },
      {
        title: "Güz ara sınavı",
        taskKind: "exam",
        allDay: true,
        dueDate: "2030-01-12",
        endDate: "2030-01-13",
        status: "planned",
      },
    ])
      tx.objectStore("records").put({
        id: crypto.randomUUID(),
        kind: "task",
        data,
        version: 1,
        cloudVersion: 0,
        dirty: true,
        deleted: false,
        updatedAt: new Date().toISOString(),
      });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Öğrenme alanın" }),
  ).toBeVisible();
  await expect(
    page.locator(".course-progress-detail progress"),
  ).toHaveAttribute("value", "2");
  await page.getByLabel("Tema seçimi").selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.getByLabel("Tema seçimi")).toHaveValue("light");
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    path: "docs/screenshots/workspace-light-demo.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByLabel("Tema seçimi").selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    path: "docs/screenshots/workspace-dark-demo.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Sohbetler", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sohbetler", exact: true }),
  ).toBeVisible();
});
test("bounds large chat histories and searches both providers", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("lifeos-v1", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction("records", "readwrite");
    for (let i = 0; i < 90; i++) {
      for (const kind of ["shortcut", "codex"]) {
        tx.objectStore("records").put({
          id: crypto.randomUUID(),
          kind,
          version: 1,
          cloudVersion: 0,
          dirty: true,
          deleted: false,
          updatedAt: new Date().toISOString(),
          data:
            kind === "shortcut"
              ? {
                  title: `Chat Thread ${i}`,
                  url: `https://chatgpt.com/c/test-${i}`,
                  color: "blue",
                  icon: "chat",
                  pinned: false,
                  order: i,
                }
              : {
                  title: `Codex Thread ${i}`,
                  reference: `codex resume test-${i}`,
                  notes: "Synthetic browser test record",
                },
        });
      }
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.locator(".workspace-section .shortcut")).toHaveCount(8);
  await expect(page.locator(".session-link")).toHaveCount(8);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Entegrasyonlar", exact: true })
    .click();
  await expect(
    page.getByRole("main").getByRole("link", { name: /^Chat Thread/ }),
  ).toHaveCount(40);
  await expect(
    page
      .getByRole("main")
      .locator(".simple-row > span")
      .filter({ hasText: /^Codex Thread/ }),
  ).toHaveCount(40);
  await page
    .getByRole("main")
    .getByRole("button", { name: "Daha fazla sohbet göster", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("main").getByRole("link", { name: /^Chat Thread/ }),
  ).toHaveCount(80);
  await page.getByPlaceholder("Çalışma alanında ara…").fill("Thread 89");
  await expect(
    page
      .getByRole("main")
      .getByRole("link", { name: "Chat Thread 89", exact: true }),
  ).toHaveCount(1);
  await expect(
    page
      .getByRole("main")
      .locator(".simple-row")
      .filter({ hasText: "Codex Thread 89" }),
  ).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (value: string) =>
          localStorage.setItem("test-clipboard", value),
      },
    }),
  );
  await page
    .getByRole("button", {
      name: "Devam komutunu kopyala: Codex Thread 89",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Oturum komutu kopyalandı.", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("test-clipboard")),
  ).toBe("codex resume test-89");
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "docs/screenshots/chat-history-demo.png" });
});
test("protects dirty forms from accidental dismissal", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "İlk görevini ekle" }).click();
  await expect(page.getByLabel("Başlık *")).toHaveValue("");
  await page.getByLabel("Başlık *").fill("Korunacak taslak");
  await page.keyboard.press("Control+Shift+A");
  await expect(page.getByLabel("Başlık *")).toHaveValue("Korunacak taslak");
  await page.keyboard.press("Escape");
  await expect(
    page
      .getByText(
        "Kaydedilmemiş değişiklikler var. Değişikliklerden vazgeçilsin mi?",
        { exact: true },
      )
      .first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Düzenlemeye devam et" }).click();
  await expect(page.getByLabel("Başlık *")).toHaveValue("Korunacak taslak");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Vazgeç", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Değişikliklerden vazgeç", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("previews markdown and persists a custom focus preset", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Aklımdakiler" })
    .fill("Markdown notu");
  await page.getByRole("button", { name: "Notu yakala" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Fikirler & notlar" })
    .click();
  await page
    .getByRole("textbox", { name: "Not", exact: true })
    .fill("# Güvenli önizleme\n**Önemli**");
  await page.getByRole("button", { name: "Önizleme", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Güvenli önizleme" }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Odak", exact: true })
    .click();
  await page.getByRole("spinbutton", { name: "Süre (dakika)" }).fill("37");
  await page.getByRole("button", { name: "Süreyi favorilere ekle" }).click();
  await page.reload();
  await expect(
    page.locator("#focus-duration option").filter({ hasText: "37 dk" }),
  ).toHaveCount(1);
});
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "İlk görevini ekle" }),
  ).toBeVisible();
});
test("tracks PDF units and filters education records", async ({ page }) => {
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Görevler" })
    .click();
  await page
    .getByRole("button", { name: "PDF takibi ekle", exact: true })
    .click();
  await page.getByLabel("Başlık *").fill("PDF unit tracking");
  await page.getByLabel("Toplam ünite", { exact: true }).fill("8");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Bir ünite tamamla", exact: true })
    .click();
  await expect(page.getByText("1/8 ünite", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("1/8 ünite", { exact: true })).toBeVisible();
  await page.getByLabel("Kayıt türüne göre filtrele").selectOption("general");
  await expect(
    page.getByText("PDF unit tracking", { exact: true }),
  ).not.toBeVisible();
  await page.getByLabel("Kayıt türüne göre filtrele").selectOption("pdf");
  await page
    .getByRole("button", { name: "Bir ünite geri al", exact: true })
    .click();
  await expect(page.getByText("0/8 ünite", { exact: true })).toBeVisible();
});
test("shows an exam on both dates without assigning an invented time and creates independent reminders", async ({
  page,
}) => {
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Görevler" })
    .click();
  await page
    .getByRole("button", { name: "Sınav tarihi ekle", exact: true })
    .click();
  await page.getByLabel("Başlık *").fill("All-day exam period");
  await page.getByLabel("Başlangıç", { exact: true }).fill("2026-12-05");
  await page.getByLabel("Bitiş günü", { exact: true }).fill("2026-12-06");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Planlayıcı", exact: true })
    .click();
  await page.getByLabel("Tarih", { exact: true }).fill("2026-12-05");
  await expect(
    page.locator(".schedule-block").filter({ hasText: "All-day exam period" }),
  ).toHaveCount(2);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Hatırlatıcılar", exact: true })
    .click();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Yeni ekle", exact: true })
    .first()
    .click();
  await page.getByLabel("Başlık *").fill("Independent reminder");
  await page.getByLabel("Hatırlatma zamanı *").fill("2026-12-04T18:00");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByText("Independent reminder", { exact: true }),
  ).toBeVisible();
});
test("lists more than eight independent reminders on the dedicated page", async ({
  page,
}) => {
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Hatırlatıcılar", exact: true })
    .click();
  for (let i = 1; i <= 9; i++) {
    await page
      .getByRole("main")
      .getByRole("button", { name: "Yeni ekle", exact: true })
      .first()
      .click();
    await page.getByLabel("Başlık *").fill(`Reminder ${i}`);
    await page.getByLabel("Hatırlatma zamanı *").fill("2026-12-04T18:00");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Kaydet", exact: true })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }
  await expect(page.locator(".reminder-row")).toHaveCount(9);
  await expect(page.getByText("Reminder 9", { exact: true })).toBeVisible();
});
test("moves a calendar task to a quarter-hour slot and persists it", async ({
  page,
}) => {
  await page.getByRole("button", { name: "İlk görevini ekle" }).click();
  await page.getByLabel("Başlık *").fill("Quarter-hour task");
  await page.getByLabel("Planlanan başlangıç").fill("2026-11-06T09:00");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Planlayıcı", exact: true })
    .click();
  await page.getByLabel("Tarih", { exact: true }).fill("2026-11-06");
  await page.getByRole("button", { name: "Gün", exact: true }).click();
  await page
    .locator(".schedule-block")
    .filter({ hasText: "Quarter-hour task" })
    .dragTo(
      page.getByRole("button", { name: "2026-11-06 13:00", exact: true }),
      { targetPosition: { x: 20, y: 18 } },
    );
  await expect(
    page.locator(".schedule-block").filter({ hasText: "Quarter-hour task" }),
  ).toContainText("13:15");
  await page.reload();
  await page.getByLabel("Tarih", { exact: true }).fill("2026-11-06");
  await expect(
    page.locator(".schedule-block").filter({ hasText: "Quarter-hour task" }),
  ).toContainText("13:15");
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
  await page.getByLabel("Hatırlatıcı da oluştur").check();
  await page.getByLabel("Kaç dakika önce hatırlatılsın?").fill("10");
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
  await page
    .getByRole("button", { name: "Düzenle", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("Hatırlatıcı da oluştur")).toBeChecked();
  await expect(page.getByLabel("Kaç dakika önce hatırlatılsın?")).toHaveValue(
    "10",
  );
});
test("repeats date-only tasks without assigning an hour or creating alarms", async ({
  page,
}) => {
  await page.getByRole("button", { name: "İlk görevini ekle" }).click();
  await page.getByLabel("Başlık *").fill("Untimed daily learning");
  await page.getByLabel("Tüm gün (oturum saati henüz belli değil)").check();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(new Date());
  await page.getByLabel("Başlangıç", { exact: true }).fill(date);
  await page.getByLabel("Tekrar", { exact: true }).selectOption("daily");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Kaydet" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Görevler" })
    .click();
  await expect(
    page.getByRole("button", { name: "Tamamla: Untimed daily learning" }),
  ).toHaveCount(35);
  const stored = await page.evaluate(async () => {
    const req = indexedDB.open("lifeos-v1", 1);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const rows = await new Promise<
      { kind: string; data: Record<string, unknown> }[]
    >((resolve, reject) => {
      const r = db.transaction("records").objectStore("records").getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return rows;
  });
  const occurrences = stored.filter(
    (r) => r.kind === "task" && r.data.seriesId,
  );
  expect(occurrences).toHaveLength(35);
  expect(
    occurrences.every(
      (r) =>
        !r.data.scheduledAt &&
        r.data.allDay === true &&
        r.data.dueDate === r.data.occurrenceDate,
    ),
  ).toBe(true);
  expect(stored.filter((r) => r.kind === "reminder")).toHaveLength(0);
  await page
    .getByRole("button", { name: "Tamamla: Untimed daily learning" })
    .first()
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Tamamla: Untimed daily learning" }),
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
  await expect(page.getByLabel("Hatırlatma zamanı *")).not.toBeVisible();
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
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("definition").filter({ hasText: "Europe/London" }),
  ).toBeVisible();
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
  await page.getByRole("button", { name: "Kartlar", exact: true }).click();
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
