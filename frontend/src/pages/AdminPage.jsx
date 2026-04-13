import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import AdminDashboard from "../components/admin/AdminDashboard.jsx";

export default function AdminPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(
    () => sessionStorage.getItem("adminToken") || "",
  );
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) sessionStorage.setItem("adminToken", token);
    else sessionStorage.removeItem("adminToken");
  }, [token]);

  async function handleAdminLogin(event) {
    event.preventDefault();
    setLoginError("");
    setLoading(true);
    try {
      const { data } = await api.post("/api/admin/login", {
        username,
        password,
      });
      setToken(data.token);
    } catch (err) {
      setLoginError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const logout = useCallback(() => {
    setToken("");
  }, []);

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">Admin Access</h1>
            <p className="login-subtitle">
              Please enter your credentials to manage the CTF
            </p>
          </div>

          {loginError && <div className="alert alert-error">{loginError}</div>}

          <form onSubmit={handleAdminLogin} className="login-form">
            <div className="input-group">
              <label htmlFor="admUser">Username</label>
              <input
                id="admUser"
                type="text"
                placeholder="Enter admin username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="admPass">Password</label>
              <input
                id="admPass"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Authenticating..." : "Sign In"}
            </button>
          </form>

          <div className="login-footer">
            <Link to="/" className="link-secondary">
              Back to Participant Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <AdminDashboard token={token} onLogout={logout} />;
}
