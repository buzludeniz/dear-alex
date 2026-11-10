import { useCallback, useEffect, useState } from "react";

/**
 * Accessibility preferences.
 *
 * Every preference defaults to following the operating system. The person can
 * override it, and the choice is stored only in this browser (localStorage).
 */
export type MotionPref = "system" | "reduce" | "allow";
export type ContrastPref = "system" | "more" | "normal";
export type TextSizePref = "normal" | "large";

export type A11yPrefs = { motion: MotionPref; contrast: ContrastPref; textSize: TextSizePref };
export type SystemSettings = { reducedMotion: boolean; moreContrast: boolean };
export type EffectivePrefs = { reduceMotion: boolean; highContrast: boolean; largeText: boolean };

export const STORAGE_KEY = "dear-alex-a11y";
export const DEFAULT_PREFS: A11yPrefs = { motion: "system", contrast: "system", textSize: "normal" };

const MOTION: readonly MotionPref[] = ["system", "reduce", "allow"];
const CONTRAST: readonly ContrastPref[] = ["system", "more", "normal"];
const TEXT_SIZE: readonly TextSizePref[] = ["normal", "large"];

function pick<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Turn arbitrary stored data into valid prefs; anything unknown falls back to the default. */
export function sanitizePrefs(raw: unknown): A11yPrefs {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    motion: pick(MOTION, o.motion, DEFAULT_PREFS.motion),
    contrast: pick(CONTRAST, o.contrast, DEFAULT_PREFS.contrast),
    textSize: pick(TEXT_SIZE, o.textSize, DEFAULT_PREFS.textSize),
  };
}

export function loadPrefs(storage: Pick<Storage, "getItem"> | null = safeStorage()): A11yPrefs {
  try {
    const text = storage?.getItem(STORAGE_KEY);
    return sanitizePrefs(text ? JSON.parse(text) : null);
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: A11yPrefs, storage: Pick<Storage, "setItem"> | null = safeStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable (private mode, quota): the choice just lasts for this visit */
  }
}

function safeStorage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

/** An explicit choice always wins; "system" follows the OS setting. */
export function resolvePrefs(prefs: A11yPrefs, system: SystemSettings): EffectivePrefs {
  return {
    reduceMotion: prefs.motion === "system" ? system.reducedMotion : prefs.motion === "reduce",
    highContrast: prefs.contrast === "system" ? system.moreContrast : prefs.contrast === "more",
    largeText: prefs.textSize === "large",
  };
}

export function applyPrefs(root: HTMLElement, effective: EffectivePrefs): void {
  root.dataset.motion = effective.reduceMotion ? "reduce" : "allow";
  root.dataset.contrast = effective.highContrast ? "more" : "normal";
  root.dataset.textSize = effective.largeText ? "large" : "normal";
}

const QUERIES = { reducedMotion: "(prefers-reduced-motion: reduce)", moreContrast: "(prefers-contrast: more)" } as const;

function readSystem(): SystemSettings {
  const matches = (q: string) => typeof window.matchMedia === "function" && window.matchMedia(q).matches;
  return { reducedMotion: matches(QUERIES.reducedMotion), moreContrast: matches(QUERIES.moreContrast) };
}

/** Preferences state: persisted, applied to <html>, and live-updating with the OS setting. */
export function useAccessibilityPrefs() {
  const [prefs, setPrefs] = useState<A11yPrefs>(() => loadPrefs());
  const [system, setSystem] = useState<SystemSettings>(readSystem);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const lists = Object.values(QUERIES).map(q => window.matchMedia(q));
    const update = () => setSystem(readSystem());
    lists.forEach(l => l.addEventListener("change", update));
    return () => lists.forEach(l => l.removeEventListener("change", update));
  }, []);

  const effective = resolvePrefs(prefs, system);
  const { reduceMotion, highContrast, largeText } = effective;
  useEffect(() => {
    applyPrefs(document.documentElement, { reduceMotion, highContrast, largeText });
  }, [reduceMotion, highContrast, largeText]);

  const update = useCallback(<K extends keyof A11yPrefs>(key: K, value: A11yPrefs[K]) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: value };
      savePrefs(next);
      return next;
    });
  }, []);
  const reset = useCallback(() => { setPrefs({ ...DEFAULT_PREFS }); savePrefs({ ...DEFAULT_PREFS }); }, []);

  return { prefs, effective, update, reset };
}
