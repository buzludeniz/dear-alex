# Design Principles & Ethical Framework

Dear Alex applies psychological self-distancing to personal reflection: users coach a fictional character through a real-world setback before discovering that the advice applies to themselves. It is an intentional, pressure-free self-help tool—not clinical therapy or a medical device.

---

## 1. Safety and Privacy First

- **Pre-Persistence Triage**: All free-text inputs pass through our conservative safety gate before any database insertion. Clear crisis phrasing immediately stops the session and surfaces Canadian 9-8-8 Suicide Crisis Helpline and UVic Counselling Services details.
- **Zero Retention of Flagged Content**: Flagged text is discarded in-flight and is never written to SQLite, persistent storage, or telemetry logs.
- **Anonymous & Local by Default**: No user accounts, passwords, or emails. A client-generated anonymous UUID in `localStorage` isolates data per device.
- **Full Data Sovereignty**: The user can download all stored reflections as structured JSON (`/api/vault/export`) or permanently delete all device records in one click (`DELETE /api/vault`).
- **Zero Third-Party APIs**: Zero external cloud calls, third-party analytics, or tracking beacons. All story transformation and classical audio synthesis execute entirely locally.

---

## 2. Deliberate Omissions (The "Anti-Features" List)

Traditional gamification mechanics exploit cognitive biases and loss aversion to drive retention metrics. In a wellbeing context, these mechanics often exacerbate guilt and anxiety. We deliberately excluded:

| Excluded Mechanic | Why We Left It Out | What We Built Instead |
|---|---|---|
| **Streaks & Daily Penalties** | Missing a day triggers shame, punishing students during busy or low-energy periods. | The Letter Vault: letters never expire, decay, or lose value. |
| **XP Decay / Leaderboards** | Social comparison amplifies impostor syndrome and feeling "behind." | Private collection badges (Compassion, Perspective, Action) without ranks. |
| **Push Notifications & Badges** | Intrusive interruptions demand attention and create guilt loops. | Calm, user-initiated visits. |
| **Timers & Countdowns** | Rushing creates cognitive overload and stress during emotional reflection. | Open-ended pacing on every scene. |
| **Locked Content / Paywalls** | Wellbeing tools should never exploit emotional vulnerability for monetization. | 100% open, accessible, and self-contained under the MIT license. |
| **Mandatory Traps** | Trapping users in a flow creates feeling of loss of control. | A penalty-free, visible **"Not today"** exit button on every screen. |

---

## 3. Sensory & Aesthetic Architecture

- **Acoustic Classical Sound**: Instead of synthesized electronic beeps, ambient music uses Web Audio API additive synthesis to model an intimate felt piano and concert hall acoustic reverb playing contemplative classical harmonies. It is strictly opt-in and never autoplays.
- **Storybook Visual World**: Alex sits on a quiet hillside under the night sky. As the user offers words of kindness, the horizon warms and Alex's campsite lantern brightens, providing positive visual reinforcement without arbitrary numbers or points.
- **Accessibility & Reduced Motion**: Full keyboard navigation, high-contrast dark and light modes, and strict adherence to `prefers-reduced-motion` to suppress animations for users with vestibular sensitivities.

---

## 4. Research Grounding & Responsible Boundaries

The core game loop operationalizes Solomon's Paradox (Grossmann & Kross, 2014) and self-distancing theory (Kross et al., 2014; Kross & Ayduk, 2017). 

**Limits**: Dear Alex does not diagnose, treat, or replace professional psychological or psychiatric care. When a user is in acute distress, technology must step aside and route immediately to trained human professionals.
