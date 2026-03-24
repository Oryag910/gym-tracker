from datetime import datetime
from sqlalchemy import Boolean, Column, Integer, String, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from api.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    unit_system = Column(String, nullable=False, default="imperial")  # 'imperial' | 'metric'
    pref_weight      = Column(String, nullable=True)   # 'lbs' | 'kg'   — gym weights
    pref_body_weight = Column(String, nullable=True)   # 'lbs' | 'kg'   — body weight (Measurements)
    pref_distance    = Column(String, nullable=True)   # 'km'  | 'mi'
    pref_measure     = Column(String, nullable=True)   # 'cm'  | 'in'
    pref_temp        = Column(String, nullable=True)   # 'c'   | 'f'

    workouts = relationship("Workout", back_populates="user", cascade="all, delete-orphan")
    measurements = relationship("Measurement", back_populates="user", cascade="all, delete-orphan")
    cardio_sessions = relationship("CardioSession", back_populates="user", cascade="all, delete-orphan")
    workout_templates = relationship("WorkoutTemplate", back_populates="user", cascade="all, delete-orphan")


class Workout(Base):
    __tablename__ = "workouts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="workouts")
    exercises = relationship("Exercise", back_populates="workout", cascade="all, delete-orphan", order_by="Exercise.order_index")


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workout_id = Column(Integer, ForeignKey("workouts.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    is_unilateral = Column(Boolean, default=False, nullable=False, server_default='0')
    attachment = Column(String, nullable=True)

    workout = relationship("Workout", back_populates="exercises")
    sets = relationship("Set", back_populates="exercise", cascade="all, delete-orphan", order_by="Set.set_number")


class Set(Base):
    __tablename__ = "sets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False, index=True)
    weight = Column(Float, nullable=True)
    reps = Column(Integer, nullable=True)
    rpe = Column(Integer, nullable=True)   # 1–10
    set_number = Column(Integer, nullable=False)
    weight_right = Column(Float, nullable=True)   # right side weight for unilateral exercises
    reps_right = Column(Integer, nullable=True)   # right side reps for unilateral exercises

    exercise = relationship("Exercise", back_populates="sets")


class ExerciseCache(Base):
    __tablename__ = "exercise_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    search_key = Column(String, unique=True, nullable=False, index=True)  # normalized lowercase
    canonical_name = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    muscles_primary = Column(Text, nullable=True)         # JSON array: '["chest", "shoulders"]'
    muscles_secondary = Column(Text, nullable=True)        # JSON array: '["triceps"]'
    muscles_primary_ids = Column(Text, nullable=True)      # JSON int array: '[1, 4]'
    muscles_secondary_ids = Column(Text, nullable=True)    # JSON int array: '[5]'
    description = Column(Text, nullable=True)              # HTML technique description from wger
    category = Column(String, nullable=True)               # e.g. "Chest", "Back"
    cached_at = Column(DateTime, default=datetime.utcnow)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String, unique=True, nullable=False)  # SHA-256, never store raw
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")


class CustomExercise(Base):
    __tablename__ = "custom_exercises"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    name_lower = Column(String, nullable=False, index=True)   # normalized for exact lookup
    category = Column(String, nullable=True)
    muscles_primary = Column(Text, nullable=True)             # JSON: '["chest"]'
    muscles_secondary = Column(Text, nullable=True)
    muscles_primary_ids = Column(Text, nullable=True)         # JSON: '[4]'
    muscles_secondary_ids = Column(Text, nullable=True)
    description = Column(Text, nullable=True)                 # plain text, user-written
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="custom_exercises")


class GlobalExercise(Base):
    __tablename__ = "global_exercises"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    name_lower = Column(String, nullable=False, index=True)
    category = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    muscles_primary = Column(Text, nullable=True)
    muscles_secondary = Column(Text, nullable=True)
    muscles_primary_ids = Column(Text, nullable=True)
    muscles_secondary_ids = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    weight = Column(Float, nullable=True)       # stored in lbs
    body_fat = Column(Float, nullable=True)     # percentage
    chest = Column(Float, nullable=True)        # stored in cm
    waist = Column(Float, nullable=True)
    hips = Column(Float, nullable=True)
    arms = Column(Float, nullable=True)
    thighs = Column(Float, nullable=True)
    neck = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="measurements")


class CardioSession(Base):
    __tablename__ = "cardio_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    name = Column(String, nullable=False)
    activity_type = Column(String, nullable=False, default="run")  # run|swim|bike|hike|other
    total_distance = Column(Float, nullable=True)   # stored in km
    total_duration = Column(Float, nullable=True)   # stored in minutes
    avg_hr = Column(Integer, nullable=True)
    max_hr = Column(Integer, nullable=True)
    calories = Column(Integer, nullable=True)
    temperature = Column(Float, nullable=True)      # stored in °C
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="cardio_sessions")
    segments = relationship("CardioSegment", back_populates="session", cascade="all, delete-orphan", order_by="CardioSegment.sort_order")


class CardioSegment(Base):
    __tablename__ = "cardio_segments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("cardio_sessions.id", ondelete="CASCADE"), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    label = Column(String, nullable=True)
    segment_type = Column(String, nullable=False, default="easy")  # warmup|easy|moderate|hard|interval|recovery|cool_down
    distance = Column(Float, nullable=True)   # km
    duration = Column(Float, nullable=True)   # minutes
    pace = Column(Float, nullable=True)       # min/km as float (5.5 = 5:30/km)
    hr = Column(Integer, nullable=True)
    reps = Column(Integer, nullable=False, default=1)
    notes = Column(Text, nullable=True)

    session = relationship("CardioSession", back_populates="segments")


class WorkoutTemplate(Base):
    __tablename__ = "workout_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    default_set_rest = Column(Integer, nullable=False, default=90)       # seconds between sets
    default_exercise_rest = Column(Integer, nullable=False, default=120) # seconds between exercises
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="workout_templates")
    exercises = relationship(
        "TemplateExercise",
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="TemplateExercise.order_index",
    )


class TemplateExercise(Base):
    __tablename__ = "template_exercises"

    id = Column(Integer, primary_key=True, autoincrement=True)
    template_id = Column(Integer, ForeignKey("workout_templates.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    set_rest_override = Column(Integer, nullable=True)       # seconds; overrides template default if set
    exercise_rest_override = Column(Integer, nullable=True)  # seconds; overrides template default if set

    template = relationship("WorkoutTemplate", back_populates="exercises")
    sets = relationship(
        "TemplateSet",
        back_populates="exercise",
        cascade="all, delete-orphan",
        order_by="TemplateSet.set_number",
    )


class TemplateSet(Base):
    __tablename__ = "template_sets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    exercise_id = Column(Integer, ForeignKey("template_exercises.id", ondelete="CASCADE"), nullable=False)
    set_number = Column(Integer, nullable=False)
    target_weight = Column(Float, nullable=True)  # lbs; null = bodyweight
    target_reps = Column(Integer, nullable=True)  # null = no rep target

    exercise = relationship("TemplateExercise", back_populates="sets")
