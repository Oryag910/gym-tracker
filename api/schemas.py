from datetime import date
from typing import Optional
from pydantic import BaseModel


# --- Auth ---

class UserRegister(BaseModel):
    username: str
    email: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str

    class Config:
        from_attributes = True


# --- Sets ---

class SetCreate(BaseModel):
    weight: Optional[float] = None
    reps: Optional[int] = None


class SetResponse(BaseModel):
    id: int
    set_number: int
    weight: Optional[float]
    reps: Optional[int]

    class Config:
        from_attributes = True


class SetUpdate(BaseModel):
    weight: Optional[float] = None
    reps: Optional[int] = None


# --- Exercises ---

class ExerciseCreate(BaseModel):
    name: str
    sets: list[SetCreate]


class ExerciseResponse(BaseModel):
    id: int
    name: str
    order_index: int
    sets: list[SetResponse]

    class Config:
        from_attributes = True


# --- Workouts ---

class WorkoutCreate(BaseModel):
    name: str
    date: date
    exercises: list[ExerciseCreate]


class WorkoutUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[date] = None


class WorkoutSummary(BaseModel):
    id: int
    name: str
    date: date
    exercise_count: int

    class Config:
        from_attributes = True


class WorkoutResponse(BaseModel):
    id: int
    name: str
    date: date
    exercises: list[ExerciseResponse]

    class Config:
        from_attributes = True


# --- Stats ---

class PREntry(BaseModel):
    exercise: str
    weight: float
    date: date


class PRHistoryPoint(BaseModel):
    date: date
    weight: float


class VolumePoint(BaseModel):
    workout_id: int
    workout_name: str
    date: date
    volume: float


class TrendPoint(BaseModel):
    date: date
    workout_id: int
    workout_name: str
    max_weight: Optional[float]
    total_volume: float


class ExerciseCompare(BaseModel):
    exercise: str
    workout_a: Optional[list[SetResponse]]
    workout_b: Optional[list[SetResponse]]


class CompareResponse(BaseModel):
    workout_a: WorkoutSummary
    workout_b: WorkoutSummary
    exercises: list[ExerciseCompare]
