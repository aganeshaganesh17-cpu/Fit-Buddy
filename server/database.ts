import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { DbUser, DbWorkoutPlan, DbFeedbackHistory, UserProfile, WorkoutPlanData } from './types.js';

const DB_PATH = path.resolve(process.cwd(), 'fitbuddy.sqlite');

let db: SqlJsDatabase | null = null;

function saveDbToFile() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to persist SQLite database to disk:', err);
  }
}

export async function getDatabase(): Promise<SqlJsDatabase> {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('Could not read existing SQLite file, creating new database instance:', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Create tables if they do not exist
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      weight_kg REAL NOT NULL,
      fitness_goal TEXT NOT NULL,
      intensity TEXT NOT NULL,
      experience_level TEXT,
      preferences TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workout_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      plan_name TEXT NOT NULL,
      summary TEXT,
      days_data TEXT NOT NULL,
      nutrition_tip TEXT,
      recovery_tip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS feedback_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      feedback_text TEXT NOT NULL,
      changes_applied_summary TEXT,
      new_plan_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
    CREATE INDEX IF NOT EXISTS idx_plans_user_id ON workout_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_plan_id ON feedback_history(plan_id);
  `);

  saveDbToFile();
  return db;
}

// User CRUD operations
export async function upsertUser(profile: UserProfile): Promise<DbUser> {
  const database = await getDatabase();
  const existingStmt = database.prepare('SELECT * FROM users WHERE user_id = :userId');
  existingStmt.bind({ ':userId': profile.userId });

  const exists = existingStmt.step();
  existingStmt.free();

  const now = new Date().toISOString();

  if (exists) {
    database.run(
      `UPDATE users SET
        name = :name,
        age = :age,
        weight_kg = :weightKg,
        fitness_goal = :fitnessGoal,
        intensity = :intensity,
        experience_level = :experienceLevel,
        preferences = :preferences,
        updated_at = :updatedAt
       WHERE user_id = :userId`,
      {
        ':name': profile.name,
        ':age': profile.age,
        ':weightKg': profile.weightKg,
        ':fitnessGoal': profile.fitnessGoal,
        ':intensity': profile.intensity,
        ':experienceLevel': profile.experienceLevel || null,
        ':preferences': profile.preferences || null,
        ':updatedAt': now,
        ':userId': profile.userId,
      }
    );
  } else {
    database.run(
      `INSERT INTO users (user_id, name, age, weight_kg, fitness_goal, intensity, experience_level, preferences, created_at, updated_at)
       VALUES (:userId, :name, :age, :weightKg, :fitnessGoal, :intensity, :experienceLevel, :preferences, :createdAt, :updatedAt)`,
      {
        ':userId': profile.userId,
        ':name': profile.name,
        ':age': profile.age,
        ':weightKg': profile.weightKg,
        ':fitnessGoal': profile.fitnessGoal,
        ':intensity': profile.intensity,
        ':experienceLevel': profile.experienceLevel || null,
        ':preferences': profile.preferences || null,
        ':createdAt': now,
        ':updatedAt': now,
      }
    );
  }

  saveDbToFile();
  return (await getUserByUserId(profile.userId))!;
}

export async function getUserByUserId(userId: string): Promise<DbUser | null> {
  const database = await getDatabase();
  const stmt = database.prepare('SELECT * FROM users WHERE user_id = :userId');
  stmt.bind({ ':userId': userId });
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as DbUser;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export async function getAllUsers(): Promise<DbUser[]> {
  const database = await getDatabase();
  const stmt = database.prepare('SELECT * FROM users ORDER BY updated_at DESC');
  const results: DbUser[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as DbUser);
  }
  stmt.free();
  return results;
}

// Workout Plan CRUD operations
export async function saveWorkoutPlan(
  userId: string,
  plan: WorkoutPlanData,
  version: number = 1
): Promise<number> {
  const database = await getDatabase();
  const now = new Date().toISOString();

  database.run(
    `INSERT INTO workout_plans (user_id, version, status, plan_name, summary, days_data, nutrition_tip, recovery_tip, created_at)
     VALUES (:userId, :version, 'active', :planName, :summary, :daysData, :nutritionTip, :recoveryTip, :createdAt)`,
    {
      ':userId': userId,
      ':version': version,
      ':planName': plan.planTitle || '7-Day Custom Fitness Plan',
      ':summary': plan.weeklyGoalSummary || '',
      ':daysData': JSON.stringify(plan.days),
      ':nutritionTip': plan.nutritionTip || '',
      ':recoveryTip': plan.recoveryTip || '',
      ':createdAt': now,
    }
  );

  const idStmt = database.prepare('SELECT last_insert_rowid() as id');
  idStmt.step();
  const insertedId = (idStmt.getAsObject() as { id: number }).id;
  idStmt.free();

  saveDbToFile();
  return insertedId;
}

export async function getPlanById(planId: number): Promise<DbWorkoutPlan | null> {
  const database = await getDatabase();
  const stmt = database.prepare('SELECT * FROM workout_plans WHERE id = :id');
  stmt.bind({ ':id': planId });
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as DbWorkoutPlan;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export async function getPlansByUserId(userId: string): Promise<DbWorkoutPlan[]> {
  const database = await getDatabase();
  const stmt = database.prepare('SELECT * FROM workout_plans WHERE user_id = :userId ORDER BY version DESC, created_at DESC');
  stmt.bind({ ':userId': userId });
  const results: DbWorkoutPlan[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as DbWorkoutPlan);
  }
  stmt.free();
  return results;
}

export async function getAllPlans(): Promise<Array<DbWorkoutPlan & { user_name?: string; fitness_goal?: string; intensity?: string }>> {
  const database = await getDatabase();
  const stmt = database.prepare(`
    SELECT wp.*, u.name as user_name, u.fitness_goal, u.intensity
    FROM workout_plans wp
    LEFT JOIN users u ON wp.user_id = u.user_id
    ORDER BY wp.created_at DESC
  `);
  const results: Array<DbWorkoutPlan & { user_name?: string; fitness_goal?: string; intensity?: string }> = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as DbWorkoutPlan & { user_name?: string; fitness_goal?: string; intensity?: string });
  }
  stmt.free();
  return results;
}

export async function deletePlanById(planId: number): Promise<boolean> {
  const database = await getDatabase();
  database.run('DELETE FROM feedback_history WHERE plan_id = :id OR new_plan_id = :id', { ':id': planId });
  database.run('DELETE FROM workout_plans WHERE id = :id', { ':id': planId });
  saveDbToFile();
  return true;
}

export async function deleteUserByUserId(userId: string): Promise<boolean> {
  const database = await getDatabase();
  database.run('DELETE FROM feedback_history WHERE user_id = :userId', { ':userId': userId });
  database.run('DELETE FROM workout_plans WHERE user_id = :userId', { ':userId': userId });
  database.run('DELETE FROM users WHERE user_id = :userId', { ':userId': userId });
  saveDbToFile();
  return true;
}

// Feedback History CRUD operations
export async function recordFeedback(
  planId: number,
  userId: string,
  feedbackText: string,
  changesSummary: string,
  newPlanId?: number
): Promise<number> {
  const database = await getDatabase();
  const now = new Date().toISOString();

  database.run(
    `INSERT INTO feedback_history (plan_id, user_id, feedback_text, changes_applied_summary, new_plan_id, created_at)
     VALUES (:planId, :userId, :feedbackText, :changesSummary, :newPlanId, :createdAt)`,
    {
      ':planId': planId,
      ':userId': userId,
      ':feedbackText': feedbackText,
      ':changesSummary': changesSummary,
      ':newPlanId': newPlanId || null,
      ':createdAt': now,
    }
  );

  const idStmt = database.prepare('SELECT last_insert_rowid() as id');
  idStmt.step();
  const insertedId = (idStmt.getAsObject() as { id: number }).id;
  idStmt.free();

  saveDbToFile();
  return insertedId;
}

export async function getFeedbackHistoryForPlan(planId: number): Promise<DbFeedbackHistory[]> {
  const database = await getDatabase();
  const stmt = database.prepare('SELECT * FROM feedback_history WHERE plan_id = :planId ORDER BY created_at DESC');
  stmt.bind({ ':planId': planId });
  const results: DbFeedbackHistory[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as DbFeedbackHistory);
  }
  stmt.free();
  return results;
}

export async function getAdminStats() {
  const database = await getDatabase();

  const userCountStmt = database.prepare('SELECT COUNT(*) as count FROM users');
  userCountStmt.step();
  const totalUsers = (userCountStmt.getAsObject() as { count: number }).count;
  userCountStmt.free();

  const planCountStmt = database.prepare('SELECT COUNT(*) as count FROM workout_plans');
  planCountStmt.step();
  const totalPlans = (planCountStmt.getAsObject() as { count: number }).count;
  planCountStmt.free();

  const feedbackCountStmt = database.prepare('SELECT COUNT(*) as count FROM feedback_history');
  feedbackCountStmt.step();
  const totalFeedback = (feedbackCountStmt.getAsObject() as { count: number }).count;
  feedbackCountStmt.free();

  const goalsStmt = database.prepare('SELECT fitness_goal, COUNT(*) as count FROM users GROUP BY fitness_goal ORDER BY count DESC');
  const goalBreakdown: Record<string, number> = {};
  while (goalsStmt.step()) {
    const row = goalsStmt.getAsObject() as { fitness_goal: string; count: number };
    goalBreakdown[row.fitness_goal] = row.count;
  }
  goalsStmt.free();

  return {
    totalUsers,
    totalPlans,
    totalFeedback,
    goalBreakdown,
  };
}
