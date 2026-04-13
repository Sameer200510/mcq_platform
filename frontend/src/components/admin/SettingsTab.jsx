import { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client.js";

export default function SettingsTab({ token, onUnauthorized }) {
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.settings && data.settings.quiz_duration_minutes) {
        setDuration(Number(data.settings.quiz_duration_minutes));
      }
    } catch (error) {
      setErr(error.response?.data?.error || "Failed to load settings");
      if (error.response?.status === 401) onUnauthorized?.();
    } finally {
      setLoading(false);
    }
  }, [token, onUnauthorized]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");
    setSaving(true);
    try {
      await api.put(
        "/api/admin/settings",
        {
          quiz_duration_minutes: duration,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg("Settings updated successfully!");
    } catch (error) {
      setErr(error.response?.data?.error || "Failed to save settings");
      if (error.response?.status === 401) onUnauthorized?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="form-card" style={{ maxWidth: "500px", margin: "0 auto" }}>
        <h2 className="form-title">Global Settings</h2>
        
        {err && <div className="alert alert-error">{err}</div>}
        {msg && <div className="alert alert-success">{msg}</div>}
        
        {loading ? (
          <p>Loading settings...</p>
        ) : (
          <form className="q-form" onSubmit={handleSave}>
            <div className="input-group">
              <label htmlFor="duration">Quiz Duration (minutes)</label>
              <input
                id="duration"
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              />
              <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "5px" }}>
                This is the total time a participant will have to complete the test once started.
              </p>
            </div>
            
            <button className="submit-btn" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
