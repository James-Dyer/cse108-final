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
        <Link className="ghost" to={`/assignments/${assignment.id}`}>
          Open
        </Link>
        <button className="ghost danger" onClick={() => onDelete(assignment.id)}>
          Delete
        </button>
      </div>
    </article>
  );
}
