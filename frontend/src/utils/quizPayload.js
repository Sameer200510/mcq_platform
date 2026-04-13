/**
 * Build answers payload for POST /api/quiz/submit (question id string -> option index).
 */
export function buildSubmitPayload(questions, answersByQuestionId) {
  const payload = {};
  questions.forEach((question) => {
    const selectedIndex = answersByQuestionId[question.id];
    if (typeof selectedIndex === "number") {
      payload[String(question.id)] = selectedIndex;
    }
  });
  return payload;
}

export function countAnsweredQuestions(questions, answersByQuestionId) {
  return questions.filter(
    (q) => typeof answersByQuestionId[q.id] === "number"
  ).length;
}
