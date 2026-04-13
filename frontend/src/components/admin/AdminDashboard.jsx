import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client.js";
import AddQuestionForm from "./AddQuestionForm.jsx";
import ParticipantsTab from "./ParticipantsTab.jsx";
import ManageQuestionsTab from "./ManageQuestionsTab.jsx";
import SettingsTab from "./SettingsTab.jsx";

const TAB_ADD = "add";
const TAB_PARTICIPANTS = "participants";
const TAB_MANAGE = "manage";
const TAB_SETTINGS = "settings";

export default function AdminDashboard({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState(TAB_ADD);
  const [participants, setParticipants] = useState([]);
  const [resultsErr, setResultsErr] = useState("");
  const [participantsLoading, setParticipantsLoading] = useState(false);

  const fetchParticipants = useCallback(async () => {
    if (!token) return;
    setResultsErr("");
    setParticipantsLoading(true);
    try {
      const { data } = await api.get("/api/admin/results", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setParticipants(data.participants || []);
    } catch (err) {
      setResultsErr(err.response?.data?.error || "Failed to load results");
      if (err.response?.status === 401) onLogout();
    } finally {
      setParticipantsLoading(false);
    }
  }, [token, onLogout]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  function handleUnauthorized() {
    onLogout();
  }

  return (
    <div className="admin-container">
      <div className="dashboard-card">
        <header className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Admin Pannel</h1>
            <p className="dashboard-subtitle">Create Your Questions Here</p>
          </div>
          <div className="admin-actions">
            <Link to="/" className="link-btn">
              Go to Login
            </Link>
            <button type="button" className="logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>

        <div className="tab-container" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === TAB_ADD}
            className={`tab-link ${activeTab === TAB_ADD ? "active" : ""}`}
            onClick={() => setActiveTab(TAB_ADD)}
          >
            Add Question
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === TAB_MANAGE}
            className={`tab-link ${activeTab === TAB_MANAGE ? "active" : ""}`}
            onClick={() => setActiveTab(TAB_MANAGE)}
          >
            Manage Questions
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === TAB_PARTICIPANTS}
            className={`tab-link ${activeTab === TAB_PARTICIPANTS ? "active" : ""}`}
            onClick={() => setActiveTab(TAB_PARTICIPANTS)}
          >
            View Participants
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === TAB_SETTINGS}
            className={`tab-link ${activeTab === TAB_SETTINGS ? "active" : ""}`}
            onClick={() => setActiveTab(TAB_SETTINGS)}
          >
            Settings
          </button>
        </div>

        <div className="tab-content" role="tabpanel">
          {activeTab === TAB_ADD ? (
            <AddQuestionForm
              token={token}
              onUnauthorized={handleUnauthorized}
            />
          ) : activeTab === TAB_MANAGE ? (
            <ManageQuestionsTab
              token={token}
              onUnauthorized={handleUnauthorized}
            />
          ) : activeTab === TAB_SETTINGS ? (
            <SettingsTab
              token={token}
              onUnauthorized={handleUnauthorized}
            />
          ) : (
            <ParticipantsTab
              token={token}
              participants={participants}
              resultsErr={resultsErr}
              loading={participantsLoading}
              onRefresh={fetchParticipants}
              onUnauthorized={handleUnauthorized}
            />
          )}
        </div>
      </div>
    </div>
  );
}
