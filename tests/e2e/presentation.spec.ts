import { test, expect } from "@playwright/test";

// Repository-owned synthetic fixture. Never read a native profile or cloud account.
test("presents a private-data-free workspace and preserves note drafts across layouts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1360, height: 1000 });
  await page.clock.setFixedTime(new Date("2030-11-07T08:00:00Z"));
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "İlk görevini ekle" }),
  ).toBeVisible();
  await page.evaluate(async () => {
    const open = indexedDB.open("lifeos-v1", 1);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    const records: { kind: string; data: Record<string, unknown> }[] = [
      {
        kind: "task",
        data: {
          title: "Tasarım araştırmasını tamamla",
          description: "Örnek çalışma kaydı.",
          dueDate: "2030-11-07",
          status: "planned",
          priority: "high",
          category: "Yazılım",
          duration: 45,
        },
      },
      {
        kind: "task",
        data: {
          title: "Algoritmalar — örnek canlı ders",
          taskKind: "lesson",
          scheduledAt: "2030-11-07T17:00:00Z",
          duration: 60,
          status: "planned",
          category: "Üniversite",
          courseCode: "DERS01",
        },
      },
      {
        kind: "task",
        data: {
          title: "Okuma notlarını düzenle",
          scheduledAt: "2030-11-07T09:00:00Z",
          duration: 30,
          status: "completed",
          category: "Öğrenme",
        },
      },
      {
        kind: "task",
        data: {
          title: "Algoritmalar — PDF",
          taskKind: "pdf",
          courseCode: "DERS01",
          totalUnits: 8,
          completedUnits: 3,
        },
      },
      {
        kind: "task",
        data: {
          title: "Web tasarımı — PDF",
          taskKind: "pdf",
          courseCode: "DERS02",
          totalUnits: 8,
          completedUnits: 1,
        },
      },
      {
        kind: "task",
        data: {
          title: "Örnek ara sınav dönemi",
          taskKind: "exam",
          allDay: true,
          dueDate: "2030-11-12",
          endDate: "2030-11-13",
          status: "planned",
        },
      },
      {
        kind: "note",
        data: {
          title: "Proje Atlas — fikir defteri",
          category: "Proje",
          body: "# Küçük bir fikir, net bir sonraki adım\n\nBu ekran yalnızca örnek veriler içerir.\n\n## Bugün deneyeceklerim\n- Kullanıcı akışını kağıda çiz.\n- İlk ekranın taslağını hazırla.\n- Bir arkadaşından geri bildirim al.\n\n**Hedef:** Daha az sekme, daha çok odak.\n\nBir fikri göreve dönüştürmeden önce burada şekillendir.",
          tags: ["örnek", "tasarım"],
          pinned: true,
          archived: false,
        },
      },
      {
        kind: "note",
        data: {
          title: "Haftalık çalışma planı",
          category: "Öğrenme",
          body: "Pazartesi: iki ünite oku.\nÇarşamba: örnek soruları çöz.\nCuma: kısa bir tekrar yap.",
          tags: ["plan"],
          pinned: false,
          archived: false,
        },
      },
      {
        kind: "note",
        data: {
          title: "Okuma notları",
          category: "Fikir",
          body: "Öğrendiğin bir şeyi kendi cümlelerinle anlatmak, onu hatırlamayı kolaylaştırır.",
          tags: ["okuma"],
          pinned: false,
          archived: false,
        },
      },
      {
        kind: "reminder",
        data: {
          title: "Örnek ders 30 dakika sonra",
          fireAt: "2030-11-07T16:30:00Z",
          sound: true,
          status: "pending",
        },
      },
      {
        kind: "project",
        data: {
          title: "Proje Atlas",
          description:
            "Örnek kişisel proje; gerçek müşteri veya şirket bilgisi içermez.",
          type: "Yazılım",
          status: "active",
          priority: "normal",
          notes: "",
        },
      },
      {
        kind: "habit",
        data: {
          title: "20 dakika oku",
          category: "Öğrenme",
          frequency: "weekdays",
          target: 20,
          unit: "dakika",
          notes: "",
        },
      },
      {
        kind: "shortcut",
        data: {
          title: "Örnek sohbet — çalışma planı",
          url: "https://chatgpt.com/c/00000000-0000-4000-8000-000000000001",
          icon: "chat",
          color: "blue",
          pinned: true,
          order: 0,
        },
      },
      {
        kind: "shortcut",
        data: {
          title: "Örnek sohbet — fikir araştırması",
          url: "https://chatgpt.com/c/00000000-0000-4000-8000-000000000002",
          icon: "chat",
          color: "green",
          pinned: false,
          order: 1,
        },
      },
      {
        kind: "codex",
        data: {
          title: "Örnek kod oturumu — Proje Atlas",
          reference: "codex resume 00000000-0000-4000-8000-000000000003",
          notes: "Bu bir yer tutucudur; gerçek oturum içermez.",
        },
      },
    ];
    const tx = db.transaction("records", "readwrite");
    for (const record of records)
      tx.objectStore("records").put({
        ...record,
        id: crypto.randomUUID(),
        version: 1,
        cloudVersion: 0,
        dirty: true,
        deleted: false,
        updatedAt: "2030-11-07T08:00:00Z",
      });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await page.getByLabel("Tema seçimi").selectOption("light");
  await page.locator(".workspace-toggle").click();
  await expect(
    page.getByRole("heading", { name: "Öğrenme alanın" }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/overview-demo.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Bugünkü görevler" }).click();
  await expect(
    page
      .locator(".agenda-task-list")
      .getByText("Tasarım araştırmasını tamamla", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Fikirler & notlar" })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Not seçimi" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Not", exact: true })
    .fill("Yerel taslak: notlar arasında geçişte korunmalı.");
  await page
    .getByRole("navigation", { name: "Not seçimi" })
    .getByRole("button")
    .filter({ hasText: "Haftalık çalışma planı" })
    .click();
  await page
    .getByRole("navigation", { name: "Not seçimi" })
    .getByRole("button")
    .filter({ hasText: "Proje Atlas" })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Not", exact: true }),
  ).toHaveValue("Yerel taslak: notlar arasında geçişte korunmalı.");
  await page.getByRole("button", { name: "Kartlar", exact: true }).click();
  await expect(page.locator(".notes-grid article")).toHaveCount(3);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Kartlar", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.locator(".workspace-toggle").click();
  await page
    .getByRole("button", { name: "Çalışma masası", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Not", exact: true })
    .fill(
      "# Küçük bir fikir, net bir sonraki adım\n\nBu ekran yalnızca örnek veriler içerir.\n\n## Bugün deneyeceklerim\n- Kullanıcı akışını kağıda çiz.\n- İlk ekranın taslağını hazırla.\n- Bir arkadaşından geri bildirim al.\n\n**Hedef:** Daha az sekme, daha çok odak.",
    );
  await page.getByRole("button", { name: "Önizleme", exact: true }).click();
  await expect(
    page.getByText("Taslak bu oturumda korunuyor…", { exact: true }),
  ).not.toBeVisible();
  await expect(
    page.locator(".note-index-item.active .note-index-excerpt"),
  ).toContainText("Küçük bir fikir");
  await page.screenshot({
    path: "docs/screenshots/notes-demo.png",
    animations: "disabled",
  });
  await page.getByLabel("Tema seçimi").selectOption("dark");
  await page.screenshot({
    path: "docs/screenshots/notes-dark-demo.png",
    animations: "disabled",
  });
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Sohbetler", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sohbetler", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/conversations-demo.png",
    animations: "disabled",
  });
  await page.getByLabel("Tema seçimi").selectOption("light");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Planlayıcı", exact: true })
    .click();
  await expect(page.locator(".planner")).toBeVisible();
  await expect(
    page.locator(".schedule-block").filter({ hasText: "Algoritmalar" }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/calendar.png",
    animations: "disabled",
  });
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Görevler" })
    .click();
  await expect(page.getByLabel("Kayıt türüne göre filtrele")).toBeVisible();
  await expect(
    page.getByText("Tasarım araştırmasını tamamla", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/tasks-demo.png",
    animations: "disabled",
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Hızlı ekle" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const duration = await page
    .locator(".modal")
    .evaluate((e) => getComputedStyle(e).animationDuration);
  expect(parseFloat(duration)).toBeLessThan(0.01);
});
