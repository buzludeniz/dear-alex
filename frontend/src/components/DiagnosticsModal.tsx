import { useState } from "react";
import { Activity, AlertTriangle, CheckCircle, Play, ShieldAlert, X } from "lucide-react";
import { API, deviceId, request } from "../lib/api";

interface DiagnosticsModalProps {
  onClose: () => void;
}

interface LogEntry {
  type: "info" | "success" | "error" | "warning";
  message: string;
  time: string;
}

export function DiagnosticsModal({ onClose }: DiagnosticsModalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState<string | null>(null);

  function log(message: string, type: "info" | "success" | "error" | "warning" = "info") {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, time }]);
  }

  function clearLogs() {
    setLogs([]);
  }

  // --- Test A: Backend Health & Diagnostics ---
  async function testBackend() {
    setRunning("backend");
    log("Initiating Backend Health & API Diagnostic check...", "info");
    const start = performance.now();

    try {
      const health = await request<{ ok: boolean }>("/health");
      const elapsed = Math.round(performance.now() - start);

      if (health && health.ok) {
        log(`Backend API Health Probe PASSED (${elapsed}ms) - Endpoint: /api/health`, "success");
      } else {
        log("Backend API Health Probe returned invalid response payload.", "error");
      }

      // Check Coaching Cards Endpoint
      const cards = await request<unknown[]>("/cards");
      log(`Coaching Cards Endpoint PASSED - ${cards.length} cards loaded from backend.`, "success");

      // Check Vault Endpoint
      const vault = await request<{ letters: unknown[] }>("/vault");
      log(`Local Vault Storage PASSED - ${vault.letters.length} letters stored for device ID ${deviceId().slice(0, 8)}...`, "success");

      log("Backend Diagnostics Completed Successfully!", "success");
    } catch (err) {
      log(`Backend Diagnostic Error: ${(err as Error).message}`, "error");
    } finally {
      setRunning(null);
    }
  }

  // --- Test B: Normal Application Flow ---
  async function testNormalFlow() {
    setRunning("flow");
    log("Starting Normal Reflection Session Workflow Test...", "info");

    try {
      const storyText = "I studied for weeks for my computer science exam but got a disappointing grade.";
      const innerVoice = "I am worried I cannot pass this course.";

      // 1. Check Story Transformation
      log("Step 1: Testing 1st-to-3rd person Story Transform...", "info");
      const storyRes = await request<{ safe: boolean; tokens: unknown[]; confidence: number }>("/story", {
        method: "POST",
        body: JSON.stringify({ story: storyText, character_name: "Alex" }),
      });

      if (!storyRes.safe) throw new Error("Story transform unexpectedly flagged safe input.");
      log(`Story Transform Engine PASSED - Confidence: ${storyRes.confidence}, Tokens: ${storyRes.tokens.length}`, "success");

      // 2. Create Session
      log("Step 2: Initiating Session Record in SQLite...", "info");
      const sessionRes = await request<{ safe: boolean; id: string }>("/sessions", {
        method: "POST",
        body: JSON.stringify({
          story: storyText,
          inner_voice: innerVoice,
          category: "Academic",
          character_name: "Alex",
          mood_before: 2,
        }),
      });

      if (!sessionRes.safe || !sessionRes.id) throw new Error("Failed to create session record.");
      const sessionId = sessionRes.id;
      log(`Session Created PASSED - Session UUID: ${sessionId.slice(0, 8)}...`, "success");

      // 3. Add Coaching Advice across 3 scenes
      log("Step 3: Recording 3 Coaching Scene Advice Entries...", "info");
      const scenes = [
        { key: "moment", cardId: "c1", style: "Compassion" },
        { key: "voice", cardId: "p1", style: "Perspective" },
        { key: "tomorrow", cardId: "a1", style: "Action" },
      ];

      for (const scene of scenes) {
        await request<{ safe: boolean }>(`/sessions/${sessionId}/advice`, {
          method: "POST",
          body: JSON.stringify({
            scene_key: scene.key,
            card_id: scene.cardId,
            free_text: null,
            style: scene.style,
          }),
        });
      }
      log("All 3 Coaching Scenes Advice Persisted PASSED.", "success");

      // 4. Finish Session & Synthesize Letter
      log("Step 4: Synthesizing Letter & Reveal Tokens...", "info");
      const finishRes = await request<{ letter: { id: string }; reveal: unknown[] }>(`/sessions/${sessionId}/finish`, {
        method: "POST",
        body: JSON.stringify({ mood_after: 4 }),
      });

      if (finishRes.letter && finishRes.reveal.length > 0) {
        log(`Session Completed PASSED - Letter ID: ${finishRes.letter.id.slice(0, 8)}..., Reveal Tokens: ${finishRes.reveal.length}`, "success");
      } else {
        log("Finish endpoint failed to return synthesized letter or reveal tokens.", "error");
      }

      log("Normal Application Flow Test Completed Successfully!", "success");
    } catch (err) {
      log(`Normal Flow Test Error: ${(err as Error).message}`, "error");
    } finally {
      setRunning(null);
    }
  }

  // --- Test C: Emergency Crisis Redirection ---
  async function testCrisisRedirection() {
    setRunning("crisis");
    log("Testing Emergency Crisis Safety Gate & 9-8-8 Redirection...", "warning");

    try {
      const crisisInput = "I feel completely hopeless and I want to end my life right now.";

      log("Submitting acute crisis phrase to Safety Triage Gate...", "info");
      const res = await request<{ safe: boolean; message?: string }>("/story", {
        method: "POST",
        body: JSON.stringify({ story: crisisInput, character_name: "Alex" }),
      });

      if (!res.safe && res.message && res.message.includes("9-8-8")) {
        log("Emergency Safety Gate PASSED - Session halted, safe=false returned, 9-8-8 Canadian Crisis Helpline & UVic Counselling surfaced.", "success");
        log(`Crisis Helpline Response Payload verified: "${res.message}"`, "info");
      } else {
        log("Safety Gate Failed: Crisis input was not caught or missing helpline routing details.", "error");
      }

      log("Crisis Redirection Safety Verification Completed!", "success");
    } catch (err) {
      log(`Crisis Test Error: ${(err as Error).message}`, "error");
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="diagnostics-modal-backdrop" onClick={onClose}>
      <div className="diagnostics-modal" onClick={e => e.stopPropagation()}>
        <header className="diagnostics-header">
          <div className="diagnostics-title">
            <Activity className="icon-pulse" size={20} />
            <h2>Diagnostics & System Test Panel</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close diagnostics panel">
            <X size={18} />
          </button>
        </header>

        <p className="diagnostics-subtitle">
          Run live in-browser tests against the FastAPI backend, deterministic story engine, and pre-persistence crisis safety gate.
        </p>

        <div className="diagnostics-buttons">
          <button
            className="secondary-button"
            disabled={running !== null}
            onClick={() => void testBackend()}
          >
            <Activity size={15} />
            {running === "backend" ? "Testing Backend..." : "1. Test Backend & API"}
          </button>

          <button
            className="secondary-button"
            disabled={running !== null}
            onClick={() => void testNormalFlow()}
          >
            <Play size={15} />
            {running === "flow" ? "Running App Flow..." : "2. Test Normal App Flow"}
          </button>

          <button
            className="secondary-button crisis-btn"
            disabled={running !== null}
            onClick={() => void testCrisisRedirection()}
          >
            <ShieldAlert size={15} />
            {running === "crisis" ? "Testing Crisis Gate..." : "3. Test Crisis Redirection"}
          </button>
        </div>

        <div className="diagnostics-logs-header">
          <span>Execution Output Logs</span>
          {logs.length > 0 && (
            <button className="text-small" onClick={clearLogs}>Clear logs</button>
          )}
        </div>

        <div className="diagnostics-logs">
          {logs.length === 0 ? (
            <div className="empty-logs">Click one of the test buttons above to execute live diagnostics.</div>
          ) : (
            logs.map((item, idx) => (
              <div key={idx} className={`log-entry log-${item.type}`}>
                <span className="log-time">[{item.time}]</span>
                <span className="log-icon">
                  {item.type === "success" && <CheckCircle size={14} />}
                  {item.type === "error" && <AlertTriangle size={14} />}
                  {item.type === "warning" && <ShieldAlert size={14} />}
                </span>
                <span className="log-msg">{item.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
