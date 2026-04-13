import { useState } from "react";
import { api } from "../../api/client.js";
import { validateQuestionFields } from "../../utils/questionFormValidation.js";

export default function AddQuestionForm({ token, onUnauthorized }) {
  const [questionText, setQuestionText] = useState("");
  const [option1, setOption1] = useState("");
  const [option2, setOption2] = useState("");
  const [option3, setOption3] = useState("");
  const [option4, setOption4] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [difficulty, setDifficulty] = useState("easy");
  const [points, setPoints] = useState(1);
  const [fieldErrors, setFieldErrors] = useState({});
  const [addMsg, setAddMsg] = useState("");
  const [addErr, setAddErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setQuestionText("");
    setOption1("");
    setOption2("");
    setOption3("");
    setOption4("");
    setCorrectAnswer(0);
    setDifficulty("easy");
    setPoints(1);
    setFieldErrors({});
    setAddErr("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setAddMsg("");
    setAddErr("");
    const validationErrors = validateQuestionFields({
      questionText,
      option1,
      option2,
      option3,
      option4,
      correctAnswer,
    });
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await api.post(
        "/api/admin/add-question",
        {
          question: questionText.trim(),
          options: [
            option1.trim(),
            option2.trim(),
            option3.trim(),
            option4.trim(),
          ],
          correctAnswer,
          difficulty,
          points: parseInt(points, 10) || 1,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setAddMsg("Question added successfully!");
      resetForm();
    } catch (err) {
      setAddErr(err.response?.data?.error || "Failed to add question");
      if (err.response?.status === 401) onUnauthorized?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-container">
      <div className="form-card">
        <h2 className="form-title">Add New Question</h2>

        {addErr && <div className="alert alert-error">{addErr}</div>}
        {addMsg && <div className="alert alert-success">{addMsg}</div>}

        <form className="q-form" onSubmit={handleSubmit} noValidate>
          <div className="input-group">
            <label htmlFor="qtext">Question Text</label>
            <textarea
              id="qtext"
              placeholder="Enter your question here..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className={fieldErrors.question ? "input-error" : ""}
            />
            {fieldErrors.question && (
              <span className="error-text">{fieldErrors.question}</span>
            )}
          </div>

          <div className="options-grid">
            {[
              {
                id: "opt1",
                label: "Option 1",
                val: option1,
                set: setOption1,
                err: fieldErrors.option1,
              },
              {
                id: "opt2",
                label: "Option 2",
                val: option2,
                set: setOption2,
                err: fieldErrors.option2,
              },
              {
                id: "opt3",
                label: "Option 3",
                val: option3,
                set: setOption3,
                err: fieldErrors.option3,
              },
              {
                id: "opt4",
                label: "Option 4",
                val: option4,
                set: setOption4,
                err: fieldErrors.option4,
              },
            ].map((opt) => (
              <div key={opt.id} className="input-group">
                <label htmlFor={opt.id}>{opt.label}</label>
                <input
                  id={opt.id}
                  type="text"
                  placeholder={`Enter ${opt.label}`}
                  value={opt.val}
                  onChange={(e) => opt.set(e.target.value)}
                  className={opt.err ? "input-error" : ""}
                />
                {opt.err && <span className="error-text">{opt.err}</span>}
              </div>
            ))}
          </div>

          <div className="input-group">
            <label htmlFor="correct">Mark Correct Answer</label>
            <select
              id="correct"
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(parseInt(e.target.value, 10))}
            >
              <option value={0}>Option 1 (A)</option>
              <option value={1}>Option 2 (B)</option>
              <option value={2}>Option 3 (C)</option>
              <option value={3}>Option 4 (D)</option>
            </select>
          </div>

          <div className="options-grid">
            <div className="input-group">
              <label htmlFor="difficulty">Difficulty</label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            
            <div className="input-group">
              <label htmlFor="points">Points</label>
              <input
                id="points"
                type="number"
                min="0"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
              />
            </div>
          </div>

          <button className="submit-btn" type="submit" disabled={submitting}>
            {submitting ? "Processing..." : "Create Question"}
          </button>
        </form>
      </div>
    </div>
  );
}
