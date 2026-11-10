import { useEffect, useRef, useState } from "react";
import { Accessibility } from "lucide-react";
import type { A11yPrefs } from "../lib/accessibility";

type Props = { prefs: A11yPrefs; update: <K extends keyof A11yPrefs>(key: K, value: A11yPrefs[K]) => void; reset: () => void };

const GROUPS: { key: keyof A11yPrefs; legend: string; options: { value: string; label: string }[] }[] = [
  { key: "motion", legend: "Motion", options: [{ value: "system", label: "Follow my device" }, { value: "reduce", label: "Reduce motion" }, { value: "allow", label: "Allow motion" }] },
  { key: "contrast", legend: "Contrast", options: [{ value: "system", label: "Follow my device" }, { value: "more", label: "Higher contrast" }, { value: "normal", label: "Standard" }] },
  { key: "textSize", legend: "Text size", options: [{ value: "normal", label: "Standard" }, { value: "large", label: "Larger" }] },
];

/** A disclosure button + panel of radio groups. Escape closes it and returns focus to the button. */
export function AccessibilityPanel({ prefs, update, reset }: Props) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="a11y">
      <button ref={button} className="icon-button" aria-expanded={open} aria-controls="a11y-panel" aria-label="Accessibility settings" onClick={() => setOpen(o => !o)}>
        <Accessibility size={16} aria-hidden="true" />
      </button>
      {open && (
        <div id="a11y-panel" className="a11y-panel" role="group" aria-label="Accessibility settings">
          {GROUPS.map(g => (
            <fieldset key={g.key}>
              <legend>{g.legend}</legend>
              {g.options.map(o => (
                <label key={o.value}>
                  <input type="radio" name={`a11y-${g.key}`} value={o.value} checked={prefs[g.key] === o.value} onChange={() => update(g.key, o.value as never)} />
                  {o.label}
                </label>
              ))}
            </fieldset>
          ))}
          <p className="a11y-note">Saved on this device only.</p>
          <button className="text" onClick={reset}>Back to my device's settings</button>
        </div>
      )}
    </div>
  );
}
