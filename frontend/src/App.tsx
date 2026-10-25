import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Download,
  Heart,
  LockKeyhole,
  Moon,
  Music2,
  Pause,
  Play,
  Sparkles,
  Sun,
  Trash2,
  Volume2,
  Zap,
} from "lucide-react";
import { API, deviceId, request } from "./lib/api";
import { useAmbientMusic } from "./lib/useAmbient";

type Style = "Compassion" | "Perspective" | "Action";
type Advice = { scene: string; text: string; style: Style };
type Token = { orig: string; alex: string; changed: boolean };
type Letter = { id: string; category: string; letter_type: Style; created_at: string; demo: boolean; body: { story: string; advice: Advice[] } };
type Card = { id: string; scene: string; style: Style; text: string; reaction: string };
type Screen = "checkin" | "intake" | "scene" | "reveal" | "letter" | "vault" | "crisis";
type Theme = "light" | "dark";

const SCENES = [
  { key: "moment", title: "The moment", prompt: "What does Alex need right now?", label: "Arrive" },
  { key: "voice", title: "The voice", prompt: "How would you answer Alex's inner critic?", label: "Reframe" },
  { key: "tomorrow", title: "Tomorrow", prompt: "What is one small thing Alex can do next?", label: "Continue" },
];
const CATEGORIES = ["Academic", "Social", "Performance", "Other"];

const DEMO = {
  story: "I got my midterm back and it was much worse than I hoped. I studied hard for weeks and still failed.",
  voice: "I'm just not smart enough for this.",
  category: "Academic" as const,
  name: "Alex",
  mood: 2,
};

function wait(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

export default function App() {
  const [screen, setScreen] = useState<Screen>("checkin");
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("dear-alex-theme") as Theme) || "light");
  const [mood, setMood] = useState<number | null>(null);
  const [story, setStory] = useState("");
  const [voice, setVoice] = useState("");
  const [category, setCategory] = useState("Other");
  const [name, setName] = useState("Alex");
  const [session, setSession] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [step, setStep] = useState(0);
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [custom, setCustom] = useState("");
  const [reaction, setReaction] = useState("");
  const [letter, setLetter] = useState<Letter | null>(null);
  const [revealTokens, setRevealTokens] = useState<Token[]>([]);
  const [vault, setVault] = useState<Letter[]>([]);
  const [collection, setCollection] = useState<Record<string, number>>({});
  const [crisis, setCrisis] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoRunning, setDemoRunning] = useState(false);

  const sessionRef = useRef("");
  const cardsRef = useRef<Card[]>([]);

  const { playing, toggle } = useAmbientMusic();

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem("dear-alex-theme", theme); }, [theme]);
  useEffect(() => { request<Card[]>("/cards").then(c => { setCards(c); cardsRef.current = c; }).catch(() => undefined); }, []);

  const light = Math.min(1, advice.length / 3);

  function safe(result: { safe: boolean; message?: string }) {
    if (!result.safe) { setCrisis(result.message ?? "Please seek immediate support."); setScreen("crisis"); return false; }
    return true;
  }

  async function begin() {
    if (!story.trim()) return;
    setLoading(true);
    try {
      const checked = await request<{ safe: boolean; message?: string }>("/story", { method: "POST", body: JSON.stringify({ story, character_name: name }) });
      if (!safe(checked)) return;
      const result = await request<{ safe: boolean; id?: string; message?: string }>("/sessions", { method: "POST", body: JSON.stringify({ story, inner_voice: voice || null, category, character_name: name, mood_before: mood }) });
      if (safe(result) && result.id) { setSession(result.id); sessionRef.current = result.id; setScreen("scene"); }
    } finally { setLoading(false); }
  }

  async function submitAdvice(card?: Card) {
    const scene = SCENES[step];
    const text = card?.text ?? custom.trim();
    if (!text || loading) return;
    setLoading(true);
    try {
      const style = card?.style ?? "Compassion";
      const result = await request<{ safe: boolean; message?: string }>(`/sessions/${session}/advice`, { method: "POST", body: JSON.stringify({ scene_key: scene.key, card_id: card?.id ?? null, free_text: card ? null : text, style }) });
      if (!safe(result)) return;
      setAdvice(prev => [...prev, { scene: scene.key, text, style }]);
      setReaction(card?.reaction ?? "Alex hears the kindness in those words.");
      setCustom("");
      window.setTimeout(() => { setReaction(""); if (step < 2) setStep(s => s + 1); else void finish(); }, 900);
    } finally { setLoading(false); }
  }

  async function finish() {
    const result = await request<{ letter: Letter; reveal?: Token[] }>(`/sessions/${session}/finish`, { method: "POST", body: JSON.stringify({}) });
    setLetter(result.letter);
    setRevealTokens(result.reveal ?? []);
    setScreen("reveal");
  }

  async function openVault() {
    const data = await request<{ letters: Letter[]; collection: Record<string, number> }>("/vault");
    setVault(data.letters);
    setCollection(data.collection);
    setScreen("vault");
  }

  async function pastLetter() {
    const data = await request<{ letter: Letter | null }>(`/vault/surprise?category=${category}&mood=${mood ?? ""}`);
    if (data.letter) { setLetter(data.letter); setScreen("letter"); }
  }

  async function erase() {
    if (confirm("Delete every Dear Alex letter on this device? This cannot be undone.")) {
      await request("/vault", { method: "DELETE" });
      setVault([]);
      setCollection({});
    }
  }

  function reset() {
    setScreen("checkin");
    setStory(""); setVoice(""); setAdvice([]); setStep(0);
    setLetter(null); setMood(null); setRevealTokens([]);
    sessionRef.current = "";
    setDemoRunning(false);
  }

  async function runDemo() {
    if (demoRunning) return;
    reset();
    await wait(400);
    setDemoRunning(true);

    // Check-in
    setMood(DEMO.mood);
    await wait(900);
    setScreen("intake");
    setCategory(DEMO.category);
    setName(DEMO.name);

    // Typewriter: story
    await wait(500);
    for (let i = 1; i <= DEMO.story.length; i++) { setStory(DEMO.story.slice(0, i)); await wait(20); }
    await wait(500);

    // Typewriter: voice
    for (let i = 1; i <= DEMO.voice.length; i++) { setVoice(DEMO.voice.slice(0, i)); await wait(32); }
    await wait(700);

    // Begin (direct API call — avoids stale closure on story/voice state)
    setLoading(true);
    let sid = "";
    try {
      const checked = await request<{ safe: boolean; message?: string }>("/story", { method: "POST", body: JSON.stringify({ story: DEMO.story, character_name: DEMO.name }) });
      if (!checked.safe) { setDemoRunning(false); return; }
      const result = await request<{ safe: boolean; id?: string }>("/sessions", { method: "POST", body: JSON.stringify({ story: DEMO.story, inner_voice: DEMO.voice, category: DEMO.category, character_name: DEMO.name, mood_before: DEMO.mood }) });
      if (!result.safe || !result.id) { setDemoRunning(false); return; }
      sid = result.id;
      setSession(sid);
      sessionRef.current = sid;
      setScreen("scene");
    } finally { setLoading(false); }

    // Auto-pick one card per scene
    await wait(1400);
    const allCards = cardsRef.current;
    for (let si = 0; si < SCENES.length; si++) {
      const scene = SCENES[si];
      const pick = allCards.find(c => c.scene === scene.key);
      if (!pick) continue;
      setLoading(true);
      try {
        await request<{ safe: boolean }>(`/sessions/${sid}/advice`, { method: "POST", body: JSON.stringify({ scene_key: scene.key, card_id: pick.id, free_text: null, style: pick.style }) });
        setAdvice(prev => [...prev, { scene: scene.key, text: pick.text, style: pick.style }]);
        setReaction(pick.reaction);
        if (si < 2) setStep(si + 1);
        await wait(1100);
        setReaction("");
        await wait(350);
      } finally { setLoading(false); }
    }

    // Finish
    await wait(500);
    const fin = await request<{ letter: Letter; reveal?: Token[] }>(`/sessions/${sid}/finish`, { method: "POST", body: JSON.stringify({}) });
    setLetter(fin.letter);
    setRevealTokens(fin.reveal ?? []);
    setScreen("reveal");
    setDemoRunning(false);
  }

  const controls = (
    <div className="utility">
      <button className="icon-button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
        {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
      </button>
      <button className={`sound-toggle ${playing ? "is-playing" : ""}`} onClick={() => void toggle()} aria-label={playing ? "Pause ambience" : "Play classical ambience"}>
        {playing ? <Pause size={14} /> : <Play size={14} />}
        <span>{playing ? "Pause" : "Ambience"}</span>
        <Music2 size={14} />
      </button>
    </div>
  );

  if (screen === "crisis") return <main><Crisis message={crisis} reset={reset} /></main>;

  return (
    <main>
      <header>
        <button className="brand" onClick={reset}>
          <span className="brand-mark"><Heart fill="currentColor" size={18} /></span>
          <span>Dear Alex<small>quietly, for you</small></span>
        </button>
        <div className="header-actions">
          {controls}
          <button className="vault-link" onClick={() => void openVault()}><LockKeyhole size={14} /> Letter vault</button>
        </div>
      </header>
      {screen === "checkin" && <Checkin mood={mood} setMood={setMood} next={() => setScreen("intake")} onDemo={() => void runDemo()} demoRunning={demoRunning} />}
      {screen === "intake" && <Intake story={story} voice={voice} category={category} name={name} setStory={setStory} setVoice={setVoice} setCategory={setCategory} setName={setName} begin={() => void begin()} reset={reset} loading={loading} />}
      {screen === "scene" && <Scene scene={SCENES[step]} name={name || "Alex"} story={story} voice={voice} cards={cards.filter(c => c.scene === SCENES[step].key)} custom={custom} setCustom={setCustom} submit={submitAdvice} reaction={reaction} light={light} step={step} loading={loading} onExit={reset} />}
      {screen === "reveal" && <Reveal story={story} name={name || "Alex"} tokens={revealTokens} done={() => setScreen("letter")} />}
      {screen === "letter" && letter && <LetterView letter={letter} onVault={() => void openVault()} onReset={reset} />}
      {screen === "vault" && <Vault letters={vault} collection={collection} open={item => { setLetter(item); setScreen("letter"); }} past={() => void pastLetter()} erase={() => void erase()} />}
    </main>
  );
}

function Checkin({ mood, setMood, next, onDemo, demoRunning }: { mood: number | null; setMood: (n: number) => void; next: () => void; onDemo: () => void; demoRunning: boolean }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow"><Sparkles size={14} /> A private, pressure-free pause</p>
        <h1>You already know<br /><em>how to be kind.</em></h1>
        <p className="lede">Give someone named Alex the warmth you would offer a friend. In a few minutes, you may discover that the words were for you.</p>
        <div className="mood-card">
          <div>
            <strong>How are you arriving?</strong>
            <span>Optional · stored only on this device</span>
          </div>
          <div className="mood-picker" role="radiogroup" aria-label="Mood check-in">
            {[1, 2, 3, 4, 5].map(n => (
              <button role="radio" aria-checked={mood === n} className={mood === n ? "selected" : ""} onClick={() => setMood(n)} key={n}>
                <span>{["Low", "Tender", "Okay", "Steady", "Bright"][n - 1]}</span>
                <b>{n}</b>
              </button>
            ))}
          </div>
        </div>
        <div className="hero-actions">
          <button className="primary" onClick={next}>Begin gently <ArrowRight size={16} /></button>
          <button className="text" onClick={next}>Skip check-in</button>
          <button className="demo-btn" onClick={onDemo} disabled={demoRunning} aria-label="Run automated demo">
            <Zap size={13} />{demoRunning ? "Demo running…" : "Watch auto-demo"}
          </button>
        </div>
      </div>
      <HeroArtwork />
    </section>
  );
}

function Intake({ story, voice, category, name, setStory, setVoice, setCategory, setName, begin, reset, loading }: { story: string; voice: string; category: string; name: string; setStory: (x: string) => void; setVoice: (x: string) => void; setCategory: (x: string) => void; setName: (x: string) => void; begin: () => void; reset: () => void; loading: boolean }) {
  return (
    <section className="panel intake">
      <div className="step-label"><span>1</span> Create a little distance</div>
      <p className="eyebrow">A small pause, for you</p>
      <h1>Tell Alex's story.</h1>
      <p className="helper">You do not need to make it neat. A few honest sentences are enough.</p>
      <label>What happened?<textarea autoFocus value={story} onChange={e => setStory(e.target.value)} placeholder="I got my midterm back and it was much worse than I hoped." /></label>
      <label>What is the harshest thing your mind is saying? <span>(optional)</span><textarea value={voice} onChange={e => setVoice(e.target.value)} placeholder="I am not good enough." /></label>
      <fieldset><legend>What kind of moment is this?</legend><div className="chips">{CATEGORIES.map(item => <button type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div></fieldset>
      <label>Who are you coaching?<input value={name} maxLength={48} onChange={e => setName(e.target.value)} /></label>
      <button className="primary" disabled={!story.trim() || loading} onClick={begin}>{loading ? "Preparing Alex's story…" : <>{`Meet ${name || "Alex"}`} <ArrowRight size={16} /></>}</button>
      <button className="text" onClick={reset}>Not today</button>
    </section>
  );
}

function Scene({ scene, name, story, voice, cards, custom, setCustom, submit, reaction, light, step, loading, onExit }: { scene: typeof SCENES[number]; name: string; story: string; voice: string; cards: Card[]; custom: string; setCustom: (x: string) => void; submit: (c?: Card) => void; reaction: string; light: number; step: number; loading: boolean; onExit: () => void }) {
  return (
    <section className="scene">
      <World name={name} reaction={reaction} light={light} />
      <div className="coach">
        <div className="scene-progress" aria-label={`Scene ${step + 1} of 3`}>
          {SCENES.map((s, i) => <div className={i <= step ? "complete" : ""} key={s.key}><i>{i + 1}</i><span>{s.label}</span></div>)}
        </div>
        <p className="eyebrow">Scene {step + 1} of 3</p>
        <h1>{scene.title}</h1>
        <p className="prompt">{scene.prompt}</p>
        {scene.key === "moment" && <blockquote><small>Alex's story</small>{story}</blockquote>}
        {scene.key === "voice" && voice && <blockquote className="inner-voice"><small>Alex's inner voice</small>"{voice}"</blockquote>}
        <div className="cards">{cards.map(card => <button disabled={loading} onClick={() => void submit(card)} key={card.id}><small className={card.style.toLowerCase()}>{card.style}</small><span>{card.text}</span><ArrowRight size={15} /></button>)}</div>
        <details>
          <summary>Write your own response</summary>
          <label className="custom"><textarea value={custom} onChange={e => setCustom(e.target.value)} placeholder="What would you say to Alex?" /></label>
          <button className="secondary-button" disabled={!custom.trim() || loading} onClick={() => void submit()}>Offer these words</button>
        </details>
        <button className="text" onClick={onExit}>Not today</button>
      </div>
    </section>
  );
}

function Reveal({ story, name, tokens, done }: { story: string; name: string; tokens: Token[]; done: () => void }) {
  const [phase, setPhase] = useState<"alex" | "you">("alex");
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPhase("you");
      tokens.forEach((_, i) => window.setTimeout(() => setRevealed(i + 1), i * 85));
    }, 1800);
    return () => window.clearTimeout(t);
  }, [tokens]);

  function skipAnim() { setPhase("you"); setRevealed(tokens.length || 9999); }

  return (
    <section className="reveal panel">
      <div className="reveal-art"><div className="reveal-orbit orbit-one" /><div className="reveal-orbit orbit-two" /><Heart fill="currentColor" size={28} /></div>
      <p className="eyebrow">The reveal</p>
      <h1>That advice was<br /><em>for you.</em></h1>
      <div className="morph" aria-live="polite">
        <small>{phase === "alex" ? `${name}'s story` : "Your story"}</small>
        {phase === "alex" ? (
          <p key="alex">{name} is going through this…</p>
        ) : tokens.length > 0 ? (
          <p key="you" className="token-reveal">
            {tokens.map((t, i) => (
              <span key={i} className={`token-word ${t.changed ? "changed" : ""} ${i < revealed ? "visible" : "hidden"}`}>{t.orig}</span>
            ))}
          </p>
        ) : (
          <p key="fallback">{story}</p>
        )}
      </div>
      <p className="reveal-copy">The care you found for Alex can belong to you too.</p>
      <button className="primary" onClick={done}>Read your letter <ArrowRight size={16} /></button>
      <button className="text" onClick={skipAnim}>Skip animation</button>
    </section>
  );
}

function LetterView({ letter, onVault, onReset }: { letter: Letter; onVault: () => void; onReset: () => void }) {
  return (
    <section className="letter panel">
      <div className="letter-seal"><Heart fill="currentColor" size={24} /></div>
      <p className="eyebrow">A letter to you {letter.demo && "· demo data"}</p>
      <h1>Dear you,</h1>
      <p className="letter-opening">You went through this: "{letter.body.story}"</p>
      {letter.body.advice.map(item => <div className="advice" key={item.scene}><small className={item.style.toLowerCase()}>{item.style} · {item.scene}</small><p>{item.text}</p></div>)}
      <p className="signature">You deserve the same care you give away.</p>
      <button className="primary" onClick={onVault}><LockKeyhole size={15} /> Seal in vault</button>
      <button className="text" onClick={onReset}>That's enough for today</button>
    </section>
  );
}

function Vault({ letters, collection, open, past, erase }: { letters: Letter[]; collection: Record<string, number>; open: (l: Letter) => void; past: () => void; erase: () => void }) {
  return (
    <section className="vault panel">
      <p className="eyebrow">Your private collection</p>
      <h1>Letter vault</h1>
      <p className="helper">Nothing expires. Nothing is counted against you.</p>
      <div className="slots">
        {(["Compassion", "Perspective", "Action"] as Style[]).map(style => (
          <div key={style}><span>{collection[style] ? "✦" : "○"}</span><strong>{style}</strong><small>{collection[style] ?? 0} letters</small></div>
        ))}
      </div>
      <button className="primary" onClick={past}>Open a letter from past you <Sparkles size={15} /></button>
      <div className="shelf">
        {letters.length ? letters.map(item => (
          <button key={item.id} onClick={() => open(item)}>
            <small>{new Date(item.created_at).toLocaleDateString()} · {item.letter_type}</small>
            <span>{item.body.story}</span>
            <ArrowRight size={15} />
          </button>
        )) : <p>No letters yet. When you're ready, your first one can wait here.</p>}
      </div>
      <div className="privacy">
        <div><h2>Your data stays yours.</h2><p>Stored on this device. Export it, or remove it completely.</p></div>
        <div>
          <a href={`${API}/vault/export`} onClick={ev => { ev.preventDefault(); fetch(`${API}/vault/export`, { headers: { "X-Device-Id": deviceId() } }).then(r => r.blob()).then(blob => { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "dear-alex-export.json"; a.click(); URL.revokeObjectURL(url); }); }}><Download size={14} /> Export</a>
          <button onClick={erase}><Trash2 size={14} /> Delete</button>
        </div>
      </div>
    </section>
  );
}

function Crisis({ message, reset }: { message: string; reset: () => void }) {
  return (
    <section className="crisis panel">
      <div className="letter-seal"><Heart fill="currentColor" size={24} /></div>
      <h1>You deserve support right now.</h1>
      <p>{message}</p>
      <a className="primary" href="tel:988">Call 9-8-8</a>
      <a className="secondary-button" href="sms:988">Text 9-8-8</a>
      <button className="text" onClick={reset}>Return to start</button>
    </section>
  );
}

function AlexFigure({ name, light, tiny = false }: { name: string; light: number; tiny?: boolean }) {
  if (tiny) {
    return (
      <div className="tiny-alex" aria-hidden="true">
        <svg viewBox="0 0 36 48" width="18" height="24">
          <circle cx="18" cy="6" r="3.5" fill="#e08e45" />
          <path d="M10 16 C10 8 26 8 26 16 Z" fill="#2d575d" />
          <rect x="8" y="14" width="20" height="4" rx="2" fill="#e08e45" />
          <circle cx="18" cy="20" r="5.5" fill="#f0c89a" />
          <rect x="11" y="24" width="14" height="4" rx="2" fill="#d97736" />
          <path d="M9 28 C9 28 11 44 18 44 C25 44 27 28 27 28 Z" fill="#3b6b74" />
        </svg>
      </div>
    );
  }

  return (
    <div className="alex-character" style={{ "--light": light } as React.CSSProperties}>
      <svg viewBox="0 0 160 190" className="alex-svg" aria-label={`Cozy illustration of ${name}`}>
        <defs>
          <radialGradient id="lanternAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffe699" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#f39c12" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f39c12" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient warm lantern glow that expands and brightens with advice */}
        <circle
          cx="130"
          cy="140"
          r={26 + light * 34}
          fill="url(#lanternAura)"
          className="lantern-aura"
        />

        {/* Ground shadow beneath Alex */}
        <ellipse cx="78" cy="174" rx="44" ry="10" fill="#08141d" opacity="0.45" />

        {/* Sitting legs in denim trousers */}
        <path d="M48 146 C44 162 52 172 68 172 C82 172 84 156 80 146 Z" fill="#1b2f3d" />
        <path d="M78 146 C84 156 90 172 108 172 C120 172 120 160 114 146 Z" fill="#152631" />
        <ellipse cx="64" cy="172" rx="9" ry="4.5" fill="#4a3728" />
        <ellipse cx="112" cy="172" rx="9" ry="4.5" fill="#4a3728" />

        {/* Cozy textured wool sweater */}
        <g className="alex-body">
          <path
            d="M46 96 C42 124 48 152 78 152 C108 152 114 124 110 96 C102 86 54 86 46 96 Z"
            fill="#325a60"
          />
          {/* Subtle knitted stitches */}
          <path d="M78 102 L78 146" stroke="#25464b" strokeWidth="2" strokeDasharray="3,3" />
          <path d="M66 108 L66 142" stroke="#25464b" strokeWidth="1.5" strokeDasharray="3,3" />
          <path d="M90 108 L90 142" stroke="#25464b" strokeWidth="1.5" strokeDasharray="3,3" />

          {/* Left arm resting gently on lap */}
          <path d="M48 102 C38 116 42 136 56 140" stroke="#325a60" strokeWidth="13" strokeLinecap="round" fill="none" />
          <circle cx="58" cy="140" r="7" fill="#e08e45" />

          {/* Right arm resting near lantern */}
          <path d="M106 102 C116 114 122 126 124 138" stroke="#325a60" strokeWidth="13" strokeLinecap="round" fill="none" />
          <circle cx="124" cy="139" r="7" fill="#e08e45" />
        </g>

        {/* Cozy wrap-around mustard scarf */}
        <g className="alex-scarf">
          <path d="M44 86 C44 86 78 98 112 86 C116 94 110 106 102 106 C78 109 52 107 44 86 Z" fill="#e08e45" />
          <path d="M58 98 C60 116 64 132 66 136 C71 137 75 135 74 130 C72 118 70 102 70 98 Z" fill="#cf7a30" />
          <line x1="66" y1="136" x2="66" y2="141" stroke="#a3581c" strokeWidth="2" />
          <line x1="70" y1="136" x2="70" y2="141" stroke="#a3581c" strokeWidth="2" />
          <line x1="73" y1="134" x2="73" y2="139" stroke="#a3581c" strokeWidth="2" />
        </g>

        {/* Head & Peaceful Smiling Face */}
        <g className="alex-head">
          <rect x="71" y="78" width="14" height="10" fill="#e5b88a" />
          <circle cx="78" cy="62" r="26" fill="#f3c99f" />

          {/* Soft hair peeking from under beanie */}
          <path d="M54 58 C52 50 56 46 62 46 C60 52 64 54 66 56 Z" fill="#2c221e" />
          <path d="M102 58 C104 50 100 46 94 46 C96 52 92 54 90 56 Z" fill="#2c221e" />

          {/* Closed gentle smiling eyes ◠ ◠ */}
          <path d="M64 64 C67 60 72 60 75 64" stroke="#4a3728" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M81 64 C84 60 89 60 92 64" stroke="#4a3728" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* Sweet quiet smile */}
          <path d="M74 73 C76 76 80 76 82 73" stroke="#8c583e" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Rosy blushing cheeks */}
          <circle cx="62" cy="68" r="5" fill="#e88080" opacity="0.45" />
          <circle cx="94" cy="68" r="5" fill="#e88080" opacity="0.45" />

          {/* Knitted Beanie with Pom-pom */}
          <g className="alex-beanie">
            <path d="M52 54 C50 26 106 26 104 54 Z" fill="#254a50" />
            <rect x="49" y="47" width="58" height="11" rx="5" fill="#e08e45" />
            <line x1="58" y1="48" x2="58" y2="57" stroke="#c4732b" strokeWidth="1.5" />
            <line x1="68" y1="48" x2="68" y2="57" stroke="#c4732b" strokeWidth="1.5" />
            <line x1="78" y1="48" x2="78" y2="57" stroke="#c4732b" strokeWidth="1.5" />
            <line x1="88" y1="48" x2="88" y2="57" stroke="#c4732b" strokeWidth="1.5" />
            <line x1="98" y1="48" x2="98" y2="57" stroke="#c4732b" strokeWidth="1.5" />
            <circle cx="78" cy="22" r="8" fill="#e08e45" />
            <circle cx="75" cy="20" r="3" fill="#f5b878" opacity="0.6" />
          </g>
        </g>

        {/* Vintage Camping Lantern sitting on the knoll */}
        <g className="alex-lantern">
          <rect x="122" y="154" width="16" height="6" rx="2" fill="#2e3842" />
          <rect
            x="124"
            y="134"
            width="12"
            height="20"
            rx="3"
            fill="#fffae6"
            fillOpacity={0.45 + light * 0.45}
            stroke="#45505b"
            strokeWidth="1.5"
          />
          {/* Flame inside lantern */}
          <ellipse
            cx="130"
            cy="144"
            rx={2.2 + light * 1.5}
            ry={4 + light * 2}
            fill="#ffaa00"
            className="lantern-flame"
          />
          <circle cx="130" cy="145" r="1.6" fill="#fff" />
          <path d="M121 134 L139 134 L134 128 L126 128 Z" fill="#252e37" />
          <circle cx="130" cy="126" r="2.5" fill="#d97736" />
          <path d="M125 128 C125 122 135 122 135 128" stroke="#8a9ba8" strokeWidth="1.2" fill="none" />
        </g>
      </svg>
      <span className="character-name-badge">{name}</span>
    </div>
  );
}

function HeroArtwork() {
  return (
    <div className="hero-art" aria-hidden="true">
      <div className="moon-glow" />
      <div className="moon" />
      <div className="cloud cloud-one" />
      <div className="cloud cloud-two" />
      <div className="hill hill-back" />
      <div className="hill hill-front" />
      <div className="window-light" />
      <AlexFigure name="Alex" light={0} tiny={true} />
      <div className="star star-one">✦</div>
      <div className="star star-two">✦</div>
      <p>A small place<br />to come back to.</p>
    </div>
  );
}

function World({ name, reaction, light }: { name: string; reaction: string; light: number }) {
  return (
    <div className="world" style={{ "--light": light } as React.CSSProperties}>
      <div className="world-stars">✦　·　✦　·　✦</div>
      <div className="world-moon" />
      <div className="world-hill hill-back" />
      <div className="world-hill hill-front" />
      <AlexFigure name={name} light={light} />
      <div className="world-message"><Volume2 size={14} />{reaction || `${name}'s world is waiting.`}</div>
    </div>
  );
}
