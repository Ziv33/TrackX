from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from supabase import create_client, Client

app = FastAPI()

# --- 1. Supabase Configuration ---
SUPABASE_URL = "http://localhost:54321"
# It is recommended to use the SERVICE_ROLE_KEY for the backend to bypass RLS
SUPABASE_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- 2. Models ---
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


# --- 3. Authorization Dependency ---
def get_authorized_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization Header")

    token = authorization.replace("Bearer ", "")
    try:
        # Verify user via Supabase Auth
        auth_user = supabase.auth.get_user(token)
        user_id = auth_user.user.id

        # Fetch the military profile from public.users
        profile = supabase.table("users").select("pluga, site_role, is_officer").eq("id", user_id).single().execute()

        if not profile.data or not profile.data.get("is_officer"):
            raise HTTPException(status_code=403, detail="Access restricted to officers")

        return profile.data
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid session: {str(e)}")


# --- 4. Endpoints ---

@app.get("/cadets/{company}")
def get_cadets(company: str, user=Depends(get_authorized_user)):
    # Security: Ensure commander is looking at their own pluga
    if user["site_role"] != "admin" and user["pluga"] != company:
        raise HTTPException(status_code=403, detail="Not authorized for this company")

    response = supabase.table("cadets").select("name").eq("company", company).execute()
    return [item['name'] for item in response.data]


@app.get("/tasks/{company}/{week}")
def get_tasks(company: str, week: int, user=Depends(get_authorized_user)):
    if user["site_role"] != "admin" and user["pluga"] != company:
        raise HTTPException(status_code=403, detail="Unauthorized")

    response = supabase.table("tasks") \
        .select("*") \
        .eq("company", company) \
        .eq("week", week) \
        .execute()
    return response.data


@app.get("/tasks-all/{company}")
def get_all_tasks(company: str, user=Depends(get_authorized_user)):
    if user["site_role"] != "admin" and user["pluga"] != company:
        raise HTTPException(status_code=403, detail="Unauthorized")

    response = supabase.table("tasks").select("*").eq("company", company).execute()
    return response.data


@app.post("/tasks/")
def add_task(task: TaskCreate, user=Depends(get_authorized_user)):
    task_dict = task.dict()
    # Override company if not admin to prevent spoofing
    if user["site_role"] != "admin":
        task_dict["company"] = user["pluga"]

    supabase.table("tasks").insert(task_dict).execute()
    return {"status": "success"}


@app.put("/tasks/{task_id}")
def update_task(task_id: int, task: TaskUpdate, user=Depends(get_authorized_user)):
    # Verify the task belongs to the officer's company
    existing = supabase.table("tasks").select("company").eq("id", task_id).single().execute()
    if not existing.data or (user["site_role"] != "admin" and existing.data["company"] != user["pluga"]):
        raise HTTPException(status_code=403, detail="Cannot edit tasks outside your company")

    supabase.table("tasks").update(task.dict()).eq("id", task_id).execute()
    return {"status": "updated"}


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, user=Depends(get_authorized_user)):
    existing = supabase.table("tasks").select("company").eq("id", task_id).single().execute()
    if existing.data and (user["site_role"] == "admin" or existing.data["company"] == user["pluga"]):
        supabase.table("tasks").delete().eq("id", task_id).execute()
        return {"status": "deleted"}
    raise HTTPException(status_code=403, detail="Unauthorized")


@app.post("/tasks/move/{task_id}")
def move_task(task_id: int, next_cat: str, new_due_date: str, new_week: int, new_day: str,
              user=Depends(get_authorized_user)):
    # 1. Fetch current task
    res = supabase.table("tasks").select("*").eq("id", task_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Task not found")

    old_task = res.data
    if user["site_role"] != "admin" and old_task["company"] != user["pluga"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # 2. Update existing task to the new category and parameters (Moving logic)
    # We update instead of (Insert + Delete) to keep it cleaner in Supabase
    supabase.table("tasks").update({
        "category": next_cat,
        "due_date": new_due_date,
        "week": new_week,
        "day": new_day,
        "is_done": False  # Reset status for the new phase
    }).eq("id", task_id).execute()

    return {"status": "success"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)