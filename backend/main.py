import os
from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from supabase import create_client, Client

app = FastAPI()

# 1. Supabase Connection
# Replace with your actual local anon key from 'npx supabase status'
SUPABASE_URL = "http://localhost:54321"
SUPABASE_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 2. Pydantic Models (MUST be defined before the routes)
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


# 3. Authorization Dependency
def get_authorized_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization Header")

    token = authorization.replace("Bearer ", "")
    try:
        # Identify the user from the JWT
        auth_response = supabase.auth.get_user(token)
        user_id = auth_response.user.id

        # Fetch profile from the public.users table we created
        profile = supabase.table("users").select("pluga, site_role, is_officer").eq("id", user_id).single().execute()

        if not profile.data:
            raise HTTPException(status_code=403, detail="User profile not found")

        user_data = profile.data

        # Strict Security: Must be Admin OR an Officer
        if user_data["site_role"] != "admin" and not user_data["is_officer"]:
            raise HTTPException(status_code=403, detail="Only officers can access this data")

        return {
            "id": user_id,
            "pluga": user_data["pluga"],
            "role": user_data["site_role"]
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid or expired session")


# 4. --- Endpoints ---

@app.get("/tasks/{company}")
def get_tasks(company: str, user=Depends(get_authorized_user)):
    # If not admin, you can only see your own company
    if user["role"] != "admin" and user["pluga"] != company:
        raise HTTPException(status_code=403, detail="Permission denied for this company")

    response = supabase.table("tasks").select("*").eq("company", company).execute()
    return response.data


@app.get("/cadets/{company}")
def get_cadets(company: str, user=Depends(get_authorized_user)):
    if user["role"] != "admin" and user["pluga"] != company:
        raise HTTPException(status_code=403, detail="Permission denied")

    response = supabase.table("cadets").select("name").eq("company", company).execute()
    return [item['name'] for item in response.data]


@app.post("/tasks/")
def add_task(task: TaskCreate, user=Depends(get_authorized_user)):
    task_data = task.dict()
    # Force the company to match the user's profile if they aren't admin
    if user["role"] != "admin":
        task_data["company"] = user["pluga"]

    response = supabase.table("tasks").insert(task_data).execute()
    return {"status": "success"}


@app.put("/tasks/{task_id}")
def update_task(task_id: int, task: TaskUpdate, user=Depends(get_authorized_user)):
    # We first verify the task exists and belongs to the user's company
    existing = supabase.table("tasks").select("company").eq("id", task_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Task not found")

    if user["role"] != "admin" and existing.data["company"] != user["pluga"]:
        raise HTTPException(status_code=403, detail="Unauthorized to edit this task")

    response = supabase.table("tasks").update(task.dict()).eq("id", task_id).execute()
    return {"status": "updated"}


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, user=Depends(get_authorized_user)):
    # Verify company match before deleting
    existing = supabase.table("tasks").select("company").eq("id", task_id).single().execute()
    if existing.data and (user["role"] == "admin" or existing.data["company"] == user["pluga"]):
        supabase.table("tasks").delete().eq("id", task_id).execute()
        return {"status": "deleted"}

    raise HTTPException(status_code=403, detail="Unauthorized")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)