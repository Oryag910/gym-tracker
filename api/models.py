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
    created_at = Column(DateTime, default=datetime.utcnow)

    workouts = relationship("Workout", back_populates="user", cascade="all, delete-orphan")


class Workout(Base):
    __tablename__ = "workouts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="workouts")
    exercises = relationship("Exercise", back_populates="workout", cascade="all, delete-orphan", order_by="Exercise.order_index")


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workout_id = Column(Integer, ForeignKey("workouts.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    order_index = Column(Integer, nullable=False, default=0)

    workout = relationship("Workout", back_populates="exercises")
    sets = relationship("Set", back_populates="exercise", cascade="all, delete-orphan", order_by="Set.set_number")


class Set(Base):
    __tablename__ = "sets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False)
    weight = Column(Float, nullable=True)
    reps = Column(Integer, nullable=True)
    set_number = Column(Integer, nullable=False)

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
