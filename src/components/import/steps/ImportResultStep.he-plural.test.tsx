// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import i18n from "i18next";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { I18nextProvider, initReactI18next } from "react-i18next";
import heImport from "../../../../public/locales/he/import.json";
import { ImportResultStep } from "./ImportResultStep";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: "he",
    fallbackLng: "he",
    resources: { he: { import: heImport } },
    ns: ["import"],
    defaultNS: "import",
    interpolation: { escapeValue: false },
  });
});

afterEach(() => cleanup());

describe("ImportResultStep Hebrew plurals", () => {
  it("renders the dual form for two inserted rows without a raw key", async () => {
    await i18n.changeLanguage("he");
    render(
      <I18nextProvider i18n={i18n}>
        <ImportResultStep
          result={{ inserted: 2, failed: 0, skipped: 0, errors: [] }}
          onImportAnother={vi.fn()}
        />
      </I18nextProvider>
    );

    expect(screen.getByText("שתי תנועות יובאו בהצלחה")).toBeInTheDocument();
    expect(screen.queryByText("result.inserted")).not.toBeInTheDocument();
    expect(screen.queryByText(/result\.inserted/)).not.toBeInTheDocument();
  });
});
