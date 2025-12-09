import type { Step } from "../hooks/useAssignments";

type Props = {
  steps: Step[];
};

export function StepsList({ steps }: Props) {
  if (!steps.length) {
    return <p className="muted">No steps yet. Add an assignment.</p>;
  }

  return (
    <ol className="steps flow">
      {steps.map((step, idx) => (
        <li key={step.order_index} className="step-card">
          <div className="step-marker" aria-hidden="true">
            <div className="step-index">{idx + 1}</div>
            {idx < steps.length - 1 && <div className="step-connector" />}
          </div>
          <div className="step-body">
            <p className="step-title">{step.title}</p>
            <p className="muted">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
