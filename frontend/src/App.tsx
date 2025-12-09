import { type FormEvent, useEffect, useMemo, useState } from "react";
import "./App.css";

type Page = "login" | "dashboard" | "assignment" | "concepts" | "workspace";

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

type Concept = {
  tag: string;
  summary: string;
  example: string;
  pitfalls?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";

const deriveConcepts = (raw: string): Concept[] => {
  const lowered = raw.toLowerCase();
  const concepts: Concept[] = [];

  const addUnique = (concept: Concept) => {
    if (!concepts.find((c) => c.tag === concept.tag)) concepts.push(concept);
  };

  if (lowered.includes("loop") || lowered.includes("iterate")) {
    addUnique({
      tag: "Iteration patterns",
      summary: "Choose between for/while, and keep counters and bounds obvious.",
      example: "for i, value in enumerate(items): ...",
      pitfalls: "Off-by-one errors and mutating while iterating.",
    });
  }

  if (lowered.includes("recursion")) {
    addUnique({
      tag: "Recursion hygiene",
      summary: "Define a base case, then shrink the input before recurring.",
      example: "if not nums: return 0\nreturn nums[0] + sum_rest(nums[1:])",
      pitfalls: "Missing base cases or forgetting to return recursion results.",
    });
  }

  if (lowered.includes("string")) {
    addUnique({
      tag: "String parsing",
      summary: "Normalize casing and strip whitespace before comparison.",
      example: 'clean = text.strip().lower().split(",")',
      pitfalls: "Comparing raw user input without trimming.",
    });
  }

  if (lowered.includes("file") || lowered.includes("input")) {
    addUnique({
      tag: "Input handling",
      summary: "Validate shape early; fail fast with helpful messages.",
      example: "if len(parts) != 3: raise ValueError('Need 3 fields')",
      pitfalls: "Silently accepting malformed rows and crashing later.",
    });
  }

  const baseline: Concept[] = [
    {
      tag: "Prompt synthesis",
      summary: "Rewrite the prompt in your own words; capture inputs, outputs, and constraints.",
      example: "Input: list of grades. Output: curved grades rounded to int.",
      pitfalls: "Starting code before clarifying edge cases.",
    },
    {
      tag: "Testing mindset",
      summary: "Craft tiny examples before full runs; hit happy path and one edge case.",
      example: "Given [1,2,3], expect [2,4,6]. Edge: [].",
      pitfalls: "Only testing the sample input from the prompt.",
    },
  ];

  return [...concepts, ...baseline].slice(0, 6);
};

function App() {
  const [page, setPage] = useState<Page>("login");
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

  const concepts = useMemo(
    () => deriveConcepts(currentAssignment?.raw_instructions || ""),
    [currentAssignment]
  );

  useEffect(() => {
    if (user && page === "login") {
      setPage("dashboard");
    }
  }, [user, page]);

  useEffect(() => {
    if (!user && page !== "login") {
      setPage("login");
    }
  }, [user, page]);

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
      setPage("dashboard");
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
      setPage("assignment");
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
        setPage("dashboard");
      }
      setStatusMessage("Assignment removed.");
    } catch (error: any) {
      setStatusMessage(error.message || "Delete failed.");
    }
  };

  const generateHint = () => {
    if (!currentAssignment) return "Pick or create an assignment to get hints.";
    if (orderedSteps.length === 0) return "Add steps to start receiving targeted hints.";
    return `Focus on: ${orderedSteps[0].title}. Keep code aligned with the brief: “${currentAssignment.raw_instructions.slice(0, 140)}...”`;
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

  const requireAssignment = (target: Page) => {
    if (!currentAssignment) {
      setStatusMessage("Select an assignment first.");
      setPage("dashboard");
      return;
    }
    setPage(target);
  };

  const navButton = (label: string, target: Page) => (
    <button
      className={`nav-button ${page === target ? "active" : ""}`}
      onClick={() =>
        target === "dashboard"
          ? setPage("dashboard")
          : target === "login"
            ? setPage("login")
            : requireAssignment(target)
      }
      disabled={target !== "dashboard" && target !== "login" && !currentAssignment}
    >
      {label}
    </button>
  );

  const renderLogin = () => (
    <div className="auth-layout">
      <div className="auth-card panel">
        <p className="eyebrow">Code Lab</p>
        <h2>{authMode === "login" ? "Log in" : "Create account"}</h2>
        <p className="muted">
          Access the guided lab workspace. We keep your assignments and step plans synced.
        </p>
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
          <div className="button-row">
            <button type="submit" className="primary">
              {authMode === "login" ? "Enter workspace" : "Start Code Lab"}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() =>
                setAuthMode(authMode === "login" ? "register" : "login")
              }
            >
              {authMode === "login" ? "Need an account?" : "Already registered?"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Keep labs organized and scoped.</h1>
          <p className="lede">
            Draft assignments, see progress, and jump into a guided workspace. Plans stay deterministic and ready for analysis.
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
      </section>

      <section className="grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Draft a new assignment</h3>
          </div>
          <form className="form" onSubmit={handleAssignmentCreate}>
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

        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Assignments</p>
              <h3>Your queue</h3>
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
                className={`assignment-card ${assignment.id === selectedId ? "active" : ""
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
                    onClick={() => {
                      setSelectedId(assignment.id);
                      setPage("assignment");
                    }}
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
    </>
  );

  const renderAssignment = () => (
    <section className="page-shell">
      <div className="breadcrumb">
        <button className="nav-pill" onClick={() => setPage("dashboard")}>
          ← Dashboard
        </button>
        <span className="muted">Assignment overview</span>
      </div>
      <div className="panel overview-grid">
        <div>
          <p className="eyebrow">Assignment</p>
          <h2>{currentAssignment?.title || "Select an assignment"}</h2>
          <p className="muted">
            {currentAssignment?.raw_instructions ||
              "Pick an assignment from your dashboard to see the summary and plan."}
          </p>
          <div className="meta-row">
            <span className="chip">Language: {currentAssignment?.language || "python"}</span>
            <span className="chip subtle">Steps: {orderedSteps.length}</span>
          </div>
          <div className="button-row top-gap">
            <button className="ghost" onClick={() => requireAssignment("concepts")}>
              View concepts
            </button>
            <button className="primary" onClick={() => requireAssignment("workspace")}>
              Open coding workspace
            </button>
          </div>
        </div>
        <div className="instruction-box">
          <h4>Step plan</h4>
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
            {orderedSteps.length === 0 && (
              <li className="muted">No steps yet. Add an assignment.</li>
            )}
          </ol>
        </div>
      </div>
    </section>
  );

  const renderConcepts = () => (
    <section className="page-shell">
      <div className="breadcrumb">
        <button className="nav-pill" onClick={() => setPage("assignment")}>
          ← Assignment
        </button>
        <span className="muted">Concept breakdown</span>
      </div>
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Concepts</p>
            <h2>Mini-lessons for this prompt</h2>
            <p className="muted">
              Derived deterministically from your instructions so you can prep before coding.
            </p>
          </div>
          <span className="chip subtle">{concepts.length} tags</span>
        </div>
        <div className="concept-grid">
          {concepts.map((concept) => (
            <article key={concept.tag} className="concept-card">
              <span className="concept-tag">{concept.tag}</span>
              <p>{concept.summary}</p>
              <p className="muted small">
                <strong>Example:</strong> {concept.example}
              </p>
              {concept.pitfalls && (
                <p className="muted small">
                  <strong>Watch for:</strong> {concept.pitfalls}
                </p>
              )}
            </article>
          ))}
        </div>
        <div className="button-row top-gap">
          <button className="ghost" onClick={() => setPage("assignment")}>
            Back to overview
          </button>
          <button className="primary" onClick={() => setPage("workspace")}>
            Jump into workspace
          </button>
        </div>
      </div>
    </section>
  );

  const renderWorkspace = () => (
    <section className="page-shell">
      <div className="breadcrumb">
        <button className="nav-pill" onClick={() => setPage("assignment")}>
          ← Assignment overview
        </button>
        <span className="muted">Coding workspace</span>
      </div>
      <div className="workspace-layout">
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Instructions</p>
              <h3>{currentAssignment?.title || "Select an assignment"}</h3>
            </div>
            <span className="chip subtle">
              {currentAssignment ? currentAssignment.language : "python"}
            </span>
          </div>
          <p className="muted">
            {currentAssignment?.raw_instructions ||
              "Pick an assignment to view its prompt, steps, and hints."}
          </p>
          <h4>Plan</h4>
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
            {orderedSteps.length === 0 && (
              <li className="muted">No steps yet. Add an assignment.</li>
            )}
          </ol>
          <div className="side-card">
            <h4>Hint</h4>
            <p className="muted">{generateHint()}</p>
            <div className="button-row top-gap">
              <button className="ghost" onClick={() => setStatusMessage(generateHint())}>
                Refresh hint
              </button>
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
      </div>
    </section>
  );

  const renderPage = () => {
    switch (page) {
      case "login":
        return renderLogin();
      case "dashboard":
        return renderDashboard();
      case "assignment":
        return renderAssignment();
      case "concepts":
        return renderConcepts();
      case "workspace":
        return renderWorkspace();
      default:
        return null;
    }
  };

  return (
    <div className="page">
      <header className="top-bar">
        <div className="brand" onClick={() => setPage("dashboard")}>
          <span className="logo-dot" /> Code Lab
        </div>
        <div className="nav-links">
          {navButton("Login", "login")}
          {navButton("Dashboard", "dashboard")}
          {navButton("Assignment", "assignment")}
          {navButton("Concepts", "concepts")}
          {navButton("Workspace", "workspace")}
        </div>
        <div className="user-chip">
          {user ? (
            <>
              <span className="chip subtle">{user.email}</span>
              <button className="ghost" onClick={() => setUser(null)}>
                Log out
              </button>
            </>
          ) : (
            <span className="muted small">Not signed in</span>
          )}
        </div>
      </header>
      <main>{renderPage()}</main>
      {statusMessage && <div className="toast">{statusMessage}</div>}
    </div>
  );
}

export default App;
