import React, { useState, useEffect, useCallback } from "react";

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const CATEGORIES = ["מבחן/מטלה", "הורדת מטלה", "תג\"ב", "ה\"ה", "א\"ת", "משוב", "סגל", "סימולציות"];
const COMPANIES = ["א", "ב", "ג", "ד", "ה"];

const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  const [company, setCompany] = useState("א");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // מודלים
  const [addModal, setAddModal] = useState(null); // {cat, day}
  const [detailTask, setDetailTask] = useState(null);
  const [inputTitle, setInputTitle] = useState("");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tasks/${company}`);
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error("Fetch error:", err);
      alert("שגיאה בחיבור לשרת. וודא ששרת הפייתון רץ בפורט 8000");
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const addTask = async () => {
    if (!inputTitle) return;
    await fetch(`${API_BASE}/tasks/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company, category: addModal.cat, day: addModal.day, title: inputTitle })
    });
    setInputTitle("");
    setAddModal(null);
    loadTasks();
  };

  const toggleTaskStatus = async (task) => {
    await fetch(`${API_BASE}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_done: !task.is_done })
    });
    setDetailTask(null);
    loadTasks();
  };

  return (
    <div dir="rtl" style={{ padding: "20px", fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>ניהול משימות לו"ז</h1>
        <select value={company} onChange={(e) => setCompany(e.target.value)} style={{ padding: "10px", fontSize: "16px" }}>
          {COMPANIES.map(c => <option key={c} value={c}>פלוגה {c}</option>)}
        </select>
      </header>

      {loading ? <p>טוען נתונים...</p> : (
        <table border="1" style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f4f4f4" }}>
              <th style={{ padding: "10px" }}>קטגוריה / יום</th>
              {DAYS.map(d => <th key={d}>{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map(cat => (
              <tr key={cat}>
                <td style={{ fontWeight: "bold", padding: "10px", backgroundColor: "#fafafa" }}>{cat}</td>
                {DAYS.map(day => (
                  <td 
                    key={day} 
                    onClick={() => setAddModal({ cat, day })}
                    style={{ height: "60px", verticalAlign: "top", cursor: "pointer", position: "relative" }}
                  >
                    {tasks.filter(t => t.category === cat && t.day === day).map(t => (
                      <div 
                        key={t.id}
                        onClick={(e) => { e.stopPropagation(); setDetailTask(t); }}
                        style={{
                          backgroundColor: t.is_done ? "#c3e6cb" : "#f5c6cb",
                          fontSize: "12px", margin: "2px", padding: "4px", borderRadius: "4px",
                          border: "1px solid #ddd"
                        }}
                      >
                        {t.title}
                      </div>
                    ))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* חלון הוספת משימה */}
      {addModal && (
        <div style={modalStyle}>
          <div style={modalContentStyle}>
            <h3>הוספת משימה ל{addModal.cat} ביום {addModal.day}</h3>
            <input 
              autoFocus
              style={{ width: "90%", padding: "10px" }} 
              value={inputTitle} 
              onChange={e => setInputTitle(e.target.value)}
              placeholder="שם המשימה..."
            />
            <div style={{ marginTop: "15px" }}>
              <button onClick={addTask} style={{ marginLeft: "10px" }}>שמור</button>
              <button onClick={() => setAddModal(null)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* חלון פרטי משימה */}
      {detailTask && (
        <div style={modalStyle}>
          <div style={modalContentStyle}>
            <h3>פרטי משימה</h3>
            <p><strong>משימה:</strong> {detailTask.title}</p>
            <p><strong>סטטוס:</strong> {detailTask.is_done ? "✅ בוצע" : "❌ לא בוצע"}</p>
            <button onClick={() => toggleTaskStatus(detailTask)} style={{ marginLeft: "10px" }}>
              סמן כ{detailTask.is_done ? "לא בוצע" : "בוצע"}
            </button>
            <button onClick={() => setDetailTask(null)}>סגור</button>
          </div>
        </div>
      )}
    </div>
  );
}

const modalStyle = {
  position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
  backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
};

const modalContentStyle = {
  backgroundColor: "white", padding: "30px", borderRadius: "10px", textAlign: "center", minWidth: "300px"
};