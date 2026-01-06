from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import List, Optional
from supabase import create_client, Client

app = FastAPI()

SUPABASE_URL = "http://localhost:54321"
# Ensure this is the long 'anon key' starting with eyJ...
SUPABASE_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# --- Dependency: Security & Context ---
def get_authorized_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization Header")

    token = authorization.replace("Bearer ", "")
    try:
        # 1. Identify the user from the JWT
        auth_response = supabase.auth.get_user(token)
        user_id = auth_response.user.id

        # 2. Fetch the user's military profile
        profile = supabase.table("users").select("pluga, site_role, is_officer").eq("id", user_id).single().execute()

        if not profile.data:
            raise HTTPException(status_code=403, detail="User profile not found in database")

        user_data = profile.data

        # 3. Check if the user is an officer (Admin bypasses this check)
        if user_data["site_role"] != "admin" and not user_data["is_officer"]:
            raise HTTPException(status_code=403, detail="Access denied: Only officers can manage tasks")

        return {
            "id": user_id,
            "pluga": user_data["pluga"],
            "role": user_data["site_role"]
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Session expired or invalid token")


# --- Updated Endpoints ---

@app.get("/tasks/{company}")
def get_tasks(company: str, user=Depends(get_authorized_user)):
    # Authorization: Only allow access to the user's own pluga unless they are admin
    if user["role"] != "admin" and user["pluga"] != company:
        raise HTTPException(status_code=403, detail=f"Access denied: You only have access to pluga {user['pluga']}")

    response = supabase.table("tasks").select("*").eq("company", company).execute()
    return response.data


@app.get("/cadets/{company}")
def get_cadets(company: str, user=Depends(get_authorized_user)):
    # Same company restriction for cadets list
    if user["role"] != "admin" and user["pluga"] != company:
        raise HTTPException(status_code=403, detail="Access denied")

    response = supabase.table("cadets").select("name").eq("company", company).execute()
    return [item['name'] for item in response.data]


@app.post("/tasks/")
def add_task(task: TaskCreate, user=Depends(get_authorized_user)):
    # Ensure a non-admin cannot create a task for a different pluga
    task_data = task.dict()
    if user["role"] != "admin":
        task_data["company"] = user["pluga"]

    response = supabase.table("tasks").insert(task_data).execute()
    return {"status": "success", "data": response.data}

# (Update PUT and DELETE similarly by adding Depends(get_authorized_user))