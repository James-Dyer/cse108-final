import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAssignments } from "../hooks/useAssignments";
import { useActivity } from "../hooks/useActivity";
import { useAuth } from "../hooks/useAuth";
import { AssignmentCard } from "../components/AssignmentCard";
import { ActivityCalendar } from "../components/ActivityCalendar";

type Props = {
  onNotify: (msg: string) => void;
};

export function DashboardPage({ onNotify }: Props) {
  const { assignments, remove } = useAssignments();
  const { activity, setDayActive, loading: activityLoading } = useActivity();
  const { user, logout, changePassword } = useAuth();
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const handleDelete = async (id: number) => {
    try {
      await remove(id);
      onNotify("Assignment removed.");
    } catch (error: any) {
      onNotify(error.message || "Delete failed.");
    }
  };

  const activityHeadline = useMemo(() => {
    const totalActive = Object.values(activity || {}).filter(Boolean).length;
    return `${totalActive} active day${totalActive === 1 ? "" : "s"}`;
  }, [activity]);

  const userEmail = user?.email ?? "student@example.com";
  const initials = useMemo(
    () => userEmail.slice(0, 2).toUpperCase(),
    [userEmail]
  );

  const handleLogout = () => {
    logout();
    onNotify("Logged out.");
  };

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
  };

  const handleChangePassword = () => {
    setChangingPassword((prev) => !prev);
    setPasswordError("");
    if (changingPassword) {
      resetPasswordForm();
    }
  };

  const handleSubmitPassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError("");

    if (!currentPassword || !newPassword) {
      setPasswordError("Enter your current password and a new one.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password entries must match.");
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      resetPasswordForm();
      setChangingPassword(false);
      onNotify("Password updated.");
    } catch (error: any) {
      setPasswordError(error.message || "Could not change password right now.");
    } finally {
      setSavingPassword(false);
    }
  };

  useEffect(() => {
    if (activityLoading) return;
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (activity?.[iso]) return;
    setDayActive(iso, true).catch(() => {
      // ignore failure; calendar stays as-is
    });
  }, [activity, activityLoading, setDayActive]);

  return (
    <>
      <section className="hero">
        <div>
          <h1>Dashboard</h1>
          <p className="lede">
            Draft assignments, plan ahead, and jump into a guided workspace.
          </p>
        </div>
      </section>

      <section className="grid dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Recent Assignments</h3>
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
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>

        <div className="dashboard-right">
          <div className="panel profile-card">
            <div className="profile-top">
              <div className="profile-avatar" aria-hidden="true">
                {initials}
              </div>
              <div className="profile-meta">
                <p className="muted profile-label">Logged in as</p>
                <p className="profile-email">{userEmail}</p>
              </div>
            </div>
            <div className="profile-actions">
              <button className="ghost" onClick={handleChangePassword}>
                {changingPassword ? "Close password form" : "Change password"}
              </button>
              <button className="ghost" onClick={handleLogout}>
                Log out
              </button>
            </div>
            {changingPassword && (
              <div className="password-form">
                <form className="form" onSubmit={handleSubmitPassword}>
                  <div className="password-grid">
                    <label>
                      Current password
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        autoComplete="current-password"
                      />
                    </label>
                    <label>
                      New password
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        autoComplete="new-password"
                      />
                    </label>
                    <label className="full-span">
                      Confirm new password
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        autoComplete="new-password"
                      />
                    </label>
                  </div>
                  {passwordError && <p className="password-error">{passwordError}</p>}
                  <div className="button-row">
                    <button type="submit" className="primary" disabled={savingPassword}>
                      {savingPassword ? "Saving..." : "Save new password"}
                    </button>
                    <button type="button" className="ghost" onClick={handleChangePassword}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          <div className="panel activity-card">
            <div className="panel-header">
              <div>
                <h3>Your activity</h3>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  {activityHeadline}
                </p>
              </div>
            </div>
            <ActivityCalendar
              activity={activity}
              months={6}
              themeOverrides={{
                activeColor: "#3cf5d0",
                hoverColor: "rgba(60, 245, 208, 0.22)",
              }}
            />
          </div>
        </div>
      </section>
    </>
  );
}
