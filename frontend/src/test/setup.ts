import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute("data-motion");
  document.documentElement.removeAttribute("data-contrast");
  document.documentElement.removeAttribute("data-text-size");
});
