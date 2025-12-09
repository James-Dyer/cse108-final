import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useAuth } from "./useAuth";

export type ActivityMap = Record<string, boolean>;

type ActivityResponse = {
  activity: ActivityMap;
};

export function useActivity() {
  const { token } = useAuth();
  const [activity, setActivity] = useState<ActivityMap>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) {
      setActivity({});
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<ActivityResponse>("/api/activity", token);
      setActivity(data.activity || {});
    } finally {
      setLoading(false);
    }
  }, [token]);

  const setDayActive = useCallback(
    async (date: string, active: boolean) => {
      if (!token) {
        throw new Error("unauthorized");
      }
      const data = await apiFetch<ActivityResponse>("/api/activity", token, {
        method: "PATCH",
        body: JSON.stringify({ date, active }),
      });
      setActivity(data.activity || {});
      return data.activity || {};
    },
    [token]
  );

  useEffect(() => {
    if (token) {
      refresh().catch(() => setActivity({}));
    } else {
      setActivity({});
    }
  }, [token, refresh]);

  return {
    activity,
    loading,
    refresh,
    setDayActive,
  };
}
