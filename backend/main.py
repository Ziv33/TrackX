from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import sqlite3

app = FastAPI()

# פתרון בעיית ה-Failed to fetch - מאפשר גישה מכל מקור
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
    title: str

class StatusUpdate(BaseModel):
    is_done: bool

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company TEXT,
            category TEXT,
            day TEXT,
            title TEXT,
            is_done BOOLEAN DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()

init_db()

@app.get("/tasks/{company}")
def get_tasks(company: str):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT id, category, day, title, is_done FROM tasks WHERE company = ?", (company,))
    rows = c.fetchall()
    conn.close()
    return [{"id": r[0], "category": r[1], "day": r[2], "title": r[3], "is_done": bool(r[4])} for r in rows]

@app.post("/tasks/")
def add_task(task: TaskCreate):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT INTO tasks (company, category, day, title) VALUES (?, ?, ?, ?)",
              (task.company, task.category, task.day, task.title))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.patch("/tasks/{task_id}")
def update_status(task_id: int, data: StatusUpdate):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("UPDATE tasks SET is_done = ? WHERE id = ?", (int(data.is_done), task_id))
    conn.commit()
    conn.close()
    return {"status": "updated"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)