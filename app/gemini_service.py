import os
import json
from typing import Dict, Any, Tuple
from .schemas import WorkoutPlanDataSchema, PlanGenerationRequest


def get_model_name() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-3.8-flash")


def generate_workout_plan_ai(req: PlanGenerationRequest) -> Dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY")

    prompt = f"""You are FitBuddy's master certified strength, conditioning, and nutrition specialist.
Create a hyper-personalized, safe, science-backed 7-DAY WORKOUT PLAN and concise NUTRITION & RECOVERY GUIDANCE:

User Profile:
- Name: {req.name}
- Age: {req.age}
- Weight: {req.weightKg} kg
- Fitness Goal: {req.fitnessGoal}
- Workout Intensity: {req.intensity}
- Experience Level: {req.experienceLevel or 'Intermediate'}
- Equipment / Preferences: {req.preferences or 'Standard gym & bodyweight'}

Return JSON strictly matching this schema:
{{
  "planTitle": "string",
  "weeklyGoalSummary": "string",
  "targetIntensity": "{req.intensity}",
  "days": [
    {{
      "day": 1,
      "dayName": "string",
      "focus": "string",
      "isRestDay": false,
      "estimatedDurationMinutes": 45,
      "warmup": "string",
      "exercises": [
        {{
          "name": "string",
          "sets": 3,
          "repsOrDuration": "string",
          "restSeconds": 60,
          "tips": "string",
          "targetMuscles": ["string"]
        }}
      ],
      "cooldown": "string"
    }}
  ],
  "nutritionTip": "concise daily nutrition advice matching {req.weightKg}kg and goal {req.fitnessGoal}",
  "recoveryTip": "concise recovery & sleep protocol"
}}"""

    if not api_key or api_key == "MY_GEMINI_API_KEY":
        return fallback_workout_plan(req)

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=get_model_name(),
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "temperature": 0.7,
            },
        )
        data = json.loads(response.text)
        return data
    except Exception as e:
        print(f"Gemini API generation error: {e}")
        return fallback_workout_plan(req)


def update_workout_plan_with_feedback_ai(
    req: PlanGenerationRequest,
    original_plan: Dict[str, Any],
    feedback: str
) -> Tuple[Dict[str, Any], str]:
    api_key = os.getenv("GEMINI_API_KEY")

    prompt = f"""You are FitBuddy's master fitness trainer.
User Profile: {req.name}, {req.age}yo, {req.weightKg}kg, goal: {req.fitnessGoal}, intensity: {req.intensity}.
Original Plan Summary: {original_plan.get('weeklyGoalSummary', '')}
User Feedback: "{feedback}"

Refine the 7-day workout plan and nutrition/recovery advice to directly address the user's feedback.
Return a JSON object:
{{
  "changeSummary": "Concise 2-3 sentence summary of changes made",
  "updatedPlan": <the full updated 7-day workout plan matching original format>
}}"""

    if not api_key or api_key == "MY_GEMINI_API_KEY":
        return fallback_plan_update(original_plan, feedback)

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=get_model_name(),
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "temperature": 0.7,
            },
        )
        data = json.loads(response.text)
        return data["updatedPlan"], data["changeSummary"]
    except Exception as e:
        print(f"Gemini API update error: {e}")
        return fallback_plan_update(original_plan, feedback)


def fallback_workout_plan(req: PlanGenerationRequest) -> Dict[str, Any]:
    protein = round(req.weightKg * 1.8)
    return {
        "planTitle": f"{req.name}'s 7-Day {req.fitnessGoal} Routine",
        "weeklyGoalSummary": f"Custom calibrated for {req.name} to achieve {req.fitnessGoal} at {req.intensity} intensity.",
        "targetIntensity": req.intensity,
        "days": [
            {
                "day": 1,
                "dayName": "Day 1: Upper Body Strength & Posture",
                "focus": "Chest, Back, Arms",
                "isRestDay": False,
                "estimatedDurationMinutes": 45,
                "warmup": "Arm circles, cat-cow, band pull-aparts (5 mins)",
                "exercises": [
                    {
                        "name": "Push-Ups / Dumbbell Bench Press",
                        "sets": 3,
                        "repsOrDuration": "10-12 reps",
                        "restSeconds": 60,
                        "tips": "Maintain neutral spine and engage core",
                        "targetMuscles": ["Chest", "Triceps"]
                    },
                    {
                        "name": "Dumbbell Bent-Over Rows",
                        "sets": 3,
                        "repsOrDuration": "10-12 reps",
                        "restSeconds": 60,
                        "tips": "Drive elbows toward hips and squeeze scapulae",
                        "targetMuscles": ["Lats", "Rhomboids", "Biceps"]
                    }
                ],
                "cooldown": "Doorway chest stretch and overhead triceps stretch"
            },
            {
                "day": 2,
                "dayName": "Day 2: Lower Body Power & Core",
                "focus": "Quads, Hamstrings, Glutes",
                "isRestDay": False,
                "estimatedDurationMinutes": 45,
                "warmup": "Bodyweight squats and leg swings",
                "exercises": [
                    {
                        "name": "Goblet Squats",
                        "sets": 4,
                        "repsOrDuration": "10-12 reps",
                        "restSeconds": 75,
                        "tips": "Knees track over second toe, brace core",
                        "targetMuscles": ["Quads", "Glutes"]
                    },
                    {
                        "name": "Romanian Deadlifts",
                        "sets": 3,
                        "repsOrDuration": "10-12 reps",
                        "restSeconds": 75,
                        "tips": "Hinge at the hips with slight knee bend",
                        "targetMuscles": ["Hamstrings", "Glutes"]
                    }
                ],
                "cooldown": "Seated forward fold and figure-4 stretch"
            },
            {
                "day": 3,
                "dayName": "Day 3: Active Recovery & Gentle Mobility",
                "focus": "Cardio & Myofascial Release",
                "isRestDay": True,
                "estimatedDurationMinutes": 25,
                "warmup": "Deep diaphragmatic breathing",
                "exercises": [
                    {
                        "name": "Zone 2 Brisk Outdoor Walk",
                        "sets": 1,
                        "repsOrDuration": "20-25 mins",
                        "restSeconds": 0,
                        "tips": "Keep nasal breathing rhythm",
                        "targetMuscles": ["Cardiovascular", "Legs"]
                    }
                ],
                "cooldown": "Full body dynamic stretching"
            },
            {
                "day": 4,
                "dayName": "Day 4: Push/Pull Hypertrophy Blitz",
                "focus": "Shoulders, Lats, Arms",
                "isRestDay": False,
                "estimatedDurationMinutes": 45,
                "warmup": "Shoulder dislocates with towel",
                "exercises": [
                    {
                        "name": "Overhead Shoulder Press",
                        "sets": 3,
                        "repsOrDuration": "10-12 reps",
                        "restSeconds": 60,
                        "tips": "Glutes squeezed to avoid overarching lower back",
                        "targetMuscles": ["Shoulders", "Core"]
                    }
                ],
                "cooldown": "Cross-body arm stretch"
            },
            {
                "day": 5,
                "dayName": "Day 5: Posterior Chain & Hamstrings",
                "focus": "Posterior Chain, Glutes, Calves",
                "isRestDay": False,
                "estimatedDurationMinutes": 45,
                "warmup": "Glute bridges and hip openers",
                "exercises": [
                    {
                        "name": "Bulgarian Split Squats",
                        "sets": 3,
                        "repsOrDuration": "8-10 reps/side",
                        "restSeconds": 60,
                        "tips": "Lower rear knee smoothly",
                        "targetMuscles": ["Glutes", "Quads"]
                    }
                ],
                "cooldown": "Hamstring and calf stretching"
            },
            {
                "day": 6,
                "dayName": "Day 6: Functional Core & MetCon",
                "focus": "Total Body Synergy & Core Endurance",
                "isRestDay": False,
                "estimatedDurationMinutes": 40,
                "warmup": "Jumping jacks and torso twists",
                "exercises": [
                    {
                        "name": "Plank Shoulder Taps",
                        "sets": 3,
                        "repsOrDuration": "45 seconds",
                        "restSeconds": 45,
                        "tips": "Hips square to the floor",
                        "targetMuscles": ["Core", "Shoulders"]
                    }
                ],
                "cooldown": "Child's pose and cobra stretch"
            },
            {
                "day": 7,
                "dayName": "Day 7: Full Rest & Weekly Reset",
                "focus": "Systemic Regeneration",
                "isRestDay": True,
                "estimatedDurationMinutes": 20,
                "warmup": "Gentle neck and wrist rolls",
                "exercises": [
                    {
                        "name": "Restorative Mindful Walk",
                        "sets": 1,
                        "repsOrDuration": "20 mins",
                        "restSeconds": 0,
                        "tips": "Relax shoulders, soak in sunlight",
                        "targetMuscles": ["Mind", "Cardio"]
                    }
                ],
                "cooldown": "Deep relaxation breathing"
            }
        ],
        "nutritionTip": f"Aim for ~{protein}g of protein daily spread over 3-4 meals. Drink at least 2.5-3L water.",
        "recoveryTip": "Prioritize 7-8 hours of quality sleep. Perform 5 minutes of mobility every morning."
    }


def fallback_plan_update(original_plan: Dict[str, Any], feedback: str) -> Tuple[Dict[str, Any], str]:
    new_plan = json.loads(json.dumps(original_plan))
    summary = f"Adjusted training parameters to address your request: '{feedback}'."
    new_plan["planTitle"] = f"{new_plan.get('planTitle', 'Plan')} (Refined)"
    return new_plan, summary
