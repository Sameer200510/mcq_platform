import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { shuffleArray } from "../utils/shuffle.js";
import {
  buildSubmitPayload,
  countAnsweredQuestions,
} from "../utils/quizPayload.js";
import {
  normalizeAnswersMap,
  orderQuestionsFromProgress,
} from "../utils/questionSession.js";
import { useQuizGuards } from "../hooks/useQuizGuards.js";
import Modal from "../components/Modal.jsx";
import QuizQuestionSlide from "../components/quiz/QuizQuestionSlide.jsx";

const SAVE_DEBOUNCE_MS = 450;

const authHeaders = (userId) => ({ "X-User-Id": String(userId) });

export default function QuizPage() {
  const navigate = useNavigate();
  const userId = sessionStorage.getItem("userId");
  const [questions, setQuestions] = useState([]);
  const [answersByQuestionId, setAnswersByQuestionId] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showUnansweredModal, setShowUnansweredModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const timerRef = useRef(null);
  const startedRef = useRef(false);
  const autoFireRef = useRef(false);
  const inFlightRef = useRef(false);

  useQuizGuards();

  const reportTabSwitch = useCallback(() => {
    if (!userId) return;
    api
      .post(
        "/api/quiz/tab-switch",
        { userId: parseInt(userId, 10) },
        { headers: authHeaders(userId) },
      )
      .catch(() => {});
  }, [userId]);

  const performSubmit = useCallback(
    async (payload) => {
      if (inFlightRef.current || submitted || !userId) return;
      if (!payload || Object.keys(payload).length === 0) {
        setError("You must select at least one answer before submitting.");
        return;
      }
      inFlightRef.current = true;
      setSubmitting(true);
      setError("");
      try {
        await api.post(
          "/api/quiz/submit",
          {
            userId: parseInt(userId, 10),
            answers: payload,
          },
          { headers: authHeaders(userId) },
        );
        setSubmitted(true);
        sessionStorage.removeItem("userId");
        setShowConfirmModal(false);
        setShowUnansweredModal(false);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (err) {
        autoFireRef.current = false;
        setError(err.response?.data?.error || "Submit failed");
      } finally {
        setSubmitting(false);
        inFlightRef.current = false;
      }
    },
    [submitted, userId],
  );

  useEffect(() => {
    if (!userId) {
      navigate("/", { replace: true });
      return;
    }

    let cancelled = false;

    async function loadQuizSession() {
      try {
        const [questionsResponse, progressResponse] = await Promise.all([
          api.get("/api/quiz/questions", {
            headers: authHeaders(userId),
          }),
          api.get(`/api/quiz/progress/${userId}`, {
            headers: authHeaders(userId),
          }),
        ]);

        if (cancelled) return;

        const list = questionsResponse.data.questions || [];
        const progress = progressResponse.data || {};

        if (progress.submitted) {
          setSubmitted(true);
          setLoading(false);
          return;
        }

        let startTime;

        if (progress.quizStartTime) {
          startTime = new Date(progress.quizStartTime).getTime();
        } else {
          startTime = Date.now();
        }
        
        const durationSec = (progress.quizDurationMinutes || 30) * 60;
        
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        const remaining = durationSec - elapsed;

        setSecondsLeft(remaining > 0 ? remaining : 0);

        const ordered = orderQuestionsFromProgress(
          list,
          progress.questionOrder,
        );

        const sessionQuestions = ordered ?? shuffleArray(list);

        setQuestions(sessionQuestions);
        setAnswersByQuestionId(normalizeAnswersMap(progress.answers));

        const maxIdx = Math.max(0, sessionQuestions.length - 1);
        const savedIdx = Number.isInteger(progress.currentQuestionIndex)
          ? progress.currentQuestionIndex
          : 0;

        setCurrentQuestionIndex(Math.min(Math.max(0, savedIdx), maxIdx));
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || "Could not load quiz");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadQuizSession();

    return () => {
      cancelled = true;
    };
  }, [userId, navigate]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        reportTabSwitch();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [reportTabSwitch]);

  useEffect(() => {
    if (loading || submitted || !userId || questions.length === 0) return;

    if (!startedRef.current) {
      startedRef.current = true;
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch {}
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((previous) => (previous <= 1 ? 0 : previous - 1));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [loading, submitted, userId, questions.length]);

  const submitQuizFromTimer = useCallback(() => {
    const payload = buildSubmitPayload(questions, answersByQuestionId);
    if (Object.keys(payload).length === 0) return;
    performSubmit(payload);
  }, [questions, answersByQuestionId, performSubmit]);

  useEffect(() => {
    if (
      secondsLeft !== 0 ||
      submitted ||
      loading ||
      questions.length === 0 ||
      autoFireRef.current
    ) {
      return;
    }
    autoFireRef.current = true;
    submitQuizFromTimer();
  }, [secondsLeft, submitted, loading, questions.length, submitQuizFromTimer]);

  useEffect(() => {
    if (!userId || loading || submitted || questions.length === 0) return;

    const answersPayload = Object.fromEntries(
      Object.entries(answersByQuestionId).map(([key, value]) => [
        String(key),
        value,
      ]),
    );

    const orderIds = questions.map((q) => q.id);

    const timerId = setTimeout(() => {
      api
        .post(
          "/api/quiz/save-progress",
          {
            userId: parseInt(userId, 10),
            answers: answersPayload,
            currentQuestionIndex,
            questionOrder: orderIds,
          },
          { headers: authHeaders(userId) },
        )
        .catch(() => {});
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timerId);
  }, [
    answersByQuestionId,
    currentQuestionIndex,
    questions,
    userId,
    loading,
    submitted,
  ]);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const isLastQuestion =
    totalQuestions > 0 && currentQuestionIndex === totalQuestions - 1;

  function handleSelectOption(questionId, optionIndex) {
    setAnswersByQuestionId((previous) => ({
      ...previous,
      [questionId]: optionIndex,
    }));
  }

  function handleNext() {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((index) => index + 1);
    }
  }

  function handleBack() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((index) => index - 1);
    }
  }

  function openSubmitFlow() {
    const answered = countAnsweredQuestions(questions, answersByQuestionId);
    if (answered < totalQuestions) {
      setShowUnansweredModal(true);
    } else {
      setShowConfirmModal(true);
    }
  }

  function handleUnansweredContinue() {
    setShowUnansweredModal(false);
    setShowConfirmModal(true);
  }

  function handleUnansweredCancel() {
    setShowUnansweredModal(false);
  }

  function handleConfirmNo() {
    setShowConfirmModal(false);
  }

  function handleConfirmYes() {
    const payload = buildSubmitPayload(questions, answersByQuestionId);
    if (Object.keys(payload).length === 0) {
      setError("You must select at least one answer before submitting.");
      setShowConfirmModal(false);
      return;
    }
    performSubmit(payload);
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  if (!userId) return null;

  if (submitted) {
    return (
      <div className="container center-content">
        <div className="card success-msg">
          <div className="icon-circle">✓</div>
          <h2>Quiz Submitted Successfully</h2>
          <p>Thank you for participating!</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container center-content">
        <div className="loading-box">Loading your quiz...</div>
      </div>
    );
  }

  return (
    <div
      className="container quiz-layout"
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
    >
      <Modal
        open={showUnansweredModal}
        title="Unanswered questions"
        footer={
          <>
            <button className="secondary" onClick={handleUnansweredCancel}>
              Cancel
            </button>
            <button onClick={handleUnansweredContinue}>Continue</button>
          </>
        }
      >
        <p>Some questions are unanswered. Are you sure you want to submit?</p>
      </Modal>

      <Modal
        open={showConfirmModal}
        title="Submit quiz"
        footer={
          <>
            <button className="secondary" onClick={handleConfirmNo}>
              No
            </button>
            <button onClick={handleConfirmYes} disabled={submitting}>
              {submitting ? "Submitting…" : "Yes, Submit"}
            </button>
          </>
        }
      >
        <p>Are you sure you want to submit the quiz?</p>
      </Modal>

      <div className="card quiz-card">
        <div className="quiz-header">
          <h1>MCQ Challenge</h1>
          <div className={`timer ${secondsLeft < 60 ? "timer-danger" : ""}`}>
            <span>Time Left:</span> <strong>{formatTime(secondsLeft)}</strong>
          </div>
        </div>

        <div className="quiz-meta">
          <div className="progress-text">
            Question{" "}
            <strong>{totalQuestions ? currentQuestionIndex + 1 : 0}</strong> of{" "}
            {totalQuestions}
          </div>
        </div>

        {error ? <div className="error">{error}</div> : null}

        {totalQuestions === 0 ? (
          <div className="empty-state">No questions available.</div>
        ) : (
          <div className="quiz-body">
            <QuizQuestionSlide
              question={currentQuestion}
              displayNumber={currentQuestionIndex + 1}
              selectedOptionIndex={answersByQuestionId[currentQuestion?.id]}
              onSelectOption={handleSelectOption}
            />

            <div className="quiz-nav">
              <button
                type="button"
                className="secondary"
                onClick={handleBack}
                disabled={currentQuestionIndex === 0}
              >
                Back
              </button>

              {!isLastQuestion ? (
                <button type="button" onClick={handleNext}>
                  Next Question
                </button>
              ) : (
                <button
                  type="button"
                  className="submit-action"
                  onClick={openSubmitFlow}
                >
                  Finish & Submit
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
