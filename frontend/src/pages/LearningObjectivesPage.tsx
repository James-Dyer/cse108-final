import { Link, Navigate, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useAssignments } from "../hooks/useAssignments";
import { AssignmentProgressNav } from "../components/AssignmentProgressNav";

type Props = {
  onNotify: (msg: string) => void;
};

type Objective = {
  tag: string;
  summary: string;
  example: string;
  pitfalls?: string;
};

const deriveObjectives = (raw: string): Objective[] => {
  const lowered = raw.toLowerCase();
  const objectives: Objective[] = [];

  const addUnique = (objective: Objective) => {
    if (!objectives.find((c) => c.tag === objective.tag)) objectives.push(objective);
  };

  if (lowered.includes("loop") || lowered.includes("iterate")) {
    addUnique({
      tag: "Iteration patterns",
      summary: "Choose between for/while, and keep counters and bounds obvious.",
      example: "for i, value in enumerate(items): ...",
      pitfalls: "Off-by-one errors and mutating while iterating.",
    });
  }

  if (lowered.includes("recursion")) {
    addUnique({
      tag: "Recursion hygiene",
      summary: "Define a base case, then shrink the input before recurring.",
      example: "if not nums: return 0\nreturn nums[0] + sum_rest(nums[1:])",
      pitfalls: "Missing base cases or forgetting to return recursion results.",
    });
  }

  if (lowered.includes("string")) {
    addUnique({
      tag: "String parsing",
      summary: "Normalize casing and strip whitespace before comparison.",
      example: 'clean = text.strip().lower().split(",")',
      pitfalls: "Comparing raw user input without trimming.",
    });
  }

  if (lowered.includes("file") || lowered.includes("input")) {
    addUnique({
      tag: "Input handling",
      summary: "Validate shape early; fail fast with helpful messages.",
      example: "if len(parts) != 3: raise ValueError('Need 3 fields')",
      pitfalls: "Silently accepting malformed rows and crashing later.",
    });
  }

  const baseline: Objective[] = [
    {
      tag: "Prompt synthesis",
      summary: "Rewrite the prompt in your own words; capture inputs, outputs, and constraints.",
      example: "Input: list of grades. Output: curved grades rounded to int.",
      pitfalls: "Starting code before clarifying edge cases.",
    },
    {
      tag: "Testing mindset",
      summary: "Craft tiny examples before full runs; hit happy path and one edge case.",
      example: "Given [1,2,3], expect [2,4,6]. Edge: [].",
      pitfalls: "Only testing the sample input from the prompt.",
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

  const objectives = useMemo(
    () => deriveObjectives(assignment?.raw_instructions || ""),
    [assignment]
  );

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
            <article key={objective.tag} className="objective-card">
              <span className="objective-tag">{objective.tag}</span>
              <p>{objective.summary}</p>
              <p className="muted small">
                <strong>Example:</strong> {objective.example}
              </p>
              {objective.pitfalls && (
                <p className="muted small">
                  <strong>Watch for:</strong> {objective.pitfalls}
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
