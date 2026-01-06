from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os

app = FastAPI()

# Allow frontend to fetch data
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models --- #
class Task(BaseModel):
    category: str
    day: str
    slot: str

# --- Database --- #
DB_FILE = "tasks.db"

def init_db():
    db_exists = os.path.exists(DB_FILE)
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    # Create tasks table
    c.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        category TEXT NOT NULL,
        day TEXT NOT NULL,
        slot TEXT NOT NULL
    )
    """)
    conn.commit()

    # Insert sample tasks only if table is empty
    c.execute("SELECT COUNT(*) FROM tasks")
    count = c.fetchone()[0]
    if count == 0:
        sample_tasks = [
            ("testuser", "Food", "Monday", "Eat breakfast"),
            ("testuser", "Food", "Monday", "Lunch"),
            ("testuser", "Clean", "Monday", "Clean room"),
            ("testuser", "Sleep", "Monday", "8h sleep"),
            ("testuser", "Food", "Tuesday", "Breakfast"),
            ("testuser", "Clean", "Tuesday", "Wash dishes"),
            ("testuser", "Sleep", "Tuesday", "7h sleep"),
            ("testuser", "Food", "Wednesday", "Breakfast"),
            ("testuser", "Clean", "Wednesday", "Vacuum room"),
            ("testuser", "Sleep", "Wednesday", "8h sleep"),
        ]
        c.executemany(
            "INSERT INTO tasks (username, category, day, slot) VALUES (?, ?, ?, ?)",
            sample_tasks
        )
        conn.commit()

    conn.close()

init_db()

# --- Routes --- #
@app.get("/tasks/{username}")
def get_tasks(username: str):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT category, day, slot FROM tasks WHERE username = ?", (username,))
    rows = c.fetchall()
    conn.close()

    if not rows:
        raise HTTPException(status_code=404, detail=f"No tasks found for user '{username}'")

    tasks = [{"category": r[0], "day": r[1], "slot": r[2]} for r in rows]
    return {"username": username, "tasks": tasks}

@app.post("/tasks/")
def add_task(username: str, task: Task):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        "INSERT INTO tasks (username, category, day, slot) VALUES (?, ?, ?, ?)",
        (username, task.category, task.day, task.slot)
    )
    conn.commit()
    conn.close()
    return {"message": "Task added successfully"}
