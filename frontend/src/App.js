import React, { useState, useEffect, useCallback } from "react";

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const CATEGORIES = ["מבחן/מטלה", "הורדת מטלה", "תג\"ב", "ה\"ה", "א\"ת", "משוב", "סגל", "סימולציות"];
const COMPANIES = ["א", "ב", "ג", "ד", "ה"];
const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  const [company, setCompany] = useState("א");
  const [tasks, setTasks] = useState([]);
  const [cadets, setCadets] = useState([]);
  
  const [addModal, setAddModal] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", assigned_cadet: "" });

  const fetchData = useCallback(async () => {
    try {
      const tRes = await fetch(`${API_BASE}/tasks/${company}`);
      const tData = await tRes.json();
      setTasks(tData);

      const cRes = await fetch(`${API_BASE}/cadets/${company}`);
      const cData = await cRes.json();
      setCadets(cData);
    } catch (err) { console.error("Error:", err); }
  }, [company]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveNew = async () => {
    if (!form.title) return alert("חובה להזין כותרת");
    await fetch(`${API_BASE}/tasks/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, company, category: addModal.cat, day: addModal.day })
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
    if (!window.confirm("למחוק את המשימה?")) return;
    await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" });
    setDetailTask(null);
    fetchData();
  };

  return (
    <div dir="rtl" style={{ padding: "20px", fontFamily: "Arial", backgroundColor: "#f4f7f6", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1>לו"ז פלוגה {company}</h1>
        <select value={company} onChange={(e) => setCompany(e.target.value)} style={{ padding: "10px", borderRadius: "5px" }}>
          {COMPANIES.map(c => <option key={c} value={c}>פלוגה {c}</option>)}
        </select>
      </header>

      <table border="1" style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white" }}>
        <thead>
          <tr style={{ backgroundColor: "#34495e", color: "white" }}>
            <th style={{ padding: "10px" }}>קטגוריה</th>
            {DAYS.map(d => <th key={d}>{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map(cat => (
            <tr key={cat}>
              <td style={{ fontWeight: "bold", padding: "10px", backgroundColor: "#ecf0f1", textAlign: "center" }}>{cat}</td>
              {DAYS.map(day => (
                <td key={day} onClick={() => setAddModal({ cat, day })} style={{ height: "85px", verticalAlign: "top", cursor: "pointer", border: "1px solid #ddd", padding: "5px" }}>
                  {tasks.filter(t => t.category === cat && t.day === day).map(t => (
                    <div key={t.id} onClick={(e) => { e.stopPropagation(); setDetailTask(t); }} 
                         style={{ 
                           backgroundColor: t.is_done ? "#d4edda" : "#fff3cd", 
                           padding: "6px", margin: "3px 0", borderRadius: "4px", fontSize: "12px", 
                           border: "1px solid #ccc"
                         }}>
                      <strong>{t.title}</strong>
                      <div style={{ color: "#666", fontSize: "11px" }}>👤 {t.assigned_cadet || "ללא שיוך"}</div>
                    </div>
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* מודל הוספה */}
      {addModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3>חדש: {addModal.cat}</h3>
            <input placeholder="כותרת" value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={inputStyle} />
            <textarea placeholder="תיאור" value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={inputStyle} />
            <select value={form.assigned_cadet} onChange={e => setForm({...form, assigned_cadet: e.target.value})} style={inputStyle}>
              <option value="">בחר צוער אחראי</option>
              {cadets.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleSaveNew} style={btnSave}>שמור</button>
            <button onClick={() => setAddModal(null)} style={btnCancel}>ביטול</button>
          </div>
        </div>
      )}

      {/* מודל עריכה/מחיקה */}
      {detailTask && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3>פרטי משימה</h3>
            <input value={detailTask.title} onChange={e => setDetailTask({...detailTask, title: e.target.value})} style={inputStyle} />
            <textarea value={detailTask.description} onChange={e => setDetailTask({...detailTask, description: e.target.value})} style={inputStyle} />
            <select value={detailTask.assigned_cadet} onChange={e => setDetailTask({...detailTask, assigned_cadet: e.target.value})} style={inputStyle}>
              <option value="">ללא שיוך</option>
              {cadets.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <label><input type="checkbox" checked={detailTask.is_done} onChange={e => setDetailTask({...detailTask, is_done: e.target.checked})} /> בוצע</label>
            <button onClick={handleUpdate} style={btnUpdate}>עדכן</button>
            <button onClick={() => handleDelete(detailTask.id)} style={btnDelete}>מחק משימה</button>
            <button onClick={() => setDetailTask(null)} style={btnCancel}>סגור</button>
          </div>
        </div>
      )}
    </div>
  );
}

// עיצובים
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalContent = { backgroundColor: "white", padding: "20px", borderRadius: "10px", width: "300px", display: "flex", flexDirection: "column", gap: "10px" };
const inputStyle = { padding: "8px", borderRadius: "5px", border: "1px solid #ddd" };
const btnSave = { backgroundColor: "#27ae60", color: "white", padding: "10px", border: "none", borderRadius: "5px", cursor: "pointer" };
const btnUpdate = { backgroundColor: "#2980b9", color: "white", padding: "10px", border: "none", borderRadius: "5px", cursor: "pointer" };
const btnDelete = { backgroundColor: "#c0392b", color: "white", padding: "10px", border: "none", borderRadius: "5px", cursor: "pointer" };
const btnCancel = { background: "none", border: "none", color: "#666", cursor: "pointer" };