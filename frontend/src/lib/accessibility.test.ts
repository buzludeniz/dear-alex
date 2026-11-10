import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS, STORAGE_KEY, loadPrefs, resolvePrefs, sanitizePrefs, savePrefs } from "./accessibility";

const OFF = { reducedMotion: false, moreContrast: false };
const ON = { reducedMotion: true, moreContrast: true };

describe("resolvePrefs", () => {
  it("follows the OS by default", () => {
    expect(resolvePrefs(DEFAULT_PREFS, ON)).toEqual({ reduceMotion: true, highContrast: true, largeText: false });
    expect(resolvePrefs(DEFAULT_PREFS, OFF)).toEqual({ reduceMotion: false, highContrast: false, largeText: false });
  });

  it("lets an explicit choice override the OS in both directions", () => {
    expect(resolvePrefs({ ...DEFAULT_PREFS, motion: "allow", contrast: "normal" }, ON)).toMatchObject({ reduceMotion: false, highContrast: false });
    expect(resolvePrefs({ ...DEFAULT_PREFS, motion: "reduce", contrast: "more" }, OFF)).toMatchObject({ reduceMotion: true, highContrast: true });
  });

  it("applies larger text only when chosen", () => {
    expect(resolvePrefs({ ...DEFAULT_PREFS, textSize: "large" }, OFF).largeText).toBe(true);
  });
});

describe("persistence", () => {
  it("round-trips through storage", () => {
    const prefs = { motion: "reduce", contrast: "more", textSize: "large" } as const;
    savePrefs(prefs);
    expect(loadPrefs()).toEqual(prefs);
  });

  it("falls back to defaults for missing, corrupt or invalid data", () => {
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
    expect(sanitizePrefs({ motion: "sideways", contrast: 3, textSize: "large" })).toEqual({ ...DEFAULT_PREFS, textSize: "large" });
    expect(sanitizePrefs(null)).toEqual(DEFAULT_PREFS);
  });

  it("does not throw when storage is unavailable", () => {
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(loadPrefs(broken)).toEqual(DEFAULT_PREFS);
    expect(() => savePrefs(DEFAULT_PREFS, broken)).not.toThrow();
  });
});
