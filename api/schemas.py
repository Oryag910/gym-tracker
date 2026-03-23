from datetime import date
from typing import Optional, List
from pydantic import BaseModel


# --- Auth ---

class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ForgotAccountRequest(BaseModel):
    email: str


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
    is_admin: bool = False
    unit_system: str = "imperial"
    pref_weight: Optional[str] = None
    pref_body_weight: Optional[str] = None
    pref_distance: Optional[str] = None
    pref_measure: Optional[str] = None
    pref_temp: Optional[str] = None

    class Config:
        from_attributes = True


class UserPreferencesUpdate(BaseModel):
    unit_system: Optional[str] = None        # 'imperial' | 'metric'
    pref_weight: Optional[str] = None        # 'lbs' | 'kg'
    pref_body_weight: Optional[str] = None   # 'lbs' | 'kg'
    pref_distance: Optional[str] = None      # 'km' | 'mi'
    pref_measure: Optional[str] = None       # 'cm' | 'in'
    pref_temp: Optional[str] = None          # 'c' | 'f'


# --- Sets ---

class SetCreate(BaseModel):
    weight: Optional[float] = None
    reps: Optional[int] = None
    rpe: Optional[int] = None


class SetResponse(BaseModel):
    id: int
    set_number: int
    weight: Optional[float]
    reps: Optional[int]
    rpe: Optional[int]

    class Config:
        from_attributes = True


class SetUpdate(BaseModel):
    weight: Optional[float] = None
    reps: Optional[int] = None
    rpe: Optional[int] = None


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


# --- Measurements ---

class MeasurementCreate(BaseModel):
    date: date
    weight: Optional[float] = None      # lbs
    body_fat: Optional[float] = None    # %
    chest: Optional[float] = None       # cm
    waist: Optional[float] = None
    hips: Optional[float] = None
    arms: Optional[float] = None
    thighs: Optional[float] = None
    neck: Optional[float] = None
    notes: Optional[str] = None


class MeasurementResponse(BaseModel):
    id: int
    date: date
    weight: Optional[float]
    body_fat: Optional[float]
    chest: Optional[float]
    waist: Optional[float]
    hips: Optional[float]
    arms: Optional[float]
    thighs: Optional[float]
    neck: Optional[float]
    notes: Optional[str]

    class Config:
        from_attributes = True


# --- Cardio ---

class CardioSegmentCreate(BaseModel):
    sort_order: int = 0
    label: Optional[str] = None
    segment_type: str = "easy"
    distance: Optional[float] = None    # km
    duration: Optional[float] = None    # minutes
    pace: Optional[float] = None        # min/km as float
    hr: Optional[int] = None
    reps: int = 1
    notes: Optional[str] = None


class CardioSegmentResponse(BaseModel):
    id: int
    sort_order: int
    label: Optional[str]
    segment_type: str
    distance: Optional[float]
    duration: Optional[float]
    pace: Optional[float]
    hr: Optional[int]
    reps: int
    notes: Optional[str]

    class Config:
        from_attributes = True


class CardioSessionCreate(BaseModel):
    date: date
    name: str
    activity_type: str = "run"
    total_distance: Optional[float] = None
    total_duration: Optional[float] = None
    avg_hr: Optional[int] = None
    max_hr: Optional[int] = None
    calories: Optional[int] = None
    temperature: Optional[float] = None
    notes: Optional[str] = None
    segments: List[CardioSegmentCreate] = []


class CardioSessionSummary(BaseModel):
    id: int
    date: date
    name: str
    activity_type: str
    total_distance: Optional[float]
    total_duration: Optional[float]
    avg_hr: Optional[int]

    class Config:
        from_attributes = True


class CardioSessionResponse(BaseModel):
    id: int
    date: date
    name: str
    activity_type: str
    total_distance: Optional[float]
    total_duration: Optional[float]
    avg_hr: Optional[int]
    max_hr: Optional[int]
    calories: Optional[int]
    temperature: Optional[float]
    notes: Optional[str]
    segments: List[CardioSegmentResponse]

    class Config:
        from_attributes = True


# --- Workout Templates ---

class TemplateSetCreate(BaseModel):
    set_number: int
    target_weight: Optional[float] = None  # lbs
    target_reps: Optional[int] = None


class TemplateSetResponse(BaseModel):
    id: int
    set_number: int
    target_weight: Optional[float]
    target_reps: Optional[int]

    class Config:
        from_attributes = True


class TemplateExerciseCreate(BaseModel):
    name: str
    order_index: int = 0
    set_rest_override: Optional[int] = None
    exercise_rest_override: Optional[int] = None
    sets: List[TemplateSetCreate]


class TemplateExerciseResponse(BaseModel):
    id: int
    name: str
    order_index: int
    set_rest_override: Optional[int]
    exercise_rest_override: Optional[int]
    sets: List[TemplateSetResponse]

    class Config:
        from_attributes = True


class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    default_set_rest: int = 90
    default_exercise_rest: int = 120
    exercises: List[TemplateExerciseCreate]


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_set_rest: Optional[int] = None
    default_exercise_rest: Optional[int] = None
    exercises: Optional[List[TemplateExerciseCreate]] = None


class TemplateSummary(BaseModel):
    id: int
    name: str
    description: Optional[str]
    default_set_rest: int
    default_exercise_rest: int
    exercise_count: int

    class Config:
        from_attributes = True


class TemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    default_set_rest: int
    default_exercise_rest: int
    exercises: List[TemplateExerciseResponse]

    class Config:
        from_attributes = True


# --- Custom Exercise Library ---

class CustomExerciseCreate(BaseModel):
    name: str
    category: Optional[str] = None
    image_url: Optional[str] = None
    muscles_primary_ids: List[int] = []
    muscles_secondary_ids: List[int] = []
    description: Optional[str] = None


class CustomExerciseUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    muscles_primary_ids: Optional[List[int]] = None
    muscles_secondary_ids: Optional[List[int]] = None
    description: Optional[str] = None


class CustomExerciseResponse(BaseModel):
    id: int
    name: str
    category: Optional[str]
    muscles_primary: List[str]
    muscles_secondary: List[str]
    muscles_primary_ids: List[int]
    muscles_secondary_ids: List[int]
    description: Optional[str]

    class Config:
        from_attributes = True
