import { Link, Navigate, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useAssignments } from "../hooks/useAssignments";
import { AssignmentProgressNav } from "../components/AssignmentProgressNav";

type Props = {
  onNotify: (msg: string) => void;
};

export function AssignmentOverviewPage({ onNotify }: Props) {
  const { assignmentId } = useParams();
  const { getById } = useAssignments();

  const assignment = useMemo(() => {
    if (!assignmentId) return null;
    const numeric = Number(assignmentId);
    if (Number.isNaN(numeric)) return null;
    return getById(numeric);
  }, [assignmentId, getById]);

  if (!assignment) {
    onNotify("Assignment not found.");
    return <Navigate to="/dashboard" replace />;
  }

  const overviewText = assignment.overview?.trim() || "";
  const fallbackText = assignment.raw_instructions?.trim() || "";
  const displayText = overviewText || fallbackText;
  const displayClass = overviewText ? "pre-wrap" : "pre-wrap muted";

  return (
    <section className="page-shell">
      <div className="breadcrumb">
        <Link className="nav-pill" to="/dashboard">
          ← Dashboard
        </Link>
        <span className="muted">Assignment overview</span>
        <div className="progress-inline">
          <AssignmentProgressNav
            assignmentId={assignment.id}
            currentStage="overview"
            maxStageUnlocked={assignment.max_stage_unlocked ?? 0}
          />
        </div>
      </div>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Assignment overview</h2>
            <p className="muted">{assignment.title}</p>
          </div>
        </div>
        <div className="assignment-brief">
          <p className={displayClass}>
            {displayText || "No overview available yet."}
          </p>
        </div>
        <div className="button-row top-gap">
          <Link className="primary" to={`/assignments/${assignment.id}/learning-objectives`}>
            View learning objectives
          </Link>
        </div>
      </div>
    </section>
  );
}
