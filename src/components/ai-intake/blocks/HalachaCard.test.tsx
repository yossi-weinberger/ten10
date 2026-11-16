// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);
import { HalachaCard } from "./HalachaCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === "introduction.body") return "Halacha introduction text";
      if (key === "aiIntake.halachaTag") return "Halacha";
      if (key === "aiIntake.halachaPersonal") return "For personal questions";
      if (key === "aiIntake.askRabbi") return "Ask the rabbi";
      if (key === "aiIntake.halachaLink") return "Halacha library";
      return key;
    },
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

describe("HalachaCard", () => {
  it("shows introduction when no ask rabbi button", () => {
    render(<HalachaCard namespace="halacha-tithes" />);
    expect(screen.getByText("Halacha introduction text")).toBeInTheDocument();
  });

  it("hides introduction when ask rabbi button is present", () => {
    render(
      <HalachaCard
        namespace="halacha-tithes"
        userQuestion="How much should I give?"
        onAskRabbi={() => {}}
      />
    );
    expect(screen.queryByText("Halacha introduction text")).not.toBeInTheDocument();
    expect(screen.getByText("Ask the rabbi")).toBeInTheDocument();
  });

  it("shows introduction when userQuestion exists but no handler", () => {
    render(<HalachaCard namespace="halacha-tithes" userQuestion="How much should I give?" />);
    expect(screen.getByText("Halacha introduction text")).toBeInTheDocument();
  });
});
