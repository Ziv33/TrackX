from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from supabase import create_client, Client

app = FastAPI()

# Supabase Connection
SUPABASE_URL = "http://localhost:54321"
SUPABASE_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"  # Run 'npx supabase status' to get this
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic Models
class TaskCreate(BaseModel):
    company: str
    category: str
    day: str
    title: str
    description: Optional[str] = ""
    assigned_cadet: Optional[str] = ""


class TaskUpdate(BaseModel):
    title: str
    description: str
    is_done: bool
    assigned_cadet: str


# --- Cadets Endpoints (Now using Supabase) ---

@app.get("/cadets/{company}")
def get_cadets(company: str):
    # Query the 'cadets' table filtering by company
    response = supabase.table("cadets").select("name").eq("company", company).execute()

    # Return just a list of names to match your React app's expectations
    return [item['name'] for item in response.data]


@app.get("/my-cadets/{company}")
def get_my_cadets(company: str):
    # If this logic is different from 'get_cadets', update the filter here
    response = supabase.table("cadets").select("name").eq("company", company).execute()
    return [item['name'] for item in response.data]


# --- Tasks Endpoints ---

@app.get("/tasks/{company}")
def get_tasks(company: str):
    response = supabase.table("tasks").select("*").eq("company", company).execute()
    return response.data


@app.post("/tasks/")
def add_task(task: TaskCreate):
    response = supabase.table("tasks").insert(task.dict()).execute()
    return {"status": "success", "data": response.data}


@app.put("/tasks/{task_id}")
def update_task(task_id: int, task: TaskUpdate):
    response = supabase.table("tasks").update(task.dict()).eq("id", task_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "updated"}


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int):
    supabase.table("tasks").delete().eq("id", task_id).execute()
    return {"status": "deleted"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
