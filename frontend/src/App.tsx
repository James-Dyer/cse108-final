import { type FormEvent, useEffect, useMemo, useState } from "react";
import "./App.css";

type User = {
  id: number;
  email: string;
};

type Step = {
  id?: number;
  title: string;
  description: string;
  order_index: number;
};

type Assignment = {
  id: number;
  user_id: number;
  title: string;
  raw_instructions: string;
  language: string;
  steps: Step[];
};

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    raw_instructions: "",
    language: "python",
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [code, setCode] = useState(
    `# Write Python here\n\ndef main():\n    sample = [1, 2, 3]\n    doubled = [x * 2 for x in sample]\n    print("Doubled values:", doubled)\n\nif __name__ == "__main__":\n    main()\n`
  );
  const [consoleText, setConsoleText] = useState("Runtime warming up...");
  const [pyodideStatus, setPyodideStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [pyodide, setPyodide] = useState<any>(null);

  const currentAssignment = useMemo(
    () => assignments.find((a) => a.id === selectedId) || null,
    [assignments, selectedId]
  );

  const orderedSteps = useMemo(() => {
    if (!currentAssignment) return [];
    return [...currentAssignment.steps].sort(
      (a, b) => a.order_index - b.order_index
    );
  }, [currentAssignment]);

  useEffect(() => {
    if (!user) return;
    loadAssignments();
  }, [user]);

  useEffect(() => {
    if (pyodideStatus !== "idle") return;
    setPyodideStatus("loading");
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";
    script.async = true;
    script.onload = async () => {
      try {
        const runtime = await (window as any).loadPyodide();
        setPyodide(runtime);
        setPyodideStatus("ready");
        setConsoleText("Pyodide ready. Write Python and press Run.");
      } catch (error) {
        console.error(error);
        setPyodideStatus("error");
        setConsoleText("Failed to load the in-browser Python runtime.");
      }
    };
    script.onerror = () => {
      setPyodideStatus("error");
      setConsoleText("Runtime load failed. Check your connection and retry.");
    };
    document.body.appendChild(script);
  }, [pyodideStatus]);

  const apiFetch = async (path: string, init?: RequestInit) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });

    if (!response.ok) {
      const raw = await response.text();
      try {
        const parsed = JSON.parse(raw);
        throw new Error(parsed.error || raw || "Request failed");
      } catch {
        throw new Error(raw || "Request failed");
      }
    }

    return response.json();
  };

  const loadAssignments = async () => {
    if (!user) return;
    try {
      const data = await apiFetch(`/api/assignments?user_id=${user.id}`);
      setAssignments(data.assignments || []);
      if (!selectedId && data.assignments?.length) {
        setSelectedId(data.assignments[0].id);
      }
    } catch (error) {
      setStatusMessage("Unable to load assignments yet.");
      console.error(error);
    }
  };

  const handleAuth = async (event: FormEvent) => {
    event.preventDefault();
    setStatusMessage("");
    try {
      const route = authMode === "login" ? "login" : "register";
      const data = await apiFetch(`/api/auth/${route}`, {
        method: "POST",
        body: JSON.stringify(authForm),
      });
      setUser(data.user);
      setStatusMessage(
        route === "login" ? "Welcome back to Code Lab." : "Account created."
      );
    } catch (error: any) {
      setStatusMessage(error.message || "Auth failed.");
    }
  };

  const handleAssignmentCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      setStatusMessage("Log in first.");
      return;
    }
    try {
      const payload = {
        ...assignmentForm,
        user_id: user.id,
      };
      const data = await apiFetch("/api/assignments", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setAssignments((prev) => [data.assignment, ...prev]);
      setSelectedId(data.assignment.id);
      setAssignmentForm({ title: "", raw_instructions: "", language: "python" });
      setStatusMessage("Assignment drafted with a starter step plan.");
    } catch (error: any) {
      setStatusMessage(error.message || "Could not create assignment.");
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    try {
      await apiFetch(`/api/assignments/${id}`, { method: "DELETE" });
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
      }
      setStatusMessage("Assignment removed.");
    } catch (error: any) {
      setStatusMessage(error.message || "Delete failed.");
    }
  };

  const selectedStep = orderedSteps[0];

  const generateHint = () => {
    if (!currentAssignment) return "Pick or create an assignment to get hints.";
    if (!selectedStep) return "Add steps to start receiving targeted hints.";
    return `Focus on: ${selectedStep.title}. Keep code aligned with the brief: “${currentAssignment.raw_instructions.slice(0, 120)}...”`;
  };

  const runCode = async () => {
    if (!pyodide || pyodideStatus !== "ready") {
      setConsoleText("Runtime not ready yet.");
      return;
    }
    try {
      const result = await pyodide.runPythonAsync(code);
      setConsoleText(String(result ?? "Finished without output."));
    } catch (error: any) {
      setConsoleText(error.message || String(error));
    }
  };

  const resetRuntime = () => {
    setConsoleText("Cleared console. Runtime still loaded.");
  };

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Code Lab / Guided Python practice</p>
          <h1>Structure your assignments, not your weekends.</h1>
          <p className="lede">
            Drop in a lab prompt, get a crisp plan, and code with an in-browser
            Python runtime. Hints and analysis nudge you without handing over
            the answers.
          </p>
          <div className="pill-row">
            <span className="pill">Step planner</span>
            <span className="pill">Concept tags</span>
            <span className="pill">Pyodide runner</span>
          </div>
        </div>
        <div className="status-tile">
          <div className="status-dot" data-state={pyodideStatus} />
          <div>
            <p className="status-label">Runtime</p>
            <p className="status-value">
              {pyodideStatus === "ready" ? "Pyodide ready" : "Loading runtime"}
            </p>
          </div>
        </div>
      </header>

      <section className="grid">
        <div className="panel">
          {!user ? (
            <div>
              <div className="panel-header">
                <h2>{authMode === "login" ? "Log in" : "Create account"}</h2>
                <button
                  className="ghost"
                  onClick={() =>
                    setAuthMode(authMode === "login" ? "register" : "login")
                  }
                >
                  {authMode === "login"
                    ? "Need an account?"
                    : "Already registered?"}
                </button>
              </div>
              <form className="form" onSubmit={handleAuth}>
                <label>
                  Email
                  <input
                    type="email"
                    required
                    value={authForm.email}
                    onChange={(e) =>
                      setAuthForm({ ...authForm, email: e.target.value })
                    }
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    required
                    value={authForm.password}
                    onChange={(e) =>
                      setAuthForm({ ...authForm, password: e.target.value })
                    }
                  />
                </label>
                <button type="submit" className="primary">
                  {authMode === "login" ? "Enter workspace" : "Start Code Lab"}
                </button>
              </form>
            </div>
          ) : (
            <div>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Welcome</p>
                  <h2>{user.email}</h2>
                </div>
                <button className="ghost" onClick={() => setUser(null)}>
                  Log out
                </button>
              </div>
              <form className="form" onSubmit={handleAssignmentCreate}>
                <h3>Draft a new assignment</h3>
                <label>
                  Title
                  <input
                    type="text"
                    required
                    value={assignmentForm.title}
                    onChange={(e) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        title: e.target.value,
                      })
                    }
                    placeholder="Lab 01: Arrays & loops"
                  />
                </label>
                <label>
                  Instructions
                  <textarea
                    required
                    value={assignmentForm.raw_instructions}
                    onChange={(e) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        raw_instructions: e.target.value,
                      })
                    }
                    placeholder="Paste the full prompt, rubric, and any inputs/outputs."
                  />
                </label>
                <label>
                  Language
                  <select
                    value={assignmentForm.language}
                    onChange={(e) =>
                      setAssignmentForm({
                        ...assignmentForm,
                        language: e.target.value,
                      })
                    }
                  >
                    <option value="python">Python</option>
                  </select>
                </label>
                <button type="submit" className="primary">
                  Build plan
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Assignments</p>
              <h2>Workspace queue</h2>
            </div>
            <span className="chip">{assignments.length} active</span>
          </div>
          <div className="assignment-list">
            {assignments.length === 0 && (
              <p className="muted">No assignments yet. Add one to start.</p>
            )}
            {assignments.map((assignment) => (
              <article
                key={assignment.id}
                className={`assignment-card ${
                  assignment.id === selectedId ? "active" : ""
                }`}
              >
                <div>
                  <h3>{assignment.title}</h3>
                  <p className="muted">
                    {assignment.raw_instructions.slice(0, 140)}
                    {assignment.raw_instructions.length > 140 ? "..." : ""}
                  </p>
                  <div className="meta-row">
                    <span className="chip">Steps: {assignment.steps.length}</span>
                    <span className="chip subtle">{assignment.language}</span>
                  </div>
                </div>
                <div className="card-actions">
                  <button
                    className="ghost"
                    onClick={() => setSelectedId(assignment.id)}
                  >
                    Open
                  </button>
                  <button
                    className="ghost danger"
                    onClick={() => handleDeleteAssignment(assignment.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="workspace">
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Plan</p>
              <h2>{currentAssignment?.title || "Choose an assignment"}</h2>
            </div>
            <span className="chip subtle">
              {currentAssignment ? currentAssignment.language : "python"}
            </span>
          </div>
          <div className="plan-grid">
            <div className="plan">
              <h4>Instructions</h4>
              <p className="muted">
                {currentAssignment?.raw_instructions ||
                  "Paste the full prompt to generate a deterministic step plan. We keep it concise—no chat bubbles."}
              </p>
              <h4>Steps</h4>
              <ol className="steps">
                {orderedSteps.map((step) => (
                  <li key={step.order_index}>
                    <div className="step-index">{step.order_index + 1}</div>
                    <div>
                      <p className="step-title">{step.title}</p>
                      <p className="muted">{step.description}</p>
                    </div>
                  </li>
                ))}
                {(!currentAssignment || orderedSteps.length === 0) && (
                  <li className="muted">No steps yet. Add an assignment.</li>
                )}
              </ol>
            </div>
            <div className="side-card">
              <h4>Hints & feedback</h4>
              <p className="muted">{generateHint()}</p>
              <button className="ghost" onClick={() => setStatusMessage(generateHint())}>
                Refresh hint
              </button>
              <div className="divider" />
              <p className="muted small">
                Feedback is deterministic and based on your steps and prompt; no
                full solutions are revealed.
              </p>
            </div>
          </div>
        </div>

        <div className="panel code-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Python runtime</p>
              <h2>Editor & console</h2>
            </div>
            <div className="button-row">
              <button className="ghost" onClick={resetRuntime}>
                Reset console
              </button>
              <button className="primary" onClick={runCode}>
                Run code
              </button>
            </div>
          </div>
          <div className="editor">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
            />
            <div className="console">
              <div className="console-label">Output</div>
              <pre>{consoleText}</pre>
            </div>
          </div>
        </div>
      </section>

      {statusMessage && <div className="toast">{statusMessage}</div>}
    </div>
  );
}

export default App;
