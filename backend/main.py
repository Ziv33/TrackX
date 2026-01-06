from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
from typing import Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "army_tasks.db"

class TaskCreate(BaseModel):
    company: str
    category: str
    day: str
    week: int
    title: str
    description: Optional[str] = ""
    assigned_cadet: Optional[str] = ""
    due_date: Optional[str] = ""

class TaskUpdate(BaseModel):
    title: str
    description: Optional[str] = ""
    is_done: bool
    assigned_cadet: str
    due_date: Optional[str] = ""

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company TEXT,
            category TEXT,
            day TEXT,
            week INTEGER, 
            title TEXT,
            description TEXT,
            is_done BOOLEAN DEFAULT 0,
            assigned_cadet TEXT,
            due_date TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

CADETS_DATA = {
    "א": ["יוסי כהן", "דניאל לוי", "איתי אברהם"],
    "ב": ["נועה ברק", "גיא שמש", "עומר גולן"],
    "ג": ["רועי פדל", "יובל כץ", "אורן רז"],
    "ד": ["מיכל דיין", "עמית חן", "נדב שגב"],
    "ה": ["ליאור זיו", "שחר פרי", "טל מור"]
}

@app.get("/cadets/{company}")
def get_cadets(company: str):
    return CADETS_DATA.get(company, [])

@app.get("/tasks/{company}/{week}")
def get_tasks(company: str, week: int):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT id, category, day, title, description, is_done, assigned_cadet, week, due_date FROM tasks WHERE company = ? AND week = ?", (company, week))
    rows = c.fetchall()
    conn.close()
    return [{"id": r[0], "category": r[1], "day": r[2], "title": r[3], "description": r[4], "is_done": bool(r[5]), "assigned_cadet": r[6], "week": r[7], "due_date": r[8]} for r in rows]

@app.get("/tasks-all/{company}")
def get_all_tasks(company: str):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT id, title, description, week, is_done, assigned_cadet, category, day, due_date FROM tasks WHERE company = ?", (company,))
    rows = c.fetchall()
    conn.close()
    return [{"id": r[0], "title": r[1], "description": r[2], "week": r[3], "is_done": bool(r[4]), "assigned_cadet": r[5], "category": r[6], "day": r[7], "due_date": r[8]} for r in rows]

@app.post("/tasks/")
def add_task(task: TaskCreate):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT INTO tasks (company, category, day, week, title, description, assigned_cadet, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              (task.company, task.category, task.day, task.week, task.title, task.description, task.assigned_cadet, task.due_date))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.put("/tasks/{task_id}")
def update_task(task_id: int, task: TaskUpdate):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("UPDATE tasks SET title=?, description=?, is_done=?, assigned_cadet=?, due_date=? WHERE id=?",
              (task.title, task.description, int(task.is_done), task.assigned_cadet, task.due_date, task_id))
    conn.commit()
    conn.close()
    return {"status": "updated"}

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted"}

@app.post("/tasks/move/{task_id}")
def move_task(task_id: int, next_cat: str, new_due_date: str, new_week: int, new_day: str):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT company, title, description, assigned_cadet FROM tasks WHERE id = ?", (task_id,))
    row = c.fetchone()
    if row:
        c.execute("""
            INSERT INTO tasks (company, category, day, week, title, description, is_done, assigned_cadet, due_date) 
            VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
        """, (row[0], next_cat, new_day, new_week, row[1], row[2], row[3], new_due_date))
        c.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        conn.commit()
    conn.close()
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)