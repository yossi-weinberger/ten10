/**
 * @vitest-environment jsdom
 */
import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { SidebarHoverZone } from "./SidebarHoverZone";

describe("SidebarHoverZone", () => {
  it("ignores mouseenter from portaled child", () => {
    const onExpandedChange = vi.fn();
    const { container } = render(
      <SidebarHoverZone onExpandedChange={onExpandedChange}>
        <div data-testid="sidebar">Sidebar</div>
      </SidebarHoverZone>
    );

    const wrapper = container.firstChild as HTMLElement;
    const portaledElement = document.createElement("div");
    document.body.appendChild(portaledElement);

    // Simulate mouseenter where target is NOT inside wrapper (portaled content)
    const event = new MouseEvent("mouseenter", { bubbles: false, cancelable: false });
    Object.defineProperty(event, "target", { value: portaledElement, enumerable: true });
    Object.defineProperty(event, "currentTarget", { value: wrapper, enumerable: true });
    wrapper.dispatchEvent(event);

    expect(onExpandedChange).not.toHaveBeenCalled();

    document.body.removeChild(portaledElement);
  });

  it("expands on mouseenter from wrapper's own DOM", () => {
    const onExpandedChange = vi.fn();
    const { container } = render(
      <SidebarHoverZone onExpandedChange={onExpandedChange}>
        <div data-testid="sidebar">Sidebar</div>
      </SidebarHoverZone>
    );

    const wrapper = container.firstChild as HTMLElement;
    fireEvent.mouseEnter(wrapper, { target: wrapper });

    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });

  it("collapses on mouseleave", () => {
    const onExpandedChange = vi.fn();
    const { container } = render(
      <SidebarHoverZone onExpandedChange={onExpandedChange}>
        <div data-testid="sidebar">Sidebar</div>
      </SidebarHoverZone>
    );

    const wrapper = container.firstChild as HTMLElement;
    fireEvent.mouseLeave(wrapper);

    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });

  it("applies className prop", () => {
    const { container } = render(
      <SidebarHoverZone onExpandedChange={vi.fn()} className="custom-class">
        <div>Content</div>
      </SidebarHoverZone>
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });
});
