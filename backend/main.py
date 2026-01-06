import os
from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from supabase import create_client, Client

app = FastAPI()

# --- 1. Supabase Configuration ---
SUPABASE_URL = "http://localhost:54321"
SUPABASE_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"  # Use Service Role Key for backend admin bypass
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- 2. Pydantic Models ---
class TaskCreate(BaseModel):
    company: str
    category: str
    day: str
    week: int
    title: str
    description: Optional[str] = ""
    assigned_cadet: Optional[str] = ""


class TaskUpdate(BaseModel):
    title: str
    description: Optional[str] = ""
    is_done: bool
    assigned_cadet: str
    category: Optional[str] = None


# --- 3. Authorization Logic ---
def get_authorized_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization Header")

    token = authorization.replace("Bearer ", "")
    try:
        # Verify JWT with Supabase Auth
        auth_response = supabase.auth.get_user(token)
        user_id = auth_response.user.id

        # Get Military Profile
        profile = supabase.table("users").select("pluga, site_role, is_officer").eq("id", user_id).single().execute()

        if not profile.data or not profile.data["is_officer"]:
            raise HTTPException(status_code=403, detail="Unauthorized: Officers only")

        return profile.data
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session")


# --- 4. Endpoints ---

@app.get("/cadets/{company}")
def get_cadets(company: str, user=Depends(get_authorized_user)):
    # Security Check
    if user["site_role"] != "admin" and user["pluga"] != company:
        raise HTTPException(status_code=403, detail="Access denied to this company")

    response = supabase.table("cadets").select("name").eq("company", company).execute()
    return [item['name'] for item in response.data]


@app.get("/tasks/{company}/{week}")
def get_tasks_by_week(company: str, week: int, user=Depends(get_authorized_user)):
    if user["site_role"] != "admin" and user["pluga"] != company:
        raise HTTPException(status_code=403, detail="Access denied")

    response = supabase.table("tasks") \
        .select("*") \
        .eq("company", company) \
        .eq("week", week) \
        .execute()
    return response.data


@app.get("/tasks-all/{company}")
def get_all_tasks(company: str, user=Depends(get_authorized_user)):
    if user["site_role"] != "admin" and user["pluga"] != company:
        raise HTTPException(status_code=403, detail="Access denied")

    response = supabase.table("tasks").select("*").eq("company", company).execute()
    return response.data


@app.post("/tasks/")
def add_task(task: TaskCreate, user=Depends(get_authorized_user)):
    # Force the task to be created in the officer's own company unless they are admin
    task_data = task.dict()
    if user["site_role"] != "admin":
        task_data["company"] = user["pluga"]

    supabase.table("tasks").insert(task_data).execute()
    return {"status": "success"}


@app.put("/tasks/{task_id}")
def update_task(task_id: int, task: TaskUpdate, user=Depends(get_authorized_user)):
    # Check ownership before update
    existing = supabase.table("tasks").select("company").eq("id", task_id).single().execute()
    if not existing.data or (user["site_role"] != "admin" and existing.data["company"] != user["pluga"]):
        raise HTTPException(status_code=403, detail="Cannot edit tasks from other companies")

    supabase.table("tasks").update(task.dict()).eq("id", task_id).execute()
    return {"status": "updated"}


@app.post("/tasks/move/{task_id}")
def move_task(task_id: int, next_category: str, user=Depends(get_authorized_user)):
    # 1. Get existing task
    res = supabase.table("tasks").select("*").eq("id", task_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Task not found")

    task = res.data
    if user["site_role"] != "admin" and task["company"] != user["pluga"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # 2. Update to new category and reset completion
    supabase.table("tasks").update({
        "category": next_category,
        "is_done": False
    }).eq("id", task_id).execute()

    return {"status": "success", "new_category": next_category}


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, user=Depends(get_authorized_user)):
    # Check ownership
    existing = supabase.table("tasks").select("company").eq("id", task_id).single().execute()
    if existing.data and (user["site_role"] == "admin" or existing.data["company"] == user["pluga"]):
        supabase.table("tasks").delete().eq("id", task_id).execute()
        return {"status": "deleted"}

    raise HTTPException(status_code=403, detail="Unauthorized")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)