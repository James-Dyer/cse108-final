import { useEffect, useMemo, useState, type ReactElement } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { AssignmentsProvider } from "./hooks/useAssignments";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { AssignmentNewPage } from "./pages/AssignmentNewPage";
import { AssignmentOverviewPage } from "./pages/AssignmentOverviewPage";
import { ConceptsPage } from "./pages/ConceptsPage";
import { StepsPage } from "./pages/StepsPage";
import { WorkspacePage } from "./pages/WorkspacePage";
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
  const { user, token, logout, loading } = useAuth();
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
            <NavLink className={({ isActive }) => `nav-button ${isActive ? "active" : ""}`} to="/dashboard">
              Dashboard
            </NavLink>
            <NavLink className={({ isActive }) => `nav-button ${isActive ? "active" : ""}`} to="/assignments/new">
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
