from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    weight_kg = Column(Float, nullable=False)
    fitness_goal = Column(String, nullable=False)
    intensity = Column(String, nullable=False)
    experience_level = Column(String, nullable=True)
    preferences = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    plans = relationship("WorkoutPlan", back_populates="user", cascade="all, delete-orphan")


class WorkoutPlan(Base):
    __tablename__ = "workout_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, default=1)
    status = Column(String, default="active")
    plan_name = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    days_data = Column(Text, nullable=False)  # JSON-encoded string of 7-day schedule
    nutrition_tip = Column(Text, nullable=True)
    recovery_tip = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="plans")
    feedback = relationship("FeedbackHistory", back_populates="plan", cascade="all, delete-orphan")


class FeedbackHistory(Base):
    __tablename__ = "feedback_history"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("workout_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, nullable=False)
    feedback_text = Column(Text, nullable=False)
    changes_applied_summary = Column(Text, nullable=True)
    new_plan_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    plan = relationship("WorkoutPlan", back_populates="feedback")
