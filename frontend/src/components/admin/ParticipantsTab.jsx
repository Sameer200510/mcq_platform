import { useState } from "react";
import { api } from "../../api/client.js";
import Modal from "../Modal.jsx";
import * as XLSX from "xlsx";

export default function ParticipantsTab({
  token,
  participants,
  resultsErr,
  loading,
  onRefresh,
  onUnauthorized,
}) {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  async function confirmDeleteUser() {
    if (!deleteTarget) return;
    setDeleteErr("");
    setDeleting(true);
    try {
      await api.delete(`/api/admin/delete-user/${deleteTarget.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeleteTarget(null);
      onRefresh();
    } catch (err) {
      setDeleteErr(err.response?.data?.error || "Delete failed");
      if (err.response?.status === 401) onUnauthorized?.();
    } finally {
      setDeleting(false);
    }
  }

  function handleExportXLS() {
    // 1. Prepare data with specific headers
    const wsData = [
      // Top row spanning headers
      ["", "", "MCQ Marks Distribution", "", "", "", "", ""],
      // Actual Column Headers
      [
        "Team Name",
        "TeamID",
        "Easy Score",
        "Medium Score",
        "Hard Score",
        "Submission Time",
        "Tab Switches/Other Activities",
        "Team Avg Score",
      ],
    ];

    participants.forEach((p) => {
      // Calculate submission time (duration or timestamp)
      let submissionTime = "Not Submitted";
      if (p.submitted_at) {
        submissionTime = new Date(p.submitted_at).toLocaleTimeString();
      }

      const teamAvgScore = p.score; // Or calculate if required

      wsData.push([
        p.team_name,
        p.roll_no, // using roll_no as TeamID based on typical CTF format
        p.easy_score || 0,
        p.medium_score || 0,
        p.hard_score || 0,
        submissionTime,
        p.tab_switch_count || 0,
        teamAvgScore || 0,
      ]);
    });

    // 2. Create Workbook and Worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Merge Cells for "MCQ Marks Distribution"
    // Merging C1 down to G1 (0 index: row 0, col 2 to row 0, col 6)
    // Wait, the image shows "MCQ Marks Distribution" covering the MCQ columns + subtime + tab switches maybe?
    // Let's merge from col 2 to col 7 (easy, medium, hard, sub time, tab switches).
    ws["!merges"] = [
      { s: { r: 0, c: 2 }, e: { r: 0, c: 7 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Results");

    // 3. Download the file
    XLSX.writeFile(wb, "CTF_Results.xlsx");
  }

  return (
    <div className="participants-container">
      <Modal
        open={!!deleteTarget}
        title="Delete user"
        footer={
          <>
            <button
              type="button"
              className="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteUser}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </>
        }
      >
        <p>Are you sure you want to delete this user?</p>
        {deleteErr ? <div className="alert alert-error">{deleteErr}</div> : null}
      </Modal>

      <div className="tab-header-actions">
        <h3 className="section-subtitle">Live Leaderboard / Results</h3>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="refresh-btn"
            style={{ backgroundColor: "#2563eb", color: "white" }}
            onClick={handleExportXLS}
            disabled={loading || participants.length === 0}
          >
            Download XLS
          </button>
          <button
            type="button"
            className="refresh-btn"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? "Updating..." : "Refresh Data"}
          </button>
        </div>
      </div>

      {resultsErr && <div className="alert alert-error">{resultsErr}</div>}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Team Name</th>
              <th>Participant Name</th>
              <th>Roll No</th>
              <th className="text-center">Easy</th>
              <th className="text-center">Medium</th>
              <th className="text-center">Hard</th>
              <th className="text-center">Total Score</th>
              <th className="text-center">Tab Switches</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {participants.length > 0 ? (
              participants.map((participant) => (
                <tr key={participant.id}>
                  <td className="font-bold">{participant.team_name}</td>
                  <td>{participant.participant_name}</td>
                  <td>
                    <code>{participant.roll_no}</code>
                  </td>
                  <td className="text-center text-green-600 font-semibold">{participant.easy_score}</td>
                  <td className="text-center text-yellow-600 font-semibold">{participant.medium_score}</td>
                  <td className="text-center text-red-600 font-semibold">{participant.hard_score}</td>
                  <td className="text-center score-cell">
                    {participant.score}
                  </td>
                  <td
                    className={`text-center ${participant.tab_switch_count > 2 ? "warning-text" : ""}`}
                  >
                    {participant.tab_switch_count}
                  </td>
                  <td className="text-center">
                    <button
                      type="button"
                      className="link-btn small-action danger-link"
                      onClick={() => {
                        setDeleteErr("");
                        setDeleteTarget(participant);
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="empty-state">
                  No participants found yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
