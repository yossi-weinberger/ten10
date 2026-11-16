// @vitest-environment jsdom

import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BreakdownBarPieChart } from "./BreakdownBarPieChart";
import { PieCustomTooltip } from "./PieCustomTooltip";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => children,
  CartesianGrid: () => null,
  Bar: () => null,
  Cell: () => null,
  YAxis: () => null,
  PieChart: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Pie: () => null,
  XAxis: ({ tickFormatter }: { tickFormatter?: (value: number) => string }) => (
    <span>{tickFormatter?.(50)}</span>
  ),
  BarChart: ({
    children,
    data,
  }: {
    children?: ReactNode;
    data?: Array<{ label?: string }>;
  }) => (
    <div>
      {data?.map((item) => (
        <span key={item.label}>{item.label}</span>
      ))}
      {children}
    </div>
  ),
  Legend: ({ formatter }: { formatter?: (value: string) => ReactNode }) => (
    <div>{formatter?.("Groceries")}</div>
  ),
  Tooltip: ({
    content,
  }: {
    content?: ReactElement<{
      active?: boolean;
      label?: string;
      payload?: Array<{
        name: string;
        value: number;
        dataKey: string;
        color: string;
        payload: { fill: string };
      }>;
    }>;
  }) =>
    isValidElement(content)
      ? cloneElement(content, {
          active: true,
          label: "Groceries",
          payload: [
            {
              name: "Groceries",
              value: 50,
              dataKey: "total_amount",
              color: "#000",
              payload: { fill: "#000" },
            },
          ],
        })
      : null,
}));

const chartConfig = {
  total_amount: { label: "Amount", color: "red" },
};

const data = [{ label: "Groceries", total_amount: 50, fill: "#fff" }];

function renderChart(chartView: "bar" | "pie") {
  return render(
    <BreakdownBarPieChart
      data={data}
      totalAmount={50}
      chartConfig={chartConfig}
      chartView={chartView}
      pieHeight={200}
      scrollHeight={200}
      fullBarHeight={200}
      fmt={(value) => `CUR:${value}`}
    />,
  );
}

afterEach(() => {
  cleanup();
});

describe("BreakdownBarPieChart PostHog masking", () => {
  it("masks bar axis labels, tick values, and the tooltip", () => {
    const { container } = renderChart("bar");

    const category = screen.getAllByText("Groceries").find((node) => node.tagName === "SPAN");
    const categoryMask = category?.closest("[data-ph-mask]");
    expect(category?.hasAttribute("data-ph-mask")).toBe(false);
    expect(categoryMask?.classList.contains("ph-mask")).toBe(true);
    expect(categoryMask?.classList.contains("ph-sensitive")).toBe(true);

    const tick = screen.getAllByText("CUR:50")[0];
    expect(tick.closest("[data-ph-mask]")?.classList.contains("ph-sensitive")).toBe(true);

    const tooltip = container.querySelector(".min-w-\\[8rem\\]");
    expect(tooltip?.getAttribute("data-ph-mask")).toBe("");
    expect(tooltip?.classList.contains("ph-mask")).toBe(true);
    expect(tooltip?.classList.contains("ph-sensitive")).toBe(true);
    expect(tooltip?.textContent).toContain("CUR:50");
  });

  it("masks pie legend names on the legend label itself", () => {
    renderChart("pie");

    const legend = screen.getAllByText("Groceries").find((node) => node.tagName === "SPAN");
    expect(legend?.getAttribute("data-ph-mask")).toBe("");
    expect(legend?.classList.contains("ph-mask")).toBe(true);
    expect(legend?.classList.contains("ph-sensitive")).toBe(true);
  });
});

describe("PieCustomTooltip PostHog masking", () => {
  it("masks the category name and amount on the tooltip root", () => {
    render(
      <PieCustomTooltip
        active
        payload={[{ name: "Groceries", value: 50 }]}
        total={100}
        fmt={(value) => `CUR:${value}`}
      />,
    );

    const name = screen.getByText("Groceries");
    const tooltip = name.closest("[data-ph-mask]");
    expect(tooltip?.classList.contains("rounded-md")).toBe(true);
    expect(tooltip?.classList.contains("ph-mask")).toBe(true);
    expect(tooltip?.classList.contains("ph-sensitive")).toBe(true);
    expect(tooltip?.textContent).toContain("CUR:50");
  });

  it("renders nothing while the tooltip is inactive", () => {
    const { container } = render(
      <PieCustomTooltip active={false} payload={[]} total={100} fmt={(value) => `CUR:${value}`} />,
    );

    expect(container.textContent).toBe("");
  });
});
