import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "../lib/api";

type User = {
  id: number;
  email: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("cl_user");
    return saved ? (JSON.parse(saved) as User) : null;
  });
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("cl_token")
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      if (!token || user || loading) return;
      setLoading(true);
      try {
        const data = await apiFetch<{ user: User }>("/api/auth/me", token);
        setUser(data.user);
        localStorage.setItem("cl_user", JSON.stringify(data.user));
      } catch (error) {
        setUser(null);
        setToken(null);
        localStorage.removeItem("cl_user");
        localStorage.removeItem("cl_token");
      } finally {
        setLoading(false);
      }
    };
    hydrate();
  }, [token, user, loading]);

  const persistSession = (nextUser: User, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem("cl_user", JSON.stringify(nextUser));
    localStorage.setItem("cl_token", nextToken);
  };

  const login = async (email: string, password: string) => {
    const data = await apiFetch<{ user: User; token: string }>(
      "/api/auth/login",
      token,
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
    persistSession(data.user, data.token);
  };

  const register = async (email: string, password: string) => {
    const data = await apiFetch<{ user: User; token: string }>(
      "/api/auth/register",
      token,
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
    persistSession(data.user, data.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("cl_user");
    localStorage.removeItem("cl_token");
  };

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export type { User };
