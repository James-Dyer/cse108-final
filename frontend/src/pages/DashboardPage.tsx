import { Link } from "react-router-dom";
import { useAssignments } from "../hooks/useAssignments";
import { StatusTile } from "../components/StatusTile";
import { AssignmentCard } from "../components/AssignmentCard";

type Props = {
  onNotify: (msg: string) => void;
  runtimeStatus?: "idle" | "loading" | "ready" | "error";
};

export function DashboardPage({
  onNotify,
  runtimeStatus = "ready",
}: Props) {
  const { assignments, remove } = useAssignments();

  const handleDelete = async (id: number) => {
    try {
      await remove(id);
      onNotify("Assignment removed.");
    } catch (error: any) {
      onNotify(error.message || "Delete failed.");
    }
  };

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
            </div>
            <span className="chip subtle">Coming soon</span>
          </div>
          <p className="muted">
            We’ll visualize recent sessions and streaks here with a calendar heatmap. For now, ship your labs and keep the streak alive.
          </p>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Your Assignments</h3>
            </div>
            <div className="button-row">
              <span className="chip">{assignments.length} active</span>
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
