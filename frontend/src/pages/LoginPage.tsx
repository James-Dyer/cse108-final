import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

type Props = {
  onNotify: (msg: string) => void;
};

export function LoginPage({ onNotify }: Props) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (mode === "login") {
        await login(email, password);
        onNotify("Welcome back to Code Lab.");
      } else {
        await register(email, password);
        onNotify("Account created.");
      }
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      onNotify(error.message || "Auth failed.");
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card panel">
        <p className="eyebrow">Code Lab</p>
        <h2>{mode === "login" ? "Log in" : "Create account"}</h2>
        <p className="muted">
          Access the guided lab workspace. We keep your assignments and step plans synced.
        </p>
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <div className="button-row">
            <button type="submit" className="primary">
              {mode === "login" ? "Enter workspace" : "Start Code Lab"}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Need an account?" : "Already registered?"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
