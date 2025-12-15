import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAssignments } from "../hooks/useAssignments";
import { StepsList } from "../components/StepsList";
import { AssignmentProgressNav } from "../components/AssignmentProgressNav";

type Props = {
  onNotify: (msg: string) => void;
};

const DEFAULT_CODE = `# Write Python here

def main():
    sample = [1, 2, 3]
    doubled = [x * 2 for x in sample]
    print("Doubled values:", doubled)

if __name__ == "__main__":
    main()
`;

export function WorkspacePage({ onNotify }: Props) {
  const { assignmentId } = useParams();
  const { getById, updateCode } = useAssignments();
  const [pyodideStatus, setPyodideStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [pyodide, setPyodide] = useState<any>(null);
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [dragging, setDragging] = useState<"col" | "row" | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [codeHeight, setCodeHeight] = useState(350);
  const [isNarrow, setIsNarrow] = useState(false);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [lastSavedCode, setLastSavedCode] = useState(DEFAULT_CODE);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "dirty" | "saving" | "saved" | "error"
  >("idle");
  const [consoleText, setConsoleText] = useState("Runtime warming up...");
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const codeStackRef = useRef<HTMLDivElement | null>(null);

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

  const overviewText =
    (assignment?.overview || "").trim() ||
    (assignment?.raw_instructions || "").trim();
  const overviewClass = assignment?.overview?.trim()
    ? "muted"
    : "muted pre-wrap";

  useEffect(() => {
    if (!assignment) return;
    const initialCode = assignment.code ?? DEFAULT_CODE;
    setCode(initialCode);
    setLastSavedCode(initialCode);
    setSaveStatus("saved");
  }, [assignment?.id, assignment?.code]);

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
    if (!assignment) return;
    if (code === lastSavedCode) {
      if (saveStatus !== "saved" && saveStatus !== "idle") {
        setSaveStatus("saved");
      }
      return;
    }
    const timeout = window.setTimeout(() => {
      if (code === lastSavedCode) return;
      setSaveStatus("saving");
      updateCode(assignment.id, code)
        .then(() => {
          setLastSavedCode(code);
          setSaveStatus("saved");
          window.setTimeout(() => setSaveStatus("idle"), 1200);
        })
        .catch((error: any) => {
          console.error(error);
          setSaveStatus("error");
          onNotify("Auto-save failed. Check your connection and try again.");
        });
    }, 1500);
    return () => window.clearTimeout(timeout);
  }, [assignment?.id, code, lastSavedCode, updateCode, onNotify, saveStatus]);

  useEffect(() => {
    if (!isHintOpen) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsHintOpen(false);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isHintOpen]);

  const generateHint = () => {
    if (!assignment) return "Pick or create an assignment to get hints.";
    if (orderedSteps.length === 0) return "Add steps to start receiving targeted hints.";
    return `Focus on: ${orderedSteps[0].title}. Keep code aligned with the brief: “${assignment.raw_instructions.slice(0, 140)}...”`;
  };

  const hintText = useMemo(() => generateHint(), [assignment, orderedSteps]);

  const runCode = async () => {
    if (!pyodide || pyodideStatus !== "ready") {
      setConsoleText("Runtime not ready yet.");
      return;
    }
    let outputBuffer = "";
    const appendOutput = (text: string) => {
      outputBuffer += text;
      setConsoleText(outputBuffer);
    };
    let prevStdout: any;
    let prevStderr: any;
    let stdoutHooked = false;
    let stderrHooked = false;
    try {
      setConsoleText("");
      prevStdout = pyodide.setStdout({ batched: appendOutput });
      prevStderr = pyodide.setStderr({ batched: appendOutput });
      stdoutHooked = true;
      stderrHooked = true;
      const result = await pyodide.runPythonAsync(code);
      const hasPrinted = outputBuffer.trim().length > 0;
      if (hasPrinted && result != null) {
        appendOutput(`${outputBuffer.endsWith("\n") ? "" : "\n"}${String(result)}`);
      } else if (!hasPrinted) {
        setConsoleText(String(result ?? "Finished without output."));
      }
    } catch (error: any) {
      setConsoleText(error.message || String(error));
    } finally {
      if (stdoutHooked) pyodide.setStdout(prevStdout);
      if (stderrHooked) pyodide.setStderr(prevStderr);
    }
  };

  const resetRuntime = () => {
    setConsoleText("Cleared console. Runtime still loaded.");
  };

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      if (!dragging) return;
      if (dragging === "col") {
        const layoutRect = layoutRef.current?.getBoundingClientRect();
        if (!layoutRect) return;
        const handleSize = 10;
        const minLeft = 240;
        const minRight = 440;
        const proposed = event.clientX - layoutRect.left;
        const maxLeft = layoutRect.width - minRight - handleSize;
        const nextWidth = Math.min(Math.max(proposed, minLeft), Math.max(minLeft, maxLeft));
        setSidebarWidth(nextWidth);
      } else if (dragging === "row") {
        const codeRect = codeStackRef.current?.getBoundingClientRect();
        if (!codeRect) return;
        const handleSize = 10;
        const minTop = 260;
        const minBottom = 200;
        const proposed = event.clientY - codeRect.top;
        const maxTop = codeRect.height - minBottom - handleSize;
        const nextHeight = Math.min(Math.max(proposed, minTop), Math.max(minTop, maxTop));
        setCodeHeight(nextHeight);
      }
      event.preventDefault();
    };

    const handleUp = () => {
      if (dragging) setDragging(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging]);

  useEffect(() => {
    const setSize = () => {
      setIsNarrow(window.innerWidth <= 1040);
    };
    setSize();
    window.addEventListener("resize", setSize);
    return () => window.removeEventListener("resize", setSize);
  }, []);

  if (!assignment) {
    onNotify("Assignment not found.");
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <section className="page-shell workspace-shell">
      <div className="breadcrumb">
        <Link className="nav-pill" to="/dashboard">
          ← Dashboard
        </Link>
        <span className="muted">Coding workspace</span>
        <div className="progress-inline">
          <AssignmentProgressNav
            assignmentId={assignment.id}
            currentStage="code"
            maxStageUnlocked={assignment.max_stage_unlocked ?? 0}
          />
        </div>
      </div>
      <div
        className="workspace-layout"
        ref={layoutRef}
        style={{
          gridTemplateColumns: isNarrow ? "1fr" : `${sidebarWidth}px 10px 1fr`,
        }}
      >
        <div className="panel window-panel">
          <div className="window-header">
            <div className="window-title">
              <span className="window-icon assignment-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M6 3.5a2 2 0 0 1 2-2h3.172a2 2 0 0 1 1.414.586l2.828 2.828A2 2 0 0 1 16 6.328V16.5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-13Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13.5 2.5V4a2 2 0 0 0 2 2h1.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8.5 9.5h5M8.5 12.5h5M8.5 6.5h2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <p className="window-title-text">{assignment.title}</p>
            </div>
            <button
              className="ghost hint-button"
              onClick={() => setIsHintOpen(true)}
              aria-label="Show hint"
            >
              <span className="hint-icon" aria-hidden="true">?</span>
              <span>Hint</span>
            </button>
          </div>
          <div className="window-body">
            <p className={overviewClass}>
              {overviewText ||
                "Pick an assignment to view its prompt, steps, and hints."}
            </p>
            <h4>Plan</h4>
            <StepsList steps={orderedSteps} showDescription layout="cascade" />
          </div>
        </div>

        {!isNarrow && (
          <div
            className={`splitter splitter-vertical${dragging === "col" ? " active" : ""}`}
            onMouseDown={(event) => {
              event.preventDefault();
              setDragging("col");
            }}
            role="presentation"
          />
        )}

        <div
          className="code-stack"
          ref={codeStackRef}
          style={{ gridTemplateRows: `${codeHeight}px 10px 1fr` }}
        >
          <div className="panel window-panel code-panel">
            <div className="window-header">
              <div className="window-title-row">
                <div className="window-title">
                  <span className="window-icon code-icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M8 5 4 10l4 5M12 5l4 5-4 5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <p className="window-title-text">Code</p>
                </div>
                <div className={`autosave-pill ${saveStatus}`}>
                  <span className="autosave-icon" aria-hidden="true">
                    {saveStatus === "saving" ? (
                      <span className="autosave-spinner" />
                    ) : saveStatus === "error" ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 17h.01M12 9v4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : saveStatus === "dirty" ? (
                      <span className="autosave-dot" />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M16.25 5.75 8.5 13.5 5.75 10.75"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="autosave-label">
                    {saveStatus === "saving"
                      ? "Saving..."
                      : saveStatus === "dirty"
                        ? "Saving..."
                        : saveStatus === "error"
                          ? "Save failed"
                          : "Saved"}
                  </span>
                </div>
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
            <div className="window-body">
              <div className="editor">
                <CodeMirror
                  value={code}
                  theme={oneDark}
                  extensions={[python()]}
                  basicSetup={{ lineNumbers: true, highlightActiveLine: true }}
                  onChange={(value) => {
                    setCode(value);
                    setSaveStatus(
                      value === lastSavedCode ? "saved" : "dirty"
                    );
                  }}
                  height="100%"
                  style={{ height: "100%" }}
                />
              </div>
            </div>
          </div>

          <div
            className={`splitter splitter-horizontal${dragging === "row" ? " active" : ""}`}
            onMouseDown={(event) => {
              event.preventDefault();
              setDragging("row");
            }}
            role="presentation"
          />

          <div className="panel window-panel console-panel">
            <div className="window-header">
              <div className="window-title">
                <span className="window-icon output-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M4.5 4.5h11a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M7 8.5 9.5 10 7 11.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10.5 11.5H13"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <p className="window-title-text">Output</p>
              </div>
              <button className="ghost" onClick={resetRuntime}>
                Reset console
              </button>
            </div>
            <div className="window-body console-body">
              <pre className="console-output">{consoleText}</pre>
            </div>
          </div>
        </div>
      </div>

      {isHintOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setIsHintOpen(false)}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Assignment hint"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">Hint</h3>
              <button
                className="ghost"
                onClick={() => setIsHintOpen(false)}
                aria-label="Close hint modal"
              >
                Close
              </button>
            </div>
            <p className="muted">{hintText}</p>
            <div className="button-row top-gap">
              <button className="ghost" onClick={() => onNotify(hintText)}>
                Send hint to toast
              </button>
              <button className="primary" onClick={() => setIsHintOpen(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
