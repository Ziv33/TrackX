import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// 1. Initialize Supabase (Use your actual URL and Anon Key)
const SUPABASE_URL = "http://localhost:54321";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1Ni..."; // Your long Anon Key
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const CATEGORIES = ["מבחן/מטלה", "הורדת מטלה", "תג\"ב", "ה\"ה", "א\"ת", "משוב", "סגל", "סימולציות"];
const COMPANIES = ["א", "ב", "ג", "ד", "ה"];
const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  // --- State Definitions ---
  const [view, setView] = useState("dashboard");
  const [company, setCompany] = useState("א");
  const [tasks, setTasks] = useState([]);
  const [cadets, setCadets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const [addModal, setAddModal] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", assigned_cadet: "" });

  // --- Helper: Get Auth Headers ---
  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.access_token}`
    };
  }, []);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const headers = await getAuthHeaders();

      const [tRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/tasks/${company}`, { headers }),
        fetch(`${API_BASE}/cadets/${company}`, { headers })
      ]);

      if (tRes.status === 403) {
        setErrorMsg("אין לך הרשאת קצין או גישה לפלוגה זו");
        return;
      }

      const tData = await tRes.json();
      const cData = await cRes.json();

      setTasks(Array.isArray(tData) ? tData : []);
      setCadets(Array.isArray(cData) ? cData : []);
    } catch (err) {
      console.error("Error fetching data:", err);
      setErrorMsg("שגיאה בתקשורת עם השרת");
    } finally {
      setLoading(false);
    }
  }, [company, getAuthHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Actions ---
  const handleSaveNew = async () => {
    if (!form.title) return alert("חובה להזין כותרת");
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/tasks/`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...form, company, category: addModal.cat, day: addModal.day })
      });
      if (res.ok) {
        setAddModal(null);
        setForm({ title: "", description: "", assigned_cadet: "" });
        fetchData();
      } else {
        alert("פעולה נכשלה: וודא שאתה רשום כקצין");
      }
    } catch (err) { alert("שגיאה בשמירה"); }
  };

  const handleUpdate = async () => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/tasks/${detailTask.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          title: detailTask.title,
          description: detailTask.description,
          is_done: detailTask.is_done,
          assigned_cadet: detailTask.assigned_cadet
        })
      });
      setDetailTask(null);
      fetchData();
    } catch (err) { alert("שגיאה בעדכון"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("למחוק לצמיתות?")) return;
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE", headers });
      setDetailTask(null);
      fetchData();
    } catch (err) { alert("שגיאה במחיקה"); }
  };

  // --- Error View ---
  if (errorMsg) {
    return (
      <div dir="rtl" style={{...pageStyle, textAlign: 'center', paddingTop: '50px'}}>
        <h2 style={{color: '#e74c3c'}}>{errorMsg}</h2>
        <button onClick={() => window.location.reload()} style={mainBtn}>נסה שוב</button>
      </div>
    );
  }

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

  // --- Table View (JSX code continues exactly as before...) ---
  return (
    <div dir="rtl" style={pageStyle}>
        {/* ... Rest of your Table JSX (Header, Table, and Modals) ... */}
        {/* Copy the table and modal code from your previous version here */}
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
                <input placeholder="כותרת" value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={inputStyle} />
                <select value={form.assigned_cadet} onChange={e => setForm({...form, assigned_cadet: e.target.value})} style={inputStyle}>
                    <option value="">-- שייך לצוער --</option>
                    {cadets.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={handleSaveNew} style={btnSave}>שמור</button>
                <button onClick={() => setAddModal(null)} style={btnCancel}>ביטול</button>
            </div>
            </div>
        )}
        {/* Detail Modal */}
        {detailTask && (
            <div style={modalOverlay}>
            <div style={modalContent}>
                <h3>עריכת משימה</h3>
                <input value={detailTask.title} onChange={e => setDetailTask({...detailTask, title: e.target.value})} style={inputStyle} />
                <button onClick={handleUpdate} style={btnUpdate}>עדכן</button>
                <button onClick={() => handleDelete(detailTask.id)} style={btnDelete}>מחק</button>
                <button onClick={() => setDetailTask(null)} style={btnCancel}>סגור</button>
            </div>
            </div>
        )}
    </div>
  );
}

// --- Styles (Same as before) ---
const pageStyle = { padding: "20px", fontFamily: "Segoe UI", backgroundColor: "#f0f2f5", minHeight: "100vh" };
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" };
const cardContainer = { display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center" };
const cadetCard = { backgroundColor: "white", padding: "20px", borderRadius: "15px", width: "160px", textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" };
const statusBadge = { color: "white", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" };
const mainBtn = { width: "100%", padding: "18px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold" };
const selectStyle = { padding: "8px 15px", borderRadius: "8px", border: "1px solid #ddd" };
const backBtn = { padding: "10px 20px", cursor: "pointer", borderRadius: "8px", border: "1px solid #ccc" };
const tableStyle = { width: "100%", borderCollapse: "collapse", backgroundColor: "white" };
const cellStyle = { minWidth: "120px", height: "100px", verticalAlign: "top", cursor: "pointer", border: "1px solid #eee", padding: "8px" };
const taskBox = { padding: "8px", marginBottom: "6px", borderRadius: "6px", fontSize: "12px" };
const catCol = { fontWeight: "bold", padding: "15px", backgroundColor: "#f8f9fa", textAlign: "center" };
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalContent = { backgroundColor: "white", padding: "25px", borderRadius: "15px", width: "350px", display: "flex", flexDirection: "column", gap: "15px" };
const inputStyle = { padding: "10px", borderRadius: "8px", border: "1px solid #ddd" };
const btnSave = { backgroundColor: "#28a745", color: "white", padding: "12px", border: "none", borderRadius: "8px", cursor: "pointer" };
const btnUpdate = { backgroundColor: "#007bff", color: "white", padding: "12px", border: "none", borderRadius: "8px", cursor: "pointer" };
const btnDelete = { backgroundColor: "#dc3545", color: "white", padding: "12px", border: "none", borderRadius: "8px", cursor: "pointer" };
const btnCancel = { background: "none", border: "none", color: "#888", cursor: "pointer" };