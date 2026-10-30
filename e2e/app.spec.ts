import { expect, test, type Locator, type Page } from "@playwright/test";

async function open(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("fullscreen-skeleton")).toHaveCount(0);
}

async function swipe(page: Page, card: Locator, dx: number) {
  const box = (await card.boundingBox())!;
  const y = box.y + box.height / 2;
  const x = box.x + box.width / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(x + (dx * i) / 12, y, { steps: 2 });
  await page.mouse.up();
}

test.describe("起動直後のタイマー", () => {
  test("全画面スケルトンの後、開いた瞬間にタイマーを開始・停止できる", async ({ page }) => {
    await page.route("**/api/dashboard**", async (route) => {
      await new Promise((r) => setTimeout(r, 600));
      await route.continue();
    });
    await page.goto("/");
    await expect(page.getByTestId("fullscreen-skeleton")).toBeVisible();

    const toggle = page.getByTestId("timer-toggle");
    const display = page.getByTestId("timer-display");
    await expect(toggle).toBeVisible();
    await expect(page.getByTestId("fullscreen-skeleton")).toHaveCount(0);
    await expect(display).toHaveText("00:00:00");
    await expect(toggle).toHaveAttribute("data-state", "paused");

    await toggle.click();
    await expect(toggle).toHaveAttribute("data-state", "running");
    await expect(display).not.toHaveText("00:00:00", { timeout: 3_000 });

    const saved = page.waitForRequest((r) => r.url().endsWith("/api/sessions") && r.method() === "POST");
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-state", "paused");
    const body = (await saved).postDataJSON();
    expect(body.mode).toBe("input");
    expect(body.seconds).toBeGreaterThanOrEqual(1);

    const frozen = await display.textContent();
    await page.waitForTimeout(1_200);
    await expect(display).toHaveText(frozen!);
  });
});

test.describe("Input / Output 切り替え", () => {
  test("トグル1タップでモードが切り替わり、モード別にD1へ記録される", async ({ page }) => {
    await open(page);
    const group = page.getByTestId("mode-toggle");
    await expect(group).toHaveAttribute("data-mode", "input");
    await expect(page.getByTestId("mode-input")).toHaveAttribute("aria-checked", "true");

    await page.getByTestId("mode-output").click();
    await expect(group).toHaveAttribute("data-mode", "output");
    await expect(page.getByTestId("mode-output")).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("mode-input")).toHaveAttribute("aria-checked", "false");

    await page.getByTestId("mode-input").click();
    await expect(group).toHaveAttribute("data-mode", "input");

    // Switching while running closes the Input segment and continues as Output.
    await page.getByTestId("timer-toggle").click();
    await page.waitForTimeout(1_300);
    const inputSaved = page.waitForRequest((r) => r.url().endsWith("/api/sessions") && r.postDataJSON()?.mode === "input");
    await page.getByTestId("mode-output").click();
    expect((await inputSaved).postDataJSON().seconds).toBeGreaterThanOrEqual(1);
    await expect(page.getByTestId("timer-toggle")).toHaveAttribute("data-state", "running");

    await page.waitForTimeout(1_300);
    const outputSaved = page.waitForRequest((r) => r.url().endsWith("/api/sessions") && r.postDataJSON()?.mode === "output");
    const res = page.waitForResponse((r) => r.url().endsWith("/api/sessions") && r.request().postDataJSON()?.mode === "output");
    await page.getByTestId("timer-toggle").click();
    expect((await outputSaved).postDataJSON().seconds).toBeGreaterThanOrEqual(1);
    expect((await res).status()).toBe(201);
    await expect(page.getByTestId("today-output")).not.toHaveText("00:00:00");
  });

  test("週間グラフと目標指標が表示される", async ({ page }) => {
    await open(page);
    await expect(page.getByTestId("weekly-chart").locator("canvas")).toBeVisible();
    await expect(page.getByTestId("weekly-total")).toContainText("17–20h");
    await expect(page.getByTestId("output-ratio")).toContainText("%");
  });
});

test.describe("タスクのフリック管理", () => {
  test("スワイプで 未着手 → 進行中 → 完了 → 進行中 と移動し、再読込後も保持される", async ({ page }) => {
    await open(page);
    await page.getByTestId("tab-tasks").click();

    const title = `Abitus MCQ FAR ${Date.now()}`;
    await page.getByTestId("task-input").fill(title);
    const created = page.waitForResponse((r) => r.url().endsWith("/api/tasks") && r.status() === 201);
    await page.getByTestId("task-add").click();
    await created;

    const card = page.getByTestId("task-card").filter({ hasText: title });
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("data-status", "todo");
    const count = async (s: string) => Number(await page.getByTestId(`count-${s}`).textContent());
    const doingBefore = await count("doing");
    const doneBefore = await count("done");

    await swipe(page, card, 220);
    await expect(card).toHaveAttribute("data-status", "doing");
    await expect(page.getByTestId("count-doing")).toHaveText(String(doingBefore + 1));

    await swipe(page, card, 220);
    await expect(card).toHaveAttribute("data-status", "done");
    await expect(page.getByTestId("count-done")).toHaveText(String(doneBefore + 1));
    await expect(page.getByTestId("count-doing")).toHaveText(String(doingBefore));

    const patched = page.waitForResponse((r) => r.url().includes("/api/tasks/") && r.request().method() === "PATCH");
    await swipe(page, card, -220);
    await expect(card).toHaveAttribute("data-status", "doing");
    expect((await patched).ok()).toBe(true);

    // A short drag must not change status.
    await swipe(page, card, 30);
    await page.waitForTimeout(400);
    await expect(card).toHaveAttribute("data-status", "doing");

    await page.reload();
    await expect(page.getByTestId("fullscreen-skeleton")).toHaveCount(0);
    await page.getByTestId("tab-tasks").click();
    await expect(card).toHaveAttribute("data-status", "doing");

    await card.getByRole("button", { name: "削除" }).click();
    await expect(card).toHaveCount(0);
  });
});
