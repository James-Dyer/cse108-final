import { useState, useEffect } from 'react';
import axios from 'axios';
import './StudentDashboard.css';

const API_URL = 'http://localhost:8000/api';

export default function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      // Redirect to home if not logged in
      window.location.href = '/';
    }

    // Load questions from localStorage
    const storedQuestions = localStorage.getItem('studentQuestions');
    if (storedQuestions) {
      setQuestions(JSON.parse(storedQuestions));
    }
  }, []);

  // Save questions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('studentQuestions', JSON.stringify(questions));
  }, [questions]);

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    
    if (!newQuestion.trim()) {
      setError('Please enter a question');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/tutor/hint`, {
        assignment: 'Student Question',
        student_code: '',
        question: newQuestion
      });

      const questionObj = {
        id: Date.now(),
        question: newQuestion,
        answer: response.data.hint,
        timestamp: new Date().toLocaleString(),
        expanded: true
      };

      setQuestions([questionObj, ...questions]);
      setNewQuestion('');
      setExpandedId(questionObj.id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to get tutor response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('studentQuestions');
    window.location.href = '/';
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="student-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>CodeMentor - Student Dashboard</h1>
          <div className="user-info">
            <span>Welcome, {user.username}!</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="question-input-section">
          <h2>Ask Your Tutor</h2>
          <form onSubmit={handleAddQuestion}>
            <div className="form-group">
              <textarea
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Ask a programming question... (e.g., 'How do I write a function in Python?' or 'Can you explain loops?')"
                rows="4"
                disabled={loading}
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading}
            >
              {loading ? 'Getting Response...' : 'Ask Tutor'}
            </button>
          </form>
        </section>

        <section className="questions-history-section">
          <h2>Question History ({questions.length})</h2>
          {questions.length === 0 ? (
            <p className="no-questions">No questions yet. Ask your first question above!</p>
          ) : (
            <div className="questions-list">
              {questions.map((q) => (
                <div key={q.id} className="question-card">
                  <div 
                    className="question-header"
                    onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                  >
                    <div className="question-title">
                      <span className="toggle-icon">
                        {expandedId === q.id ? '▼' : '▶'}
                      </span>
                      <strong>{q.question}</strong>
                    </div>
                    <span className="question-time">{q.timestamp}</span>
                  </div>
                  
                  {expandedId === q.id && (
                    <div className="question-answer">
                      <div className="answer-header">
                        <strong>Tutor Response:</strong>
                      </div>
                      <div className="answer-text">
                        {q.answer}
                      </div>
                      <button 
                        className="delete-btn"
                        onClick={() => deleteQuestion(q.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
