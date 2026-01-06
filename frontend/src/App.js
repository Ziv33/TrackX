import React, { useState, useEffect, useCallback } from "react";

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const CATEGORIES = ["מבחן/מטלה", "הורדת מטלה", "תג\"ב", "ה\"ה", "א\"ת", "משוב", "סגל", "סימולציות"];
const COMPANIES = ["א", "ב", "ג", "ד", "ה"];
const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  const [view, setView] = useState("dashboard"); 
  const [company, setCompany] = useState("א");
  const [tasks, setTasks] = useState([]);
  const [cadets, setCadets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [addModal, setAddModal] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", assigned_cadet: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetching tasks and cadets in parallel for speed
      const [tRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/tasks/${company}`),
        fetch(`${API_BASE}/cadets/${company}`)
      ]);

      const tData = await tRes.json();
      const cData = await cRes.json();

      // Ensure data is an array before setting state (prevents map errors)
      setTasks(Array.isArray(tData) ? tData : []);
      setCadets(Array.isArray(cData) ? cData : []);
    } catch (err) {
      console.error("Error fetching data from Python API:", err);
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveNew = async () => {
    if (!form.title) return alert("חובה להזין כותרת");
    try {
      await fetch(`${API_BASE}/tasks/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, company, category: addModal.cat, day: addModal.day })
      });
      setAddModal(null);
      setForm({ title: "", description: "", assigned_cadet: "" });
      fetchData();
    } catch (err) { alert("שגיאה בשמירת המשימה"); }
  };

  const handleUpdate = async () => {
    try {
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
    } catch (err) { alert("שגיאה בעדכון המשימה"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("למחוק את המשימה לצמיתות?")) return;
    try {
      await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" });
      setDetailTask(null);
      fetchData();
    } catch (err) { alert("שגיאה במחיקת המשימה"); }
  };

  // --- Dashboard View ---
  if (view === "dashboard") {
    return (
      <div dir="rtl" style={pageStyle}>
        <header style={headerStyle}>
          <div>
            <h1>דשבורד מפקד</h1>
            <h2 style={{color: "#666"}}>פלוגה {company}</h2>
          </div>
          <select value={company} onChange={(e) => setCompany(e.target.value)} style={selectStyle}>
            {COMPANIES.map(c => <option key={c} value={c}>פלוגה {c}</option>)}
          </select>
        </header>

        {loading ? <p>טוען נתונים...</p> : (
          <div style={cardContainer}>
            {cadets.map(cadet => {
              const openTasks = tasks.filter(t => t.assigned_cadet === cadet && !t.is_done).length;
              return (
                <div key={cadet} style={cadetCard}>
                  <div style={{fontSize: "40px"}}>👤</div>
                  <h3 style={{margin: "10px 0"}}>{cadet}</h3>
                  <div style={{...statusBadge, backgroundColor: openTasks > 0 ? "#e74c3c" : "#2ecc71"}}>
                     {openTasks} משימות פתוחות
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => setView("table")} style={mainBtn}>לעריכת הלו"ז ושיוך משימות 📅</button>
      </div>
    );
  }

  // --- Table/Schedule View ---
  return (
    <div dir="rtl" style={pageStyle}>
      <header style={headerStyle}>
        <button onClick={() => setView("dashboard")} style={backBtn}>⬅ חזור לצוערים שלי</button>
        <h1>ניהול לו"ז פלוגה {company}</h1>
      </header>

      <div style={{overflowX: "auto"}}>
        <table border="1" style={tableStyle}>
          <thead>
            <tr style={{ backgroundColor: "#2c3e50", color: "white" }}>
              <th style={{padding: "15px"}}>קטגוריה</th>
              {DAYS.map(d => <th key={d} style={{padding: "10px"}}>{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map(cat => (
              <tr key={cat}>
                <td style={catCol}>{cat}</td>
                {DAYS.map(day => (
                  <td key={day} onClick={() => setAddModal({ cat, day })} style={cellStyle}>
                    {tasks
                      .filter(t => t.category === cat && t.day === day)
                      .map(t => (
                        <div key={t.id} onClick={(e) => { e.stopPropagation(); setDetailTask(t); }}
                             style={{ ...taskBox, backgroundColor: t.is_done ? "#d4edda" : "#fff3cd", borderRight: t.is_done ? "4px solid #28a745" : "4px solid #f1c40f" }}>
                          <strong style={{display: "block"}}>{t.title}</strong>
                          <span style={{fontSize: "10px", color: "#555"}}>👤 {t.assigned_cadet || "ללא שיוך"}</span>
                        </div>
                      ))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {addModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3>משימה חדשה</h3>
            <p style={{fontSize: "12px", color: "#666"}}>{addModal.cat} - יום {addModal.day}</p>
            <input placeholder="כותרת המשימה" value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={inputStyle} />
            <textarea placeholder="תיאור נוסף" value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{...inputStyle, minHeight: "60px"}} />
            <label style={{fontSize: "14px", fontWeight: "bold"}}>שיוך לצוער:</label>
            <select value={form.assigned_cadet} onChange={e => setForm({...form, assigned_cadet: e.target.value})} style={inputStyle}>
              <option value="">-- בחר צוער --</option>
              {cadets.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleSaveNew} style={btnSave}>שמור ושייך לצוער</button>
            <button onClick={() => setAddModal(null)} style={btnCancel}>ביטול</button>
          </div>
        </div>
      )}

      {/* Edit/Detail Modal */}
      {detailTask && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3>עריכת משימה</h3>
            <input value={detailTask.title} onChange={e => setDetailTask({...detailTask, title: e.target.value})} style={inputStyle} />
            <textarea value={detailTask.description || ""} onChange={e => setDetailTask({...detailTask, description: e.target.value})} style={{...inputStyle, minHeight: "60px"}} />

            <label style={{fontSize: "14px", fontWeight: "bold"}}>שיוך לצוער:</label>
            <select value={detailTask.assigned_cadet} onChange={e => setDetailTask({...detailTask, assigned_cadet: e.target.value})} style={inputStyle}>
              <option value="">ללא שיוך</option>
              {cadets.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <label style={{display: "flex", alignItems: "center", gap: "10px", cursor: "pointer"}}>
              <input type="checkbox" checked={detailTask.is_done} onChange={e => setDetailTask({...detailTask, is_done: e.target.checked})} style={{width: "20px", height: "20px"}} />
              <span>סומן כבוצע</span>
            </label>

            <button onClick={handleUpdate} style={btnUpdate}>עדכן פרטים</button>
            <button onClick={() => handleDelete(detailTask.id)} style={btnDelete}>מחק משימה</button>
            <button onClick={() => setDetailTask(null)} style={btnCancel}>סגור</button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Styles (Existing Styles with minor improvements for spacing) ---
const pageStyle = { padding: "20px", fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif", backgroundColor: "#f0f2f5", minHeight: "100vh" };
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "2px solid #ddd", paddingBottom: "10px" };
const cardContainer = { display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "30px", justifyContent: "center" };
const cadetCard = { backgroundColor: "white", padding: "20px", borderRadius: "15px", width: "160px", textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", border: "1px solid #e0e0e0" };
const statusBadge = { color: "white", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" };
const mainBtn = { width: "100%", padding: "18px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "16px", boxShadow: "0 4px 6px rgba(0,123,255,0.3)" };
const backBtn = { padding: "10px 20px", cursor: "pointer", borderRadius: "8px", border: "1px solid #ccc", backgroundColor: "white" };
const tableStyle = { width: "100%", borderCollapse: "collapse", backgroundColor: "white", borderRadius: "8px", overflow: "hidden" };
const cellStyle = { minWidth: "120px", height: "100px", verticalAlign: "top", cursor: "pointer", border: "1px solid #eee", padding: "8px", transition: "background 0.2s" };
const taskBox = { padding: "8px", marginBottom: "6px", borderRadius: "6px", fontSize: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" };
const catCol = { fontWeight: "bold", padding: "15px", backgroundColor: "#f8f9fa", textAlign: "center", color: "#333", border: "1px solid #eee" };
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalContent = { backgroundColor: "white", padding: "25px", borderRadius: "15px", width: "350px", display: "flex", flexDirection: "column", gap: "15px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" };
const inputStyle = { padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px" };
const btnSave = { backgroundColor: "#28a745", color: "white", padding: "12px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" };
const btnUpdate = { backgroundColor: "#007bff", color: "white", padding: "12px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" };
const btnDelete = { backgroundColor: "#dc3545", color: "white", padding: "12px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" };
const btnCancel = { background: "none", border: "none", color: "#888", cursor: "pointer", marginTop: "5px" };
const selectStyle = { padding: "8px 15px", borderRadius: "8px", border: "1px solid #ddd", backgroundColor: "white", fontWeight: "bold" };