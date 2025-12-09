import { Link, Navigate, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useAssignments } from "../hooks/useAssignments";
import { StepsList } from "../components/StepsList";

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

  const orderedSteps = useMemo(() => {
    if (!assignment) return [];
    return [...assignment.steps].sort((a, b) => a.order_index - b.order_index);
  }, [assignment]);

  if (!assignment) {
    onNotify("Assignment not found.");
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
          <h2>{assignment.title}</h2>
          <p className="muted">{assignment.raw_instructions}</p>
          <div className="button-row top-gap">
            <Link className="ghost" to={`/assignments/${assignment.id}/concepts`}>
              View concepts
            </Link>
            <Link className="primary" to={`/assignments/${assignment.id}/workspace`}>
              Open coding workspace
            </Link>
          </div>
        </div>
        <div className="instruction-box">
          <h4>Step plan</h4>
          <StepsList steps={orderedSteps} />
        </div>
      </div>
    </section>
  );
}
