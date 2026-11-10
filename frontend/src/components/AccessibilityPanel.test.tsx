import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccessibilityPanel } from "./AccessibilityPanel";
import { STORAGE_KEY, useAccessibilityPrefs } from "../lib/accessibility";

function Harness() {
  const a11y = useAccessibilityPrefs();
  return <AccessibilityPanel prefs={a11y.prefs} update={a11y.update} reset={a11y.reset} />;
}

function mockSystem(reducedMotion: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reducedMotion && query.includes("reduced-motion"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

const root = document.documentElement;

describe("AccessibilityPanel", () => {
  beforeEach(() => mockSystem(false));

  it("respects the OS reduced-motion setting by default", () => {
    mockSystem(true);
    render(<Harness />);
    expect(root.dataset.motion).toBe("reduce");
  });

  it("is keyboard operable: toggles by Enter, Escape closes and returns focus", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const button = screen.getByRole("button", { name: "Accessibility settings" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    button.focus();
    await user.keyboard("{Enter}");
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("group", { name: "Motion" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
  });

  it("lets the user override the OS, applies it and persists it", async () => {
    mockSystem(true);
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Accessibility settings" }));
    await user.click(screen.getByRole("radio", { name: "Allow motion" }));
    expect(root.dataset.motion).toBe("allow");
    await user.click(screen.getByRole("radio", { name: "Larger" }));
    expect(root.dataset.textSize).toBe("large");
    await user.click(screen.getByRole("radio", { name: "Higher contrast" }));
    expect(root.dataset.contrast).toBe("more");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({ motion: "allow", contrast: "more", textSize: "large" });
  });

  it("restores a saved choice on load, and reset goes back to the device settings", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ motion: "reduce", contrast: "system", textSize: "large" }));
    const user = userEvent.setup();
    render(<Harness />);
    expect(root.dataset.motion).toBe("reduce");
    expect(root.dataset.textSize).toBe("large");
    await user.click(screen.getByRole("button", { name: "Accessibility settings" }));
    expect(screen.getByRole("radio", { name: "Reduce motion" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: /back to my device/i }));
    expect(root.dataset.motion).toBe("allow");
    expect(root.dataset.textSize).toBe("normal");
    expect(within(screen.getByRole("group", { name: "Motion" })).getByRole("radio", { name: "Follow my device" })).toBeChecked();
  });
});
