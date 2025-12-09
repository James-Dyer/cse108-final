import type { Step } from "../hooks/useAssignments";

type Props = {
  steps: Step[];
};

export function StepsList({ steps }: Props) {
  if (!steps.length) {
    return <p className="muted">No steps yet. Add an assignment.</p>;
  }

  return (
    <div className="steps flowchart" role="list">
      {steps.map((step, idx) => (
        <div className="flow-segment" key={step.order_index} role="listitem">
          <div
            className="flow-node"
            style={{ animationDelay: `${idx * 200}ms` }}
          >
            <div className="flow-index">{idx + 1}</div>
            <p className="flow-title">{step.title}</p>
          </div>
          {idx < steps.length - 1 && (
            <div
              className="flow-connector"
              aria-hidden="true"
              style={{ animationDelay: `${idx * 200 + 120}ms` }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
