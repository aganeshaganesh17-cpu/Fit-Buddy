from typing import List, Optional, Any
from pydantic import BaseModel, Field


class ExerciseSchema(BaseModel):
    name: str
    sets: int = Field(ge=1, le=10)
    repsOrDuration: str
    restSeconds: int = Field(ge=0, le=600)
    tips: str
    targetMuscles: List[str]


class DayPlanSchema(BaseModel):
    day: int = Field(ge=1, le=7)
    dayName: str
    focus: str
    isRestDay: bool
    estimatedDurationMinutes: int
    warmup: str
    exercises: List[ExerciseSchema]
    cooldown: str


class WorkoutPlanDataSchema(BaseModel):
    planTitle: str
    weeklyGoalSummary: str
    targetIntensity: str
    days: List[DayPlanSchema]
    nutritionTip: str
    recoveryTip: str


class PlanGenerationRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    userId: str = Field(min_length=2, max_length=50)
    age: int = Field(ge=10, le=120)
    weightKg: float = Field(ge=20.0, le=350.0)
    fitnessGoal: str = Field(min_length=2, max_length=100)
    intensity: str = Field(default="Moderate")
    experienceLevel: Optional[str] = "Intermediate"
    preferences: Optional[str] = None


class PlanUpdateRequest(BaseModel):
    planId: int
    feedback: str = Field(min_length=3, max_length=500)


class UserResponse(BaseModel):
    id: int
    user_id: str
    name: str
    age: int
    weight_kg: float
    fitness_goal: str
    intensity: str
    experience_level: Optional[str] = None
    preferences: Optional[str] = None

    class Config:
        from_attributes = True
