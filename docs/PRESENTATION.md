# Dear Alex — 10-Minute Competition Presentation Deck & Pitch Script

> UVEC 2026 Hackathon • Stream: Gamified Mental Health • Owner: Deniz Ikili

---

## Slide Outline & Speaking Script

### Slide 1 — The Hook (0:00 – 0:45)
- **Visual**: Quote: *"Think of the last time a close friend was struggling. You knew exactly what to say. Now think about what you told yourself after your last setback."*
- **Script**:
  > "Good afternoon, judges. When a friend fails a midterm or freezes up in a presentation, we offer warmth, perspective, and a concrete next step. But when the same thing happens to us, the inner voice turns harsh, critical, and unforgiving.
  >
  > Today's mental health apps ask us to stare directly at personal feelings through mood trackers and journals. But staring at yourself when overwhelmed is where the inner critic is loudest.
  >
  > What if, instead of asking you to coach yourself, you coached a friend named Alex?"

---

### Slide 2 — The Psychological Mechanism (0:45 – 1:45)
- **Visual**: Diagram showing **Self-Distancing & Solomon's Paradox** with citations:
  - Kross et al. (2014) *JPSP*
  - Grossmann & Kross (2014) *Psychological Science*
  - Kross & Ayduk (2017) *Advances in Experimental Social Psychology*
- **Script**:
  > "Dear Alex is built on peer-reviewed psychological research on **self-distancing**. In 2014, Grossmann and Ethan Kross explored **Solomon's Paradox**: the proven asymmetry where people reason with far greater wisdom, nuance, and compassion about other people's problems than their own.
  >
  > Kross et al. demonstrated that simply shifting the linguistic perspective from first-person ('I failed') to third-person ('Alex failed') creates psychological distance, cooling emotional reactivity without suppressing the emotion.
  >
  > Dear Alex harnesses this asymmetry. You tell Alex's story, coach Alex through three grounded scenes, and then discover the core twist."

---

### Slide 3 — The Live Demo (1:45 – 5:45)
- **Action**: Switch to browser at `http://localhost:5173` (or run automated showcase).
- **Step-by-step Demo Flow**:
  1. **Check-in**: Mood picker (1–5) with immediate skip. Select Mood 2 ("Tender").
  2. **Intake**:
     - Story: *"I got my midterm back and it was much worse than I hoped. I studied for weeks and still failed."*
     - Inner voice: *"I am not cut out for computer science."*
     - Category: *Academic*.
  3. **Alex's World (Scene 1: The Moment)**:
     - The story is transformed into third person: *"Alex got Alex's midterm back..."*
     - The inner voice appears in quotes as Alex's inner critic.
     - Pick a **Compassion** card: *"Take a breath. You deserve gentleness before you solve anything."*
     - Watch Alex's world horizon brighten and the lantern warm up.
  4. **Scene 2: The Voice**:
     - Pick a **Perspective** card: *"A thought can be loud without being true."*
  5. **Scene 3: Tomorrow**:
     - Pick an **Action** card: *"Choose one tiny next action you can finish in ten minutes."*
  6. **THE REVEAL (The Killer Feature)**:
     - The screen pauses: *"That advice was for you."*
     - The words animate token-by-token back from Alex's story into original sentences.
  7. **The Letter to You & The Vault**:
     - Review the synthesized letter sealed into the local private SQLite vault.
     - Open a past resurfaced letter via the weighted scorer.
- **Script during demo**:
  > "Notice what just happened. We didn't lecture the player on cognitive behavioral therapy. We simply let them generate compassionate wisdom under the shelter of helping someone else—and then gently handed their own words back to them."

---

### Slide 4 — Technical Depth (5:45 – 7:15)
- **Visual**: Architecture Diagram (FastAPI + React + SQLite + Token-level Story Engine + Safety Gate).
- **Key Points**:
  - **Deterministic NLP**: Token alignment tracker mapping `(orig, alex, changed)` with grammatical case preservation and confidence fallbacks.
  - **Crisis Safety Layer**: Conservative pre-database triage routing explicit crisis phrases to Canadian 9-8-8 and UVic Counselling before persisting anything. 10 false-positive guards.
  - **Scored Resurfacing Algorithm**: Category bonus (+3), compassion weighting for low mood (+2), 7-day recency decay (-5), and weighted top-3 stochastic selection.
  - **Zero Third-Party APIs**: 100% private, local, and zero-cost runtime.
  - **Comprehensive Testing**: 76 passing pytest unit, integration, and edge-case tests.

---

### Slide 5 — Ethical Design: What Was Deliberately Excluded (7:15 – 8:15)
- **Visual**: The Anti-Features List:
  - No streaks or streak freeze microtransactions
  - No XP loss or guilt mechanics
  - No push notifications or countdown timers
  - No user accounts or third-party trackers
- **Script**:
  > "A mental health tool must not weaponize loss aversion. If a student is having a hard week and misses three days, a broken streak induces guilt—the exact emotion intended to alleviate.
  >
  > In Dear Alex, letters in the vault never expire. Every screen features a visible, penalty-free 'Not today' exit. Data stays on device, exportable as JSON or permanently deletable in one click."

---

### Slide 6 — Limitations & Future Work (8:15 – 9:00)
- **Visual**:
  - Self-help reflection tool, not clinical therapy or medical diagnosis.
  - Future local small language model (SLM) on-device for richer linguistic conjugation.
  - Student union partnerships & campus wellness integration.

---

### Slide 7 — Summary & Q&A (9:00 – 10:00)
- **Visual**: Links to GitHub repository, MIT License (Deniz Ikili), and test commands.
- **Script**:
  > "Dear Alex proves that students already know how to be compassionate—they just need a little distance to hear their own voice. Thank you, and I am ready for questions."

---

## Anticipated Judge Q&A & Rebuttals

### Q1: "Is this clinically validated?"
> **Answer**: "No, and the system is very explicit about that in the README and UI: Dear Alex is a self-help reflection tool, not a medical device or therapy substitute. However, the foundational psychological mechanism—self-distancing and Solomon's Paradox—is supported by extensive empirical research from Ethan Kross and Igor Grossmann showing reduced cardiovascular reactivity and improved reasoning when adopting an outside perspective."

### Q2: "What if someone enters language indicating immediate crisis?"
> **Answer**: "Safety is the highest technical constraint. Before any user text is written to the SQLite database or logs, it passes through the regex safety gate. Explicit crisis phrases halt the game immediately and display Canadian 9-8-8 and UVic Counselling resources. Flagged text is discarded and never persisted to protect user privacy."

### Q3: "Why build a rule-based story engine instead of calling an LLM like GPT-4?"
> **Answer**: "Three crucial reasons:
> 1. **Hackathon constraints**: No paid APIs or runtime costs.
> 2. **Absolute Privacy**: Mental health reflections must never be transmitted to third-party cloud servers.
> 3. **Determinism & Speed**: The rule-based alignment engine executes in under 2 milliseconds and is backed by 76 unit and edge-case tests with 100% predictable token mappings."

### Q4: "Why no streaks or gamified levels?"
> **Answer**: "Streaks create guilt on missed days. When a student is already overwhelmed by exams, an alert saying 'You lost your streak!' actively causes distress. Gamification is achieved through narrative, creativity, collection, and surprise—never through loss aversion or shame."
