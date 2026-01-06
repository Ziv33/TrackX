import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// --- 1. Supabase Config ---
const SUPABASE_URL = "https://stxeyhqnikhkdfuaxfxc.supabase.co";
const SUPABASE_KEY = "sb_publishable_xDr7SOAxBPly03gR_sc6Fw_4Tvj_hQW";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const CATEGORIES = ["מבחן/מטלה", "הורדת מטלה", "תג\"ב", "ה\"ה", "א\"ת", "משוב", "סגל", "סימולציות"];
const COMPANIES = ["א", "ב", "ג", "ד", "ה"];
const API_BASE = "http://127.0.0.1:8000";
const START_DATE = new Date("2026-01-04");

export default function App() {
  // Auth State
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // App State
  const [company, setCompany] = useState("א");
  const [currentWeek, setCurrentWeek] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [cadets, setCadets] = useState([]);

  // Modals state
  const [addModal, setAddModal] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [askMoveModal, setAskMoveModal] = useState(null);
  const [dateMoveModal, setDateMoveModal] = useState(null);
  const [selectedCadetTasks, setSelectedCadetTasks] = useState(null);

  // Form State including Description
  const [form, setForm] = useState({ title: "", description: "", assigned_cadet: "", due_date: "" });

  // --- Auth logic ---
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

  const getHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session?.access_token}`
  }), [session]);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    if (!session) return;
    try {
      const headers = getHeaders();
      const [tRes, allRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/tasks/${company}/${currentWeek}`, { headers }),
        fetch(`${API_BASE}/tasks-all/${company}`, { headers }),
        fetch(`${API_BASE}/cadets/${company}`, { headers })
      ]);

      if (tRes.status === 403) return alert("אין הרשאה לפלוגה זו");

      setTasks(await tRes.json());
      setAllTasks(await allRes.json());
      setCadets(await cRes.json());
    } catch (err) { console.error(err); }
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
    await fetch(`${API_BASE}/tasks/`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ ...form, company, week: currentWeek, category: addModal.cat, day: addModal.day })
    });
    closeAll(); fetchData();
  };

  const closeAll = () => {
    setAddModal(null); setDetailTask(null); setAskMoveModal(null);
    setDateMoveModal(null); setSelectedCadetTasks(null);
    setForm({title:"", description: "", assigned_cadet:"", due_date:""});
  };

  // --- Render Login ---
  if (!session) {
    return (
      <div dir="rtl" style={s.ovl}>
        <div style={s.modal}>
          <h2 style={{textAlign:'center', color:'#1e293b'}}>מגדלור - כניסה</h2>
          <form onSubmit={handleLogin} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
            <input type="email" placeholder="אימייל" style={s.input} value={email} onChange={e=>setEmail(e.target.value)} required />
            <input type="password" placeholder="סיסמה" style={s.input} value={password} onChange={e=>setPassword(e.target.value)} required />
            <button type="submit" style={s.btnP}>התחבר</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={s.container}>
      <aside style={s.sidebar}>
        <div style={s.sideHeader}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h3 style={{margin:0}}>ניהול פלוגה {company}</h3>
            <button onClick={handleLogout} style={{background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:'12px'}}>התנתק</button>
          </div>
          <select value={company} onChange={e=>setCompany(e.target.value)} style={{...s.input, marginTop:'10px'}}>
            {COMPANIES.map(c=><option key={c} value={c}>פלוגה {c}</option>)}
          </select>
        </div>
        <div style={{padding:'15px'}}>
          <p style={s.label}>רשימת צוערים:</p>
          {cadets.map(c => {
            const cadetTasks = allTasks.filter(t => t.assigned_cadet === c);
            return (
              <div key={c} style={s.cadetItem} onClick={() => setSelectedCadetTasks({name: c, list: cadetTasks})}>
                <span>👤 {c}</span>
                <span style={s.taskCount}>{cadetTasks.length}</span>
              </div>
            );
          })}
        </div>
      </aside>

      <main style={s.main}>
        <section style={s.dash}>
          <h3 style={{marginTop:0}}>ריכוז משימות פלוגתי</h3>
          <div style={{maxHeight:'180px', overflowY:'auto'}}>
            <table style={s.sumTable}>
              <thead><tr><th>משימה</th><th>קטגוריה</th><th>יעד</th><th>צוער</th><th>סטטוס</th></tr></thead>
              <tbody>
                {allTasks.map(t => (
                  <tr key={t.id} onClick={()=>setDetailTask(t)} style={s.row}>
                    <td><b>{t.title}</b></td>
                    <td>{t.category}</td>
                    <td style={{color: getStatus(t).label === "באיחור" ? "red" : "inherit"}}>{t.due_date || "-"}</td>
                    <td>{t.assigned_cadet || "-"}</td>
                    <td><span style={{...s.stBadge, background: getStatus(t).bg, color: getStatus(t).color}}>{getStatus(t).label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

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
                    <div>{item.dayName}</div>
                    <div style={{fontSize:'10px', fontWeight:'normal', opacity:0.8}}>{item.formattedDate}</div>
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
                          <div style={{fontSize:'10px'}}>{t.assigned_cadet}</div>
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

      {/* --- Detail Task Modal (Modified) --- */}
      {detailTask && (
        <div style={s.ovl} onClick={closeAll}>
          <div style={{...s.modal, width:'450px'}} onClick={e=>e.stopPropagation()}>
            <h3 style={{margin:0}}>פרטי משימה</h3>

            <label style={s.label}>כותרת</label>
            <input value={detailTask.title} style={s.input} onChange={e=>setDetailTask({...detailTask, title:e.target.value})}/>

            <label style={s.label}>תיאור מורחב</label>
            <textarea
              value={detailTask.description || ""}
              style={{...s.input, minHeight:'100px', resize:'vertical'}}
              placeholder="הוסף פרטים נוספים כאן..."
              onChange={e=>setDetailTask({...detailTask, description:e.target.value})}
            />

            <label style={s.label}>צוער אחראי</label>
            <select value={detailTask.assigned_cadet} style={s.input} onChange={e=>setDetailTask({...detailTask, assigned_cadet:e.target.value})}>
              <option value="">בחר צוער</option>
              {cadets.map(c=><option key={c} value={c}>{c}</option>)}
            </select>

            <label style={s.label}>תאריך יעד</label>
            <input type="date" value={detailTask.due_date || ""} style={s.input} onChange={e=>setDetailTask({...detailTask, due_date:e.target.value})}/>

            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <input type="checkbox" checked={detailTask.is_done} onChange={e=>setDetailTask({...detailTask, is_done:e.target.checked})}/>
              <span style={{fontSize:'14px', fontWeight:'600'}}>סמן כבוצע</span>
            </div>

            <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
              <button style={{...s.btnP, flex:1}} onClick={()=>handleUpdateClick(detailTask)}>שמור שינויים</button>
              <button style={{...s.btnD, background:'#fee2e2', color:'#dc2626'}} onClick={async () => {
                  if(window.confirm("למחוק את המשימה לצמיתות?")) {
                      await fetch(`${API_BASE}/tasks/${detailTask.id}`, { method: "DELETE", headers: getHeaders() });
                      closeAll(); fetchData();
                  }
              }}>מחק</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Add Task Modal (Modified) --- */}
      {addModal && (
        <div style={s.ovl} onClick={closeAll}>
          <div style={{...s.modal, width:'450px'}} onClick={e=>e.stopPropagation()}>
            <h3 style={{margin:0}}>חדש: {addModal.cat} ({addModal.day})</h3>

            <input placeholder="כותרת המשימה" style={s.input} onChange={e=>setForm({...form, title:e.target.value})}/>

            <textarea
              placeholder="תיאור המשימה והנחיות..."
              style={{...s.input, minHeight:'100px', resize:'vertical'}}
              onChange={e=>setForm({...form, description:e.target.value})}
            />

            <select style={s.input} onChange={e=>setForm({...form, assigned_cadet:e.target.value})}>
              <option value="">בחר צוער</option>
              {cadets.map(c=><option key={c} value={c}>{c}</option>)}
            </select>

            <input type="date" style={s.input} onChange={e=>setForm({...form, due_date:e.target.value})}/>

            <button style={s.btnP} onClick={handleSave}>צור משימה</button>
          </div>
        </div>
      )}

      {/* Other Modals (Cadet List, Move, etc) */}
      {selectedCadetTasks && (
        <div style={s.ovl} onClick={closeAll}>
          <div style={{...s.modal, width:'450px'}} onClick={e=>e.stopPropagation()}>
            <h3 style={{margin:0}}>משימות של: {selectedCadetTasks.name}</h3>
            <div style={{maxHeight:'400px', overflowY:'auto', marginTop:'15px'}}>
              {selectedCadetTasks.list.map(t => (
                <div key={t.id} style={s.cadetTaskRow} onClick={() => { setDetailTask(t); setSelectedCadetTasks(null); }}>
                  <div style={{flex:1}}>
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

      {askMoveModal && (
        <div style={s.ovl}>
          <div style={s.modal}>
            <h2>המשימה הושלמה! 🎉</h2>
            <p>האם להעביר לשלב ה<b>{askMoveModal.category === "ה\"ה" ? "א\"ת" : "משוב"}</b>?</p>
            <div style={{display:'flex', gap:'10px'}}>
              <button style={{...s.btnP, flex:1}} onClick={proceedToMove}>כן, העבר</button>
              <button style={{...s.btnD, flex:1, background:'#f1f5f9'}} onClick={() => saveUpdate(askMoveModal)}>לא, רק סיים</button>
            </div>
          </div>
        </div>
      )}

      {dateMoveModal && (
        <div style={s.ovl}>
          <div style={s.modal}>
            <h3 style={{color:'#2563eb'}}>הגדרת {dateMoveModal.nextCat}</h3>
            <label style={s.label}>תאריך בלוח:</label>
            <input type="date" style={s.input} onChange={e=>setDateMoveModal({...dateMoveModal, targetDate:e.target.value})}/>
            <label style={s.label}>דדליין חדש:</label>
            <input type="date" style={s.input} onChange={e=>setDateMoveModal({...dateMoveModal, newDueDate:e.target.value})}/>
            <button style={s.btnP} onClick={confirmMove}>אשר העברה</button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { display:'flex', height:'100vh', direction:'rtl', fontFamily:'system-ui, sans-serif', background:'#f8fafc', color:'#1e293b' },
  sidebar: { width:'260px', background:'#fff', borderLeft:'1px solid #e2e8f0', display:'flex', flexDirection:'column' },
  sideHeader: { padding:'20px', borderBottom:'1px solid #f1f5f9', background:'#f8fafc' },
  main: { flex:1, padding:'24px', overflowY:'auto' },
  dash: { background:'#fff', padding:'20px', borderRadius:'16px', marginBottom:'24px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' },
  sumTable: { width:'100%', borderCollapse:'collapse', fontSize:'13px', textAlign:'center' },
  row: { cursor:'pointer', borderBottom:'1px solid #f1f5f9', transition:'0.2s' },
  stBadge: { padding:'4px 10px', borderRadius:'99px', fontSize:'11px', fontWeight:'700' },
  tableBox: { background:'#fff', padding:'20px', borderRadius:'16px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', overflowX:'auto' },
  weekHead: { display:'flex', justifyContent:'center', alignItems:'center', gap:'24px', marginBottom:'20px' },
  mainTable: { width:'100%', borderCollapse:'collapse', tableLayout:'fixed', minWidth:'800px' },
  th: { background:'#1e293b', color:'#fff', padding:'12px', fontSize:'13px', border:'1px solid #334155' },
  td: { border:'1px solid #f1f5f9', height:'95px', verticalAlign:'top', padding:'6px', cursor:'pointer', transition:'0.2s' },
  catTd: { background:'#f8fafc', fontWeight:'700', border:'1px solid #f1f5f9', textAlign:'center', fontSize:'13px' },
  card: { background:'#fff', padding:'8px', borderRadius:'8px', marginBottom:'6px', fontSize:'12px', border:'1px solid #e2e8f0' },
  ovl: { position:'fixed', inset:0, background:'rgba(15, 23, 42, 0.5)', backdropFilter:'blur(2px)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:100 },
  modal: { background:'#fff', padding:'24px', borderRadius:'16px', display:'flex', flexDirection:'column', gap:'16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' },
  input: { padding:'10px', borderRadius:'8px', border:'1px solid #cbd5e1', width:'100%', boxSizing:'border-box', fontFamily:'inherit' },
  btnP: { background:'#2563eb', color:'#fff', border:'none', padding:'12px', borderRadius:'8px', cursor:'pointer', fontWeight:'600' },
  btnD: { padding:'12px', borderRadius:'8px', border:'none', cursor:'pointer', fontWeight:'600' },
  nav: { border:'none', background:'#f1f5f9', width:'36px', height:'36px', borderRadius:'10px', cursor:'pointer' },
  cadetItem: { padding:'12px', borderBottom:'1px solid #f1f5f9', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' },
  taskCount: { background:'#f1f5f9', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', fontWeight:'700' },
  label: { fontSize:'12px', fontWeight:'700', color:'#64748b', marginBottom:'-8px' },
  cadetTaskRow: { padding:'12px', borderBottom:'1px solid #f8fafc', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }
};