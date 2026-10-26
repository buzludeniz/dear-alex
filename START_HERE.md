# START HERE: Developer Blueprint & Master Onboarding Guide

> *This document is the master mental model, quickstart guide, engineering philosophy, architectural rationale, and step-by-step orientation guide for **Dear Alex**.*

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

## 2. Instant Kickstart & Developer Setup

### Prerequisites
- **Python**: 3.11+
- **Node.js**: 20+ (with npm)
- **OS**: Windows, macOS, or Linux

### Three Fast Ways to See the System Working

#### Option A: In-App Diagnostics & Live Test Launcher
1. Start the backend and frontend development servers (see Manual Setup below).
2. Open `http://localhost:5173` in a browser.
3. Click **"Diagnostics & Tests"** on the hero screen or top utility bar.
4. Run live tests for backend health, normal workflow simulation, and emergency crisis redirection directly inside the browser.

#### Option B: The One-Command Automated Suite
Run the unified automation script. It automatically kickstarts both servers, runs a database concurrency stress test, and launches Chrome to drive normal and emergency interactions:
```bash
python scripts/automated_system_test.py
```
*(Add `--headless` to run Chrome without a visible window).*

#### Option C: The Zero-Setup In-App Auto-Demo
1. Start the development servers.
2. Open `http://localhost:5173` in a browser.
3. Click **"Watch auto-demo"** on the welcome screen.
4. Sit back and watch the application automatically enter a realistic academic setback, coach Alex, observe the lantern glowing, and execute the Reveal.

---

### Manual Step-by-Step Developer Setup

#### Step 1: Start the Backend (FastAPI)
Open a terminal in the project root:

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server with live reload
python -m uvicorn app.main:app --reload --port 8000
```
- The backend starts at `http://127.0.0.1:8000`.
- Verify by visiting: `http://127.0.0.1:8000/health` (returns `{"ok": true}`).
- View interactive Swagger documentation: `http://127.0.0.1:8000/docs`.

#### Step 2: Start the Frontend (React + Vite)
Open a second terminal in the project root:

```bash
cd frontend

# Install npm packages
npm install

# Start Vite dev server
npm run dev
```
- Open browser to `http://localhost:5173`.

#### Step 3: Seed Demo Letters (Optional)
To pre-populate the vault with labelled past letters for demonstration:

```bash
cd backend
python -m app.seed_demo
```
*The command outputs a demo device UUID (e.g. `00000000-0000-0000-0000-000000000001`). Set this value in browser Developer Tools under `localStorage["dear-alex-device-id"]` to immediately explore a populated vault.*

---

## 3. Technical Decisions & Architectural Rationale

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
* **No Streaks & Loss Mechanics**: Broken streaks cause shame during low-energy/burnout periods. Letters never decay.
* **No Leaderboards & XP**: Gamified social comparison exacerbates imposter syndrome.
* **No Push Notifications**: Rushing users or interrupting them creates anxiety loops.
* **No User Accounts / Cloud Logins**: Eliminates server-side privacy risk entirely. Device isolation is handled via a client-generated UUID stored in `localStorage`.

---

## 4. System Architecture & Map of Codebase

```
dear-alex/
├── START_HERE.md                 # <--- YOU ARE HERE (Master Blueprint & Onboarding Guide)
├── README.md                     # High-level overview
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
│   └── RESEARCH.md
└── scripts/                      # Automated showcase and test runners
    ├── automated_system_test.py  # Unified 3-stage concurrency & Chrome test suite
    ├── api_showcase.py           # Pure terminal API workflow runner
    └── demo.py                   # Playwright browser automation
```

---

## 5. Key Subsystems & Mental Models

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

## 6. Testing & Quality Assurance Suite

Dear Alex comes with an extensive testing suite:

### 1. Pytest Unit, Integration & Edge-Case Tests (76 Tests)
Run from the `backend/` directory:
```bash
.venv/bin/pytest -v
```
- `tests/test_story_engine.py`: Pronouns, irregular verbs, contractions, capitalization, custom names, and fallback templates.
- `tests/test_safety.py`: Crisis phrases, false-positive guards (*"die my hair"*), and multi-field inputs.
- `tests/test_resurface.py`: Determinism of weighted letter selection and empty vault handling.
- `tests/test_api_showcase.py`: Complete API workflow test through FastAPI's TestClient.
- `tests/test_edge_cases.py`: Multi-threaded database concurrency stress test, multi-field crisis checks, and resurfacing recency decay math.

### 2. Database Concurrency Stress Test
Run the concurrency suite to simulate simultaneous users executing full reflection sessions:
```bash
python scripts/automated_system_test.py --stress-only
```
- Confirms zero database locks under SQLite WAL mode with 175+ requests/sec throughput.

---

## 7. Failure Modes, Edge Cases & Defenses

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

## 8. Development Verification Checklist

When returning to or verifying the repository, follow these steps in order:

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
