import { Link, Navigate, useParams } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { useAssignments, type LearningObjective } from "../hooks/useAssignments";
import { AssignmentProgressNav } from "../components/AssignmentProgressNav";

type Props = {
  onNotify: (msg: string) => void;
};

export function LearningObjectivesPage({ onNotify }: Props) {
  const { assignmentId } = useParams();
  const { getById, loading: assignmentsLoading, refresh } = useAssignments();

  const numericId = assignmentId ? Number(assignmentId) : NaN;
  const assignment =
    assignmentId && !Number.isNaN(numericId) ? getById(numericId) : null;

  const objectives = useMemo(() => {
    const storedObjectives = assignment?.learning_objectives || [];
    return [...storedObjectives].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );
  }, [assignment]);

  if (!assignment && assignmentsLoading) {
    return (
      <section className="page-shell">
        <div className="panel muted" style={{ marginTop: 20 }}>
          Loading assignment...
        </div>
      </section>
    );
  }

  if (!assignment) {
    onNotify("Assignment not found.");
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    if (!assignmentId || Number.isNaN(numericId)) return;
    if (objectives.length > 0) return;
    if (!assignment?.raw_instructions?.trim()) return;

    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;

    const poll = async () => {
      attempts += 1;
      try {
        await refresh();
      } catch {
        // ignore errors; UI shows placeholder
      }
      if (cancelled) return;
      const updated = getById(numericId);
      if (
        (!updated?.learning_objectives ||
          updated.learning_objectives.length === 0) && attempts < 10
      ) {
        timer = window.setTimeout(poll, 2000);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [assignment?.raw_instructions, assignmentId, getById, numericId, objectives.length, refresh]);

  const isGeneratingObjectives =
    objectives.length === 0 && Boolean(assignment.raw_instructions?.trim());

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
        {isGeneratingObjectives ? (
          <div className="instruction-box">
            <p className="muted">Generating... Waiting on OpenAI for the learning objectives.</p>
          </div>
        ) : objectives.length === 0 ? (
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
