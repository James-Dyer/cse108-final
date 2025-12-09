import { Link, Navigate, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useAssignments } from "../hooks/useAssignments";
import { StepsList } from "../components/StepsList";

type Props = {
  onNotify: (msg: string) => void;
};

export function StepsPage({ onNotify }: Props) {
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
        <Link className="nav-pill" to={`/assignments/${assignment.id}/concepts`}>
          ← Concepts
        </Link>
        <span className="muted">Step plan</span>
      </div>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Step-by-step flow</h2>
            <p className="muted">{assignment.title}</p>
          </div>
          <span className="chip subtle">{orderedSteps.length} steps</span>
        </div>
        <StepsList steps={orderedSteps} />
        <div className="button-row top-gap">
          <Link className="ghost" to={`/assignments/${assignment.id}/concepts`}>
            Back to concepts
          </Link>
          <Link className="primary" to={`/assignments/${assignment.id}/workspace`}>
            Open coding workspace
          </Link>
        </div>
      </div>
    </section>
  );
}
