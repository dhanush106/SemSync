import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import BookClock from './components/BookClock';
import './Dash.css';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
});

const COLORS = [
  'rgba(255, 154, 162, 0.8)',
  'rgba(255, 183, 178, 0.8)',
  'rgba(255, 218, 193, 0.8)',
  'rgba(226, 240, 203, 0.8)',
  'rgba(181, 234, 215, 0.8)',
  'rgba(199, 206, 234, 0.8)'
];

const CARD_COLORS = [
  'rgba(255, 154, 162, 0.15)',
  'rgba(255, 183, 178, 0.15)',
  'rgba(255, 218, 193, 0.15)',
  'rgba(226, 240, 203, 0.15)',
  'rgba(181, 234, 215, 0.15)',
  'rgba(199, 206, 234, 0.15)',
  'rgba(162, 210, 255, 0.15)',
  'rgba(214, 162, 255, 0.15)'
];

function Dash() {
  const [subjects, setSubjects] = useState([]);
  const [quizHistory, setQuizHistory] = useState([]);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get('/subjects');
        setSubjects(res.data);
      } catch (err) {
        console.error('Error fetching subjects:', err.response?.data || err.message);
      }
    };
    fetchSubjects();
  }, []);

  useEffect(() => {
    const fetchQuizHistory = async () => {
      try {
        const res = await api.get('/quiz/history');
        setQuizHistory(res.data.history || []);
      } catch (err) {
        console.error('Error fetching quiz history:', err.response?.data || err.message);
      }
    };
    fetchQuizHistory();
  }, []);

  const totalSubjects = subjects.length;
  const totalQuizzes = quizHistory.length;
  const totalCredits = subjects.reduce((sum, subj) => sum + (subj.credits || 0), 0);
const gradeToPoint = {
  'A+': 10,
  'A': 9,
  'B+': 8,
  'B': 7,
  'C+': 6,
  'C': 5,
  'D': 4,
  'F': 0
};

function calculateExpectedGPA(subjects) {
  let totalCredits = 0;
  let weightedPoints = 0;

  subjects.forEach(subject => {
    const grade = subject.targetGrade?.toUpperCase();
    const credits = subject.credits || 0;
    const gradePoint = gradeToPoint[grade] ?? null;

    if (gradePoint !== null && credits > 0) {
      totalCredits += credits;
      weightedPoints += gradePoint * credits;
    }
  });

  if (totalCredits === 0) return 'N/A';
  return (weightedPoints / totalCredits).toFixed(2);
}

const totalExpectedGPA = calculateExpectedGPA(subjects);


  return (
    <div className="dashboard-container">
      <div className="glass-container">
        <div className="dashboard-header">
          <h1>Artistic Study Dashboard</h1>
          <div className="header-decoration">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="decoration-circle" style={{ 
                backgroundColor: COLORS[i % COLORS.length],
                opacity: 0.8
              }}></div>
            ))}
          </div>
        </div>

        <div className="bento-grid">
          {/* Row 1 */}
          <div className="bento-card" style={{ 
            gridArea: 'kpi1',
            background: CARD_COLORS[0],
            borderColor: COLORS[0]
          }}>
            <div className="kpi-icon">🎨</div>
            <h4>Total Subjects</h4>
            <p>{totalSubjects}</p>
          </div>

          <div className="bento-card" style={{ 
            gridArea: 'kpi2',
            background: CARD_COLORS[1],
            borderColor: COLORS[1]
          }}>
            <div className="kpi-icon">✏️</div>
            <h4>Total Quizzes</h4>
            <p>{totalQuizzes}</p>
          </div>

          <div className="bento-card" style={{ 
            gridArea: 'kpi3',
            background: CARD_COLORS[2],
            borderColor: COLORS[2]
          }}>
            <div className="kpi-icon">📚</div>
            <h4>Total Credits</h4>
            <p>{totalCredits}</p>
          </div>

          {/* Row 2 */}
          <div className="bento-card clock-card" style={{ 
            gridArea: 'clock',
            background: CARD_COLORS[3],
            borderColor: COLORS[3]
          }}>
            <div className="clock-wrapper">
              <BookClock />
              <div className="clock-label">Creative Time</div>
            </div>
          </div>

          <div className="bento-card" style={{ 
            gridArea: 'gpa',
            background: CARD_COLORS[4],
            borderColor: COLORS[4]
          }}>
            <div className="gpa-display">
              <div className="kpi-icon">🏆</div>
              <h4>Expected GPA</h4>
              <p>{totalExpectedGPA}</p>
            </div>
          </div>

          {/* Row 3 */}
          <div className="bento-card scroll-card" style={{ 
            gridArea: 'subjects',
            background: CARD_COLORS[5],
            borderColor: COLORS[5]
          }}>
            <h2 className="section-title">Subject Progress</h2>
            <div className="scroll-content">
              <div className="pie-charts-grid">
                {subjects.map((subject, idx) => (
                  <div className="pie-chart-box" key={idx}>
                    <div className="subject-badge" style={{ backgroundColor: COLORS[idx % COLORS.length] }}>
                      {subject.name.substring(0, 2).toUpperCase()}
                    </div>
                    <h3>{subject.name}</h3>
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: subject.name, value: subject.progress }, 
                            { name: 'Remaining', value: 100 - subject.progress }
                          ]}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={50}
                          innerRadius={30}
                          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        >
                          <Cell fill={COLORS[idx % COLORS.length]} />
                          <Cell fill="rgba(245, 245, 245, 0.5)" />
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}%`, value === subject.progress ? 'Completed' : 'Remaining']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 4 */}
          <div className="bento-card" style={{ 
            gridArea: 'chart',
            background: CARD_COLORS[6],
            borderColor: COLORS[0]
          }}>
            <h2 className="section-title">Quiz Performance</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart 
                  data={quizHistory} 
                  margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.3)" />
                  <XAxis 
                    dataKey="quizName" 
                    tick={{ fill: '#5d4037' }}
                    tickMargin={10}
                  />
                  <YAxis 
                    tick={{ fill: '#5d4037' }}
                    tickMargin={10}
                  />
                  <Tooltip 
                    contentStyle={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      color: '#5d4037'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{
                      paddingTop: '10px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#FF9AA2" 
                    strokeWidth={3} 
                    dot={{ r: 5, fill: '#FF9AA2' }} 
                    activeDot={{ r: 8, stroke: '#FF9AA2', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bento-card scroll-card" style={{ 
            gridArea: 'quizzes',
            background: CARD_COLORS[7],
            borderColor: COLORS[2]
          }}>
            <h2 className="section-title">Quiz History</h2>
            <div className="scroll-content">
              <div className="quiz-cards">
                {quizHistory.map((quiz, idx) => (
                  <div className="quiz-card" key={idx}>
                    <div className="quiz-score" style={{ 
                      background: `linear-gradient(to right, ${COLORS[idx % COLORS.length]}, ${COLORS[(idx + 2) % COLORS.length]})`
                    }}>
                      {quiz.score}%
                    </div>
                    <div className="quiz-info">
                      <h3>{quiz.quizName}</h3>
                      <p>{new Date(quiz.date).toLocaleDateString()}</p>
                      <p className="quiz-topic">{quiz.topic || 'General'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 5 */}
          <div className="bento-card scroll-card" style={{ 
            gridArea: 'summary',
            background: CARD_COLORS[3],
            borderColor: COLORS[4]
          }}>
            <h2 className="section-title">Academic Summary</h2>
            <div className="scroll-content">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Credits</th>
                    <th>Expected Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subj, idx) => (
                    <tr key={idx}>
                      <td>{subj.name}</td>
                      <td>{subj.credits || '-'}</td>
                      <td>{subj.targetGrade || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="dashboard-footer">
          <p>Made with ❤️ for creative minds</p>
        </div>
      </div>
    </div>
  );
}

export default Dash;