export interface UserProfile {
  name: string;
  userId: string;
  age: number;
  weightKg: number;
  fitnessGoal: string;
  intensity: 'Low' | 'Moderate' | 'High' | 'Extreme';
  experienceLevel?: 'Beginner' | 'Intermediate' | 'Advanced';
  preferences?: string;
}

export interface ExerciseItem {
  name: string;
  sets: number;
  repsOrDuration: string;
  restSeconds: number;
  tips: string;
  targetMuscles: string[];
}

export interface DayWorkoutPlan {
  day: number;
  dayName: string;
  focus: string;
  isRestDay: boolean;
  estimatedDurationMinutes: number;
  warmup: string;
  exercises: ExerciseItem[];
  cooldown: string;
}

export interface WorkoutPlanData {
  planTitle: string;
  weeklyGoalSummary: string;
  targetIntensity: string;
  days: DayWorkoutPlan[];
  nutritionTip: string;
  recoveryTip: string;
}

export interface DbUser {
  id: number;
  user_id: string;
  name: string;
  age: number;
  weight_kg: number;
  fitness_goal: string;
  intensity: string;
  experience_level: string | null;
  preferences: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbWorkoutPlan {
  id: number;
  user_id: string;
  version: number;
  status: string;
  plan_name: string;
  summary: string;
  days_data: string; // JSON string of DayWorkoutPlan[]
  nutrition_tip: string;
  recovery_tip: string;
  created_at: string;
}

export interface DbFeedbackHistory {
  id: number;
  plan_id: number;
  user_id: string;
  feedback_text: string;
  changes_applied_summary: string | null;
  new_plan_id: number | null;
  created_at: string;
}
