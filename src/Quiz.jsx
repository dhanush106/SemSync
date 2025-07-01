import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  FaQuestionCircle,
  FaClock,
  FaHistory,
  FaTrophy
} from 'react-icons/fa';
import { useAuth } from './AuthContext';
import './quiz.css';

const Quiz = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [stage, setStage] = useState('setup');
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [timeLimit, setTimeLimit] = useState(10);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizHistory, setQuizHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 🔐 Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [loading, user, navigate]);

  // ⏱ Timer countdown
  useEffect(() => {
    if (stage !== 'quiz' || timeLeft <= 0) return;

    const timer = setTimeout(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleNextQuestion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, stage]);

  // 🕘 Load quiz history
  useEffect(() => {
    if (user) {
      axios
        .get('http://localhost:5000/api/quiz/history', {
          withCredentials: true,
        })
        .then((res) => setQuizHistory(res.data.history))
        .catch((err) => console.error('Error loading quiz history', err));
    }
  }, [user]);

  const startQuiz = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.post(
        'http://localhost:5000/api/quiz/generate',
        {
          topic,
          numQuestions,
        },
        { withCredentials: true }
      );
      setQuestions(res.data.questions);
      setSelectedAnswers([]);
      setCurrentQuestion(0);
      setTimeLeft(timeLimit * 60);
      setStage('quiz');
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to generate quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (index) => {
    const updated = [...selectedAnswers];
    updated[currentQuestion] = index;
    setSelectedAnswers(updated);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    let correct = 0;

    questions.forEach((q, i) => {
      if (selectedAnswers[i] !== undefined && selectedAnswers[i] === q.correctAnswer) {
        correct++;
      }
    });

    const finalScore = Math.round((correct / questions.length) * 100);
    setScore(finalScore);

    try {
      await axios.post(
        'http://localhost:5000/api/quiz/save-history',
        {
          topic,
          score: finalScore,
          totalQuestions: questions.length,
          timeTaken: timeLimit * 60 - timeLeft,
          totalTime: timeLimit * 60,
        },
        { withCredentials: true }
      );
      const historyRes = await axios.get('http://localhost:5000/api/quiz/history', {
        withCredentials: true,
      });
      setQuizHistory(historyRes.data.history);
    } catch (err) {
      console.error('Error saving history:', err);
    }

    setStage('results');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const restartQuiz = () => {
    setStage('setup');
    setTopic('');
    setNumQuestions(5);
    setTimeLimit(10);
  };

  if (loading) return <p>Loading...</p>;
  if (!user) return null;

  return (
    <div className="quiz-app">
      <header className="quiz-header">
        <h1>
          <FaQuestionCircle /> Quiz Master
        </h1>
        <p>Test your knowledge on any topic!</p>
      </header>

      <main className="quiz-container">
        {stage === 'setup' && (
          <div className="quiz-setup glass-card">
            <h2>Create Your Quiz</h2>
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label>Topic:</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Number of Questions: {numQuestions}</label>
              <input
                type="range"
                min="3"
                max="20"
                value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Time Limit (minutes): {timeLimit}</label>
              <input
                type="range"
                min="1"
                max="30"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value))}
              />
            </div>

            <button onClick={startQuiz} disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Start Quiz'}
            </button>
          </div>
        )}

        {stage === 'quiz' && questions.length > 0 && (
          <div className="quiz-questions glass-card">
            <div className="quiz-info">
              <span>
                <FaClock /> {formatTime(timeLeft)}
              </span>
              <span>
                Question {currentQuestion + 1}/{questions.length}
              </span>
            </div>

            <h3>{questions[currentQuestion].text}</h3>
            <div className="options-container">
              {questions[currentQuestion].options.map((opt, i) => (
                <button
                  key={i}
                  className={`option-button ${selectedAnswers[currentQuestion] === i ? 'selected' : ''}`}
                  onClick={() => handleAnswerSelect(i)}
                >
                  {String.fromCharCode(65 + i)}. {opt}
                </button>
              ))}
            </div>

            <div className="navigation-buttons">
              <button
                onClick={handleNextQuestion}
                disabled={selectedAnswers[currentQuestion] === undefined}
              >
                {currentQuestion === questions.length - 1 ? 'Finish Quiz' : 'Next'}
              </button>
            </div>
          </div>
        )}

        {stage === 'results' && (
          <div className="quiz-results glass-card">
            <h2>Results</h2>
            <div className="score-display">
              <FaTrophy size={40} />
              <span
                className={
                  score >= 70 ? 'high-score' : score >= 50 ? 'medium-score' : 'low-score'
                }
              >
                {score}%
              </span>
            </div>
            <p>You answered {score}% correctly.</p>
            <p>Time used: {formatTime(timeLimit * 60 - timeLeft)}</p>

            <h4>Review:</h4>
            {questions.map((q, i) => {
              const isCorrect = selectedAnswers[i] !== undefined && selectedAnswers[i] === q.correctAnswer;

              return (
                <div key={i} className={`review-item ${isCorrect ? 'correct' : 'incorrect'}`} >
                  <p>{i + 1}. {q.text}</p>
                  <p>Your answer: {selectedAnswers[i] !== undefined ? q.options[selectedAnswers[i]] : 'Not answered'}</p>
                  {!isCorrect && <p>Correct: {q.options[q.correctAnswer]}</p>}
                </div>
              );
            })}

            <button onClick={restartQuiz}>Start New Quiz</button>
          </div>
        )}
      </main>

      <aside className="quiz-history">
        <h3>
          <FaHistory /> Recent Quizzes
        </h3>
        {quizHistory.length > 0 ? (
  <ul>
    {quizHistory.map((quiz, index) => (
      <li key={index} className="history-item glass-card">
        <div><strong>Topic:</strong> {quiz.topic}</div>
        <div><strong>Score:</strong> {quiz.score}%</div>
        <div><strong>Time:</strong> {formatTime(quiz.timeTaken)} / {formatTime(quiz.totalTime)}</div>
        <div><strong>Date:</strong> {new Date(quiz.date).toLocaleDateString()}</div>
      </li>
    ))}
  </ul>
) : (
  <p>No quizzes yet</p>
)}

      </aside>
    </div>
  );
};

export default Quiz;
