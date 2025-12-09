import { Link } from "react-router-dom";
import { ProgressBar, Step } from "react-step-progress-bar";
import { STAGES, getStageIndexByKey, type StageKey } from "../lib/stages";
import "react-step-progress-bar/styles.css";

type Props = {
  assignmentId: number;
  currentStage: StageKey;
  maxStageUnlocked?: number;
};

export function AssignmentProgressNav({
  assignmentId,
  currentStage,
  maxStageUnlocked = 0,
}: Props) {
  const totalStages = Math.max(STAGES.length - 1, 1);
  const currentIndex = Math.max(0, getStageIndexByKey(currentStage));
  const maxUnlockedIndex = Math.max(0, maxStageUnlocked);
  const progressIndex = Math.max(currentIndex, maxUnlockedIndex);
  const percent = (progressIndex / totalStages) * 100;

  return (
    <div className="assignment-progress">
      <ProgressBar
        percent={percent}
        filledBackground="linear-gradient(90deg, var(--accent), #28e0cb)"
        unfilledBackground="rgba(255, 255, 255, 0.16)"
      >
        {STAGES.map((stage, index) => {
          const href = stage.toPath(assignmentId);
          const isUnlocked = maxUnlockedIndex >= index - 1;

          return (
            <Step key={stage.key} transition="scale" position={(index / totalStages) * 100}>
              {({ accomplished }) => (
                <Link
                  to={href}
                  className={`progress-step${accomplished ? " accomplished" : ""}${
                    index === currentIndex ? " active" : ""
                  }${isUnlocked ? "" : " locked"}`}
                  tabIndex={isUnlocked ? 0 : -1}
                  aria-disabled={!isUnlocked}
                  aria-current={index === currentIndex ? "step" : undefined}
                  onClick={(event) => {
                    if (!isUnlocked) {
                      event.preventDefault();
                      event.stopPropagation();
                    }
                  }}
                >
                  <span className="progress-circle" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="progress-label">{stage.label}</span>
                </Link>
              )}
            </Step>
          );
        })}
      </ProgressBar>
    </div>
  );
}
