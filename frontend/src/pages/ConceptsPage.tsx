import { Link, Navigate, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useAssignments } from "../hooks/useAssignments";

type Props = {
  onNotify: (msg: string) => void;
};

type Concept = {
  tag: string;
  summary: string;
  example: string;
  pitfalls?: string;
};

const deriveConcepts = (raw: string): Concept[] => {
  const lowered = raw.toLowerCase();
  const concepts: Concept[] = [];

  const addUnique = (concept: Concept) => {
    if (!concepts.find((c) => c.tag === concept.tag)) concepts.push(concept);
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

  const baseline: Concept[] = [
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

  return [...concepts, ...baseline].slice(0, 6);
};

export function ConceptsPage({ onNotify }: Props) {
  const { assignmentId } = useParams();
  const { getById } = useAssignments();

  const assignment = useMemo(() => {
    if (!assignmentId) return null;
    const numeric = Number(assignmentId);
    if (Number.isNaN(numeric)) return null;
    return getById(numeric);
  }, [assignmentId, getById]);

  const concepts = useMemo(
    () => deriveConcepts(assignment?.raw_instructions || ""),
    [assignment]
  );

  if (!assignment) {
    onNotify("Assignment not found.");
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <section className="page-shell">
      <div className="breadcrumb">
        <Link className="nav-pill" to={`/assignments/${assignment.id}`}>
          ← Assignment
        </Link>
        <span className="muted">Concept breakdown</span>
      </div>
      <div className="panel">
        <div className="panel-header concept-header">
          <div>
            <h2>Concept mini-lessons for this assignment</h2>
            <p className="muted">
              Derived deterministically from your instructions so you can prep before coding.
            </p>
          </div>
          <span className="chip subtle">{concepts.length} concepts</span>
        </div>
        <div className="concept-grid">
          {concepts.map((concept) => (
            <article key={concept.tag} className="concept-card">
              <span className="concept-tag">{concept.tag}</span>
              <p>{concept.summary}</p>
              <p className="muted small">
                <strong>Example:</strong> {concept.example}
              </p>
              {concept.pitfalls && (
                <p className="muted small">
                  <strong>Watch for:</strong> {concept.pitfalls}
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
