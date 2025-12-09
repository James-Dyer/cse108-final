import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
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
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("cl_token") : null
  );
  const [authChecking, setAuthChecking] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    raw_instructions: "",
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

  const apiFetch = async (path: string, init?: RequestInit) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {}),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        setUser(null);
        setToken(null);
        localStorage.removeItem("cl_token");
        localStorage.removeItem("cl_user");
        navigate("/login", { replace: true });
      }
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

  useEffect(() => {
    if (!token && location.pathname !== "/login") {
      navigate("/login", { replace: true });
    }
    if (user && location.pathname === "/login") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, token, location.pathname, navigate]);

  useEffect(() => {
    if (!statusMessage) return;
    const id = window.setTimeout(() => setStatusMessage(""), 7000);
    return () => {
      window.clearTimeout(id);
    };
  }, [statusMessage]);

  useEffect(() => {
    const savedUser =
      typeof window !== "undefined" ? localStorage.getItem("cl_user") : null;
    if (savedUser && !user) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("cl_user");
      }
    }
  }, [user]);

  useEffect(() => {
    const fetchMe = async () => {
      if (!token || user || authChecking) return;
      setAuthChecking(true);
      try {
        const data = await apiFetch("/api/auth/me");
        setUser(data.user);
        localStorage.setItem("cl_user", JSON.stringify(data.user));
      } catch (error) {
        setUser(null);
        setToken(null);
        localStorage.removeItem("cl_token");
        localStorage.removeItem("cl_user");
        navigate("/login", { replace: true });
      } finally {
        setAuthChecking(false);
      }
    };
    fetchMe();
  }, [token, user, authChecking, navigate]);

  useEffect(() => {
    if (!user || !token) return;
    loadAssignments();
  }, [user, token]);

  const loadAssignments = async () => {
    if (!user || !token) return;
    try {
      const data = await apiFetch(`/api/assignments`);
      setAssignments(data.assignments || []);
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
      setToken(data.token);
      localStorage.setItem("cl_token", data.token);
      localStorage.setItem("cl_user", JSON.stringify(data.user));
      setStatusMessage(
        route === "login" ? "Welcome back to Code Lab." : "Account created."
      );
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      setStatusMessage(error.message || "Auth failed.");
    }
  };

  const handleAssignmentCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !token) {
      setStatusMessage("Log in first.");
      navigate("/login");
      return;
    }
    try {
      const payload = {
        ...assignmentForm,
        language: "python",
      };
      const data = await apiFetch("/api/assignments", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setAssignments((prev) => [data.assignment, ...prev]);
      setAssignmentForm({ title: "", raw_instructions: "" });
      setStatusMessage("Assignment drafted with a starter step plan.");
      navigate(`/assignments/${data.assignment.id}`);
    } catch (error: any) {
      setStatusMessage(error.message || "Could not create assignment.");
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    try {
      await apiFetch(`/api/assignments/${id}`, { method: "DELETE" });
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      setStatusMessage("Assignment removed.");
      navigate("/dashboard");
    } catch (error: any) {
      setStatusMessage(error.message || "Delete failed.");
    }
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

  const navIsHidden = location.pathname === "/login";

  const brand = (
    <div className="brand" onClick={() => navigate("/dashboard")}>
      <span className="logo-dot" /> Code Lab
    </div>
  );

  const activeAssignmentFromParam = (assignmentId?: string | null) => {
    if (!assignmentId) return null;
    const idNum = Number(assignmentId);
    if (Number.isNaN(idNum)) return null;
    return assignments.find((a) => a.id === idNum) || null;
  };

  const LoginPage = () => {
    if (user) {
      return <Navigate to="/dashboard" replace />;
    }
    return (
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
  };

  const DashboardPage = () => (
    <>
      <section className="hero">
        <div>
          <h1>Dashboard</h1>
          <p className="lede">
            Draft assignments, see progress, and jump into a guided workspace. Plans stay deterministic and ready for analysis.
          </p>
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
            <div>
              <h3>Your Assignments</h3>
            </div>
            <div className="button-row">
              <Link className="primary" to="/assignments/new">
                + New Assignment
              </Link>
            </div>
          </div>
          <div className="assignment-list">
            {assignments.length === 0 && (
              <p className="muted">No assignments yet. Add one to start.</p>
            )}
            {assignments.map((assignment) => (
              <article
                key={assignment.id}
                className="assignment-card"
              >
                <div>
                  <h3>{assignment.title}</h3>
                  <p className="muted">
                    {assignment.raw_instructions.slice(0, 140)}
                    {assignment.raw_instructions.length > 140 ? "..." : ""}
                  </p>
                </div>
                <div className="card-actions">
                  <Link className="ghost" to={`/assignments/${assignment.id}`}>
                    Open
                  </Link>
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
        <div className="panel activity-card">
          <div className="panel-header">
            <div>
              <h3>Your Activity</h3>
            </div>
            <span className="chip subtle">Coming soon</span>
          </div>
          <p className="muted">
            We’ll visualize recent sessions and streaks here with a calendar heatmap. For now, ship your labs and keep the streak alive.
          </p>
        </div>
      </section>
    </>
  );

  const AssignmentOverviewPage = () => {
    const { assignmentId } = useParams();
    const currentAssignment = activeAssignmentFromParam(assignmentId);
    const orderedSteps = useMemo(() => {
      if (!currentAssignment) return [];
      return [...currentAssignment.steps].sort(
        (a, b) => a.order_index - b.order_index
      );
    }, [currentAssignment]);

    if (!currentAssignment) {
      return <Navigate to="/dashboard" replace />;
    }

    return (
      <section className="page-shell">
        <div className="breadcrumb">
          <Link className="nav-pill" to="/dashboard">
            ← Dashboard
          </Link>
          <span className="muted">Assignment overview</span>
        </div>
        <div className="panel overview-grid">
          <div>
            <p className="eyebrow">Assignment</p>
            <h2>{currentAssignment.title}</h2>
            <p className="muted">{currentAssignment.raw_instructions}</p>
            <div className="button-row top-gap">
              <Link className="ghost" to={`/assignments/${currentAssignment.id}/concepts`}>
                View concepts
              </Link>
              <Link className="primary" to={`/assignments/${currentAssignment.id}/workspace`}>
                Open coding workspace
              </Link>
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
  };

  const ConceptsPage = () => {
    const { assignmentId } = useParams();
    const currentAssignment = activeAssignmentFromParam(assignmentId);
    const concepts = useMemo(
      () => deriveConcepts(currentAssignment?.raw_instructions || ""),
      [currentAssignment]
    );

    if (!currentAssignment) {
      return <Navigate to="/dashboard" replace />;
    }

    return (
      <section className="page-shell">
        <div className="breadcrumb">
          <Link className="nav-pill" to={`/assignments/${currentAssignment.id}`}>
            ← Assignment
          </Link>
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
            <Link className="ghost" to={`/assignments/${currentAssignment.id}`}>
              Back to overview
            </Link>
            <Link className="primary" to={`/assignments/${currentAssignment.id}/workspace`}>
              Jump into workspace
            </Link>
          </div>
        </div>
      </section>
    );
  };

  const WorkspacePage = () => {
    const { assignmentId } = useParams();
    const currentAssignment = activeAssignmentFromParam(assignmentId);
    const orderedSteps = useMemo(() => {
      if (!currentAssignment) return [];
      return [...currentAssignment.steps].sort(
        (a, b) => a.order_index - b.order_index
      );
    }, [currentAssignment]);

    const generateHint = () => {
      if (!currentAssignment) return "Pick or create an assignment to get hints.";
      if (orderedSteps.length === 0) return "Add steps to start receiving targeted hints.";
      return `Focus on: ${orderedSteps[0].title}. Keep code aligned with the brief: “${currentAssignment.raw_instructions.slice(0, 140)}...”`;
    };

    if (!currentAssignment) {
      return <Navigate to="/dashboard" replace />;
    }

    return (
      <section className="page-shell">
        <div className="breadcrumb">
          <Link className="nav-pill" to={`/assignments/${currentAssignment.id}`}>
            ← Assignment overview
          </Link>
          <span className="muted">Coding workspace</span>
        </div>
        <div className="workspace-layout">
          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Instructions</p>
                <h3>{currentAssignment.title}</h3>
              </div>
              <span className="chip subtle">
                python
              </span>
            </div>
            <p className="muted">
              {currentAssignment.raw_instructions ||
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
  };

  const NewAssignmentPage = () => (
    <section className="page-shell">
      <div className="breadcrumb">
        <Link className="nav-pill" to="/dashboard">
          ← Dashboard
        </Link>
        <span className="muted">New assignment</span>
      </div>
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Create</p>
            <h2>Draft a new assignment</h2>
            <p className="muted">
              Paste the full prompt, rubric, and any inputs/outputs. We’ll keep it scoped to Python.
            </p>
          </div>
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
          <div className="button-row top-gap">
            <button type="button" className="ghost" onClick={() => navigate("/dashboard")}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Build plan
            </button>
          </div>
        </form>
      </div>
    </section>
  );

  const isAuthed = Boolean(user && token);

  const protectedRoute = (element: ReactNode) => {
    if (authChecking) {
      return (
        <div className="panel muted" style={{ marginTop: 20 }}>
          Checking session...
        </div>
      );
    }
    return isAuthed ? element : <Navigate to="/login" replace />;
  };

  return (
    <div className="page">
      {!navIsHidden && (
        <header className="top-bar">
          {brand}
          <div className="nav-links">
            <NavLink
              className={({ isActive }) =>
                `nav-button ${isActive ? "active" : ""}`
              }
              to="/dashboard"
            >
              Dashboard
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `nav-button ${isActive ? "active" : ""}`
              }
              to="/assignments/new"
            >
              New Assignment
            </NavLink>
          </div>
          <div className="user-chip">
            {user ? (
              <>
                <span className="chip subtle">{user.email}</span>
                <button
                  className="ghost"
                  onClick={() => {
                    setUser(null);
                    setToken(null);
                    setAssignments([]);
                    localStorage.removeItem("cl_token");
                    localStorage.removeItem("cl_user");
                    navigate("/login");
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <Link className="ghost" to="/login">
                Log in
              </Link>
            )}
          </div>
        </header>
      )}

      <main>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={protectedRoute(<DashboardPage />)} />
          <Route
            path="/assignments/new"
            element={protectedRoute(<NewAssignmentPage />)}
          />
          <Route
            path="/assignments/:assignmentId"
            element={protectedRoute(<AssignmentOverviewPage />)}
          />
          <Route
            path="/assignments/:assignmentId/concepts"
            element={protectedRoute(<ConceptsPage />)}
          />
          <Route
            path="/assignments/:assignmentId/workspace"
            element={protectedRoute(<WorkspacePage />)}
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      {statusMessage && <div className="toast">{statusMessage}</div>}
    </div>
  );
}

export default App;
