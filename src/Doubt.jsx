import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiClock, FiSend, FiTrash2 } from 'react-icons/fi';
import { FaRobot } from 'react-icons/fa';
import './doubt.css';

const Doubt = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/ai/history', { credentials: 'include' });
      if (!res.ok) throw new Error('Fetch error');
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setError('Query must be at least 2 characters.');
      return;
    }
    if (trimmed.length > 300) {
      setError('Query must be under 300 characters.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:5000/api/ai/search', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Search failed');
      }

      const data = await res.json();
      setResults(data);
      fetchHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteHistoryItem = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/ai/history/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      setHistory(prev => prev.filter(item => item._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAllHistory = async () => {
    if (!window.confirm("Are you sure you want to delete all search history?")) return;
    try {
      await fetch('http://localhost:5000/api/ai/history', {
        method: 'DELETE',
        credentials: 'include'
      });
      setHistory([]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [results]);

  return (
    <div className="ai-container">
      <div className="history-panel">
        <h3>
          <FiClock className="history-icon" /> History
          {history.length > 0 && (
            <button onClick={deleteAllHistory} className="delete-all-btn">
              <FiTrash2 /> Clear All
            </button>
          )}
        </h3>
        {history.length === 0 ? (
          <p>No history yet</p>
        ) : (
          <ul>
            {history.map((item) => (
              <li key={item._id}>
                <span
                  onClick={() => {
                    setQuery(item.query);
                    handleSearch();
                  }}
                  className="clickable-query"
                >
                  {item.query}
                </span>
                <button
                  onClick={() => deleteHistoryItem(item._id)}
                  className="delete-btn"
                >
                  <FiTrash2 />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="chat-panel">
        <div className="ai-search-header">
          <FaRobot className="ai-logo" />
          <h2>Lovable AI Assistant</h2>
        </div>

        <form onSubmit={handleSearch} className="ai-search-form">
          <div className="search-input-container">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask your doubt..."
              className="ai-search-input"
            />
            <button type="submit" className="ai-search-button" disabled={loading}>
              {loading ? 'Searching...' : <><FiSend /> Ask</>}
            </button>
          </div>
        </form>

        {error && <div className="ai-error">{error}</div>}

        {results && (
          <div ref={resultsRef} className="ai-results">
            <h3>Results:</h3>
            <div className="ai-response">
              {results.response.split('\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Doubt;
