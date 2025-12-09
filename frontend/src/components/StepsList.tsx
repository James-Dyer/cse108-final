import type { Step } from "../hooks/useAssignments";

type Props = {
  steps: Step[];
  showDescription?: boolean;
  layout?: "flowchart" | "cascade";
};

export function StepsList({
  steps,
  showDescription = false,
  layout = "flowchart",
}: Props) {
  if (!steps.length) {
    return <p className="muted">No steps yet. Add an assignment.</p>;
  }

  if (layout === "flowchart") {
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

  return (
    <div className="steps cascade" role="list">
      {steps.map((step, idx) => (
        <div className="cascade-row" key={step.order_index} role="listitem">
          <div className="flow-index">{idx + 1}</div>
          <div className="cascade-text">
            <p className="cascade-title">{step.title}</p>
            {showDescription && step.description && (
              <p className="cascade-description">{step.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
