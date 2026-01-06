import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// --- 1. Supabase Config ---
// Replace these with your actual credentials from the Supabase dashboard
const SUPABASE_URL = "http://localhost:54321";
const SUPABASE_KEY = "YOUR_ANON_KEY";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const CATEGORIES = ["מבחן/מטלה", "הורדת מטלה", "תג\"ב", "ה\"ה", "א\"ת", "משוב", "סגל", "סימולציות"];
const COMPANIES = ["א", "ב", "ג", "ד", "ה"];
const API_BASE = "http://127.0.0.1:8000";
const START_DATE = new Date("2026-01-04");

export default function App() {
  // --- Auth State ---
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // --- App State ---
  const [company, setCompany] = useState("א");
  const [currentWeek, setCurrentWeek] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [cadets, setCadets] = useState([]);

  const [addModal, setAddModal] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [askMoveModal, setAskMoveModal] = useState(null);
  const [dateMoveModal, setDateMoveModal] = useState(null);
  const [selectedCadetTasks, setSelectedCadetTasks] = useState(null);

  const [form, setForm] = useState({ title: "", description: "", assigned_cadet: "", due_date: "" });

  // --- Auth Logic ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("שגיאה בכניסה: " + error.message);
  };

  const handleLogout = () => supabase.auth.signOut();

  const getHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session?.access_token}`
  }), [session]);

  // --- Fetch Data ---
  const fetchData = useCallback(async () => {
    if (!session) return;
    try {
      const headers = getHeaders();
      const [tRes, allRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/tasks/${company}/${currentWeek}`, { headers }),
        fetch(`${API_BASE}/tasks-all/${company}`, { headers }),
        fetch(`${API_BASE}/cadets/${company}`, { headers })
      ]);

      if (tRes.status === 403) return console.warn("Unauthorized access to company");

      setTasks(await tRes.json());
      setAllTasks(await allRes.json());
      setCadets(await cRes.json());
    } catch (err) { console.error("Error fetching data:", err); }
  }, [company, currentWeek, session, getHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Helpers ---
  const getWeekDaysWithDates = () => {
    return DAYS.map((dayName, index) => {
      const date = new Date(START_DATE);
      date.setDate(START_DATE.getDate() + (currentWeek * 7) + index);
      const formattedDate = `${date.getDate()}/${date.getMonth() + 1}`;
      return { dayName, formattedDate };
    });
  };

  const calculatePosition = (dateStr) => {
    const d = new Date(dateStr);
    const diff = Math.floor((d - START_DATE) / (1000 * 60 * 60 * 24));
    return { week: Math.floor(diff / 7), day: DAYS[d.getDay()] || DAYS[0] };
  };

  const getStatus = (t) => {
    if (t.is_done) return { label: "הושלם", color: "#065f46", bg: "#dcfce7", border: "#10b981" };
    if (t.due_date) {
      const d = new Date(t.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d < today) return { label: "באיחור", color: "#991b1b", bg: "#fee2e2", border: "#ef4444" };
    }
    return { label: "בתהליך", color: "#92400e", bg: "#fef3c7", border: "#f59e0b" };
  };

  // --- Actions ---
  const handleUpdateClick = (task) => {
    if (task.is_done && (task.category === "ה\"ה" || task.category === "א\"ת")) {
      setDetailTask(null);
      setAskMoveModal(task);
    } else {
      saveUpdate(task);
    }
  };

  const saveUpdate = async (task) => {
    await fetch(`${API_BASE}/tasks/${task.id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(task)
    });
    closeAll();
    fetchData();
  };

  const proceedToMove = () => {
    const task = askMoveModal;
    const next = task.category === "ה\"ה" ? "א\"ת" : "משוב";
    setAskMoveModal(null);
    setDateMoveModal({ task, nextCat: next, newDueDate: "", targetDate: "" });
  };

  const confirmMove = async () => {
    if (!dateMoveModal.targetDate || !dateMoveModal.newDueDate) return alert("חובה למלא תאריכים!");
    const { week, day } = calculatePosition(dateMoveModal.targetDate);
    const params = new URLSearchParams({
      next_cat: dateMoveModal.nextCat,
      new_due_date: dateMoveModal.newDueDate,
      new_week: week,
      new_day: day
    });
    await fetch(`${API_BASE}/tasks/move/${dateMoveModal.task.id}?${params.toString()}`, {
        method: "POST",
        headers: getHeaders()
    });
    closeAll();
    fetchData();
  };

  const handleSave = async () => {
    if (!form.title) return alert("חובה להזין כותרת");
    await fetch(`${API_BASE}/tasks/`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ ...form, company, week: currentWeek, category: addModal.cat, day: addModal.day })
    });
    closeAll();
    fetchData();
  };

  const closeAll = () => {
    setAddModal(null); setDetailTask(null); setAskMoveModal(null);
    setDateMoveModal(null); setSelectedCadetTasks(null);
    setForm({title:"", description: "", assigned_cadet:"", due_date:""});
  };

  // --- Login Screen ---
  if (!session) {
    return (
      <div dir="rtl" style={s.ovl}>
        <div style={{...s.modal, width:'400px', textAlign:'center'}}>
          <h1 style={{color:'#1e293b', marginBottom:'5px'}}>מגדלור</h1>
          <p style={{color:'#64748b', marginBottom:'25px'}}>מערכת ניהול משימות קצונה</p>
          <form onSubmit={handleLogin} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
            <input type="email" placeholder="אימייל" style={s.input} value={email} onChange={e=>setEmail(e.target.value)} required />
            <input type="password" placeholder="סיסמה" style={s.input} value={password} onChange={e=>setPassword(e.target.value)} required />
            <button type="submit" style={s.btnP}>התחבר למערכת</button>
          </form>
        </div>
      </div>
    );
  }

  // --- Main App UI ---
  return (
    <div dir="rtl" style={s.container}>
      <aside style={s.sidebar}>
        <div style={s.sideHeader}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h3 style={{margin:0}}>פלוגה {company}</h3>
            <button onClick={handleLogout} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:'12px', fontWeight:'700'}}>התנתק</button>
          </div>
          <select value={company} onChange={e=>setCompany(e.target.value)} style={{...s.input, marginTop:'10px', padding:'8px'}}>
            {COMPANIES.map(c=><option key={c} value={c}>פלוגה {c}</option>)}
          </select>
        </div>
        <div style={{padding:'15px', flex:1, overflowY:'auto'}}>
          <p style={s.label}>צוערים (לחץ לפירוט):</p>
          {cadets.map(c => {
             const cTasks = allTasks.filter(t => t.assigned_cadet === c);
             return (
              <div key={c} style={s.cadetItem} onClick={() => setSelectedCadetTasks({name: c, list: cTasks})}>
                <span>👤 {c}</span>
                <span style={s.taskCount}>{cTasks.length}</span>
              </div>
             );
          })}
        </div>
      </aside>

      <main style={s.main}>
        <div style={s.tableBox}>
          <div style={s.weekHead}>
            <button style={s.nav} onClick={()=>setCurrentWeek(w=>Math.max(0,w-1))}>▶</button>
            <h2 style={{margin:0}}>שבוע {currentWeek}</h2>
            <button style={s.nav} onClick={()=>setCurrentWeek(w=>w+1)}>◀</button>
          </div>

          <table style={s.mainTable}>
            <thead>
              <tr>
                <th style={s.th}>קטגוריה</th>
                {getWeekDaysWithDates().map((item, idx) => (
                  <th key={idx} style={s.th}>
                    <div style={{fontSize:'14px'}}>{item.dayName}</div>
                    <div style={{fontSize:'11px', fontWeight:'normal', opacity:0.8}}>{item.formattedDate}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map(cat=>(
                <tr key={cat}>
                  <td style={s.catTd}>{cat}</td>
                  {DAYS.map(day=>(
                    <td key={day} style={s.td} onClick={()=>setAddModal({cat,day})}>
                      {tasks.filter(t=>t.category===cat && t.day===day).map(t=>(
                        <div key={t.id} onClick={e=>{e.stopPropagation(); setDetailTask(t)}} style={{...s.card, borderRight: `5px solid ${getStatus(t).border}`}}>
                          <div style={{fontWeight:'bold', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{t.title}</div>
                          <div style={{fontSize:'10px', color:'#64748b'}}>{t.assigned_cadet || "ללא שיוך"}</div>
                        </div>
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add Modal */}
      {addModal && (
        <div style={s.ovl} onClick={closeAll}>
          <div style={{...s.modal, width:'550px'}} onClick={e=>e.stopPropagation()}>
            <h2 style={{margin:0}}>משימה חדשה: {addModal.cat}</h2>
            <p style={{margin:0, color:'#64748b'}}>יום {addModal.day}, שבוע {currentWeek}</p>
            <label style={s.label}>כותרת המשימה</label>
            <input placeholder="לדוגמה: הורדת התנסות ממש" style={s.input} onChange={e=>setForm({...form, title:e.target.value})}/>
            <label style={s.label}>פירוט והנחיות</label>
            <textarea placeholder="פרט כאן מה נדרש לבצע..." style={{...s.input, minHeight:'120px', resize:'vertical'}} onChange={e=>setForm({...form, description:e.target.value})} />
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
              <div>
                <label style={s.label}>צוער אחראי</label>
                <select style={s.input} onChange={e=>setForm({...form, assigned_cadet:e.target.value})}>
                  <option value="">בחר צוער...</option>
                  {cadets.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>תאריך יעד (Deadline)</label>
                <input type="date" style={s.input} onChange={e=>setForm({...form, due_date:e.target.value})}/>
              </div>
            </div>
            <div style={{display:'flex', gap:'12px', marginTop:'10px'}}>
              <button style={{...s.btnP, flex:2}} onClick={handleSave}>צור משימה</button>
              <button style={{...s.btnD, flex:1, background:'#f1f5f9'}} onClick={closeAll}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailTask && (
        <div style={s.ovl} onClick={closeAll}>
          <div style={{...s.modal, width:'550px'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <h2 style={{margin:0}}>עריכת משימה</h2>
              <span style={{...s.stBadge, background: getStatus(detailTask).bg, color: getStatus(detailTask).color}}>
                {getStatus(detailTask).label}
              </span>
            </div>
            <label style={s.label}>כותרת</label>
            <input value={detailTask.title} style={s.input} onChange={e=>setDetailTask({...detailTask, title:e.target.value})}/>
            <label style={s.label}>פירוט מורחב</label>
            <textarea value={detailTask.description || ""} style={{...s.input, minHeight:'150px', resize:'vertical'}} onChange={e=>setDetailTask({...detailTask, description:e.target.value})} />
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                <div>
                    <label style={s.label}>צוער אחראי</label>
                    <select value={detailTask.assigned_cadet} style={s.input} onChange={e=>setDetailTask({...detailTask, assigned_cadet:e.target.value})}>
                        <option value="">ללא שיוך</option>
                        {cadets.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label style={s.label}>תאריך יעד</label>
                    <input type="date" value={detailTask.due_date || ""} style={s.input} onChange={e=>setDetailTask({...detailTask, due_date:e.target.value})}/>
                </div>
            </div>
            <label style={{display:'flex', alignItems:'center', gap:'12px', background:'#eff6ff', padding:'15px', borderRadius:'12px', cursor:'pointer', border:'1px solid #dbeafe'}}>
                <input type="checkbox" style={{width:'22px', height:'22px'}} checked={detailTask.is_done} onChange={e=>setDetailTask({...detailTask, is_done:e.target.checked})}/>
                <span style={{fontWeight:'bold', color:'#1e40af'}}>סמן כבוצע (יציע מעבר לשלב הבא)</span>
            </label>
            <div style={{display:'flex', gap:'12px'}}>
              <button style={{...s.btnP, flex:2}} onClick={()=>handleUpdateClick(detailTask)}>שמור שינויים</button>
              <button style={{...s.btnD, flex:1, background:'#fee2e2', color:'#b91c1c'}} onClick={async () => {
                  if(window.confirm("למחוק?")) {
                      await fetch(`${API_BASE}/tasks/${detailTask.id}`, {method:"DELETE", headers: getHeaders()});
                      closeAll(); fetchData();
                  }
              }}>מחק</button>
            </div>
          </div>
        </div>
      )}

      {/* Logic Modals (Move, Cadet List, etc) */}
      {askMoveModal && (
        <div style={s.ovl}>
          <div style={s.modal}>
            <div style={{textAlign:'center'}}>
              <h2 style={{color:'#166534'}}>המשימה הושלמה! 🎉</h2>
              <p>האם להעביר לשלב ה<b>{askMoveModal.category === "ה\"ה" ? "א\"ת" : "משוב"}</b>?</p>
            </div>
            <div style={{display:'flex', gap:'10px'}}>
              <button style={{...s.btnP, flex:1}} onClick={proceedToMove}>כן, העבר שלב</button>
              <button style={{...s.btnD, flex:1, background:'#f1f5f9'}} onClick={() => saveUpdate(askMoveModal)}>לא, רק סיים</button>
            </div>
          </div>
        </div>
      )}

      {dateMoveModal && (
        <div style={s.ovl}>
          <div style={s.modal}>
            <h3 style={{color:'#2563eb'}}>הגדרת {dateMoveModal.nextCat}</h3>
            <label style={s.label}>איפה למקם בלוח (תאריך):</label>
            <input type="date" style={s.input} onChange={e=>setDateMoveModal({...dateMoveModal, targetDate:e.target.value})}/>
            <label style={s.label}>דדליין חדש למשימה:</label>
            <input type="date" style={s.input} onChange={e=>setDateMoveModal({...dateMoveModal, newDueDate:e.target.value})}/>
            <button style={s.btnP} onClick={confirmMove}>אשר וצור משימה</button>
          </div>
        </div>
      )}

      {selectedCadetTasks && (
        <div style={s.ovl} onClick={closeAll}>
          <div style={{...s.modal, width:'500px'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', borderBottom:'1px solid #eee', paddingBottom:'10px'}}>
              <h3 style={{margin:0}}>משימות: {selectedCadetTasks.name}</h3>
              <button onClick={closeAll} style={{border:'none', background:'none', cursor:'pointer', fontSize:'20px'}}>×</button>
            </div>
            <div style={{maxHeight:'400px', overflowY:'auto', marginTop:'10px'}}>
              {selectedCadetTasks.list.map(t => (
                <div key={t.id} style={s.cadetTaskRow} onClick={() => { setDetailTask(t); setSelectedCadetTasks(null); }}>
                  <div>
                    <div style={{fontWeight:'bold'}}>{t.title}</div>
                    <div style={{fontSize:'12px', color:'#666'}}>{t.category} | שבוע {t.week}</div>
                  </div>
                  <span style={{...s.stBadge, background: getStatus(t).bg, color: getStatus(t).color}}>{getStatus(t).label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Styles (Original Styles Preserved) ---
const s = {
  container: { display:'flex', height:'100vh', direction:'rtl', fontFamily:'system-ui, -apple-system, sans-serif', background:'#f8fafc', color:'#1e293b' },
  sidebar: { width:'260px', background:'#fff', borderLeft:'1px solid #e2e8f0', display:'flex', flexDirection:'column', boxShadow:'2px 0 10px rgba(0,0,0,0.02)' },
  sideHeader: { padding:'20px', borderBottom:'1px solid #f1f5f9', background:'#f8fafc' },
  main: { flex:1, padding:'24px', overflowY:'auto' },
  tableBox: { background:'#fff', padding:'25px', borderRadius:'20px', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)', overflowX:'auto' },
  weekHead: { display:'flex', justifyContent:'center', alignItems:'center', gap:'30px', marginBottom:'25px' },
  mainTable: { width:'100%', borderCollapse:'collapse', tableLayout:'fixed', minWidth:'900px' },
  th: { background:'#1e293b', color:'#fff', padding:'12px', border:'1px solid #334155', textAlign:'center' },
  td: { border:'1px solid #f1f5f9', height:'110px', verticalAlign:'top', padding:'8px', cursor:'pointer', transition:'0.2s' },
  catTd: { background:'#f8fafc', fontWeight:'bold', border:'1px solid #f1f5f9', textAlign:'center', width:'110px', color:'#475569' },
  card: { background:'#fff', padding:'10px', borderRadius:'10px', marginBottom:'6px', border:'1px solid #e2e8f0', boxShadow:'0 2px 4px rgba(0,0,0,0.04)', transition:'0.2s' },
  ovl: { position:'fixed', inset:0, background:'rgba(15, 23, 42, 0.5)', backdropFilter:'blur(3px)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:100 },
  modal: { background:'#fff', padding:'30px', borderRadius:'20px', display:'flex', flexDirection:'column', gap:'18px', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight:'90vh', overflowY:'auto' },
  input: { padding:'14px', borderRadius:'10px', border:'1px solid #cbd5e1', fontSize:'15px', width:'100%', boxSizing:'border-box', background:'#fcfcfc' },
  label: { fontSize:'13px', fontWeight:'700', color:'#475569', marginBottom:'-12px' },
  btnP: { background:'#2563eb', color:'#fff', padding:'14px', borderRadius:'10px', border:'none', cursor:'pointer', fontWeight:'700', fontSize:'15px' },
  btnD: { padding:'14px', borderRadius:'10px', border:'none', cursor:'pointer', fontWeight:'700' },
  nav: { width:'45px', height:'45px', borderRadius:'12px', border:'none', cursor:'pointer', background:'#f1f5f9', fontSize:'20px' },
  cadetItem: { padding:'12px', borderBottom:'1px solid #f1f5f9', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', borderRadius:'10px', margin:'2px 0' },
  taskCount: { background:'#f1f5f9', padding:'3px 10px', borderRadius:'8px', fontSize:'12px', fontWeight:'800', color:'#475569' },
  stBadge: { padding:'5px 12px', borderRadius:'99px', fontSize:'12px', fontWeight:'800' },
  cadetTaskRow: { padding:'15px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', borderRadius:'10px' }
};