import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";

export default function LoginPage() {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/api/auth/login", {
        teamName: teamName.trim(),
        participantName: participantName.trim(),
        rollNo: rollNo.trim(),
      });

      const uid = data.userId;

      if (data.alreadySubmitted) {
        alert("Your response has already been submitted");
        return;
      }

      sessionStorage.setItem("userId", String(uid));
      sessionStorage.setItem("teamName", teamName.trim());
      sessionStorage.setItem("participantName", participantName.trim());

      try {
        const progressRes = await api.get(`/api/quiz/progress/${uid}`, {
          headers: { "X-User-Id": String(uid) },
        });

        if (progressRes.data?.submitted) {
          alert("Your response has already been submitted");
          return;
        }
      } catch {}

      navigate("/quiz");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">HACK-ERA CTF</h1>
          <p className="login-subtitle2">Engineered by GEU</p>
          <p className="login-subtitle">
            Enter your details to start the challenge
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="teamName">Team Name</label>
            <input
              id="teamName"
              type="text"
              placeholder="e.g. 404_Found"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              autoComplete="off"
            />
          </div>

          <div className="input-group">
            <label htmlFor="participantName">Participant Name</label>
            <input
              id="participantName"
              type="text"
              placeholder="Your full name"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div className="input-group">
            <label htmlFor="rollNo">University Roll No</label>
            <input
              id="rollNo"
              type="text"
              placeholder="Roll number"
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value)}
              required
              autoComplete="off"
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Verifying..." : "Start Quiz"}
          </button>
        </form>

        <div className="login-footer">
          <Link to="/admin" className="link-secondary">
            Admin Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
