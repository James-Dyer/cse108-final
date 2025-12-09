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
      navigate(`/assignments/${assignment.id}`);
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
            <p className="eyebrow">Create</p>
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
              Build plan
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
