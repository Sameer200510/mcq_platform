import { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client.js";
import Modal from "../Modal.jsx";
import {
  validateQuestionFields,
  QUESTION_FIELD_LIMITS,
} from "../../utils/questionFormValidation.js";

const LABELS = ["A", "B", "C", "D"];

export default function ManageQuestionsTab({ token, onUnauthorized }) {
  const [questions, setQuestions] = useState([]);
  const [listErr, setListErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState({
    questionText: "",
    option1: "",
    option2: "",
    option3: "",
    option4: "",
    correctAnswer: 0,
    difficulty: "easy",
    points: 1,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [saveErr, setSaveErr] = useState("");
  const [saving, setSaving] = useState(false);

  const loadQuestions = useCallback(async () => {
    setListErr("");
    setLoading(true);
    try {
      const { data } = await api.get("/api/admin/questions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuestions(data.questions || []);
    } catch (err) {
      setListErr(err.response?.data?.error || "Failed to load questions");
      if (err.response?.status === 401) onUnauthorized?.();
    } finally {
      setLoading(false);
    }
  }, [token, onUnauthorized]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  function openEdit(questionRow) {
    const opts = questionRow.options || [];
    setForm({
      questionText: questionRow.question || "",
      option1: opts[0] ?? "",
      option2: opts[1] ?? "",
      option3: opts[2] ?? "",
      option4: opts[3] ?? "",
      correctAnswer: questionRow.correct_answer ?? 0,
      difficulty: questionRow.difficulty || "easy",
      points: questionRow.points || 1,
    });
    setEditing(questionRow);
    setFieldErrors({});
    setSaveErr("");
  }

  function closeEdit() {
    setEditing(null);
    setSaveErr("");
    setFieldErrors({});
  }

  async function handleSaveEdit(event) {
    event.preventDefault();
    setSaveErr("");
    const validationErrors = validateQuestionFields({
      questionText: form.questionText,
      option1: form.option1,
      option2: form.option2,
      option3: form.option3,
      option4: form.option4,
      correctAnswer: form.correctAnswer,
    });
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      await api.put(
        `/api/admin/update-question/${editing.id}`,
        {
          question: form.questionText.trim(),
          options: [
            form.option1.trim(),
            form.option2.trim(),
            form.option3.trim(),
            form.option4.trim(),
          ],
          correctAnswer: form.correctAnswer,
          difficulty: form.difficulty,
          points: parseInt(form.points, 10) || 1,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      closeEdit();
      await loadQuestions();
    } catch (err) {
      setSaveErr(err.response?.data?.error || "Update failed");
      if (err.response?.status === 401) onUnauthorized?.();
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setSaving(true);
    setListErr("");
    try {
      await api.delete(`/api/admin/delete-question/${deleting.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeleting(null);
      await loadQuestions();
    } catch (err) {
      setListErr(err.response?.data?.error || "Delete failed");
      if (err.response?.status === 401) onUnauthorized?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="manage-questions">
      {listErr ? <div className="alert alert-error">{listErr}</div> : null}
      <div className="tab-header-actions">
        <h3 className="section-subtitle">Question bank</h3>
        <button
          type="button"
          className="refresh-btn"
          onClick={loadQuestions}
          disabled={loading}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <Modal
        open={!!editing}
        title="Edit question"
        contentClassName="modal-wide"
        footer={
          <>
            <button type="button" className="secondary" onClick={closeEdit}>
              Cancel
            </button>
            <button
              type="submit"
              form="edit-question-form"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <form id="edit-question-form" onSubmit={handleSaveEdit}>
          {saveErr ? <div className="alert alert-error">{saveErr}</div> : null}
          <div className="input-group">
            <label htmlFor="edit-qtext">Question</label>
            <textarea
              id="edit-qtext"
              value={form.questionText}
              maxLength={QUESTION_FIELD_LIMITS.QUESTION_MAX + 50}
              onChange={(e) =>
                setForm((f) => ({ ...f, questionText: e.target.value }))
              }
            />
            {fieldErrors.question ? (
              <span className="error-text">{fieldErrors.question}</span>
            ) : null}
          </div>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="input-group">
              <label htmlFor={`edit-opt${n}`}>Option {n}</label>
              <input
                id={`edit-opt${n}`}
                type="text"
                value={form[`option${n}`]}
                maxLength={QUESTION_FIELD_LIMITS.OPTION_MAX + 50}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [`option${n}`]: e.target.value }))
                }
              />
              {fieldErrors[`option${n}`] ? (
                <span className="error-text">{fieldErrors[`option${n}`]}</span>
              ) : null}
            </div>
          ))}
          <div className="input-group">
            <label htmlFor="edit-correct">Correct answer</label>
            <select
              id="edit-correct"
              value={form.correctAnswer}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  correctAnswer: parseInt(e.target.value, 10),
                }))
              }
            >
              <option value={0}>Option 1 (A)</option>
              <option value={1}>Option 2 (B)</option>
              <option value={2}>Option 3 (C)</option>
              <option value={3}>Option 4 (D)</option>
            </select>
          </div>
          <div className="options-grid">
            <div className="input-group">
              <label htmlFor="edit-difficulty">Difficulty</label>
              <select
                id="edit-difficulty"
                value={form.difficulty}
                onChange={(e) =>
                  setForm((f) => ({ ...f, difficulty: e.target.value }))
                }
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            
            <div className="input-group">
              <label htmlFor="edit-points">Points</label>
              <input
                id="edit-points"
                type="number"
                min="0"
                value={form.points}
                onChange={(e) =>
                  setForm((f) => ({ ...f, points: e.target.value }))
                }
              />
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleting}
        title="Delete question"
        footer={
          <>
            <button
              type="button"
              className="secondary"
              onClick={() => setDeleting(null)}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="button" onClick={confirmDelete} disabled={saving}>
              {saving ? "Deleting…" : "Delete"}
            </button>
          </>
        }
      >
        <p>
          Delete this question permanently? This cannot be undone.
        </p>
      </Modal>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Question</th>
              <th>Options</th>
              <th>Correct</th>
              <th>Points / Diff</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="empty-state">
                  Loading…
                </td>
              </tr>
            ) : questions.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-state">
                  No questions yet.
                </td>
              </tr>
            ) : (
              questions.map((q) => (
                <tr key={q.id}>
                  <td className="question-cell">{q.question}</td>
                  <td>
                    <ul className="options-list">
                      {(q.options || []).map((opt, i) => (
                        <li key={i}>
                          {LABELS[i]}. {opt}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    {LABELS[q.correct_answer] ?? q.correct_answer} (index{" "}
                    {q.correct_answer})
                  </td>
                  <td>
                    {q.points} pt(s)
                    <br />
                    <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'capitalize' }}>{q.difficulty}</span>
                  </td>
                  <td className="text-center actions-cell">
                    <button
                      type="button"
                      className="link-btn small-action"
                      onClick={() => openEdit(q)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="link-btn small-action danger-link"
                      onClick={() => setDeleting(q)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
