import { Router } from "express";
import { body, validationResult } from "express-validator";
import { pool } from "../db.js";

const router = Router();

router.post(
  "/login",
  [
    body("teamName").trim().notEmpty().isLength({ max: 255 }),
    body("participantName").trim().notEmpty().isLength({ max: 255 }),
    body("rollNo").trim().notEmpty().isLength({ max: 100 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { teamName, participantName, rollNo } = req.body;

      const existing = await pool.query(
        `SELECT id FROM users
         WHERE team_name = $1 AND participant_name = $2 AND roll_no = $3`,
        [teamName, participantName, rollNo],
      );

      if (existing.rows.length > 0) {
        const userId = existing.rows[0].id;

        const userData = await pool.query(
          `SELECT submitted, quiz_start_time FROM users WHERE id = $1`,
          [userId],
        );

        return res.json({
          userId,
          alreadySubmitted: userData.rows[0]?.submitted || false,
          quizStartTime: userData.rows[0]?.quiz_start_time,
        });
      }

      const inserted = await pool.query(
        `INSERT INTO users (team_name, participant_name, roll_no, quiz_start_time)
         VALUES ($1, $2, $3, NOW())
         RETURNING id`,
        [teamName, participantName, rollNo],
      );

      return res.json({
        userId: inserted.rows[0].id,
        alreadySubmitted: false,
      });
    } catch (err) {
      console.error(err);

      if (err.code === "23505") {
        const retry = await pool.query(
          `SELECT id FROM users
           WHERE team_name = $1 AND participant_name = $2 AND roll_no = $3`,
          [req.body.teamName, req.body.participantName, req.body.rollNo],
        );

        if (retry.rows.length > 0) {
          return res.json({
            userId: retry.rows[0].id,
            alreadySubmitted: false,
          });
        }
      }

      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
