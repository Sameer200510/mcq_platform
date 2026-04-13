const QUESTION_MAX = 10000;
const OPTION_MAX = 2000;

export function validateQuestionFields({
  questionText,
  option1,
  option2,
  option3,
  option4,
  correctAnswer,
}) {
  const errors = {};
  const q = questionText.trim();
  if (!q) errors.question = "Question is required.";
  else if (q.length > QUESTION_MAX)
    errors.question = `Question must be at most ${QUESTION_MAX} characters.`;

  const opts = [option1, option2, option3, option4].map((o) => String(o).trim());
  opts.forEach((opt, index) => {
    if (!opt) errors[`option${index + 1}`] = `Option ${index + 1} is required.`;
    else if (opt.length > OPTION_MAX)
      errors[`option${index + 1}`] =
        `Option ${index + 1} must be at most ${OPTION_MAX} characters.`;
  });

  if (
    typeof correctAnswer !== "number" ||
    correctAnswer < 0 ||
    correctAnswer > 3
  ) {
    errors.correctAnswer = "Select a valid correct answer (A–D).";
  }
  return errors;
}

export const QUESTION_FIELD_LIMITS = { QUESTION_MAX, OPTION_MAX };
