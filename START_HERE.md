# START HERE: Developer Blueprint & Memory Recovery Guide

> *If you are reading this after losing memory of how this system was conceived, designed, and built: take a deep breath. This document contains the exact mental model, engineering philosophy, architectural rationale, and step-by-step orientation guide needed to pick up where development left off.*

---

## 1. Core Philosophy & Problem Space

### What is Dear Alex?
**Dear Alex** is an offline-first, privacy-sovereign, 4-minute interactive web application designed for university students experiencing academic, social, or personal setbacks.

### The Core Psychological Insight: Solomon's Paradox
When human beings experience personal failure (a bombed midterm, an awkward interaction, imposter syndrome), the inner monologue defaults to a harsh, punitive critic. Traditional mental health applications ask users to practice direct self-reflection (mood sliders, direct journaling), which inadvertently places the user directly in front of that critical inner voice.

**The breakthrough mechanism** is **Self-Distancing** (Kross et al., 2014; Grossmann & Kross, 2014):
1. Humans reason with significantly greater wisdom, warmth, and actionable clarity when giving advice to a friend than when advising themselves (**Solomon's Paradox**).
2. By asking the user to describe a setback as a story about a fictional student named **Alex**, linguistic distance is established (*"I failed"* -> *"Alex failed"*).
3. The user coaches Alex through three grounded scenes (*The Moment*, *The Voice*, *Tomorrow*).
4. **The Reveal**: The app pauses and gently states: *"That advice was for you."* The text animates token-by-token from Alex's story back into original user words.
5. The synthesized letter is sealed into a private local vault and resurfaced when needed most.

---

## 2. Technical Decisions & Architectural Rationale

Every technical choice in Dear Alex reflects intentional engineering constraints:

### A. Deterministic Rule-Based NLP vs. Cloud LLMs (GPT-4)
* **Why no LLM / OpenAI API?**
  1. **Absolute Privacy**: Personal mental health reflections must **never** leave the local machine or be transmitted to third-party cloud LLM providers.
  2. **Determinism & Speed**: The rule-based engine executes in `< 2 milliseconds`, produces zero hallucination, is 100% predictable, and works completely offline without API keys or costs.
  3. **Word-by-Word Alignment**: To execute the Reveal animation, every single token tracks its original form, its transformed 3rd-person form, and whether it changed. An LLM rewrite cannot guarantee 1:1 token alignment without loss of original phrasing.

### B. SQLite in WAL Mode vs. PostgreSQL / Cloud DB
* **Why SQLite?**
  - Keeps the application 100% zero-config and self-contained. No Docker or database server setup required.
  - Configured with **Write-Ahead Logging (WAL mode)** and `busy_timeout=30000` to prevent database locks even under multi-threaded concurrency (proven under 175+ req/sec stress tests).

### C. Web Audio API Synthesis vs. Audio File Downloads
* **Why synthesize classical audio locally in code?**
  - Zero asset downloads (no large MP3s or WAV files).
  - Uses additive sine synthesis, simulated hammer transients, and an algorithmic convolver reverb to recreate J.S. Bach (BWV 846) and Erik Satie inspired classical piano voicings locally in JavaScript.
  - Fully opt-in: respects browser autoplay restrictions and user sensory preferences.

### D. The Anti-Features List (Ethical Engineering)
Deliberately excluded:
* No Streaks & Loss Mechanics: Broken streaks cause shame during low-energy/burnout periods. Letters never decay.
* No Leaderboards & XP: Gamified social comparison exacerbates imposter syndrome.
* No Push Notifications: Rushing users or interrupting them creates anxiety loops.
* No User Accounts / Cloud Logins: Eliminates server-side privacy risk entirely. Device isolation is handled via a client-generated UUID stored in `localStorage`.

---

## 3. System Architecture & Map of Codebase

```
dear-alex/
├── START_HERE.md                 # <--- YOU ARE HERE
├── README.md                     # High-level overview & quickstart
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI entry point & REST endpoints
│   │   ├── story_engine.py       # First-to-third person regex NLP transform
│   │   ├── safety.py             # Pre-persistence crisis regex gate & false-positive guards
│   │   ├── resurface.py          # Stochastic weighted letter selection algorithm
│   │   ├── database.py           # SQLAlchemy SQLite engine (WAL mode)
│   │   ├── models.py             # Database schemas (Devices, Sessions, Advice, Letters)
│   │   ├── schemas.py            # Pydantic validation schemas
│   │   ├── seed_demo.py          # Demo data generator script
│   │   └── content/cards.json    # 18 curated coaching cards & reactions
│   ├── tests/                    # 76 Pytest unit, integration, and edge-case tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.ts            # API client with device UUID header & diagnostic runner
│   │   │   └── useAmbient.ts     # Acoustic classical piano Web Audio synthesizer
│   │   ├── components/
│   │   │   └── DiagnosticsModal.tsx # In-app frontend diagnostic test panel
│   │   ├── App.tsx               # Main application flow & illustrated Alex state
│   │   ├── main.tsx              # React mounting point
│   │   └── styles.css            # Custom CSS design system, dark/light modes, animations
│   ├── package.json
│   └── vite.config.ts
├── docs/                         # In-depth technical & research docs
│   ├── ARCHITECTURE.md
│   ├── DESIGN_PRINCIPLES.md
│   ├── RESEARCH.md
│   ├── STARTER_GUIDE.md
│   ├── PRESENTATION.md
│   └── AI_USAGE.md
└── scripts/                      # Automated showcase and test runners
    ├── automated_system_test.py  # Unified 3-stage concurrency & Chrome test suite
    ├── api_showcase.py           # Pure terminal API workflow runner
    └── demo.py                   # Playwright browser automation
```

---

## 4. Key Subsystems & Mental Models

### Subsystem 1: The Story Engine (`backend/app/story_engine.py`)
- **How it works**: Uses regex tokenization that preserves whitespace, punctuation, and casing.
- **Pronoun & Verb Mapping**: Maps 1st-person (`I`, `me`, `my`, `mine`, `myself`, `I'm`, `I've`, `I'll`, `I'd`) and present-tense verbs (`am`, `have`, `do`, `feel`) to 3rd-person equivalents (`Alex`, `Alex's`, `is`, `has`).
- **Confidence Scoring & Safe Fallback**: Calculates confidence ratio = `transformed_count / total_pronouns`. If 0 tokens were transformed or confidence is low, uses an explicit quoted fallback: `"{name} is reflecting on this: “{text}”"`.

### Subsystem 2: The Safety Gate (`backend/app/safety.py`)
- **Hard Privacy Rule**: Crisis checks run **BEFORE** any text reaches the database or logs.
- **Crisis Regex Patterns**: Explicit crisis triggers (suicide, self-harm, ending life).
- **False-Positive Guards**: Rules preventing triggers on idiomatic English (*"die my hair"*, *"overdose of homework"*, *"joke was suicidal"*).
- **Action on Flag**: If triggered, returns `{"safe": false}` with Canadian 9-8-8 helpline and UVic Counselling links immediately. Flagged text is discarded in memory.

### Subsystem 3: Weighted Resurfacing Scorer (`backend/app/resurface.py`)
Computes an affinity score for every letter in the user's vault:
$$\text{Score} = \text{Bonus}_{\text{category\_match}} (+3) + \text{Bonus}_{\text{low\_mood\_compassion}} (+2) - \text{Penalty}_{\text{shown\_in\_last\_7\_days}} (5) + \text{RandomJitter}$$
Selects stochastically among top candidates to provide fresh, relevant past wisdom without repetitive predictability.

---

## 5. Failure Modes, Edge Cases & Defenses

1. **SQLite Database Locking**:
   - *Risk*: Concurrent reads/writes during session completion locking DB.
   - *Defense*: WAL mode enabled in `database.py` (`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=30000;`). Tested with parallel thread stress test.

2. **Ungrammatical Pronoun Conversions**:
   - *Risk*: Complex sentences like *"I bought myself a book I liked"* converting poorly.
   - *Defense*: Token alignment preserves original words. If confidence drops, fallback template wraps in quotes. The Reveal returns exact original tokens to the user.

3. **Crisis False Positives / False Negatives**:
   - *Risk*: Student venting about homework ("This test killed me") getting blocked or genuine distress missed.
   - *Defense*: Dual-layer regex with active false-positive guards + always-visible 24/7 help links in the app footer regardless of safety gate output.

---

## 6. Memory Recovery Step-by-Step Checklist

When returning to the repository, follow these steps in order:

1. **Run Backend Unit & Edge-Case Tests**:
   ```bash
   cd backend
   .venv/bin/pytest -v
   ```
   *Expected: 76 passing tests covering NLP transform, safety triage, resurfacing math, concurrency, and API routes.*

2. **Run Integrated System Automation**:
   ```bash
   python scripts/automated_system_test.py --stress-only
   ```
   *Expected: Multi-threaded DB stress test completing with 0 locks and high throughput.*

3. **Start Development Servers**:
   - Terminal 1 (Backend): `cd backend && uvicorn app.main:app --reload`
   - Terminal 2 (Frontend): `cd frontend && npm run dev`
   - Open browser at `http://localhost:5173`.

4. **Run In-App Diagnostics**:
   - Click the **Diagnostics & Tests** button in the app header or hero screen.
   - Run **Test Backend API**, **Test Normal Flow**, and **Test Crisis Safety Gate**.
   - Observe real-time execution and log verification directly in the browser.
