import React, { useState, useEffect, useCallback } from "react";

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const CATEGORIES = ["מבחן/מטלה", "הורדת מטלה", "תג\"ב", "ה\"ה", "א\"ת", "משוב", "סגל", "סימולציות"];
const COMPANIES = ["א", "ב", "ג", "ד", "ה"];
const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  const [company, setCompany] = useState("א");
  const [currentWeek, setCurrentWeek] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [cadets, setCadets] = useState([]);

  const [addModal, setAddModal] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [movePrompt, setMovePrompt] = useState(null);
  const [selectedCadetTasks, setSelectedCadetTasks] = useState(null);

  const [form, setForm] = useState({ title: "", description: "", assigned_cadet: "" });

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
    } catch (err) { console.error("Sync error", err); }
  }, [company, currentWeek]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const closeAll = () => {
    setAddModal(null); setDetailTask(null); setMovePrompt(null); setSelectedCadetTasks(null);
    setForm({ title: "", description: "", assigned_cadet: "" });
  };

  const handleSaveNew = async () => {
    await fetch(`${API_BASE}/tasks/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, company, week: currentWeek, category: addModal.cat, day: addModal.day })
    });
    closeAll(); fetchData();
  };

  const executeMove = async (oldTask, nextCat) => {
    await fetch(`${API_BASE}/tasks/move/${oldTask.id}?next_category=${encodeURIComponent(nextCat)}`, { method: "POST" });
    closeAll(); fetchData();
  };

  const finalizeWithoutMove = async (task) => {
    await fetch(`${API_BASE}/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...task, is_done: true })
    });
    closeAll(); fetchData();
  };

  const handleUpdate = async (task) => {
    if (task.is_done) {
      if (task.category === "ה\"ה") { setMovePrompt({ task, nextCat: "א\"ת" }); return; }
      if (task.category === "א\"ת") { setMovePrompt({ task, nextCat: "משוב" }); return; }
    }
    await fetch(`${API_BASE}/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task)
    });
    closeAll(); fetchData();
  };

  return (
    <div dir="rtl" style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.sideHeader}>
          <h3>ניהול פלוגה {company}</h3>
          <select value={company} onChange={(e)=>setCompany(e.target.value)} style={styles.input}>
            {COMPANIES.map(c => <option key={c} value={c}>פלוגה {c}</option>)}
          </select>
        </div>
        <div style={{padding:'15px'}}>
          <div style={styles.bankBtn} onClick={()=>setSelectedCadetTasks({name:"בנק משימות", list:allTasks.filter(t=>!t.assigned_cadet)})}>📦 בנק משימות</div>
          <p style={styles.label}>צוערים</p>
          {cadets.map(c => (
            <div key={c} style={styles.cadetItem} onClick={()=>setSelectedCadetTasks({name:c, list:allTasks.filter(t=>t.assigned_cadet===c)})}>👤 {c}</div>
          ))}
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div style={styles.weekControl}>
            <button onClick={()=>setCurrentWeek(w=>Math.max(0,w-1))}>▶</button>
            <strong>שבוע {currentWeek}</strong>
            <button onClick={()=>setCurrentWeek(w=>Math.min(12,w+1))}>◀</button>
          </div>
        </header>

        <div style={styles.tableBox}>
          <table style={styles.table}>
            <thead>
              <tr><th style={styles.th}>קטגוריה</th>{DAYS.map(d => <th key={d} style={styles.th}>{d}</th>)}</tr>
            </thead>
            <tbody>
              {CATEGORIES.map(cat => (
                <tr key={cat}>
                  <td style={styles.catCell}>{cat}</td>
                  {DAYS.map(day => (
                    <td key={day} style={styles.td} onClick={()=>setAddModal({cat, day})}>
                      {tasks.filter(t=>t.category===cat && t.day===day).map(t => (
                        <div key={t.id} style={{...styles.card, borderRight:`5px solid ${t.is_done?'#10b981':'#f59e0b'}`}}
                             onClick={(e)=>{e.stopPropagation(); setDetailTask(t)}}>
                          <div style={{fontWeight:'bold', fontSize:'12px'}}>{t.title}</div>
                          <div style={{fontSize:'10px', color:'#666'}}>{t.assigned_cadet || "ללא שיוך"}</div>
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

      {/* מודל העברה/SWAP */}
      {movePrompt && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3>העברה לשלב הבא</h3>
            <p>להעביר את "<strong>{movePrompt.task.title}</strong>" ל-<strong>{movePrompt.nextCat}</strong>?</p>
            <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
              <button style={styles.btnPrimary} onClick={()=>executeMove(movePrompt.task, movePrompt.nextCat)}>כן, העבר שורה</button>
              <button style={styles.btnSecondary} onClick={()=>finalizeWithoutMove(movePrompt.task)}>רק סמן כבוצע</button>
            </div>
          </div>
        </div>
      )}

      {/* מודל עריכה */}
      {detailTask && !movePrompt && (
        <div style={styles.overlay} onClick={closeAll}>
          <div style={styles.modal} onClick={e=>e.stopPropagation()}>
            <h3>עריכת משימה</h3>
            <input value={detailTask.title} style={styles.input} onChange={e=>setDetailTask({...detailTask, title:e.target.value})} />
            <textarea value={detailTask.description || ""} style={{...styles.input, height:'60px'}} onChange={e=>setDetailTask({...detailTask, description:e.target.value})} />
            <select value={detailTask.assigned_cadet || ""} style={styles.input} onChange={e=>setDetailTask({...detailTask, assigned_cadet:e.target.value})}>
              <option value="">ללא שיוך</option>
              {cadets.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <label style={{display:'flex', gap:'10px', margin:'10px 0'}}>
              <input type="checkbox" checked={detailTask.is_done} onChange={e=>setDetailTask({...detailTask, is_done:e.target.checked})} />
              סימון כבוצע
            </label>
            <button style={styles.btnPrimary} onClick={()=>handleUpdate(detailTask)}>שמור</button>
          </div>
        </div>
      )}

      {/* מודל הוספה */}
      {addModal && (
        <div style={styles.overlay} onClick={closeAll}>
          <div style={styles.modal} onClick={e=>e.stopPropagation()}>
            <h3>חדש ב{addModal.cat}</h3>
            <input placeholder="כותרת" style={styles.input} onChange={e=>setForm({...form, title:e.target.value})} />
            <textarea placeholder="תיאור" style={{...styles.input, height:'60px'}} onChange={e=>setForm({...form, description:e.target.value})} />
            <select style={styles.input} onChange={e=>setForm({...form, assigned_cadet:e.target.value})}>
              <option value="">בחר צוער</option>
              {cadets.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <button style={styles.btnPrimary} onClick={handleSaveNew}>צור משימה</button>
          </div>
        </div>
      )}

      {/* משימות צוער */}
      {selectedCadetTasks && (
        <div style={styles.overlay} onClick={closeAll}>
          <div style={styles.sideModal} onClick={e=>e.stopPropagation()}>
            <h3>משימות: {selectedCadetTasks.name}</h3>
            {selectedCadetTasks.list.map(t => (
              <div key={t.id} style={styles.miniCard} onClick={()=>{setDetailTask(t); setSelectedCadetTasks(null)}}>
                <strong>{t.title}</strong> ({t.category})
              </div>
            ))}
            <button onClick={closeAll}>סגור</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', height: '100vh', direction: 'rtl', fontFamily: 'sans-serif' },
  sidebar: { width: '250px', background: '#fff', borderLeft: '1px solid #ddd' },
  sideHeader: { padding: '20px', background: '#f8f9fa' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', background: '#f1f3f5' },
  header: { padding: '15px', background: '#fff', display: 'flex', justifyContent: 'center' },
  weekControl: { display: 'flex', gap: '20px', alignItems: 'center' },
  tableBox: { flex: 1, padding: '20px', overflow: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff' },
  th: { border: '1px solid #ddd', padding: '10px', background: '#343a40', color: '#fff' },
  td: { border: '1px solid #ddd', height: '90px', width: '12%', verticalAlign: 'top', padding: '5px' },
  catCell: { background: '#f8f9fa', fontWeight: 'bold', textAlign: 'center' },
  card: { background: '#fff', padding: '8px', borderRadius: '5px', marginBottom: '5px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer' },
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { background: '#fff', padding: '20px', borderRadius: '10px', width: '300px' },
  sideModal: { background: '#fff', padding: '20px', borderRadius: '10px', width: '400px', maxHeight: '80vh', overflowY: 'auto' },
  miniCard: { padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer' },
  input: { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd' },
  btnPrimary: { background: '#007bff', color: '#fff', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer', flex: 1 },
  btnSecondary: { background: '#6c757d', color: '#fff', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer', flex: 1 },
  label: { fontSize: '12px', color: '#666', marginTop: '10px' },
  cadetItem: { padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer' },
  bankBtn: { padding: '10px', background: '#e9ecef', borderRadius: '5px', cursor: 'pointer', textAlign: 'center' }
};