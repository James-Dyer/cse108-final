import { Link, Navigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { useAssignments } from "../hooks/useAssignments";
import { AssignmentProgressNav } from "../components/AssignmentProgressNav";

type Props = {
  onNotify: (msg: string) => void;
};

export function AssignmentOverviewPage({ onNotify }: Props) {
  const { assignmentId } = useParams();
  const { getById, loading: assignmentsLoading, refresh } = useAssignments();

  const numericId = assignmentId ? Number(assignmentId) : NaN;
  const assignment =
    assignmentId && !Number.isNaN(numericId) ? getById(numericId) : null;

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
    if (!assignmentId || Number.isNaN(numericId) || assignment?.overview?.trim()) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;

    const poll = async () => {
      attempts += 1;
      try {
        await refresh();
      } catch {
        // swallow errors; UI already shows fallback state
      }
      if (cancelled) return;
      const updated = getById(numericId);
      if (!updated?.overview?.trim() && attempts < 10) {
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
  }, [assignment?.overview, assignmentId, getById, numericId, refresh]);

  const overviewText = assignment.overview?.trim() || "";
  const fallbackText = assignment.raw_instructions?.trim() || "";
  const isGenerating = !overviewText && Boolean(fallbackText);
  const displayText = isGenerating ? "Generating..." : overviewText || fallbackText;
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
        <p className={displayClass} style={{ marginTop: 12 }}>
          {displayText || "No overview available yet."}
        </p>
        <div className="button-row top-gap">
          <Link className="primary" to={`/assignments/${assignment.id}/learning-objectives`}>
            View learning objectives
          </Link>
        </div>
      </div>
    </section>
  );
}
