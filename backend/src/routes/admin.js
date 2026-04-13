import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = Router();

const ADMIN_USER = "admin";
const ADMIN_PASS = "AdminCtf*123,,,";

router.post(
  "/login",
  [body("username").trim().notEmpty(), body("password").notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { username, password } = req.body;
      if (username !== ADMIN_USER || password !== ADMIN_PASS) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const secret = process.env.ADMIN_JWT_SECRET;
      if (!secret) {
        return res.status(500).json({ error: "Server configuration error" });
      }
      const token = jwt.sign({ role: "admin", sub: "admin" }, secret, {
        expiresIn: "2h",
      });
      return res.json({ token });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post(
  "/add-question",
  requireAdmin,
  [
    body("question").trim().notEmpty().isLength({ max: 10000 }),
    body("options").isArray({ min: 4, max: 4 }),
    body("options.*").trim().notEmpty().isLength({ max: 2000 }),
    body("correctAnswer").isInt({ min: 0, max: 3 }),
    body("difficulty").optional().isIn(['easy', 'medium', 'hard']),
    body("points").optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { question, options, correctAnswer, difficulty = 'easy', points = 1 } = req.body;
      const opts = options.map((o) => String(o).trim());
      if (opts.some((o) => !o)) {
        return res.status(400).json({ error: "All options must be non-empty" });
      }
      await pool.query(
        `INSERT INTO questions (question, options, correct_answer, difficulty, points)
         VALUES ($1, $2::jsonb, $3, $4, $5)`,
        [question, JSON.stringify(opts), correctAnswer, difficulty, points],
      );
      return res.json({ message: "Question added" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get("/questions", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, question, options, correct_answer, difficulty, points
       FROM questions
       ORDER BY id ASC`,
    );
    return res.json({ questions: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put(
  "/update-question/:id",
  requireAdmin,
  [
    param("id").isInt({ min: 1 }),
    body("question").trim().notEmpty().isLength({ max: 10000 }),
    body("options").isArray({ min: 4, max: 4 }),
    body("options.*").trim().notEmpty().isLength({ max: 2000 }),
    body("correctAnswer").isInt({ min: 0, max: 3 }),
    body("difficulty").optional().isIn(['easy', 'medium', 'hard']),
    body("points").optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const id = parseInt(String(req.params.id), 10);
      const { question, options, correctAnswer, difficulty = 'easy', points = 1 } = req.body;
      const opts = options.map((o) => String(o).trim());
      if (opts.some((o) => !o)) {
        return res.status(400).json({ error: "All options must be non-empty" });
      }
      const upd = await pool.query(
        `UPDATE questions
         SET question = $1, options = $2::jsonb, correct_answer = $3, difficulty = $4, points = $5
         WHERE id = $6
         RETURNING id`,
        [question, JSON.stringify(opts), correctAnswer, difficulty, points, id],
      );
      if (upd.rows.length === 0) {
        return res.status(404).json({ error: "Question not found" });
      }
      return res.json({ message: "Question updated" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.delete(
  "/delete-question/:id",
  requireAdmin,
  [param("id").isInt({ min: 1 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const id = parseInt(String(req.params.id), 10);
      const del = await pool.query(
        `DELETE FROM questions WHERE id = $1 RETURNING id`,
        [id],
      );
      if (del.rows.length === 0) {
        return res.status(404).json({ error: "Question not found" });
      }
      return res.json({ message: "Question deleted" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get("/results", requireAdmin, async (req, res) => {
  try {
    const questionsResult = await pool.query(
      `SELECT id, correct_answer, difficulty, points FROM questions ORDER BY id ASC`,
    );
    const questions = questionsResult.rows;

    const result = await pool.query(
      `SELECT id, team_name, participant_name, roll_no, score, tab_switch_count, answers, submitted_at, quiz_start_time
       FROM users
       ORDER BY id ASC`,
    );

    const participants = result.rows.map((user) => {
      let easy_score = 0;
      let medium_score = 0;
      let hard_score = 0;

      const userAnswers = user.answers || {};

      questions.forEach((q) => {
        if (userAnswers[q.id] === q.correct_answer) {
          const pts = q.points || 0;
          if (q.difficulty === 'easy') {
            easy_score += pts;
          } else if (q.difficulty === 'medium') {
            medium_score += pts;
          } else if (q.difficulty === 'hard') {
            hard_score += pts;
          }
        }
      });

      return {
        id: user.id,
        team_name: user.team_name,
        participant_name: user.participant_name,
        roll_no: user.roll_no,
        score: user.score,
        tab_switch_count: user.tab_switch_count,
        easy_score: easy_score,
        medium_score: medium_score,
        hard_score: hard_score,
        submitted_at: user.submitted_at,
        quiz_start_time: user.quiz_start_time
      };
    });

    return res.json({ participants });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete(
  "/delete-user/:id",
  requireAdmin,
  [param("id").isInt({ min: 1 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const id = parseInt(String(req.params.id), 10);
      const del = await pool.query(
        `DELETE FROM users WHERE id = $1 RETURNING id`,
        [id],
      );
      if (del.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      return res.json({ message: "User deleted" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get("/settings", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`SELECT key, value FROM settings`);
    const settings = {};
    result.rows.forEach((row) => {
      settings[row.key] = row.value;
    });
    return res.json({ settings });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put(
  "/settings",
  requireAdmin,
  [body("quiz_duration_minutes").isInt({ min: 1 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { quiz_duration_minutes } = req.body;
      
      await pool.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        ['quiz_duration_minutes', JSON.stringify(quiz_duration_minutes)]
      );
      
      return res.json({ message: "Settings updated" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
