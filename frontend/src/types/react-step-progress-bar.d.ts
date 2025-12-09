declare module "react-step-progress-bar" {
  import * as React from "react";

  export type TransitionName = "scale" | "rotate" | null;

  export type StepRenderProps = {
    accomplished: boolean;
    position: number;
    transitionState?: "entering" | "entered" | "exiting" | "exited";
    index: number;
  };

  export type StepProps = {
    children: (props: StepRenderProps) => React.ReactNode;
    transition?: TransitionName;
    transitionDuration?: number;
    position?: number;
    accomplished?: boolean;
    index?: number;
  };

  export type ProgressBarProps = {
    percent: number;
    children: React.ReactNode;
    stepPositions?: number[];
    unfilledBackground?: string;
    filledBackground?: string;
    width?: number | string;
    height?: number | string;
    hasStepZero?: boolean;
    text?: string | number;
  };

  export const ProgressBar: React.FC<ProgressBarProps>;
  export const Step: React.FC<StepProps>;
}
