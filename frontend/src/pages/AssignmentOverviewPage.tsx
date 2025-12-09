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
          <p>
            Given an array of integers nums and an integer target, return the indices of the two
            numbers such that they add up to target. You may assume that each input would have
            exactly one solution, and you may not use the same element twice. Return the answer in
            any order.
          </p>
          <p className="muted">
            Example: Input: nums = [2,7,11,15], target = 9. Output: [0,1]. Explanation:
            Because nums[0] + nums[1] == 9.
          </p>
        </div>
        <div className="button-row top-gap">
          <Link className="primary" to={`/assignments/${assignment.id}/concepts`}>
            View concepts
          </Link>
        </div>
      </div>
    </section>
  );
}
