import { useEffect, useMemo, useState, type ReactElement } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ProgressBar, Step } from "react-step-progress-bar";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { AssignmentsProvider, useAssignments } from "./hooks/useAssignments";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { AssignmentNewPage } from "./pages/AssignmentNewPage";
import { AssignmentOverviewPage } from "./pages/AssignmentOverviewPage";
import { ConceptsPage } from "./pages/ConceptsPage";
import { StepsPage } from "./pages/StepsPage";
import { WorkspacePage } from "./pages/WorkspacePage";
import "react-step-progress-bar/styles.css";
import "./styles/theme.css";
import "./styles/layout.css";
import "./styles/dashboard.css";
import "./styles/assignment.css";
import "./styles/workspace.css";

type ToastProps = {
  message: string;
};

type ProgressStage = {
  key: "overview" | "concepts" | "steps" | "code";
  label: string;
  path: string;
  enabled: boolean;
  active: boolean;
};

const STAGE_KEYS: ProgressStage["key"][] = ["overview", "concepts", "steps", "code"];

function Toast({ message }: ToastProps) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}

function Layout() {
  const { user, token, logout, loading } = useAuth();
  const { getById, updateProgress } = useAssignments();
  const location = useLocation();
  const navigate = useNavigate();
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 7000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const navIsHidden = location.pathname === "/login";
  const isAuthed = useMemo(() => Boolean(user && token), [user, token]);
  const assignmentIdMatch = location.pathname.match(/\/assignments\/(\d+)/);
  const currentAssignmentId = assignmentIdMatch ? Number(assignmentIdMatch[1]) : null;
  const assignment = currentAssignmentId ? getById(currentAssignmentId) : null;
  const currentStageIndex = useMemo(() => {
    if (!currentAssignmentId) return -1;
    const stageIndexFromPath = STAGE_KEYS.findIndex((stageKey) => {
      switch (stageKey) {
        case "overview":
          return location.pathname === `/assignments/${currentAssignmentId}`;
        case "concepts":
          return location.pathname.startsWith(`/assignments/${currentAssignmentId}/concepts`);
        case "steps":
          return location.pathname.startsWith(`/assignments/${currentAssignmentId}/steps`);
        case "code":
          return location.pathname.startsWith(`/assignments/${currentAssignmentId}/workspace`);
        default:
          return false;
      }
    });
    return stageIndexFromPath;
  }, [currentAssignmentId, location.pathname]);

  useEffect(() => {
    if (!assignment || currentStageIndex < 0) return;
    const currentUnlocked = assignment.max_stage_unlocked ?? 0;
    if (currentStageIndex > currentUnlocked) {
      updateProgress(assignment.id, currentStageIndex).catch(() => {
        // swallow errors; UI can still function with existing unlocked state
      });
    }
  }, [assignment, currentStageIndex, updateProgress]);

  const stages: ProgressStage[] | null = useMemo(() => {
    if (!assignment || !currentAssignmentId) return null;
    const hasSteps = Array.isArray(assignment.steps) && assignment.steps.length > 0;
    const base = `/assignments/${currentAssignmentId}`;
    const path = location.pathname;
    const unlockedThrough = assignment.max_stage_unlocked ?? 0; // overview unlocked by default
    const unlockThreshold = Math.min(unlockedThrough + 1, STAGE_KEYS.length - 1);
    const isUnlocked = (index: number) => index === 0 || index <= unlockThreshold;
    const stageList: ProgressStage[] = [
      { key: "overview", label: "Overview", path: base, enabled: true, active: path === base },
      {
        key: "concepts",
        label: "Study",
        path: `${base}/concepts`,
        enabled: isUnlocked(1),
        active: path.startsWith(`${base}/concepts`),
      },
      {
        key: "steps",
        label: "Plan",
        path: `${base}/steps`,
        enabled: isUnlocked(2) && hasSteps,
        active: path.startsWith(`${base}/steps`),
      },
      {
        key: "code",
        label: "Code",
        path: `${base}/workspace`,
        enabled: isUnlocked(3) && hasSteps,
        active: path.startsWith(`${base}/workspace`),
      },
    ];
    return stageList;
  }, [assignment, currentAssignmentId, location.pathname]);

  const progressPercent = useMemo(() => {
    if (!stages || stages.length <= 1) return 100;
    const unlocked = assignment?.max_stage_unlocked ?? 0;
    const furthestStage = Math.max(unlocked, currentStageIndex);
    const percent = (furthestStage / (stages.length - 1)) * 100;
    return Math.min(Math.max(percent, 0), 100);
  }, [assignment?.max_stage_unlocked, currentStageIndex, stages]);

  const protectedRoute = (element: ReactElement) => {
    if (loading) {
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
          <div className="brand" onClick={() => navigate("/dashboard")}>
            <span className="logo-dot" /> Code Lab
          </div>
          <div className="nav-links">
            {stages && (
              <div className="progress-nav">
                <ProgressBar
                  percent={progressPercent}
                  filledBackground="linear-gradient(90deg, var(--accent), var(--accent-2))"
                  unfilledBackground="rgba(255, 255, 255, 0.08)"
                  height={8}
                  className="progress-bar"
                >
                  {stages.map((stage, idx) => {
                    const isLocked = !stage.enabled;
                    return (
                      <Step key={stage.key} transition="scale">
                        {({ accomplished }) => {
                          const classes = [
                            "progress-step",
                            stage.active ? "active" : "",
                            isLocked ? "disabled" : "",
                            accomplished ? "complete" : "",
                          ]
                            .filter(Boolean)
                            .join(" ");
                          return (
                            <button
                              className={classes}
                              onClick={() => !isLocked && navigate(stage.path)}
                              disabled={isLocked}
                              aria-label={stage.label}
                            >
                              <span className="progress-dot">{idx + 1}</span>
                              <span className="progress-label">{stage.label}</span>
                            </button>
                          );
                        }}
                      </Step>
                    );
                  })}
                </ProgressBar>
              </div>
            )}
          </div>
          <div className="user-chip">
            {user ? (
              <>
                <span className="chip subtle">{user.email}</span>
                <button
                  className="ghost"
                  onClick={() => {
                    logout();
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
          <Route path="/login" element={<LoginPage onNotify={setToast} />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={protectedRoute(<DashboardPage onNotify={setToast} />)} />
          <Route path="/assignments/new" element={protectedRoute(<AssignmentNewPage onNotify={setToast} />)} />
          <Route path="/assignments/:assignmentId" element={protectedRoute(<AssignmentOverviewPage onNotify={setToast} />)} />
          <Route path="/assignments/:assignmentId/concepts" element={protectedRoute(<ConceptsPage onNotify={setToast} />)} />
          <Route path="/assignments/:assignmentId/steps" element={protectedRoute(<StepsPage onNotify={setToast} />)} />
          <Route path="/assignments/:assignmentId/workspace" element={protectedRoute(<WorkspacePage onNotify={setToast} />)} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      <Toast message={toast} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AssignmentsProvider>
        <Layout />
      </AssignmentsProvider>
    </AuthProvider>
  );
}
