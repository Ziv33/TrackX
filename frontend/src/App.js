import React, { useState, useEffect, useCallback } from "react";

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const CATEGORIES = ["מבחן/מטלה", "הורדת מטלה", "תג\"ב", "ה\"ה", "א\"ת", "משוב", "סגל", "סימולציות"];
const COMPANIES = ["א", "ב", "ג", "ד", "ה"];
const API_BASE = "http://127.0.0.1:8000";

// תאריך תחילת שבוע 0 (יום ראשון הקרוב/האחרון)
const START_DATE = new Date();
START_DATE.setDate(START_DATE.getDate() - START_DATE.getDay());

export default function App() {
  const [view, setView] = useState("dashboard"); 
  const [company, setCompany] = useState("א");
  const [currentWeek, setCurrentWeek] = useState(0); // שבוע 0-12
  const [tasks, setTasks] = useState([]);
  const [cadets, setCadets] = useState([]);
  
  const [addModal, setAddModal] = useState(null); 
  const [detailTask, setDetailTask] = useState(null); 
  const [form, setForm] = useState({ title: "", description: "", assigned_cadet: "" });

  const fetchData = useCallback(async () => {
    try {
      // שליפת משימות לפי פלוגה ושבוע
      const tRes = await fetch(`${API_BASE}/tasks/${company}/${currentWeek}`);
      const tData = await tRes.json();
      setTasks(tData);

      const cRes = await fetch(`${API_BASE}/cadets/${company}`);
      const cData = await cRes.json();
      setCadets(cData);
    } catch (err) { console.error("Error fetching:", err); }
  }, [company, currentWeek]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // פונקציה לחישוב תאריך להצגה בראש הטבלה
  const getDateString = (dayIndex) => {
    const d = new Date(START_DATE);
    d.setDate(d.getDate() + (currentWeek * 7) + dayIndex);
    return d.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
  };

  const handleSaveNew = async () => {
    if (!form.title) return alert("חובה להזין כותרת");
    await fetch(`${API_BASE}/tasks/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, company, week: currentWeek, category: addModal.cat, day: addModal.day })
    });
    setAddModal(null);
    setForm({ title: "", description: "", assigned_cadet: "" });
    fetchData();
  };

  const handleUpdate = async () => {
    await fetch(`${API_BASE}/tasks/${detailTask.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: detailTask.title,
        description: detailTask.description,
        is_done: detailTask.is_done,
        assigned_cadet: detailTask.assigned_cadet
      })
    });
    setDetailTask(null);
    fetchData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("למחוק?")) return;
    await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" });
    setDetailTask(null);
    fetchData();
  };

  if (view === "dashboard") {
    return (
      <div dir="rtl" style={pageStyle}>
        <header style={headerStyle}>
          <h1>דשבורד מפקד - פלוגה {company}</h1>
          <select value={company} onChange={(e) => setCompany(e.target.value)} style={selectStyle}>
            {COMPANIES.map(c => <option key={c} value={c}>פלוגה {c}</option>)}
          </select>
        </header>

        <div style={cardContainer}>
          {cadets.map(cadet => {
            const openTasks = tasks.filter(t => t.assigned_cadet === cadet && !t.is_done).length;
            return (
              <div key={cadet} style={cadetCard}>
                <div style={{fontSize: "40px"}}>👤</div>
                <h3>{cadet}</h3>
                <div style={{...statusBadge, backgroundColor: openTasks > 0 ? "#e74c3c" : "#2ecc71"}}>
                   {openTasks} משימות לשבוע {currentWeek}
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={() => setView("table")} style={mainBtn}>לעריכת הלו"ז השבועי 📅</button>
      </div>
    );
  }

  return (
    <div dir="rtl" style={pageStyle}>
      <header style={headerStyle}>
        <button onClick={() => setView("dashboard")} style={backBtn}>⬅ חזור</button>
        
        {/* ניווט בין שבועות */}
        <div style={weekNavContainer}>
          <button disabled={currentWeek === 0} onClick={() => setCurrentWeek(c => c - 1)} style={navArrow}>▶</button>
          <h2 style={{margin: "0 20px"}}>שבוע {currentWeek}</h2>
          <button disabled={currentWeek === 12} onClick={() => setCurrentWeek(c => c + 1)} style={navArrow}>◀</button>
        </div>

        <h1>ניהול לו"ז פלוגה {company}</h1>
      </header>

      <table border="1" style={tableStyle}>
        <thead>
          <tr style={{ backgroundColor: "#2c3e50", color: "white" }}>
            <th style={{padding: "10px", width: "100px"}}>קטגוריה</th>
            {DAYS.map((d, i) => (
              <th key={d} style={{padding: "10px"}}>
                {d}
                <div style={{fontSize: "12px", fontWeight: "normal"}}>{getDateString(i)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map(cat => (
            <tr key={cat}>
              <td style={catCol}>{cat}</td>
              {DAYS.map(day => (
                <td key={day} onClick={() => setAddModal({ cat, day })} style={cellStyle}>
                  {tasks.filter(t => t.category === cat && t.day === day).map(t => (
                    <div key={t.id} onClick={(e) => { e.stopPropagation(); setDetailTask(t); }} 
                         style={{ ...taskBox, backgroundColor: t.is_done ? "#d4edda" : "#fff3cd" }}>
                      <strong>{t.title}</strong>
                      <div style={{fontSize: "10px", color: "#666"}}>👤 {t.assigned_cadet || "ללא שיוך"}</div>
                    </div>
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* מודלים של הוספה ועריכה - נשארים ללא שינוי מהקוד הקודם */}
      {addModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3>חדש: {addModal.cat} (שבוע {currentWeek})</h3>
            <input placeholder="כותרת" value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={inputStyle} />
            <select value={form.assigned_cadet} onChange={e => setForm({...form, assigned_cadet: e.target.value})} style={inputStyle}>
              <option value="">-- בחר צוער --</option>
              {cadets.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleSaveNew} style={btnSave}>שמור ושייך</button>
            <button onClick={() => setAddModal(null)} style={btnCancel}>ביטול</button>
          </div>
        </div>
      )}

      {detailTask && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3>עריכת משימה</h3>
            <input value={detailTask.title} onChange={e => setDetailTask({...detailTask, title: e.target.value})} style={inputStyle} />
            <label><input type="checkbox" checked={detailTask.is_done} onChange={e => setDetailTask({...detailTask, is_done: e.target.checked})} /> בוצע</label>
            <button onClick={handleUpdate} style={btnUpdate}>עדכן</button>
            <button onClick={() => handleDelete(detailTask.id)} style={btnDelete}>מחק</button>
            <button onClick={() => setDetailTask(null)} style={btnCancel}>סגור</button>
          </div>
        </div>
      )}
    </div>
  );
}

// סטיילים נוספים
const weekNavContainer = { display: "flex", alignItems: "center", backgroundColor: "#fff", padding: "10px 20px", borderRadius: "30px", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" };
const navArrow = { fontSize: "24px", border: "none", background: "none", cursor: "pointer", color: "#007bff" };

// (שאר הסטיילים הקודמים נשארים אותו דבר)
const pageStyle = { padding: "20px", fontFamily: "Arial", backgroundColor: "#f8f9fa", minHeight: "100vh" };
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" };
const cardContainer = { display: "flex", gap: "15px", flexWrap: "wrap", marginBottom: "30px" };
const cadetCard = { backgroundColor: "white", padding: "15px", borderRadius: "10px", width: "150px", textAlign: "center", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" };
const statusBadge = { color: "white", padding: "5px", borderRadius: "5px", fontSize: "12px", marginTop: "10px" };
const mainBtn = { width: "100%", padding: "15px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" };
const backBtn = { padding: "10px", cursor: "pointer", borderRadius: "5px", border: "1px solid #ccc" };
const tableStyle = { width: "100%", borderCollapse: "collapse", backgroundColor: "white", tableLayout: "fixed" };
const cellStyle = { height: "80px", verticalAlign: "top", cursor: "pointer", border: "1px solid #ddd", padding: "5px" };
const taskBox = { padding: "5px", marginBottom: "3px", borderRadius: "4px", border: "1px solid #eee", fontSize: "11px" };
const catCol = { fontWeight: "bold", padding: "10px", backgroundColor: "#f1f1f1", textAlign: "center" };
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalContent = { backgroundColor: "white", padding: "20px", borderRadius: "10px", width: "300px", display: "flex", flexDirection: "column", gap: "10px" };
const inputStyle = { padding: "8px", borderRadius: "5px", border: "1px solid #ccc" };
const btnSave = { backgroundColor: "#28a745", color: "white", padding: "10px", border: "none", cursor: "pointer" };
const btnUpdate = { backgroundColor: "#007bff", color: "white", padding: "10px", border: "none", cursor: "pointer" };
const btnDelete = { backgroundColor: "#dc3545", color: "white", padding: "10px", border: "none", cursor: "pointer" };
const btnCancel = { background: "none", border: "none", color: "#666", cursor: "pointer" };
const selectStyle = { padding: "5px", borderRadius: "5px" };