import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAssignments } from "../hooks/useAssignments";

type Props = {
  onNotify: (msg: string) => void;
};

export function AssignmentNewPage({ onNotify }: Props) {
  const { create } = useAssignments();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [rawInstructions, setRawInstructions] = useState("");

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const assignment = await create({
        title,
        raw_instructions: rawInstructions,
      });
      setTitle("");
      setRawInstructions("");
      onNotify("Assignment drafted with a starter step plan.");
      const url = `/assignments/${assignment.id}`;
      navigate(url);
    } catch (error: any) {
      onNotify(error.message || "Could not create assignment.");
    }
  };

  return (
    <section className="page-shell">
      <div className="breadcrumb">
        <Link className="nav-pill" to="/dashboard">
          ← Dashboard
        </Link>
        <span className="muted">New assignment</span>
      </div>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Draft a new assignment</h2>
            <p className="muted">
              Paste the full prompt, rubric, and any inputs/outputs. We’ll keep it scoped to Python.
            </p>
          </div>
        </div>
        <form className="form" onSubmit={handleCreate}>
          <label>
            Title
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Lab 01: Arrays & loops"
            />
          </label>
          <label>
            Instructions
            <textarea
              required
              value={rawInstructions}
              onChange={(e) => setRawInstructions(e.target.value)}
              placeholder="Paste the full prompt, rubric, and any inputs/outputs."
            />
          </label>
          <div className="button-row top-gap">
            <button type="button" className="ghost" onClick={() => navigate("/dashboard")}>
              Cancel
            </button>
            <button type="submit" className="primary">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span>Start Assignment</span>
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
              </span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
