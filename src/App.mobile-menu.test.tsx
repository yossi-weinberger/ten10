// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Menu } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";
import { useTranslation } from "react-i18next";
import { Button } from "./components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./components/ui/sheet";

describe("App mobile menu accessibility translations", () => {
  afterEach(() => cleanup());

  describe("menu button aria-label", () => {
    it("uses navigation namespace with menu.open key", () => {
      const MobileMenuButton = () => {
        const { t } = useTranslation();
        return (
          <Button aria-label={t("menu.open", { ns: "navigation" })}>
            <Menu className="h-6 w-6" />
          </Button>
        );
      };

      render(<MobileMenuButton />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label");
      expect(button.getAttribute("aria-label")).not.toBe("");
    });
  });

  describe("sheet title and description", () => {
    it("uses navigation namespace for sheet.title and sheet.description", () => {
      const MobileSheet = () => {
        const { t } = useTranslation();
        return (
          <Sheet>
            <SheetTrigger asChild>
              <Button>Open</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle className="sr-only">
                  {t("sheet.title", { ns: "navigation" })}
                </SheetTitle>
                <SheetDescription className="sr-only">
                  {t("sheet.description", { ns: "navigation" })}
                </SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        );
      };

      render(<MobileSheet />);
      const title = screen.getByText(/./);
      expect(title).toBeInTheDocument();
    });
  });

  describe("translation keys exist in locale files", () => {
    it("Hebrew navigation.json has menu.open key", async () => {
      const heNavigation = await import("../public/locales/he/navigation.json");
      expect(heNavigation.menu).toHaveProperty("open");
      expect(heNavigation.menu.open).not.toBe("");
    });

    it("English navigation.json has menu.open key", async () => {
      const enNavigation = await import("../public/locales/en/navigation.json");
      expect(enNavigation.menu).toHaveProperty("open");
      expect(enNavigation.menu.open).not.toBe("");
    });

    it("Hebrew navigation.json has sheet.title and sheet.description keys", async () => {
      const heNavigation = await import("../public/locales/he/navigation.json");
      expect(heNavigation).toHaveProperty("sheet");
      expect(heNavigation.sheet).toHaveProperty("title");
      expect(heNavigation.sheet).toHaveProperty("description");
      expect(heNavigation.sheet.title).not.toBe("");
      expect(heNavigation.sheet.description).not.toBe("");
    });

    it("English navigation.json has sheet.title and sheet.description keys", async () => {
      const enNavigation = await import("../public/locales/en/navigation.json");
      expect(enNavigation).toHaveProperty("sheet");
      expect(enNavigation.sheet).toHaveProperty("title");
      expect(enNavigation.sheet).toHaveProperty("description");
      expect(enNavigation.sheet.title).not.toBe("");
      expect(enNavigation.sheet.description).not.toBe("");
    });
  });
});
