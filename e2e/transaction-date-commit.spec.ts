import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const ARTIFACTS = "/opt/cursor/artifacts/playwright";

async function blockNonLocalNetwork(page: Page) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const local =
      url.hostname === "127.0.0.1" ||
      url.hostname === "localhost" ||
      url.hostname === "[::1]";
    if (local) {
      await route.continue();
      return;
    }
    await route.abort();
  });
}

async function openForm(page: Page, mode: "add" | "edit") {
  await blockNonLocalNetwork(page);
  await page.goto(`/?mode=${mode}`);
  await expect(page.getByPlaceholder("DD/MM/YYYY")).toBeVisible();
  await expect(page.getByPlaceholder("0.00")).toBeVisible();
}

async function typeDateFromFocusedField(page: Page, value: string) {
  const input = page.getByPlaceholder("DD/MM/YYYY");
  await input.click();
  await input.press("Control+A");
  await input.pressSequentially(value, { delay: 25 });
}

async function clickSave(page: Page, mode: "add" | "edit") {
  const name = mode === "add" ? "שמור תנועה" : "שמור שינויים";
  await page.getByRole("button", { name }).click({ trial: false });
}

async function savedPayloads(page: Page) {
  return page.evaluate(() => window.__E2E_SAVES__ ?? []);
}

test.describe("transaction date commit in Chromium", () => {
  for (const mode of ["add", "edit"] as const) {
    test(`${mode}: abc then Save click shows invalid and does not save`, async ({
      page,
    }, testInfo) => {
      await openForm(page, mode);
      if (mode === "add") {
        await page.getByPlaceholder("0.00").fill("1");
      }
      await typeDateFromFocusedField(page, "abc");
      await clickSave(page, mode);

      await expect(page.getByRole("alert")).toContainText("תאריך לא תקין");
      await expect(page.getByPlaceholder("DD/MM/YYYY")).toHaveValue("abc");
      expect(await savedPayloads(page)).toEqual([]);

      await page.screenshot({
        path: path.join(ARTIFACTS, `${mode}-abc-save.png`),
        fullPage: true,
      });
      await testInfo.attach(`${mode}-abc-save`, {
        path: path.join(ARTIFACTS, `${mode}-abc-save.png`),
        contentType: "image/png",
      });
    });

    test(`${mode}: 01/01/26 then Save click saves 2026-01-01`, async ({
      page,
    }, testInfo) => {
      await openForm(page, mode);
      if (mode === "add") {
        await page.getByPlaceholder("0.00").fill("1");
      }
      await typeDateFromFocusedField(page, "01/01/26");
      await clickSave(page, mode);

      await expect.poll(async () => (await savedPayloads(page)).length).toBe(1);
      const saves = await savedPayloads(page);
      expect(saves[0]?.date).toBe("2026-01-01");
      await expect(page.getByPlaceholder("DD/MM/YYYY")).toHaveValue("01/01/2026");
      await expect(page.getByText("תאריך לא תקין")).toHaveCount(0);

      await page.screenshot({
        path: path.join(ARTIFACTS, `${mode}-yy-save.png`),
        fullPage: true,
      });
      await testInfo.attach(`${mode}-yy-save`, {
        path: path.join(ARTIFACTS, `${mode}-yy-save.png`),
        contentType: "image/png",
      });
    });

    test(`${mode}: 31/12/1999 then Save click shows min-date and does not save`, async ({
      page,
    }, testInfo) => {
      await openForm(page, mode);
      if (mode === "add") {
        await page.getByPlaceholder("0.00").fill("1");
      }
      await typeDateFromFocusedField(page, "31/12/1999");
      await clickSave(page, mode);

      await expect(page.getByRole("alert")).toContainText(
        "התאריך חייב להיות ב-1 בינואר 2000 או אחריו",
      );
      await expect(page.getByPlaceholder("DD/MM/YYYY")).toHaveValue("31/12/1999");
      expect(await savedPayloads(page)).toEqual([]);

      await page.screenshot({
        path: path.join(ARTIFACTS, `${mode}-min-save.png`),
        fullPage: true,
      });
      await testInfo.attach(`${mode}-min-save`, {
        path: path.join(ARTIFACTS, `${mode}-min-save.png`),
        contentType: "image/png",
      });
    });
  }
});
