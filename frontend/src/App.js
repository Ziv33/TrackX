import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// --- 1. Configuration ---
const SUPABASE_URL = "http://localhost:54321";
const SUPABASE_KEY = "YOUR_ANON_KEY_HERE"; // Get from 'npx supabase status'
const API_BASE = "http://127.0.0.1:8000";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const CATEGORIES = ["מבחן/מטלה", "הורדת מטלה", "תג\"ב", "ה\"ה", "א\"ת", "משוב", "סגל", "סימולציות"];
const COMPANIES = ["א", "ב", "ג", "ד", "ה"];

export default function App() {
  // --- Auth State ---
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // --- App State ---
  const [view, setView] = useState("dashboard");
  const [company, setCompany] = useState("א");
  const [tasks, setTasks] = useState([]);
  const [cadets, setCadets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [addModal, setAddModal] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", assigned_cadet: "" });

  // --- Auth Logic ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("שגיאה: " + error.message);
  };

  const handleLogout = () => supabase.auth.signOut();

  // --- Data Fetching ---
  const getAuthHeaders = useCallback(async () => {
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.access_token}`
    };
  }, [session]);

  const fetchData = useCallback(async () => {
    if (!session) return;
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
      setErrorMsg("שגיאה בתקשורת עם השרת");
    } finally {
      setLoading(false);
    }
  }, [company, session, getAuthHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Task Actions ---
  const handleSaveNew = async () => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/tasks/`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...form, company, category: addModal.cat, day: addModal.day })
      });
      setAddModal(null);
      setForm({ title: "", description: "", assigned_cadet: "" });
      fetchData();
    } catch (err) { alert("שגיאה בשמירה"); }
  };

  const handleUpdate = async () => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/tasks/${detailTask.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(detailTask)
      });
      setDetailTask(null);
      fetchData();
    } catch (err) { alert("שגיאה בעדכון"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("למחוק?")) return;
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE", headers });
      setDetailTask(null);
      fetchData();
    } catch (err) { alert("שגיאה במחיקה"); }
  };

  // --- Conditional Rendering ---

  // 1. LOGIN SCREEN
  if (!session) {
    return (
      <div dir="rtl" style={loginPageStyle}>
        <div style={loginCardStyle}>
          <h2 style={{marginBottom: '20px'}}>כניסה למערכת מגדלור</h2>
          <form onSubmit={handleLogin} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
            <input type="email" placeholder="אימייל" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="סיסמה" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
            <button type="submit" style={btnUpdate}>התחבר</button>
          </form>
        </div>
      </div>
    );
  }

  // 2. ERROR STATE
  if (errorMsg) {
    return (
      <div dir="rtl" style={{...pageStyle, textAlign: 'center'}}>
        <h2 style={{color: '#e74c3c'}}>{errorMsg}</h2>
        <button onClick={handleLogout} style={btnCancel}>התנתק ונסה משתמש אחר</button>
      </div>
    );
  }

  // 3. MAIN DASHBOARD
  if (view === "dashboard") {
    return (
      <div dir="rtl" style={pageStyle}>
        <header style={headerStyle}>
          <div>
            <h1>דשבורד מפקד</h1>
            <p>מחובר כ: {session.user.email} | <button onClick={handleLogout} style={btnCancel}>התנתק</button></p>
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

  // 4. TABLE VIEW
  return (
    <div dir="rtl" style={pageStyle}>
      <header style={headerStyle}>
        <button onClick={() => setView("dashboard")} style={backBtn}>⬅ חזור</button>
        <h1>לו"ז פלוגה {company}</h1>
      </header>
      <table border="1" style={tableStyle}>
        <thead>
          <tr style={{ backgroundColor: "#2c3e50", color: "white" }}>
            <th style={{padding: "15px"}}>קטגוריה</th>
            {DAYS.map(d => <th key={d}>{d}</th>)}
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
                      {t.title}
                    </div>
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {addModal && (
        <div style={modalOverlay}><div style={modalContent}>
          <h3>משימה חדשה</h3>
          <input placeholder="כותרת" value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={inputStyle} />
          <select value={form.assigned_cadet} onChange={e => setForm({...form, assigned_cadet: e.target.value})} style={inputStyle}>
            <option value="">בחר צוער</option>
            {cadets.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={handleSaveNew} style={btnSave}>שמור</button>
          <button onClick={() => setAddModal(null)} style={btnCancel}>ביטול</button>
        </div></div>
      )}

      {detailTask && (
        <div style={modalOverlay}><div style={modalContent}>
          <h3>עריכת משימה</h3>
          <input value={detailTask.title} onChange={e => setDetailTask({...detailTask, title: e.target.value})} style={inputStyle} />
          <label><input type="checkbox" checked={detailTask.is_done} onChange={e => setDetailTask({...detailTask, is_done: e.target.checked})} /> בוצע</label>
          <button onClick={handleUpdate} style={btnUpdate}>עדכן</button>
          <button onClick={() => handleDelete(detailTask.id)} style={btnDelete}>מחק</button>
          <button onClick={() => setDetailTask(null)} style={btnCancel}>סגור</button>
        </div></div>
      )}
    </div>
  );
}

// --- Styles ---
const pageStyle = { padding: "20px", fontFamily: "Arial", backgroundColor: "#f0f2f5", minHeight: "100vh" };
const headerStyle = { display: "flex", justifyContent: "space-between", marginBottom: "20px" };
const cardContainer = { display: "flex", gap: "15px", flexWrap: "wrap" };
const cadetCard = { background: "white", padding: "15px", borderRadius: "10px", width: "140px", textAlign: "center", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" };
const statusBadge = { color: "white", padding: "4px", borderRadius: "10px", fontSize: "11px" };
const mainBtn = { width: "100%", padding: "15px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", marginTop: "20px" };
const tableStyle = { width: "100%", borderCollapse: "collapse", background: "white" };
const cellStyle = { minWidth: "100px", height: "80px", verticalAlign: "top", padding: "5px", cursor: "pointer" };
const taskBox = { padding: "5px", marginBottom: "4px", borderRadius: "4px", fontSize: "11px" };
const catCol = { fontWeight: "bold", background: "#f8f9fa", textAlign: "center" };
const loginPageStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' };
const loginCardStyle = { background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', width: '320px' };
const inputStyle = { padding: "10px", borderRadius: "5px", border: "1px solid #ddd" };
const modalOverlay = { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center" };
const modalContent = { background: "white", padding: "20px", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "10px", width: "300px" };
const btnSave = { background: "#28a745", color: "white", padding: "10px", border: "none", borderRadius: "5px" };
const btnUpdate = { background: "#007bff", color: "white", padding: "10px", border: "none", borderRadius: "5px" };
const btnDelete = { background: "#dc3545", color: "white", padding: "10px", border: "none", borderRadius: "5px" };
const btnCancel = { background: "none", border: "none", color: "#666", cursor: "pointer" };
const selectStyle = { padding: "5px", borderRadius: "5px" };
const backBtn = { padding: "5px 15px", cursor: "pointer" };