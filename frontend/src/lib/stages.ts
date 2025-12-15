export type StageKey = "overview" | "objectives" | "steps" | "code";

export type StageDefinition = {
  key: StageKey;
  label: string;
  toPath: (assignmentId: number) => string;
  matchesPath: (assignmentId: number, pathname: string) => boolean;
};

export const STAGES: StageDefinition[] = [
  {
    key: "overview",
    label: "Start",
    toPath: (id) => `/assignments/${id}`,
    matchesPath: (id, pathname) => pathname === `/assignments/${id}`,
  },
  {
    key: "objectives",
    label: "Learn",
    toPath: (id) => `/assignments/${id}/learning-objectives`,
    matchesPath: (id, pathname) =>
      pathname.startsWith(`/assignments/${id}/learning-objectives`),
  },
  {
    key: "steps",
    label: "Plan",
    toPath: (id) => `/assignments/${id}/steps`,
    matchesPath: (id, pathname) => pathname.startsWith(`/assignments/${id}/steps`),
  },
  {
    key: "code",
    label: "Code",
    toPath: (id) => `/assignments/${id}/workspace`,
    matchesPath: (id, pathname) => pathname.startsWith(`/assignments/${id}/workspace`),
  },
];

export const STAGE_KEYS: StageKey[] = STAGES.map((stage) => stage.key);

export const getStageIndexByKey = (stageKey: StageKey) =>
  STAGE_KEYS.findIndex((key) => key === stageKey);

export const getStageIndexFromPath = (assignmentId: number, pathname: string) =>
  STAGES.findIndex((stage) => stage.matchesPath(assignmentId, pathname));

export const getStageByIndex = (index: number) => STAGES[index] ?? null;
