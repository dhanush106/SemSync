import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import "./gpa.css";

const gradeToPoints = { O: 10, "A+": 9, A: 8, "B+": 7, B: 6, C: 5, D: 4, F: 0 };

function GPA() {
  const { user, loading, checkAuth } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [gpa, setGpa] = useState(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/get-subjects", { credentials: 'include' });
        const data = await res.json();
        const subjectsWithId = (data.subjects || []).map(sub => ({
          ...sub,
          id: sub._id
        }));
        setSubjects(subjectsWithId);
        setGpa(calculateGPA(subjectsWithId));
      } catch (err) {
        console.error("Failed to fetch subjects", err);
      }
    };
    checkAuth();
    fetchSubjects();
  }, []);

  const calculateGPA = (subs) => {
    let totalCredits = 0;
    let totalGradePoints = 0;
    subs.forEach(sub => {
      const gp = gradeToPoints[sub.grade] || 0;
      totalCredits += Number(sub.credits);
      totalGradePoints += gp * Number(sub.credits);
    });
    return totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : "0.00";
  };

  const handleChange = (id, field, value) => {
    setSubjects(prev =>
      prev.map(sub => sub.id === id ? { ...sub, [field]: value } : sub)
    );
  };

  const addSubject = () => {
    setSubjects(prev => [...prev, { id: Date.now(), name: "", grade: "O", credits: 0 }]);
  };

  const deleteSubject = (id) => {
    setSubjects(prev => prev.filter(sub => sub.id !== id));
  };

  const handleSubmit = async () => {
    const finalGPA = calculateGPA(subjects);
    setGpa(finalGPA);
    await fetch("http://localhost:5000/api/save-subjects", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ subjects, gpa: finalGPA })
    });
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in to access your dashboard.</div>;

  return (
    <div className="gpa-dashboard">
      <h2 className="gpa-heading">CGPA Calculator</h2>
      <p className="gpa-score">GPA: {gpa || "0.00"}</p>
      <button className="gpa-add-btn" onClick={addSubject}>Add Subject</button>
      <div className="gpa-subject-grid">
        {subjects.map((sub, index) => (
          <div key={sub.id || index} className="gpa-subject-card">
            <input
              className="gpa-input"
              value={sub.name}
              onChange={(e) => handleChange(sub.id, 'name', e.target.value)}
              placeholder="Subject"
            />
            <select
              className="gpa-select"
              value={sub.grade}
              onChange={(e) => handleChange(sub.id, 'grade', e.target.value)}
            >
              {Object.keys(gradeToPoints).map(g => <option key={g}>{g}</option>)}
            </select>
            <input
              type="number"
              className="gpa-input gpa-credit-input"
              value={sub.credits}
              onChange={(e) => handleChange(sub.id, 'credits', e.target.value)}
            />
            <button className="gpa-delete-btn" onClick={() => deleteSubject(sub.id)}>Delete</button>
          </div>
        ))}
      </div>
      <button className="gpa-submit-btn" onClick={handleSubmit}>Submit</button>
    </div>
  );
}

export default GPA;
