import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAssignments } from "../hooks/useAssignments";
import { useActivity } from "../hooks/useActivity";
import { StatusTile } from "../components/StatusTile";
import { AssignmentCard } from "../components/AssignmentCard";
import { ActivityCalendar } from "../components/ActivityCalendar";

type Props = {
  onNotify: (msg: string) => void;
  runtimeStatus?: "idle" | "loading" | "ready" | "error";
};

export function DashboardPage({
  onNotify,
  runtimeStatus = "ready",
}: Props) {
  const { assignments, remove } = useAssignments();
  const { activity, loading: activityLoading, setDayActive } = useActivity();
  const [pendingDate, setPendingDate] = useState<string | null>(null);

  const handleDelete = async (id: number) => {
    try {
      await remove(id);
      onNotify("Assignment removed.");
    } catch (error: any) {
      onNotify(error.message || "Delete failed.");
    }
  };

  const handleToggleDay = async (date: string, nextActive: boolean) => {
    setPendingDate(date);
    try {
      await setDayActive(date, nextActive);
      onNotify(nextActive ? "Marked day as active." : "Marked day as inactive.");
    } catch (error: any) {
      onNotify(error.message || "Unable to update day.");
    } finally {
      setPendingDate(null);
    }
  };

  const activityHeadline = useMemo(() => {
    const totalActive = Object.values(activity || {}).filter(Boolean).length;
    return `${totalActive} active day${totalActive === 1 ? "" : "s"} logged`;
  }, [activity]);

  return (
    <>
      <section className="hero">
        <div>
          <h1>Dashboard</h1>
          <p className="lede">
            Draft assignments, see progress, and jump into a guided workspace. Plans stay deterministic and ready for analysis.
          </p>
        </div>
        <StatusTile status={runtimeStatus} />
      </section>

      <section className="grid dashboard-grid">
        <div className="panel activity-card">
          <div className="panel-header">
            <div>
              <h3>Your activity</h3>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                Last 6 months · {activityHeadline}
              </p>
            </div>
            <span className="chip subtle">
              {activityLoading ? "Syncing..." : "Daily check-in"}
            </span>
          </div>
          <p className="muted" style={{ marginTop: 0 }}>
            We mark today as active when you land here. Tap any tile to toggle activity and keep your streak honest.
          </p>
          <ActivityCalendar
            activity={activity}
            months={6}
            onToggleDay={handleToggleDay}
            themeOverrides={{
              activeColor: "#3cf5d0",
              hoverColor: "rgba(60, 245, 208, 0.22)",
            }}
          />
          {pendingDate && (
            <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              Updating {pendingDate}...
            </p>
          )}
        </div>

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
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
