from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from supabase import create_client, Client

app = FastAPI()

# --- 1. Supabase Connection ---
SUPABASE_URL = "https://your-project-id.supabase.co"
# Use the 'service_role' key here so the backend has permission to manage all rows
SUPABASE_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- 2. Data Models ---
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


# --- 3. Auth Dependency ---
def get_current_user(authorization: str = Header(None)):
    """Verifies the JWT token and returns the user's company (pluga)"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = authorization.replace("Bearer ", "")
    try:
        # Check session with Supabase Auth
        user_response = supabase.auth.get_user(token)
        user_id = user_response.user.id

        # Fetch the military profile (pluga) from your 'users' table
        profile = supabase.table("users").select("pluga, is_officer").eq("id", user_id).single().execute()

        if not profile.data or not profile.data.get("is_officer"):
            raise HTTPException(status_code=403, detail="Only officers can access this system")

        return profile.data  # Returns {'pluga': 'א', 'is_officer': True}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session")


# --- 4. Endpoints ---

@app.get("/cadets/{company}")
def get_cadets(company: str, user=Depends(get_current_user)):
    # Security: Commanders can only see cadets in their own company
    if user["pluga"] != company:
        raise HTTPException(status_code=403, detail="Access denied to other companies")

    # Assuming you have a 'cadets' table in Supabase
    res = supabase.table("cadets").select("name").eq("company", company).execute()
    return [c["name"] for c in res.data]


@app.get("/tasks/{company}/{week}")
def get_tasks(company: str, week: int, user=Depends(get_current_user)):
    if user["pluga"] != company:
        raise HTTPException(status_code=403, detail="Unauthorized")

    res = supabase.table("tasks").select("*").eq("company", company).eq("week", week).execute()
    return res.data


@app.get("/tasks-all/{company}")
def get_all_tasks(company: str, user=Depends(get_current_user)):
    if user["pluga"] != company:
        raise HTTPException(status_code=403, detail="Unauthorized")

    res = supabase.table("tasks").select("*").eq("company", company).execute()
    return res.data


@app.post("/tasks/")
def add_task(task: TaskCreate, user=Depends(get_current_user)):
    # Force the company to the user's actual pluga for security
    task_data = task.dict()
    task_data["company"] = user["pluga"]

    supabase.table("tasks").insert(task_data).execute()
    return {"status": "success"}


@app.put("/tasks/{task_id}")
def update_task(task_id: int, task: TaskUpdate, user=Depends(get_current_user)):
    # Verify ownership before updating
    check = supabase.table("tasks").select("company").eq("id", task_id).single().execute()
    if check.data["company"] != user["pluga"]:
        raise HTTPException(status_code=403, detail="Cannot edit tasks from another company")

    supabase.table("tasks").update(task.dict()).eq("id", task_id).execute()
    return {"status": "updated"}


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, user=Depends(get_current_user)):
    check = supabase.table("tasks").select("company").eq("id", task_id).single().execute()
    if check.data["company"] == user["pluga"]:
        supabase.table("tasks").delete().eq("id", task_id).execute()
        return {"status": "deleted"}
    raise HTTPException(status_code=403, detail="Unauthorized")


@app.post("/tasks/move/{task_id}")
def move_task(task_id: int, next_cat: str, new_due_date: str, new_week: int, new_day: str,
              user=Depends(get_current_user)):
    # Get old task data
    res = supabase.table("tasks").select("*").eq("id", task_id).single().execute()
    if not res.data or res.data["company"] != user["pluga"]:
        raise HTTPException(status_code=403, detail="Unauthorized")

    old_task = res.data
    # Insert new phase task
    new_task = {
        "company": old_task["company"],
        "category": next_cat,
        "day": new_day,
        "week": new_week,
        "title": old_task["title"],
        "description": old_task["description"],
        "assigned_cadet": old_task["assigned_cadet"],
        "due_date": new_due_date,
        "is_done": False
    }
    supabase.table("tasks").insert(new_task).execute()
    # Delete the finished one
    supabase.table("tasks").delete().eq("id", task_id).execute()

    return {"status": "success"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)