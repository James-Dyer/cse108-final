import { useEffect, useMemo, useState, type ReactElement } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { AssignmentsProvider, useAssignments } from "./hooks/useAssignments";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { AssignmentNewPage } from "./pages/AssignmentNewPage";
import { AssignmentOverviewPage } from "./pages/AssignmentOverviewPage";
import { ConceptsPage } from "./pages/ConceptsPage";
import { StepsPage } from "./pages/StepsPage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { STAGES, STAGE_KEYS, getStageIndexFromPath } from "./lib/stages";
import "./styles/theme.css";
import "./styles/layout.css";
import "./styles/dashboard.css";
import "./styles/assignment.css";
import "./styles/workspace.css";

type ToastProps = {
  message: string;
};

function Toast({ message }: ToastProps) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}

function Layout() {
  const { user, token, loading } = useAuth();
  const { getById, updateProgress } = useAssignments();
  const location = useLocation();
  const navigate = useNavigate();
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 7000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const isAuthed = useMemo(() => Boolean(user && token), [user, token]);
  const assignmentIdMatch = location.pathname.match(/\/assignments\/(\d+)/);
  const currentAssignmentId = assignmentIdMatch ? Number(assignmentIdMatch[1]) : null;
  const assignment = currentAssignmentId ? getById(currentAssignmentId) : null;
  const currentStageIndex = useMemo(() => {
    if (!currentAssignmentId) return -1;
    return getStageIndexFromPath(currentAssignmentId, location.pathname);
  }, [currentAssignmentId, location.pathname]);

  useEffect(() => {
    if (!assignment || currentStageIndex < 0) return;
    const maxUnlocked = assignment.max_stage_unlocked ?? 0;
    const maxAllowedIndex = Math.min(STAGE_KEYS.length - 1, maxUnlocked + 1);
    if (currentStageIndex > maxAllowedIndex) {
      const fallbackStage = STAGES[maxAllowedIndex];
      navigate(fallbackStage.toPath(assignment.id), { replace: true });
    }
  }, [assignment, currentStageIndex, navigate]);

  useEffect(() => {
    if (!assignment || currentStageIndex < 0) return;
    const currentUnlocked = assignment.max_stage_unlocked ?? 0;
    const maxAllowedIndex = Math.min(STAGE_KEYS.length - 1, currentUnlocked + 1);
    if (currentStageIndex > maxAllowedIndex) return;
    if (currentStageIndex > currentUnlocked) {
      updateProgress(assignment.id, currentStageIndex).catch(() => {
        // swallow errors; UI can still function with existing unlocked state
      });
    }
  }, [assignment, currentStageIndex, updateProgress]);

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
      <header className="topbar">
        <div
          className="brand"
          role="button"
          tabIndex={0}
          onClick={() => navigate("/dashboard")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              navigate("/dashboard");
            }
          }}
        >
          <span className="logo-dot" aria-hidden="true" />
          Code Lab
        </div>
      </header>
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
