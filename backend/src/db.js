import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      team_name VARCHAR(255) NOT NULL,
      participant_name VARCHAR(255) NOT NULL,
      roll_no VARCHAR(100) NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      tab_switch_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      question TEXT NOT NULL,
      options JSONB NOT NULL,
      correct_answer SMALLINT NOT NULL,
      difficulty VARCHAR(20) DEFAULT 'easy',
      points INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT options_len CHECK (jsonb_array_length(options) = 4),
      CONSTRAINT correct_idx CHECK (correct_answer >= 0 AND correct_answer <= 3)
    );
  `);
  
  await pool.query(`
    ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'easy';
  `);
  
  await pool.query(`
    ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 1;
  `);

  await pool.query(`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS submitted BOOLEAN DEFAULT FALSE;
  `);

  await pool.query(`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
  `);

  await pool.query(`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS quiz_start_time TIMESTAMPTZ;
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '{}'::jsonb;
  `);
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS current_question_index INTEGER NOT NULL DEFAULT 0;
  `);
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS question_order JSONB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(50) PRIMARY KEY,
      value JSONB NOT NULL
    );
  `);

  // Insert default values if not exists
  await pool.query(`
    INSERT INTO settings (key, value)
    VALUES ('quiz_duration_minutes', '30'::jsonb)
    ON CONFLICT (key) DO NOTHING;
  `);

  try {
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_team_participant_roll_unique
      ON users (team_name, participant_name, roll_no);
    `);
  } catch (e) {
    console.warn(
      "Could not create unique index on users (team_name, participant_name, roll_no). Remove duplicate rows if needed:",
      e.message,
    );
  }
}

export { pool };
