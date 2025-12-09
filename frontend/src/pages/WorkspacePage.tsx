import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAssignments } from "../hooks/useAssignments";
import { StepsList } from "../components/StepsList";

type Props = {
  onNotify: (msg: string) => void;
};

export function WorkspacePage({ onNotify }: Props) {
  const { assignmentId } = useParams();
  const { getById } = useAssignments();
  const [pyodideStatus, setPyodideStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [pyodide, setPyodide] = useState<any>(null);
  const [code, setCode] = useState(
    `# Write Python here\n\ndef main():\n    sample = [1, 2, 3]\n    doubled = [x * 2 for x in sample]\n    print("Doubled values:", doubled)\n\nif __name__ == "__main__":\n    main()\n`
  );
  const [consoleText, setConsoleText] = useState("Runtime warming up...");

  const assignment = useMemo(() => {
    if (!assignmentId) return null;
    const numeric = Number(assignmentId);
    if (Number.isNaN(numeric)) return null;
    return getById(numeric);
  }, [assignmentId, getById]);

  const orderedSteps = useMemo(() => {
    if (!assignment) return [];
    return [...assignment.steps].sort((a, b) => a.order_index - b.order_index);
  }, [assignment]);

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

  const generateHint = () => {
    if (!assignment) return "Pick or create an assignment to get hints.";
    if (orderedSteps.length === 0) return "Add steps to start receiving targeted hints.";
    return `Focus on: ${orderedSteps[0].title}. Keep code aligned with the brief: “${assignment.raw_instructions.slice(0, 140)}...”`;
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

  if (!assignment) {
    onNotify("Assignment not found.");
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <section className="page-shell">
      <div className="breadcrumb">
        <Link className="nav-pill" to={`/assignments/${assignment.id}/steps`}>
          ← Steps
        </Link>
        <span className="muted">Coding workspace</span>
      </div>
      <div className="workspace-layout">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Assignment instructions</h3>
              <p className="muted">{assignment.title}</p>
            </div>
            <span className="chip subtle">python</span>
          </div>
          <p className="muted">
            {assignment.raw_instructions ||
              "Pick an assignment to view its prompt, steps, and hints."}
          </p>
          <h4>Plan</h4>
          <StepsList steps={orderedSteps} />
          <div className="side-card">
            <h4>Hint</h4>
            <p className="muted">{generateHint()}</p>
            <div className="button-row top-gap">
              <button className="ghost" onClick={() => onNotify(generateHint())}>
                Refresh hint
              </button>
            </div>
          </div>
        </div>

        <div className="panel code-panel">
          <div className="panel-header">
            <div>
              <h2>Python editor & console</h2>
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
}
