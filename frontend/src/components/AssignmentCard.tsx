import { Link } from "react-router-dom";
import type { Assignment } from "../hooks/useAssignments";

type Props = {
  assignment: Assignment;
  onDelete: (id: number) => void;
};

export function AssignmentCard({ assignment, onDelete }: Props) {
  return (
    <article className="assignment-card">
      <div>
        <h3>{assignment.title}</h3>
        <p className="muted">
          {assignment.raw_instructions.slice(0, 140)}
          {assignment.raw_instructions.length > 140 ? "..." : ""}
        </p>
      </div>
      <div className="card-actions">
        <Link
          className="ghost icon-button"
          to={`/assignments/${assignment.id}`}
          aria-label="Open assignment"
          title="Open assignment"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path
              d="M10.5 4.5H15.5V9.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9.5 10.5 15.5 4.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 4.5H6.5A2 2 0 0 0 4.5 6.5V13.5A2 2 0 0 0 6.5 15.5H13.5A2 2 0 0 0 15.5 13.5V11"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <button
          className="ghost icon-button danger"
          onClick={() => onDelete(assignment.id)}
          aria-label="Delete assignment"
          title="Delete"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path
              d="M4.5 6.5h11"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12.5 3.5h-5l-.5 1h6l-.5-1Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M5.5 6.5 6 15a1 1 0 0 0 1 1H13a1 1 0 0 0 1-1l.5-8.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8.5 9.5v4M11.5 9.5v4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </article>
  );
}
