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
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
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
  const [validatedToken, setValidatedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(() =>
    Boolean(localStorage.getItem("cl_token"))
  );

  const clearSession = () => {
    setUser(null);
    setToken(null);
    setValidatedToken(null);
    setLoading(false);
    localStorage.removeItem("cl_user");
    localStorage.removeItem("cl_token");
  };

  const persistSession = (nextUser: User, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    setValidatedToken(nextToken);
    setLoading(false);
    localStorage.setItem("cl_user", JSON.stringify(nextUser));
    localStorage.setItem("cl_token", nextToken);
  };

  useEffect(() => {
    if (!token) {
      clearSession();
      return;
    }

    if (validatedToken === token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const hydrate = async () => {
      setLoading(true);
      try {
        const data = await apiFetch<{ user: User }>("/api/auth/me", token);
        if (cancelled) return;
        setUser(data.user);
        setValidatedToken(token);
        localStorage.setItem("cl_user", JSON.stringify(data.user));
      } catch (error) {
        if (cancelled) return;
        clearSession();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    hydrate();

    return () => {
      cancelled = true;
    };
  }, [token, validatedToken]);

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

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ) => {
    if (!token) {
      throw new Error("unauthorized");
    }
    const data = await apiFetch<{ user?: User; token?: string }>(
      "/api/auth/password",
      token,
      {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      }
    );
    // Refresh the session if the server issued a fresh token.
    if (data.user && data.token) {
      persistSession(data.user, data.token);
    }
  };

  const logout = clearSession;

  const value = useMemo(
    () => ({ user, token, loading, login, register, changePassword, logout }),
    [user, token, loading, login, register, changePassword, logout]
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
