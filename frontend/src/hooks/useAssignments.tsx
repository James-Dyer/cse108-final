import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "../lib/api";
import { useAuth } from "./useAuth";

type Step = {
  id?: number;
  title: string;
  description: string;
  order_index: number;
};

type LearningObjective = {
  id?: number;
  title: string;
  summary: string;
  why_it_matters?: string;
  used_in_this_assignment?: string;
  order_index: number;
};

type Assignment = {
  id: number;
  user_id: number;
  title: string;
  raw_instructions: string;
  language: string;
  code?: string;
  overview?: string;
  max_stage_unlocked?: number;
  steps: Step[];
  learning_objectives?: LearningObjective[];
};

type AssignmentsContextValue = {
  assignments: Assignment[];
  loading: boolean;
  refresh: () => Promise<void>;
  create: (data: { title: string; raw_instructions: string }) => Promise<Assignment>;
  remove: (id: number) => Promise<void>;
  updateCode: (id: number, code: string) => Promise<Assignment>;
  updateProgress: (id: number, maxStageUnlocked: number) => Promise<Assignment>;
  getById: (id: number) => Assignment | null;
};

const AssignmentsContext = createContext<AssignmentsContextValue | undefined>(
  undefined
);

export function AssignmentsProvider({ children }: { children: ReactNode }) {
  const { token, loading: authLoading } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!token || authLoading) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ assignments: Assignment[] }>(
        "/api/assignments",
        token
      );
      setAssignments(data.assignments || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setAssignments([]);
      return;
    }
    refresh();
  }, [token, authLoading]);

  const create = async (data: { title: string; raw_instructions: string }) => {
    if (!token) throw new Error("unauthorized");
    const payload = { ...data, language: "python" };
    const resp = await apiFetch<{ assignment: Assignment }>(
      "/api/assignments",
      token,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    setAssignments((prev) => [resp.assignment, ...prev]);
    return resp.assignment;
  };

  const remove = async (id: number) => {
    if (!token) throw new Error("unauthorized");
    await apiFetch(`/api/assignments/${id}`, token, { method: "DELETE" });
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  };

  const updateCode = async (id: number, code: string) => {
    if (!token) throw new Error("unauthorized");
    const resp = await apiFetch<{ assignment: Assignment }>(
      `/api/assignments/${id}/code`,
      token,
      {
        method: "PATCH",
        body: JSON.stringify({ code }),
      }
    );
    setAssignments((prev) =>
      prev.map((assignment) => (assignment.id === id ? resp.assignment : assignment))
    );
    return resp.assignment;
  };

  const updateProgress = async (id: number, maxStageUnlocked: number) => {
    if (!token) throw new Error("unauthorized");
    const resp = await apiFetch<{ assignment: Assignment }>(
      `/api/assignments/${id}/progress`,
      token,
      {
        method: "PATCH",
        body: JSON.stringify({ max_stage_unlocked: maxStageUnlocked }),
      }
    );
    setAssignments((prev) =>
      prev.map((assignment) => (assignment.id === id ? resp.assignment : assignment))
    );
    return resp.assignment;
  };

  const getById = (id: number) =>
    assignments.find((a) => a.id === id) || null;

  const value = useMemo(
    () => ({
      assignments,
      loading,
      refresh,
      create,
      remove,
      updateCode,
      updateProgress,
      getById,
    }),
    [assignments, loading]
  );

  return (
    <AssignmentsContext.Provider value={value}>
      {children}
    </AssignmentsContext.Provider>
  );
}

export function useAssignments() {
  const ctx = useContext(AssignmentsContext);
  if (!ctx) {
    throw new Error("useAssignments must be used within AssignmentsProvider");
  }
  return ctx;
}

export type { Assignment, Step, LearningObjective };
