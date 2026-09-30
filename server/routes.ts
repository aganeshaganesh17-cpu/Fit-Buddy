import { Router, Request, Response } from 'express';
import {
  upsertUser,
  getUserByUserId,
  getAllUsers,
  saveWorkoutPlan,
  getPlanById,
  getPlansByUserId,
  getAllPlans,
  deletePlanById,
  deleteUserByUserId,
  recordFeedback,
  getFeedbackHistoryForPlan,
  getAdminStats,
} from './database.js';
import {
  generateWorkoutPlanWithGemini,
  updateWorkoutPlanWithFeedback,
} from './gemini_service.js';
import { UserProfile, WorkoutPlanData } from './types.js';

export const apiRouter = Router();

// Health and public config (never exposes keys)
apiRouter.get('/config', (_req: Request, res: Response) => {
  res.json({
    appName: 'FitBuddy – AI Fitness Plan Generator',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    status: 'healthy',
  });
});

// Generate new 7-day fitness plan
apiRouter.post('/generate-plan', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, userId, age, weightKg, fitnessGoal, intensity, experienceLevel, preferences } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Name is required and must be at least 2 characters.' });
      return;
    }
    if (!userId || typeof userId !== 'string' || userId.trim().length < 2) {
      res.status(400).json({ error: 'User ID is required (e.g. "sarah_fit" or "user101").' });
      return;
    }
    const cleanUserId = userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    const numAge = Number(age);
    if (!numAge || numAge < 10 || numAge > 120) {
      res.status(400).json({ error: 'Please enter a valid age between 10 and 120.' });
      return;
    }

    const numWeight = Number(weightKg);
    if (!numWeight || numWeight < 20 || numWeight > 350) {
      res.status(400).json({ error: 'Please enter a valid weight in kg between 20 and 350.' });
      return;
    }

    if (!fitnessGoal || typeof fitnessGoal !== 'string' || fitnessGoal.trim().length < 2) {
      res.status(400).json({ error: 'Fitness goal is required.' });
      return;
    }

    const validIntensities = ['Low', 'Moderate', 'High', 'Extreme'];
    const cleanIntensity = validIntensities.includes(intensity) ? intensity : 'Moderate';

    const userProfile: UserProfile = {
      name: name.trim(),
      userId: cleanUserId,
      age: numAge,
      weightKg: numWeight,
      fitnessGoal: fitnessGoal.trim(),
      intensity: cleanIntensity as UserProfile['intensity'],
      experienceLevel: experienceLevel || 'Intermediate',
      preferences: preferences?.trim() || '',
    };

    // 1. Save or update user in SQLite
    const savedUser = await upsertUser(userProfile);

    // 2. Generate personalized plan with Gemini API
    const generatedPlan = await generateWorkoutPlanWithGemini(userProfile);

    // 3. Persist generated plan in SQLite
    const planId = await saveWorkoutPlan(savedUser.user_id, generatedPlan, 1);

    res.status(201).json({
      success: true,
      planId,
      user: savedUser,
      plan: generatedPlan,
      version: 1,
    });
  } catch (err: unknown) {
    console.error('Error generating workout plan:', err);
    res.status(500).json({
      error: 'Failed to generate workout plan. Please try again.',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

// Update plan with user feedback
apiRouter.post('/update-plan', async (req: Request, res: Response): Promise<void> => {
  try {
    const { planId, feedback } = req.body;

    if (!planId || isNaN(Number(planId))) {
      res.status(400).json({ error: 'Valid planId is required.' });
      return;
    }
    if (!feedback || typeof feedback !== 'string' || feedback.trim().length < 3) {
      res.status(400).json({ error: 'Please provide constructive feedback (at least 3 characters).' });
      return;
    }

    // 1. Fetch original plan
    const originalDbPlan = await getPlanById(Number(planId));
    if (!originalDbPlan) {
      res.status(404).json({ error: 'Workout plan not found.' });
      return;
    }

    // 2. Fetch associated user
    const dbUser = await getUserByUserId(originalDbPlan.user_id);
    if (!dbUser) {
      res.status(404).json({ error: 'Associated user profile not found.' });
      return;
    }

    const userProfile: UserProfile = {
      name: dbUser.name,
      userId: dbUser.user_id,
      age: dbUser.age,
      weightKg: dbUser.weight_kg,
      fitnessGoal: dbUser.fitness_goal,
      intensity: dbUser.intensity as UserProfile['intensity'],
      experienceLevel: (dbUser.experience_level as UserProfile['experienceLevel']) || 'Intermediate',
      preferences: dbUser.preferences || '',
    };

    let originalDays = [];
    try {
      originalDays = JSON.parse(originalDbPlan.days_data);
    } catch {
      originalDays = [];
    }

    const originalPlanData: WorkoutPlanData = {
      planTitle: originalDbPlan.plan_name,
      weeklyGoalSummary: originalDbPlan.summary,
      targetIntensity: dbUser.intensity,
      days: originalDays,
      nutritionTip: originalDbPlan.nutrition_tip,
      recoveryTip: originalDbPlan.recovery_tip,
    };

    // 3. Request Gemini to refine plan according to feedback
    const { updatedPlan, changeSummary } = await updateWorkoutPlanWithFeedback(
      userProfile,
      originalPlanData,
      feedback.trim()
    );

    // 4. Save updated plan as version + 1
    const newVersion = (originalDbPlan.version || 1) + 1;
    const newPlanId = await saveWorkoutPlan(dbUser.user_id, updatedPlan, newVersion);

    // 5. Record feedback in database
    await recordFeedback(
      Number(planId),
      dbUser.user_id,
      feedback.trim(),
      changeSummary,
      newPlanId
    );

    res.status(201).json({
      success: true,
      previousPlanId: Number(planId),
      newPlanId,
      version: newVersion,
      changeSummary,
      plan: updatedPlan,
      user: dbUser,
    });
  } catch (err: unknown) {
    console.error('Error updating workout plan with feedback:', err);
    res.status(500).json({
      error: 'Failed to update plan based on feedback. Please try again.',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

// Get user profile and their workout plans
apiRouter.get('/users/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getUserByUserId(req.params.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const plans = await getPlansByUserId(req.params.userId);
    const parsedPlans = plans.map((p) => {
      let parsedDays = [];
      try {
        parsedDays = JSON.parse(p.days_data);
      } catch {
        parsedDays = [];
      }
      return {
        ...p,
        days: parsedDays,
      };
    });

    res.json({
      user,
      plans: parsedPlans,
    });
  } catch (err: unknown) {
    console.error('Error fetching user data:', err);
    res.status(500).json({ error: 'Failed to fetch user data.' });
  }
});

// Get specific plan and its feedback history
apiRouter.get('/plans/:planId', async (req: Request, res: Response): Promise<void> => {
  try {
    const planId = Number(req.params.planId);
    const plan = await getPlanById(planId);
    if (!plan) {
      res.status(404).json({ error: 'Plan not found.' });
      return;
    }

    const user = await getUserByUserId(plan.user_id);
    const feedbackList = await getFeedbackHistoryForPlan(planId);

    let days = [];
    try {
      days = JSON.parse(plan.days_data);
    } catch {
      days = [];
    }

    res.json({
      plan: {
        ...plan,
        days,
      },
      user,
      feedbackList,
    });
  } catch (err: unknown) {
    console.error('Error fetching plan:', err);
    res.status(500).json({ error: 'Failed to fetch plan details.' });
  }
});

// Admin stats
apiRouter.get('/admin/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch (err: unknown) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ error: 'Failed to fetch admin stats.' });
  }
});

// Admin data (users and plans table)
apiRouter.get('/admin/data', async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await getAllUsers();
    const plans = await getAllPlans();

    const formattedPlans = plans.map((p) => {
      let parsedDays = [];
      try {
        parsedDays = JSON.parse(p.days_data);
      } catch {
        parsedDays = [];
      }
      return {
        id: p.id,
        user_id: p.user_id,
        user_name: p.user_name || 'Anonymous',
        plan_name: p.plan_name,
        version: p.version,
        created_at: p.created_at,
        days_count: parsedDays.length,
        fitness_goal: p.fitness_goal,
        intensity: p.intensity,
        summary: p.summary,
        nutrition_tip: p.nutrition_tip,
        recovery_tip: p.recovery_tip,
      };
    });

    res.json({
      users,
      plans: formattedPlans,
    });
  } catch (err: unknown) {
    console.error('Error fetching admin data:', err);
    res.status(500).json({ error: 'Failed to fetch admin records.' });
  }
});

// Admin delete plan
apiRouter.delete('/admin/plans/:planId', async (req: Request, res: Response): Promise<void> => {
  try {
    const planId = Number(req.params.planId);
    await deletePlanById(planId);
    res.json({ success: true, message: `Plan #${planId} deleted.` });
  } catch (err: unknown) {
    console.error('Error deleting plan:', err);
    res.status(500).json({ error: 'Failed to delete plan.' });
  }
});

// Admin delete user
apiRouter.delete('/admin/users/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteUserByUserId(req.params.userId);
    res.json({ success: true, message: `User ${req.params.userId} and their plans were deleted.` });
  } catch (err: unknown) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});
