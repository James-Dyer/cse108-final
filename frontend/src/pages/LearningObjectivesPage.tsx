import { Link, Navigate, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useAssignments, type LearningObjective } from "../hooks/useAssignments";
import { AssignmentProgressNav } from "../components/AssignmentProgressNav";

type Props = {
  onNotify: (msg: string) => void;
};

const deriveObjectives = (raw: string): LearningObjective[] => {
  const lowered = raw.toLowerCase();
  const objectives: LearningObjective[] = [];

  const addUnique = (objective: LearningObjective) => {
    if (!objectives.find((c) => c.title === objective.title)) objectives.push(objective);
  };

  if (lowered.includes("loop") || lowered.includes("iterate")) {
    addUnique({
      title: "Iteration patterns",
      summary: "Choose between for/while, and keep counters and bounds obvious.",
      why_it_matters: "Prevents off-by-one bugs and keeps control flow clear.",
      used_in_this_assignment: "Use clear indices or enumerations in loops.",
      order_index: objectives.length,
    });
  }

  if (lowered.includes("recursion")) {
    addUnique({
      title: "Recursion hygiene",
      summary: "Define a base case, then shrink the input before recurring.",
      why_it_matters: "Avoids infinite loops and stack overflows.",
      used_in_this_assignment: "Show base cases explicitly and return recursive results.",
      order_index: objectives.length,
    });
  }

  if (lowered.includes("string")) {
    addUnique({
      title: "String parsing",
      summary: "Normalize casing and strip whitespace before comparison.",
      why_it_matters: "Reduces brittle comparisons and hidden whitespace bugs.",
      used_in_this_assignment: "Call .strip().lower() on inputs before logic.",
      order_index: objectives.length,
    });
  }

  if (lowered.includes("file") || lowered.includes("input")) {
    addUnique({
      title: "Input handling",
      summary: "Validate shape early; fail fast with helpful messages.",
      why_it_matters: "Prevents crashes and makes debugging easier.",
      used_in_this_assignment: "Check counts and types before processing input.",
      order_index: objectives.length,
    });
  }

  const baseline: LearningObjective[] = [
    {
      title: "Prompt synthesis",
      summary: "Rewrite the prompt in your own words; capture inputs, outputs, and constraints.",
      why_it_matters: "Clarifies the target so you build the right thing.",
      used_in_this_assignment: "Write a 2–3 sentence summary before coding.",
      order_index: objectives.length,
    },
    {
      title: "Testing mindset",
      summary: "Craft tiny examples before full runs; hit happy path and one edge case.",
      why_it_matters: "Catches mistakes early and builds confidence.",
      used_in_this_assignment: "List one happy-path and one edge-case test.",
      order_index: objectives.length + 1,
    },
  ];

  return [...objectives, ...baseline].slice(0, 6);
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
    const source =
      storedObjectives.length > 0
        ? storedObjectives
        : deriveObjectives(assignment?.raw_instructions || "");
    return [...source].sort(
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
