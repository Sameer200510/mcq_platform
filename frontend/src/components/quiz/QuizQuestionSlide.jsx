export default function QuizQuestionSlide({
  question,
  displayNumber,
  selectedOptionIndex,
  onSelectOption,
}) {
  if (!question) return null;

  return (
    <div className="quiz-slide">
      <div className="question-header">
        <span className="q-number">Question {displayNumber}</span>
        <h2 className="question-text">{question.question}</h2>
      </div>

      <div className="options-container">
        {question.options.map((optionLabel, optionIndex) => {
          const isSelected = selectedOptionIndex === optionIndex;

          return (
            <label
              key={optionIndex}
              className={`option-card ${isSelected ? "selected" : ""}`}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={isSelected}
                onChange={() => onSelectOption(question.id, optionIndex)}
                className="hidden-radio"
              />
              <span className="option-indicator">
                {String.fromCharCode(65 + optionIndex)}
              </span>
              <span className="option-label-text">{optionLabel}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
