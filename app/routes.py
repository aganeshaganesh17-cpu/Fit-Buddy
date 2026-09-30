import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .database import get_db
from .models import User, WorkoutPlan, FeedbackHistory
from .schemas import PlanGenerationRequest, PlanUpdateRequest
from .gemini_service import generate_workout_plan_ai, update_workout_plan_with_feedback_ai

router = APIRouter(prefix="/api")


@router.get("/config")
def get_config():
    return {
        "appName": "FitBuddy – AI Fitness Plan Generator",
        "status": "healthy"
    }


@router.post("/generate-plan")
def generate_plan(req: PlanGenerationRequest, db: Session = Depends(get_db)):
    # 1. Upsert User
    user = db.query(User).filter(User.user_id == req.userId).first()
    if not user:
        user = User(
            user_id=req.userId,
            name=req.name,
            age=req.age,
            weight_kg=req.weightKg,
            fitness_goal=req.fitnessGoal,
            intensity=req.intensity,
            experience_level=req.experienceLevel,
            preferences=req.preferences,
        )
        db.add(user)
    else:
        user.name = req.name
        user.age = req.age
        user.weight_kg = req.weightKg
        user.fitness_goal = req.fitnessGoal
        user.intensity = req.intensity
        user.experience_level = req.experienceLevel
        user.preferences = req.preferences
    db.commit()
    db.refresh(user)

    # 2. Call Gemini
    plan_data = generate_workout_plan_ai(req)

    # 3. Save Workout Plan
    new_plan = WorkoutPlan(
        user_id=user.user_id,
        version=1,
        status="active",
        plan_name=plan_data.get("planTitle", "7-Day Fitness Plan"),
        summary=plan_data.get("weeklyGoalSummary", ""),
        days_data=json.dumps(plan_data.get("days", [])),
        nutrition_tip=plan_data.get("nutritionTip", ""),
        recovery_tip=plan_data.get("recoveryTip", ""),
    )
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)

    return {
        "success": True,
        "planId": new_plan.id,
        "plan": plan_data,
        "user": {
            "name": user.name,
            "user_id": user.user_id,
            "age": user.age,
            "weight_kg": user.weight_kg,
            "fitness_goal": user.fitness_goal,
            "intensity": user.intensity,
        }
    }


@router.post("/update-plan")
def update_plan(req: PlanUpdateRequest, db: Session = Depends(get_db)):
    original_plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == req.planId).first()
    if not original_plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    user = db.query(User).filter(User.user_id == original_plan.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        days = json.loads(original_plan.days_data)
    except Exception:
        days = []

    plan_dict = {
        "planTitle": original_plan.plan_name,
        "weeklyGoalSummary": original_plan.summary,
        "targetIntensity": user.intensity,
        "days": days,
        "nutritionTip": original_plan.nutrition_tip,
        "recoveryTip": original_plan.recovery_tip,
    }

    user_req = PlanGenerationRequest(
        name=user.name,
        userId=user.user_id,
        age=user.age,
        weightKg=user.weight_kg,
        fitnessGoal=user.fitness_goal,
        intensity=user.intensity,
        experienceLevel=user.experience_level,
        preferences=user.preferences,
    )

    updated_plan_data, change_summary = update_workout_plan_with_feedback_ai(
        user_req, plan_dict, req.feedback
    )

    new_version = (original_plan.version or 1) + 1
    new_db_plan = WorkoutPlan(
        user_id=user.user_id,
        version=new_version,
        status="active",
        plan_name=updated_plan_data.get("planTitle", f"{original_plan.plan_name} v{new_version}"),
        summary=updated_plan_data.get("weeklyGoalSummary", ""),
        days_data=json.dumps(updated_plan_data.get("days", [])),
        nutrition_tip=updated_plan_data.get("nutritionTip", ""),
        recovery_tip=updated_plan_data.get("recoveryTip", ""),
    )
    db.add(new_db_plan)
    db.commit()
    db.refresh(new_db_plan)

    feedback_record = FeedbackHistory(
        plan_id=original_plan.id,
        user_id=user.user_id,
        feedback_text=req.feedback,
        changes_applied_summary=change_summary,
        new_plan_id=new_db_plan.id,
    )
    db.add(feedback_record)
    db.commit()

    return {
        "success": True,
        "previousPlanId": original_plan.id,
        "newPlanId": new_db_plan.id,
        "version": new_version,
        "changeSummary": change_summary,
        "plan": updated_plan_data,
    }


@router.get("/admin/stats")
def admin_stats(db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    total_plans = db.query(WorkoutPlan).count()
    total_feedback = db.query(FeedbackHistory).count()
    return {
        "totalUsers": total_users,
        "totalPlans": total_plans,
        "totalFeedback": total_feedback,
    }
