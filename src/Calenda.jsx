import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Calendar.css';
import { useAuth } from './AuthContext';

const DailyTracker = () => {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [feeling, setFeeling] = useState('Good');
  const [productivity, setProductivity] = useState(5);
  const [studyHours, setStudyHours] = useState(0);
  const [journal, setJournal] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  const api = axios.create({
    baseURL: 'http://localhost:5000',
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    }
  });
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const dateStr = selectedDate.toDateString();

      const [tasksResponse, journalResponse] = await Promise.all([
        api.get(`/api/calendar/tasks/${dateStr}`),
        api.get(`/api/calendar/journal/${dateStr}`)
      ]);

      setTasks(Array.isArray(tasksResponse?.data) ? tasksResponse.data : []);

      const journalData = journalResponse.data || {};
      setFeeling(journalData.feeling || 'Good');
      setProductivity(journalData.productivity || 5);
      setStudyHours(journalData.studyHours || 0);
      setJournal(journalData.content || '');

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch data');
      console.error('Fetch error:', err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const addTask = async () => {
    const taskText = prompt('Enter your task:');
    if (!taskText?.trim()) return;

    try {
      const response = await api.post('/api/calendar/tasks', {
        task: taskText.trim(),
        date: selectedDate.toDateString()
      });
      setTasks(prev => [...prev, response.data]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add task');
      console.error('Add task error:', err);
    }
  };

  const deleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await api.delete(`/api/calendar/tasks/${id}`);
      setTasks(prev => prev.filter(task => task._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete task');
      console.error('Delete task error:', err);
    }
  };

  const updateTaskCompletion = async (id, completed) => {
    try {
      await api.put(`/api/calendar/tasks/${id}/complete`, { completed });
      setTasks(prev => 
        prev.map(t => t._id === id ? { ...t, completed } : t)
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update task');
      console.error('Update task error:', err);
    }
  };

  const handleDragStart = (id) => setDraggedTaskId(id);

  const handleDrop = (toCompleted) => {
    if (draggedTaskId) {
      updateTaskCompletion(draggedTaskId, toCompleted);
      setDraggedTaskId(null);
    }
  };

  const saveJournal = async () => {
    try {
      await api.post('/api/calendar/journal', {
        date: selectedDate.toDateString(),
        feeling,
        productivity: Number(productivity),
        studyHours: Number(studyHours),
        content: journal
      });
      alert('Journal saved successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save journal');
      console.error('Journal save error:', err);
    }
  };

  const getCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const days = Array(firstDayOfMonth).fill(null);
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const tasksForSelectedDate = tasks.filter(t => t.date === selectedDate.toDateString());
  const remainingTasks = tasksForSelectedDate.filter(t => !t.completed);
  const completedTasks = tasksForSelectedDate.filter(t => t.completed);

  if (loading) {
    return (
      <div className="tracker-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="tracker-container">
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <header className="tracker-header">
        <h1>📅 Daily Tracker</h1>
        <p>Plan your day and track your progress</p>
      </header>

      <section className="tracker-main">
        <div className="tracker-date">
          <h2>{selectedDate.toDateString()}</h2>
          <p>📝 {tasksForSelectedDate.length} tasks &nbsp; ✅ {completedTasks.length} completed</p>
          <button className="add-task" onClick={addTask}>+ Add Task</button>
        </div>

        <div className="tracker-body">
          <div className="calendar">
            <h3>{selectedDate.toLocaleString('default', { month: 'long' })} {selectedDate.getFullYear()}</h3>
            <div className="calendar-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="calendar-weekday">{day}</div>
              ))}
            </div>
            <div className="calendar-grid">
              {getCalendarDays().map((day, index) => (
                <div
                  key={day ? day.toDateString() : `empty-${index}`}
                  className={`calendar-day ${day ? '' : 'empty'} ${
                    day?.toDateString() === selectedDate.toDateString() ? 'active' : ''
                  }`}
                  onClick={() => day && setSelectedDate(day)}
                >
                  {day?.getDate() || ''}
                </div>
              ))}
            </div>
            <button className="today-btn" onClick={() => setSelectedDate(new Date())}>Today</button>
          </div>

          <div className="tasks-section two-columns">
            <div
              className="task-card"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(false)}
            >
              <h3>🕗 Remaining Tasks</h3>
              {remainingTasks.length === 0 ? (
                <p>No tasks</p>
              ) : (
                remainingTasks.map((t) => (
                  <div
                    key={t._id}
                    className="task-item remaining-tasks"
                    draggable
                    onDragStart={() => handleDragStart(t._id)}
                  >
                    <span className="task-text">{t.task}</span>
                    <button 
                      className="delete-task-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTask(t._id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            <div
              className="task-card completed"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(true)}
            >
              <h3>✅ Completed</h3>
              {completedTasks.length === 0 ? (
                <p>No completed tasks</p>
              ) : (
                completedTasks.map((t) => (
                  <div
                    key={t._id}
                    className="task-item completed-tasks"
                    draggable
                    onDragStart={() => handleDragStart(t._id)}
                  >
                    <span className="task-text">{t.task}</span>
                    <button 
                      className="delete-task-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTask(t._id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="journal-section">
          <h3>📖 Daily Journal</h3>
          <div className="journal-fields">
            <label>How are you feeling?</label>
            <select value={feeling} onChange={(e) => setFeeling(e.target.value)}>
              <option value="Good">😀 Good</option>
              <option value="Okay">😐 Okay</option>
              <option value="Bad">😔 Bad</option>
            </select>

            <label>Productivity (1-10)</label>
            <input 
              type="number" 
              min="1" 
              max="10" 
              value={productivity} 
              onChange={(e) => {
                const val = Math.min(10, Math.max(1, parseInt(e.target.value) || 5));
                setProductivity(val);
              }} 
            />

            <label>Study Hours</label>
            <input 
              type="number" 
              min="0"
              value={studyHours} 
              onChange={(e) => setStudyHours(Math.max(0, parseInt(e.target.value) || 0))} 
            />

            <label>What happened today?</label>
            <textarea 
              value={journal} 
              onChange={(e) => setJournal(e.target.value)} 
              placeholder="Write about your day..." 
            />

            <button className="save-btn" onClick={saveJournal}>📥 Save Entry</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DailyTracker;