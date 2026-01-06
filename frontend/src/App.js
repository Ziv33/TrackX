import React, { useState, useEffect, useCallback } from "react";

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const CATEGORIES = ["מבחן/מטלה", "הורדת מטלה", "תג\"ב", "ה\"ה", "א\"ת", "משוב", "סגל", "סימולציות"];
const COMPANIES = ["א", "ב", "ג", "ד", "ה"];
const API_BASE = "http://127.0.0.1:8000";
const START_DATE = new Date("2026-01-04");

export default function App() {
  const [company, setCompany] = useState("א");
  const [currentWeek, setCurrentWeek] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [cadets, setCadets] = useState([]);
  const [addModal, setAddModal] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [selectedCadetTasks, setSelectedCadetTasks] = useState(null);
  const [form, setForm] = useState({ title: "", assigned_cadet: "" });

  const fetchData = useCallback(async () => {
    try {
      const [tRes, allRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/tasks/${company}/${currentWeek}`),
        fetch(`${API_BASE}/tasks-all/${company}`),
        fetch(`${API_BASE}/cadets/${company}`)
      ]);
      setTasks(await tRes.json());
      setAllTasks(await allRes.json());
      setCadets(await cRes.json());
    } catch (err) { console.error(err); }
  }, [company, currentWeek]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getDateOfDay = (dayIdx, week = currentWeek) => {
    const d = new Date(START_DATE);
    d.setDate(d.getDate() + (week * 7) + dayIdx);
    return d;
  };

  // לוגיקת צבעים מעודכנת
  const getStatus = (t) => {
    if (t.is_done) {
      return { label: "הושלם", color: "#065f46", bg: "#dcfce7", border: "#10b981" }; // ירוק
    }
    const taskDate = getDateOfDay(DAYS.indexOf(t.day), t.week);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (taskDate < today) {
      return { label: "באיחור", color: "#991b1b", bg: "#fee2e2", border: "#ef4444" }; // אדום
    }
    return { label: "בתהליך", color: "#92400e", bg: "#fef3c7", border: "#f59e0b" }; // צהוב
  };

  const handleUpdate = async (task) => {
    if (task.is_done) {
      let next = task.category === "ה\"ה" ? "א\"ת" : task.category === "א\"ת" ? "משוב" : null;
      if (next && window.confirm(`המשימה הושלמה! להעביר אותה לשלב הבא (${next})?`)) {
        await fetch(`${API_BASE}/tasks/move/${task.id}?next_category=${encodeURIComponent(next)}`, { method: "POST" });
        closeAll(); fetchData(); return;
      }
    }
    await fetch(`${API_BASE}/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task)
    });
    closeAll(); fetchData();
  };

  const handleDelete = async (id) => {
    if (window.confirm("למחוק משימה זו לצמיתות?")) {
      await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" });
      closeAll(); fetchData();
    }
  };

  const handleSave = async () => {
    await fetch(`${API_BASE}/tasks/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, company, week: currentWeek, category: addModal.cat, day: addModal.day })
    });
    closeAll(); fetchData();
  };

  const closeAll = () => { setAddModal(null); setDetailTask(null); setSelectedCadetTasks(null); setForm({title:"", assigned_cadet:""}); };

  return (
    <div dir="rtl" style={s.container}>
      {/* סיידבר */}
      <aside style={s.sidebar}>
        <div style={s.sideHeader}>
          <h3>ניהול פלוגה {company}</h3>
          <select value={company} onChange={e=>setCompany(e.target.value)} style={s.input}>
            {COMPANIES.map(c=><option key={c} value={c}>פלוגה {c}</option>)}
          </select>
        </div>
        <div style={{padding:'15px'}}>
          <p style={s.label}>משימות לפי צוער</p>
          {cadets.map(c=>(
            <div key={c} style={s.cadetItem} onClick={()=>setSelectedCadetTasks({name:c, list:allTasks.filter(t=>t.assigned_cadet===c)})}>
              <span>👤 {c}</span>
              <span style={s.taskCount}>{allTasks.filter(t=>t.assigned_cadet===c).length}</span>
            </div>
          ))}
        </div>
      </aside>

      <main style={s.main}>
        {/* טבלת ריכוז עליונה */}
        <section style={s.dash}>
          <h2 style={{textAlign:'center', marginBottom:'15px'}}>ריכוז משימות פלוגתי</h2>
          <div style={s.tableWrap}>
            <table style={s.sumTable}>
              <thead>
                <tr>
                  <th style={s.thS}>משימה</th>
                  <th style={s.thS}>קטגוריה</th>
                  <th style={s.thS}>שבוע/יום</th>
                  <th style={s.thS}>צוער</th>
                  <th style={s.thS}>סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {allTasks.map(t=>{ 
                  const st = getStatus(t); 
                  return (
                    <tr key={t.id} onClick={()=>setDetailTask(t)} style={s.row}>
                      <td><b>{t.title}</b></td>
                      <td><span style={s.badge}>{t.category}</span></td>
                      <td>ש' {t.week}, {t.day}</td>
                      <td>{t.assigned_cadet || "-"}</td>
                      <td>
                        <span style={{...s.stBadge, background: st.bg, color: st.color, border: `1px solid ${st.border}`}}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                )})}
              </tbody>
            </table>
          </div>
        </section>

        {/* לוח שבועי */}
        <div style={s.tableBox}>
          <div style={s.weekHead}>
            <button style={s.nav} onClick={()=>setCurrentWeek(w=>Math.max(0,w-1))}>▶</button>
            <h2 style={{margin:0}}>שבוע {currentWeek}</h2>
            <button style={s.nav} onClick={()=>setCurrentWeek(w=>Math.min(12,w+1))}>◀</button>
          </div>
          <table style={s.mainTable}>
            <thead>
              <tr>
                <th style={s.th}>קטגוריה</th>
                {DAYS.map((d,i)=>(
                  <th key={d} style={s.th}>
                    {d}<br/><small style={{fontWeight:'normal'}}>{getDateOfDay(i).toLocaleDateString("he-IL")}</small>
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
                      {tasks.filter(t=>t.category===cat && t.day===day).map(t=>{
                        const st = getStatus(t);
                        return (
                          <div key={t.id} 
                               onClick={e=>{e.stopPropagation(); setDetailTask(t)}} 
                               style={{...s.card, borderRight: `5px solid ${st.border}`}}>
                            <div style={{fontSize:'11px', fontWeight:'bold'}}>{t.title}</div>
                            <div style={{fontSize:'9px', color:'#666'}}>{t.assigned_cadet}</div>
                          </div>
                        )
                      })}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* מודלים */}
      {detailTask && (
        <div style={s.ovl} onClick={closeAll}>
          <div style={s.modal} onClick={e=>e.stopPropagation()}>
            <h3>עריכת משימה</h3>
            <input value={detailTask.title} style={s.input} onChange={e=>setDetailTask({...detailTask, title:e.target.value})}/>
            <select value={detailTask.assigned_cadet} style={s.input} onChange={e=>setDetailTask({...detailTask, assigned_cadet:e.target.value})}>
              <option value="">בחר צוער</option>
              {cadets.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <label style={{display:'flex', alignItems:'center', gap:'10px', cursor:'pointer'}}>
              <input type="checkbox" checked={detailTask.is_done} onChange={e=>setDetailTask({...detailTask, is_done:e.target.checked})}/>
              סמן כהושלם / העבר שלב
            </label>
            <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
              <button style={s.btnP} onClick={()=>handleUpdate(detailTask)}>שמור עדכון</button>
              <button style={s.btnD} onClick={()=>handleDelete(detailTask.id)}>מחק</button>
            </div>
          </div>
        </div>
      )}

      {addModal && (
        <div style={s.ovl} onClick={closeAll}>
          <div style={s.modal} onClick={e=>e.stopPropagation()}>
            <h3>משימה חדשה: {addModal.cat}</h3>
            <input placeholder="כותרת המשימה" style={s.input} onChange={e=>setForm({...form, title:e.target.value})}/>
            <select style={s.input} onChange={e=>setForm({...form, assigned_cadet:e.target.value})}>
              <option value="">שייך לצוער</option>
              {cadets.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <button style={s.btnP} onClick={handleSave}>צור משימה</button>
          </div>
        </div>
      )}

      {selectedCadetTasks && (
        <div style={s.ovl} onClick={closeAll}>
          <div style={s.sideModal} onClick={e=>e.stopPropagation()}>
            <h3>משימות של {selectedCadetTasks.name}</h3>
            <div style={{maxHeight:'400px', overflowY:'auto'}}>
              {selectedCadetTasks.list.map(t => (
                <div key={t.id} style={{...s.miniCard, borderRight:`4px solid ${getStatus(t).border}`}} onClick={()=>{setDetailTask(t); setSelectedCadetTasks(null)}}>
                  <strong>{t.title}</strong>
                  <div style={{fontSize:'12px', color:'#666'}}>{t.category} | שבוע {t.week}</div>
                </div>
              ))}
            </div>
            <button style={s.btnS} onClick={closeAll} style={{marginTop:'15px', width:'100%', padding:'10px'}}>סגור</button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: { display:'flex', height:'100vh', direction:'rtl', fontFamily:'system-ui, -apple-system, sans-serif', background:'#f1f5f9' },
  sidebar: { width:'240px', background:'#fff', borderLeft:'1px solid #e2e8f0', display:'flex', flexDirection:'column' },
  sideHeader: { padding:'20px', borderBottom:'1px solid #f1f5f9' },
  main: { flex:1, padding:'20px', overflowY:'auto' },
  dash: { background:'#fff', padding:'20px', borderRadius:'15px', marginBottom:'20px', boxShadow:'0 1px 3px rgba(0,0,0,0.1)' },
  tableWrap: { maxHeight:'250px', overflowY:'auto' },
  sumTable: { width:'100%', borderCollapse:'collapse' },
  thS: { padding:'12px', background:'#f8fafc', position:'sticky', top:0, fontSize:'13px', color:'#64748b', borderBottom:'1px solid #eee' },
  row: { borderBottom:'1px solid #f8fafc', cursor:'pointer', textAlign:'center', transition:'0.2s hover', ':hover': {background:'#fbfcfd'} },
  badge: { background:'#eff6ff', color:'#2563eb', padding:'3px 8px', borderRadius:'6px', fontSize:'11px', fontWeight:'bold' },
  stBadge: { padding:'4px 12px', borderRadius:'20px', fontSize:'11px', fontWeight:'bold' },
  tableBox: { background:'#fff', padding:'20px', borderRadius:'15px', boxShadow:'0 1px 3px rgba(0,0,0,0.1)' },
  weekHead: { display:'flex', justifyContent:'center', alignItems:'center', gap:'30px', marginBottom:'20px' },
  mainTable: { width:'100%', borderCollapse:'collapse', tableLayout:'fixed' },
  th: { background:'#1e293b', color:'#fff', padding:'12px', fontSize:'13px', border:'1px solid #334155' },
  td: { border:'1px solid #f1f5f9', height:'85px', verticalAlign:'top', padding:'6px', cursor:'pointer', background:'#fff' },
  catTd: { background:'#f8fafc', fontWeight:'bold', fontSize:'13px', border:'1px solid #eee', textAlign:'center', color:'#475569' },
  card: { background:'#fff', padding:'8px', borderRadius:'6px', marginBottom:'5px', boxShadow:'0 2px 4px rgba(0,0,0,0.05)', border:'1px solid #f1f5f9' },
  ovl: { position:'fixed', inset:0, background:'rgba(15, 23, 42, 0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000, backdropFilter:'blur(2px)' },
  modal: { background:'#fff', padding:'30px', borderRadius:'20px', width:'340px', display:'flex', flexDirection:'column', gap:'15px', boxShadow:'0 20px 25px -5px rgba(0,0,0,0.1)' },
  sideModal: { background:'#fff', padding:'25px', borderRadius:'20px', width:'400px' },
  input: { padding:'10px', borderRadius:'10px', border:'1px solid #e2e8f0', outline:'none', fontSize:'14px' },
  btnP: { background:'#2563eb', color:'#fff', border:'none', padding:'12px', borderRadius:'10px', cursor:'pointer', fontWeight:'bold', flex:1 },
  btnD: { background:'#fee2e2', color:'#dc2626', border:'none', padding:'12px', borderRadius:'10px', cursor:'pointer', fontWeight:'bold' },
  nav: { border:'none', background:'#f1f5f9', fontSize:'20px', cursor:'pointer', color:'#2563eb', width:'40px', height:'40px', borderRadius:'10px' },
  cadetItem: { padding:'12px', borderRadius:'10px', cursor:'pointer', display:'flex', justifyContent:'space-between', marginBottom:'5px', transition:'0.2s' },
  taskCount: { background:'#f1f5f9', padding:'2px 8px', borderRadius:'8px', fontSize:'11px', color:'#475569' },
  miniCard: { padding:'12px', background:'#f8fafc', borderRadius:'10px', marginBottom:'10px', cursor:'pointer', border:'1px solid #e2e8f0' },
  label: { fontSize:'12px', color:'#64748b', fontWeight:'bold', marginBottom:'10px', display:'block' }
};