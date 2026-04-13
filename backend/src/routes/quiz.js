import { Router } from "express";
import { body, validationResult } from "express-validator";
import { pool } from "../db.js";

const router = Router();

async function userExists(userId) {
  const r = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
  return r.rows.length > 0;
}

router.get("/questions", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(400).json({ error: "UserId required" });

    const result = await pool.query(
      `SELECT id, question, options FROM questions`,
    );

    res.json({ questions: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/progress/:userId", async (req, res) => {
  try {
    const uid = parseInt(req.params.userId);

    const row = await pool.query(
      `SELECT answers, current_question_index, question_order, submitted, quiz_start_time
       FROM users WHERE id = $1`,
      [uid],
    );

    const settingRow = await pool.query(
      `SELECT value FROM settings WHERE key = 'quiz_duration_minutes'`
    );
    let quizDurationMinutes = 30;
    if (settingRow.rows.length > 0) {
      quizDurationMinutes = Number(settingRow.rows[0].value) || 30;
    }

    const u = row.rows[0];

    res.json({
      answers: u.answers || {},
      currentQuestionIndex: u.current_question_index || 0,
      questionOrder: u.question_order || null,
      submitted: u.submitted || false,
      quizStartTime: u.quiz_start_time,
      quizDurationMinutes,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/save-progress",
  [
    body("userId").isInt(),
    body("answers").isObject(),
    body("currentQuestionIndex").isInt(),
  ],
  async (req, res) => {
    try {
      const { userId, answers, currentQuestionIndex } = req.body;

      await pool.query(
        `UPDATE users
         SET answers = $1, current_question_index = $2
         WHERE id = $3`,
        [JSON.stringify(answers), currentQuestionIndex, userId],
      );

      res.json({ message: "Saved" });
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post(
  "/submit",
  [body("answers").isObject(), body("userId").isInt()],
  async (req, res) => {
    try {
      const { answers, userId } = req.body;

      const qResult = await pool.query(
        `SELECT id, correct_answer, points FROM questions ORDER BY id ASC`,
      );

      let score = 0;

      qResult.rows.forEach((row) => {
        if (answers[row.id] === row.correct_answer) {
          score += (row.points || 0);
        }
      });

      await pool.query(
        `UPDATE users
         SET score = $1,
             answers = $2,
             submitted = TRUE,
             submitted_at = NOW(),
             current_question_index = 0,
             question_order = NULL
         WHERE id = $3`,
        [score, JSON.stringify(answers), userId],
      );

      res.json({ message: "Submitted" });
    } catch {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post("/tab-switch", async (req, res) => {
  try {
    const { userId } = req.body;

    await pool.query(
      `UPDATE users
       SET tab_switch_count = tab_switch_count + 1
       WHERE id = $1`,
      [userId],
    );

    res.json({ message: "Recorded" });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
