from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class Cadet(BaseModel):
    id: int
    name: str

class Commander(BaseModel):
    id: int
    name: str
    cadets: List[Cadet]

# In-memory data
commanders = [
    Commander(
        id=1,
        name="Commander Alpha",
        cadets=[
            Cadet(id=1, name="Cadet DEADBEEF"),
            Cadet(id=2, name="Cadet Two"),
        ],
    ),
    Commander(
        id=2,
        name="Commander Bravo",
        cadets=[
            Cadet(id=3, name="Cadet Three"),
        ],
    ),
]

# Routes
@app.get("/commanders")
def get_commanders():
    return commanders
