import { Link, Navigate, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useAssignments, type LearningObjective } from "../hooks/useAssignments";
import { AssignmentProgressNav } from "../components/AssignmentProgressNav";

type Props = {
  onNotify: (msg: string) => void;
};

export function LearningObjectivesPage({ onNotify }: Props) {
  const { assignmentId } = useParams();
  const { getById } = useAssignments();

  const assignment = useMemo(() => {
    if (!assignmentId) return null;
    const numeric = Number(assignmentId);
    if (Number.isNaN(numeric)) return null;
    return getById(numeric);
  }, [assignmentId, getById]);

  const objectives = useMemo(() => {
    const storedObjectives = assignment?.learning_objectives || [];
    return [...storedObjectives].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );
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
        <span className="muted">Learning objectives</span>
        <div className="progress-inline">
          <AssignmentProgressNav
            assignmentId={assignment.id}
            currentStage="objectives"
            maxStageUnlocked={assignment.max_stage_unlocked ?? 0}
          />
        </div>
      </div>
      <div className="panel">
        <div className="panel-header objective-header">
          <div>
            <h2>Learning objectives for this assignment</h2>
            <p className="muted">
              Derived deterministically from your instructions so you can prep before coding.
            </p>
          </div>
          <span className="chip subtle">{objectives.length} objectives</span>
        </div>
        {objectives.length === 0 ? (
          <div className="instruction-box">
            <p className="muted">
              No learning objectives are available for this assignment yet. Please regenerate or try again later.
            </p>
          </div>
        ) : (
          <div className="objective-grid">
            {objectives.map((objective) => (
              <article key={objective.title} className="objective-card">
                <span className="objective-tag">{objective.title}</span>
                <p>{objective.summary}</p>
                {objective.why_it_matters && (
                  <p className="muted small">
                    <strong>Why it matters:</strong> {objective.why_it_matters}
                  </p>
                )}
                {objective.used_in_this_assignment && (
                  <p className="muted small">
                    <strong>Use it here:</strong> {objective.used_in_this_assignment}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
        <div className="button-row top-gap">
          <Link className="ghost" to={`/assignments/${assignment.id}`}>
            Back to overview
          </Link>
          <Link className="primary" to={`/assignments/${assignment.id}/steps`}>
            View steps
          </Link>
        </div>
      </div >
    </section >
  );
}
