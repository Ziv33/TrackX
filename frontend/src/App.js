import React, { useState, useEffect, useCallback } from "react";

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const CATEGORIES = ["מבחן/מטלה", "הורדת מטלה", "תג\"ב", "ה\"ה", "א\"ת", "משוב", "סגל", "סימולציות"];
const COMPANIES = ["א", "ב", "ג", "ד", "ה"];
const API_BASE = "http://127.0.0.1:8000";

const START_DATE = new Date();
START_DATE.setDate(START_DATE.getDate() - START_DATE.getDay());

export default function App() {
  const [view, setView] = useState("dashboard"); 
  const [company, setCompany] = useState("א");
  const [currentWeek, setCurrentWeek] = useState(0); 
  const [tasks, setTasks] = useState([]);      
  const [allTasks, setAllTasks] = useState([]); 
  const [cadets, setCadets] = useState([]);
  
  const [addModal, setAddModal] = useState(null); 
  const [detailTask, setDetailTask] = useState(null); 
  const [selectedCadetTasks, setSelectedCadetTasks] = useState(null); 
  
  const [form, setForm] = useState({ title: "", description: "", assigned_cadet: "" });

  const fetchData = useCallback(async () => {
    try {
      // שליפת משימות לשבוע ספציפי
      const tRes = await fetch(`${API_BASE}/tasks/${company}/${currentWeek}`);
      setTasks(await tRes.json());
      // שליפת כל המשימות של הפלוגה הספציפית הזו בלבד (ה-Backend כבר מסנן לפי פלוגה)
      const allRes = await fetch(`${API_BASE}/tasks-all/${company}`);
      setAllTasks(await allRes.json());
      // שליפת רשימת הצוערים של הפלוגה
      const cRes = await fetch(`${API_BASE}/cadets/${company}`);
      setCadets(await cRes.json());
    } catch (err) { console.error(err); }
  }, [company, currentWeek]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveNew = async () => {
    if (!form.title) return alert("חובה כותרת");
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
      body: JSON.stringify(detailTask)
    });
    setDetailTask(null);
    fetchData();
    // עדכון הרשימה הפתוחה במידה והמפקד נמצא בתוך פירוט צוער/בנק
    if (selectedCadetTasks) {
      const allRes = await fetch(`${API_BASE}/tasks-all/${company}`);
      const all = await allRes.json();
      const targetName = selectedCadetTasks.name;
      // סינון מחדש - אם זה בנק מציגים ללא שיוך, אם זה צוער מציגים לפי שם
      setSelectedCadetTasks({ 
        ...selectedCadetTasks, 
        list: all.filter(t => (targetName === "טרם שויך" ? !t.assigned_cadet : t.assigned_cadet === targetName)) 
      });
    }
  };

  const toggleTaskStatus = async (task) => {
    const updated = { ...task, is_done: !task.is_done };
    await fetch(`${API_BASE}/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    });
    fetchData();
    if (selectedCadetTasks) {
      const newList = selectedCadetTasks.list.map(t => t.id === task.id ? updated : t);
      setSelectedCadetTasks({ ...selectedCadetTasks, list: newList });
    }
  };

  if (view === "dashboard") {
    // משימות שלא שויכו לאף אחד בתוך הפלוגה הנוכחית בלבד
    const unassignedTasks = allTasks.filter(t => !t.assigned_cadet);

    return (
      <div dir="rtl" style={styles.page}>
        <header style={styles.header}>
          <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
             <h1 style={{margin: 0}}>דשבורד פלוגתי - פלוגה {company}</h1>
             <select value={company} onChange={(e) => setCompany(e.target.value)} style={styles.select}>
               {COMPANIES.map(c => <option key={c} value={c}>פלוגה {c}</option>)}
             </select>
          </div>
          <div style={{color: '#666'}}>סה"כ משימות בפלוגה: {allTasks.length}</div>
        </header>

        <div style={styles.cardContainer}>
          {/* בנק משימות פלוגתי - מציג רק משימות של הפלוגה הנבחרת */}
          <div 
            onClick={() => setSelectedCadetTasks({ name: "טרם שויך", list: unassignedTasks })} 
            style={{...styles.cadetCard, borderTop: "5px solid #95a5a6", backgroundColor: "#f8f9fa"}}
          >
            <div style={{fontSize: "35px"}}>📦</div>
            <h3 style={{margin: '10px 0'}}>בנק משימות פלוגה {company}</h3>
            <div style={{...styles.badge, backgroundColor: unassignedTasks.length > 0 ? "#e74c3c" : "#bdc3c7"}}>
              {unassignedTasks.length} משימות להקצאה
            </div>
            {unassignedTasks.length > 0 && <div style={styles.ping}></div>}
          </div>

          {/* כרטיסיות הצוערים */}
          {cadets.map(cadet => {
            const cadetTasks = allTasks.filter(t => t.assigned_cadet === cadet);
            const open = cadetTasks.filter(t => !t.is_done).length;
            return (
              <div key={cadet} onClick={() => setSelectedCadetTasks({ name: cadet, list: cadetTasks })} style={styles.cadetCard}>
                <div style={{fontSize: "35px"}}>👤</div>
                <h3>{cadet}</h3>
                <div style={{...styles.badge, backgroundColor: open > 0 ? "#ff9800" : "#2ecc71"}}>
                  {open} משימות פתוחות
                </div>
              </div>
            );
          })}
        </div>
        
        <button onClick={() => setView("table")} style={styles.mainBtn}>מעבר ללוח שנה ועריכת לו"ז 📅</button>

        {selectedCadetTasks && (
          <div style={styles.overlay} onClick={() => setSelectedCadetTasks(null)}>
            <div style={styles.modalLarge} onClick={e => e.stopPropagation()}>
              <div style={{display:'flex', justifyContent:'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px'}}>
                <h2>{selectedCadetTasks.name === "טרם שויך" ? `בנק משימות - פלוגה ${company}` : `משימות של ${selectedCadetTasks.name}`}</h2>
                <button onClick={() => setSelectedCadetTasks(null)} style={styles.closeBtnIcon}>✖</button>
              </div>
              <div style={styles.taskListScroll}>
                {selectedCadetTasks.list.length === 0 ? <p style={{textAlign:'center', marginTop:'20px'}}>אין משימות להצגה.</p> : 
                  selectedCadetTasks.list.map(t => (
                    <div key={t.id} style={{...styles.cadetTaskItem, borderRight: t.is_done ? "5px solid #2ecc71" : "5px solid #ff9800"}}>
                      <div onClick={() => setDetailTask(t)} style={{flex:1, cursor:'pointer'}}>
                        <strong>{t.title} <span style={{fontSize: '11px', fontWeight: 'normal'}}>(שבוע {t.week})</span></strong>
                        <div style={{fontSize:'12px', color: '#666'}}>{t.description || "אין תיאור..."}</div>
                      </div>
                      <button onClick={() => toggleTaskStatus(t)} style={{...styles.statusToggleBtn, backgroundColor: t.is_done ? "#2ecc71" : "#ff9800"}}>
                        {t.is_done ? "בוצע ✓" : "סמן כבוצע"}
                      </button>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}
        
        {detailTask && <EditModal task={detailTask} setTask={setDetailTask} onSave={handleUpdate} cadets={cadets} />}
      </div>
    );
  }

  // --- תצוגת לוח שנה ---
  return (
    <div dir="rtl" style={styles.page}>
      <header style={styles.header}>
        <button onClick={() => setView("dashboard")} style={styles.backBtn}>⬅ חזור לדשבורד פלוגה {company}</button>
        <div style={styles.weekNav}>
          <button onClick={() => setCurrentWeek(c => Math.max(0, c - 1))} style={styles.navBtn}>▶</button>
          <h2 style={{margin:'0 20px'}}>שבוע {currentWeek}</h2>
          <button onClick={() => setCurrentWeek(c => Math.min(12, c + 1))} style={styles.navBtn}>◀</button>
        </div>
        <div style={{fontWeight: 'bold', fontSize: '18px'}}>לוח שנה פלוגתי</div>
      </header>

      <table border="1" style={styles.table}>
        <thead>
          <tr style={{backgroundColor:'#2c3e50', color:'white'}}>
            <th style={styles.catCol}>קטגוריה</th>
            {DAYS.map(d => <th key={d} style={{padding: '10px'}}>{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map(cat => (
            <tr key={cat}>
              <td style={styles.catCol}>{cat}</td>
              {DAYS.map(day => (
                <td key={day} onClick={() => setAddModal({ cat, day })} style={styles.cell}>
                  {tasks.filter(t => t.category === cat && t.day === day).map(t => (
                    <div key={t.id} onClick={(e) => { e.stopPropagation(); setDetailTask(t); }} 
                         style={{ ...styles.taskBox, backgroundColor: t.is_done ? "#d4edda" : "#ffe0b2", borderRight: t.is_done ? "4px solid #2ecc71" : "4px solid #ff9800" }}>
                      <strong>{t.title}</strong>
                      <div style={{fontSize: "9px", marginTop: "2px"}}>{t.assigned_cadet || "⚠️ טרם שויך"}</div>
                    </div>
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {addModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3>הוספת משימה | {addModal.cat}</h3>
            <label>כותרת:</label>
            <input placeholder="מה המשימה?" onChange={e => setForm({...form, title: e.target.value})} style={styles.input} />
            <label>צוער אחראי:</label>
            <select onChange={e => setForm({...form, assigned_cadet: e.target.value})} style={styles.input}>
              <option value="">ללא שיוך (בנק פלוגתי)</option>
              {cadets.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleSaveNew} style={styles.btnSave}>שמור בלו"ז</button>
            <button onClick={() => setAddModal(null)} style={styles.btnCancel}>ביטול</button>
          </div>
        </div>
      )}

      {detailTask && <EditModal task={detailTask} setTask={setDetailTask} onSave={handleUpdate} cadets={cadets} />}
    </div>
  );
}

// קומפוננטת מודל עריכה
function EditModal({ task, setTask, onSave, cadets }) {
  return (
    <div style={styles.overlay} onClick={() => setTask(null)}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h3>עריכת משימה</h3>
        <label>כותרת:</label>
        <input value={task.title} onChange={e => setTask({...task, title: e.target.value})} style={styles.input} />
        <label>תיאור:</label>
        <textarea value={task.description} onChange={e => setTask({...task, description: e.target.value})} style={{...styles.input, height:'70px'}} />
        <label>שיוך לצוער:</label>
        <select value={task.assigned_cadet || ""} onChange={e => setTask({...task, assigned_cadet: e.target.value})} style={styles.input}>
          <option value="">ללא שיוך (בנק פלוגתי)</option>
          {cadets.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer'}}>
            <input type="checkbox" checked={task.is_done} onChange={e => setTask({...task, is_done: e.target.checked})} />
            סומן כבוצע
        </label>
        <button onClick={onSave} style={styles.btnSave}>עדכן פרטים</button>
        <button onClick={() => setTask(null)} style={styles.btnCancel}>סגור</button>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "20px", fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif", direction: "rtl", backgroundColor: "#f0f2f5", minHeight: "100vh" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", backgroundColor: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" },
  cardContainer: { display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "30px" },
  cadetCard: { background: "white", padding: "20px", borderRadius: "15px", width: "190px", textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", borderTop: "5px solid #ff9800", cursor: "pointer", position: "relative", transition: "transform 0.2s" },
  badge: { color: "white", padding: "6px 12px", borderRadius: "20px", marginTop: "15px", fontSize: "14px", fontWeight: "bold" },
  ping: { position: "absolute", top: "10px", right: "10px", width: "10px", height: "10px", backgroundColor: "#e74c3c", borderRadius: "50%", animation: "pulse 1.5s infinite" },
  mainBtn: { width: "100%", padding: "18px", backgroundColor: "#2c3e50", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "18px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" },
  table: { width: "100%", borderCollapse: "collapse", backgroundColor: "white", borderRadius: "10px", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
  cell: { height: "100px", verticalAlign: "top", cursor: "pointer", border: "1px solid #eee", padding: "8px" },
  taskBox: { padding: "8px", marginBottom: "5px", borderRadius: "6px", fontSize: "12px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
  catCol: { fontWeight: "bold", background: "#f8f9fa", textAlign: "center", width: "110px", color: "#2c3e50" },
  weekNav: { display: "flex", alignItems: "center", backgroundColor: "#fff", padding: "5px 15px", borderRadius: "30px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" },
  navBtn: { border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "#3498db" },
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 },
  modal: { background: "white", padding: "30px", borderRadius: "20px", width: "350px", display: "flex", flexDirection: "column", gap: "15px" },
  modalLarge: { background: "white", padding: "30px", borderRadius: "20px", width: "550px", maxHeight: "85vh", display: "flex", flexDirection: "column" },
  taskListScroll: { overflowY: "auto", flex: 1, marginTop: "20px", paddingRight: "5px" },
  cadetTaskItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", marginBottom: "12px", backgroundColor: "white", borderRadius: "10px", border: "1px solid #eee" },
  statusToggleBtn: { border: "none", color: "white", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "bold", minWidth: "100px" },
  input: { padding: "12px", borderRadius: "10px", border: "1px solid #ddd", fontSize: "14px" },
  btnSave: { background: "#ff9800", color: "white", padding: "12px", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "bold", fontSize: "16px" },
  btnCancel: { background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "14px" },
  closeBtnIcon: { border: "none", background: "none", fontSize: "24px", cursor: "pointer", color: "#ccc" },
  select: { padding: "10px 20px", borderRadius: "10px", border: "1px solid #ddd", fontWeight: "bold", cursor: "pointer" },
  backBtn: { padding: "10px 20px", cursor: "pointer", borderRadius: "10px", border: "1px solid #ddd", background: "white" }
};