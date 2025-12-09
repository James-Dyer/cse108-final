import type { Step } from "../hooks/useAssignments";

type Props = {
  steps: Step[];
};

export function StepsList({ steps }: Props) {
  if (!steps.length) {
    return <p className="muted">No steps yet. Add an assignment.</p>;
  }

  return (
    <ol className="steps">
      {steps.map((step) => (
        <li key={step.order_index}>
          <div className="step-index">{step.order_index + 1}</div>
          <div>
            <p className="step-title">{step.title}</p>
            <p className="muted">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
