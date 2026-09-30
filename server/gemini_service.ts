import { GoogleGenAI, Type } from '@google/genai';
import { UserProfile, WorkoutPlanData } from './types.js';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getModelName(): string {
  return process.env.GEMINI_MODEL || 'gemini-3.8-flash';
}

const workoutPlanResponseSchema = {
  type: Type.OBJECT,
  properties: {
    planTitle: {
      type: Type.STRING,
      description: 'An inspiring title for this 7-day fitness regimen',
    },
    weeklyGoalSummary: {
      type: Type.STRING,
      description: 'Clear 2-3 sentence overview of this 7-day progression tailored to the user profile',
    },
    targetIntensity: {
      type: Type.STRING,
      description: 'Intensity level of the workout program',
    },
    days: {
      type: Type.ARRAY,
      description: 'Exactly 7 days of training and active recovery',
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER, description: 'Day number 1 to 7' },
          dayName: { type: Type.STRING, description: 'Day title, e.g. Day 1: Upper Body Push & Core' },
          focus: { type: Type.STRING, description: 'Primary muscle groups or modality' },
          isRestDay: { type: Type.BOOLEAN, description: 'Whether this day is a designated rest/recovery day' },
          estimatedDurationMinutes: { type: Type.INTEGER, description: 'Estimated total session duration in minutes' },
          warmup: { type: Type.STRING, description: '5-10 minute dynamic warmup routine' },
          exercises: {
            type: Type.ARRAY,
            description: 'List of 3 to 6 exercises for the session (empty or light mobility for rest days)',
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: 'Exercise name' },
                sets: { type: Type.INTEGER, description: 'Recommended sets' },
                repsOrDuration: { type: Type.STRING, description: 'Reps range e.g. "8-12 reps" or duration e.g. "45s"' },
                restSeconds: { type: Type.INTEGER, description: 'Rest between sets in seconds' },
                tips: { type: Type.STRING, description: 'Key biomechanical cue or safety tip' },
                targetMuscles: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Primary muscles worked',
                },
              },
              required: ['name', 'sets', 'repsOrDuration', 'restSeconds', 'tips', 'targetMuscles'],
            },
          },
          cooldown: { type: Type.STRING, description: '3-5 minute static stretch or breathwork cooldown' },
        },
        required: ['day', 'dayName', 'focus', 'isRestDay', 'estimatedDurationMinutes', 'warmup', 'exercises', 'cooldown'],
      },
    },
    nutritionTip: {
      type: Type.STRING,
      description: 'Personalized, practical daily nutrition guidance matching their body weight and fitness goal (protein target, hydration, meal timing)',
    },
    recoveryTip: {
      type: Type.STRING,
      description: 'Personalized recovery guidance (sleep hygiene, active recovery, soreness management)',
    },
  },
  required: ['planTitle', 'weeklyGoalSummary', 'targetIntensity', 'days', 'nutritionTip', 'recoveryTip'],
};

export async function generateWorkoutPlanWithGemini(user: UserProfile): Promise<WorkoutPlanData> {
  const ai = getAiClient();
  const model = getModelName();

  const prompt = `You are FitBuddy's master certified strength, conditioning, and nutrition specialist.
Create a hyper-personalized, safe, science-backed 7-DAY WORKOUT PLAN and concise NUTRITION & RECOVERY GUIDANCE for the following individual:

User Profile:
- Name: ${user.name}
- Age: ${user.age} years old
- Weight: ${user.weightKg} kg
- Fitness Goal: ${user.fitnessGoal}
- Workout Intensity: ${user.intensity}
- Experience Level: ${user.experienceLevel || 'Intermediate'}
- Equipment / Workout Preferences: ${user.preferences || 'Standard gym equipment & home bodyweight'}

Guidelines:
1. Provide a comprehensive 7-day schedule (Day 1 through Day 7). Incorporate appropriate rest / active recovery days tailored to intensity (${user.intensity}).
2. Ensure exercise selection directly matches their experience level (${user.experienceLevel || 'Intermediate'}) and equipment preferences.
3. Every workout day must feature a specific dynamic warm-up, realistic sets/reps/rest periods, precise biomechanical safety cues, and a cooldown.
4. Nutrition tip should include specific daily protein recommendations for a ${user.weightKg} kg person aiming for ${user.fitnessGoal}, plus hydration and pre/post-workout fuel tips.
5. Recovery tip should include optimal sleep duration and active mobility protocols.`;

  if (!ai) {
    console.warn('GEMINI_API_KEY is not configured. Utilizing deterministic expert fitness generator fallback.');
    return generateFallbackPlan(user);
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: 'You are an elite, certified strength and conditioning coach and sports nutritionist. You design structured, scientifically calibrated 7-day workout plans.',
        responseMimeType: 'application/json',
        responseSchema: workoutPlanResponseSchema,
        temperature: 0.7,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response received from Gemini API');
    }

    const parsed = JSON.parse(responseText) as WorkoutPlanData;
    validatePlanStructure(parsed);
    return parsed;
  } catch (err) {
    console.error('Gemini API plan generation failed, falling back to expert algorithm:', err);
    return generateFallbackPlan(user);
  }
}

export async function updateWorkoutPlanWithFeedback(
  user: UserProfile,
  originalPlan: WorkoutPlanData,
  feedback: string
): Promise<{ updatedPlan: WorkoutPlanData; changeSummary: string }> {
  const ai = getAiClient();
  const model = getModelName();

  const prompt = `You are FitBuddy's master fitness trainer. A user has tested their 7-day workout plan and provided specific feedback.

User Profile:
- Name: ${user.name}
- Age: ${user.age}
- Weight: ${user.weightKg} kg
- Fitness Goal: ${user.fitnessGoal}
- Current Intensity: ${user.intensity}

Original Plan Title: ${originalPlan.planTitle}
Original Weekly Summary: ${originalPlan.weeklyGoalSummary}
User Feedback: "${feedback}"

Task:
Revise the 7-day workout plan and nutrition/recovery advice to directly address the user's feedback (e.g. if they asked for "Add more cardio", "Reduce workout intensity", "Include more rest days", "Add yoga", "Focus more on upper body", or "I have only 30 minutes per day", ensure every single day and exercise accurately reflects these changes).
Also provide an explicit "changeSummary" explaining exactly what modifications were made.`;

  const feedbackResponseSchema = {
    type: Type.OBJECT,
    properties: {
      changeSummary: {
        type: Type.STRING,
        description: 'A 2-3 sentence clear summary highlighting the modifications made based on the user feedback',
      },
      updatedPlan: workoutPlanResponseSchema,
    },
    required: ['changeSummary', 'updatedPlan'],
  };

  if (!ai) {
    console.warn('GEMINI_API_KEY is not configured. Applying programmatic feedback transformation.');
    return generateFallbackPlanUpdate(user, originalPlan, feedback);
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: 'You are an elite fitness specialist responding iteratively to client feedback. You adjust volume, exercise selection, rest days, and intensity precisely as requested.',
        responseMimeType: 'application/json',
        responseSchema: feedbackResponseSchema,
        temperature: 0.7,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response from Gemini API for feedback update');
    }

    const result = JSON.parse(responseText) as { updatedPlan: WorkoutPlanData; changeSummary: string };
    validatePlanStructure(result.updatedPlan);
    return result;
  } catch (err) {
    console.error('Gemini API plan update failed, applying fallback transformation:', err);
    return generateFallbackPlanUpdate(user, originalPlan, feedback);
  }
}

function validatePlanStructure(plan: WorkoutPlanData): void {
  if (!plan.days || !Array.isArray(plan.days) || plan.days.length !== 7) {
    // Ensure 7 days exist
    if (!Array.isArray(plan.days)) plan.days = [];
    while (plan.days.length < 7) {
      const dayNum = plan.days.length + 1;
      plan.days.push({
        day: dayNum,
        dayName: `Day ${dayNum} - Active Recovery & Mobility`,
        focus: 'Active Recovery',
        isRestDay: true,
        estimatedDurationMinutes: 20,
        warmup: 'Gentle spinal waves and cat-cow breathing (5 mins)',
        exercises: [
          {
            name: 'Walking or Light Cycling',
            sets: 1,
            repsOrDuration: '20 mins',
            restSeconds: 0,
            tips: 'Keep heart rate in Zone 1 for active blood circulation',
            targetMuscles: ['Full Body', 'Cardiovascular'],
          },
        ],
        cooldown: 'Static hamstring and hip flexor stretches (5 mins)',
      });
    }
  }
}

// Fallback generator when offline or API key absent
function generateFallbackPlan(user: UserProfile): WorkoutPlanData {
  const isMuscle = user.fitnessGoal.toLowerCase().includes('muscle') || user.fitnessGoal.toLowerCase().includes('strength');
  const isLoss = user.fitnessGoal.toLowerCase().includes('loss') || user.fitnessGoal.toLowerCase().includes('fat') || user.fitnessGoal.toLowerCase().includes('burn');
  const proteinGrams = Math.round(user.weightKg * (isMuscle ? 2.0 : 1.6));
  const waterLiters = (user.weightKg * 0.035).toFixed(1);

  const days: WorkoutPlanData['days'] = [
    {
      day: 1,
      dayName: 'Day 1: Upper Body Strength & Posture',
      focus: 'Chest, Back, Shoulders & Arms',
      isRestDay: false,
      estimatedDurationMinutes: 45,
      warmup: '5 mins arm circles, band pull-aparts, and light push-up planks',
      exercises: [
        {
          name: isMuscle ? 'Dumbbell Bench Press' : 'Push-Ups (standard or incline)',
          sets: 3,
          repsOrDuration: isMuscle ? '8-10 reps' : '10-15 reps',
          restSeconds: 75,
          tips: 'Retract your shoulder blades and control the tempo on the descent',
          targetMuscles: ['Chest', 'Anterior Deltoids', 'Triceps'],
        },
        {
          name: 'Dumbbell Rows / Inverted Rows',
          sets: 3,
          repsOrDuration: '10-12 reps',
          restSeconds: 60,
          tips: 'Pull with your elbows and squeeze lats at the peak contraction',
          targetMuscles: ['Lats', 'Rhomboids', 'Biceps'],
        },
        {
          name: 'Dumbbell Overhead Shoulder Press',
          sets: 3,
          repsOrDuration: '10-12 reps',
          restSeconds: 60,
          tips: 'Brace your core to protect the lower back and avoid overarching',
          targetMuscles: ['Deltoids', 'Triceps'],
        },
        {
          name: 'Plank with Shoulder Taps',
          sets: 3,
          repsOrDuration: '45 seconds',
          restSeconds: 45,
          tips: 'Keep hips completely steady without rotating side to side',
          targetMuscles: ['Core', 'Transverse Abdominis', 'Shoulders'],
        },
      ],
      cooldown: '5 mins cross-body shoulder stretch and cobra chest stretch',
    },
    {
      day: 2,
      dayName: 'Day 2: Lower Body Power & Core Stabilization',
      focus: 'Quads, Hamstrings, Glutes & Calves',
      isRestDay: false,
      estimatedDurationMinutes: 50,
      warmup: '5 mins bodyweight squats, leg swings, and ankle mobility circles',
      exercises: [
        {
          name: 'Goblet Squats or Barbell Back Squats',
          sets: 4,
          repsOrDuration: '10-12 reps',
          restSeconds: 90,
          tips: 'Drive through your heels, keep chest proud and knees tracking toes',
          targetMuscles: ['Quadriceps', 'Glutes', 'Core'],
        },
        {
          name: 'Romanian Deadlifts (Dumbbell or Barbell)',
          sets: 3,
          repsOrDuration: '10-12 reps',
          restSeconds: 75,
          tips: 'Hinge deeply at the hips while maintaining a neutral spine',
          targetMuscles: ['Hamstrings', 'Glutes', 'Erector Spinae'],
        },
        {
          name: 'Walking Lunges',
          sets: 3,
          repsOrDuration: '10 reps each leg',
          restSeconds: 60,
          tips: 'Step forward smoothly and lower rear knee toward the floor',
          targetMuscles: ['Quads', 'Glutes', 'Calves'],
        },
        {
          name: 'Glute Bridge with 2-sec Pause',
          sets: 3,
          repsOrDuration: '15 reps',
          restSeconds: 45,
          tips: 'Squeeze glutes maximally at the top without hyperextending back',
          targetMuscles: ['Gluteus Maximus', 'Hamstrings'],
        },
      ],
      cooldown: '5 mins butterfly stretch, pigeon pose, and standing quad stretch',
    },
    {
      day: 3,
      dayName: 'Day 3: Active Recovery & Mobility Flow',
      focus: 'Joint Mobility, Myofascial Release & Gentle Cardio',
      isRestDay: true,
      estimatedDurationMinutes: 30,
      warmup: 'Light dynamic arm and torso swings',
      exercises: [
        {
          name: 'Zone 2 Brisk Outdoor Walk or Light Cycling',
          sets: 1,
          repsOrDuration: '20-25 mins',
          restSeconds: 0,
          tips: 'Breathe exclusively through your nose to promote parasympathetic recovery',
          targetMuscles: ['Cardiovascular System', 'Legs'],
        },
        {
          name: 'World’s Greatest Stretch & Thoracic Spine Openers',
          sets: 2,
          repsOrDuration: '5 reps per side',
          restSeconds: 30,
          tips: 'Sink deep into the hip flexor while rotating your chest to the ceiling',
          targetMuscles: ['Hips', 'Thoracic Spine', 'Hamstrings'],
        },
      ],
      cooldown: 'Deep diaphragmatic breathing (4s in, 6s out) for 5 minutes',
    },
    {
      day: 4,
      dayName: isLoss ? 'Day 4: High-Intensity Interval Conditioning' : 'Day 4: Push/Pull Hypertrophy Blitz',
      focus: isLoss ? 'Cardiovascular Capacity & Fat Burn' : 'Chest, Back & Shoulders',
      isRestDay: false,
      estimatedDurationMinutes: 45,
      warmup: '5 mins jumping jacks, inchworms, and mountain climbers',
      exercises: [
        {
          name: isLoss ? 'Kettlebell Swings or Dumbbell Clean' : 'Incline Dumbbell Press',
          sets: 4,
          repsOrDuration: isLoss ? '40s work / 20s rest' : '10-12 reps',
          restSeconds: isLoss ? 40 : 75,
          tips: 'Power generated from the hips, arms act purely as cables',
          targetMuscles: ['Full Body', 'Posterior Chain'],
        },
        {
          name: isLoss ? 'Bodyweight Mountain Climbers' : 'Lat Pulldowns / Pull-Ups',
          sets: 3,
          repsOrDuration: isLoss ? '30s fast' : '8-10 reps',
          restSeconds: 60,
          tips: 'Keep core tight and maintain steady cadence',
          targetMuscles: ['Lats', 'Core'],
        },
        {
          name: 'Lateral Dumbbell Raises',
          sets: 3,
          repsOrDuration: '12-15 reps',
          restSeconds: 45,
          tips: 'Slight bend in elbows, raise to parallel with ground',
          targetMuscles: ['Lateral Deltoids'],
        },
        {
          name: 'Bicycle Crunches',
          sets: 3,
          repsOrDuration: '20 alternating reps',
          restSeconds: 45,
          tips: 'Focus on rotation from the ribcage rather than pulling the neck',
          targetMuscles: ['Rectus Abdominis', 'Obliques'],
        },
      ],
      cooldown: 'Child’s pose and cat-cow stretch for 5 minutes',
    },
    {
      day: 5,
      dayName: 'Day 5: Posterior Chain & Lower Strength',
      focus: 'Hamstrings, Glutes, Calves & Lower Back Stability',
      isRestDay: false,
      estimatedDurationMinutes: 45,
      warmup: '5 mins butt kicks, high knees, and glute activation bridges',
      exercises: [
        {
          name: 'Bulgarian Split Squats',
          sets: 3,
          repsOrDuration: '8-10 reps each leg',
          restSeconds: 75,
          tips: 'Slight forward lean at torso to target gluteus medius and quads',
          targetMuscles: ['Quadriceps', 'Glutes'],
        },
        {
          name: 'Dumbbell Step-Ups onto Bench/Box',
          sets: 3,
          repsOrDuration: '10 reps each leg',
          restSeconds: 60,
          tips: 'Do not push off the trailing toe; rely on the lead leg',
          targetMuscles: ['Glutes', 'Quads', 'Hamstrings'],
        },
        {
          name: 'Standing Calf Raises',
          sets: 4,
          repsOrDuration: '15-20 reps',
          restSeconds: 45,
          tips: 'Hold peak contraction for 1 full second',
          targetMuscles: ['Gastrocnemius', 'Soleus'],
        },
        {
          name: 'Hanging Knee Raises or Reverse Crunches',
          sets: 3,
          repsOrDuration: '12 reps',
          restSeconds: 45,
          tips: 'Curl the pelvis upward toward sternum without swinging',
          targetMuscles: ['Lower Abdominals', 'Hip Flexors'],
        },
      ],
      cooldown: 'Seated hamstring stretch and figure-four glute stretch for 5 mins',
    },
    {
      day: 6,
      dayName: 'Day 6: Functional Core & Full Body MetCon',
      focus: 'Total Body Synergy, Agility & Core Endurance',
      isRestDay: false,
      estimatedDurationMinutes: 40,
      warmup: '5 mins skipping rope simulation, torso twists, and hip circles',
      exercises: [
        {
          name: 'Farmer’s Walk (Heavy Dumbbell Carry)',
          sets: 4,
          repsOrDuration: '40 meters or 45s carry',
          restSeconds: 60,
          tips: 'Stand tall with shoulders pinned back and grip tightly',
          targetMuscles: ['Grip Forearms', 'Trapezius', 'Core'],
        },
        {
          name: 'Dumbbell Thrusters (Squat to Overhead Press)',
          sets: 3,
          repsOrDuration: '10-12 reps',
          restSeconds: 75,
          tips: 'Use leg drive momentum to launch the weights overhead',
          targetMuscles: ['Quads', 'Shoulders', 'Cardio'],
        },
        {
          name: 'Russian Twists',
          sets: 3,
          repsOrDuration: '24 total touches',
          restSeconds: 45,
          tips: 'Elevate heels slightly if able, rotate shoulders fully',
          targetMuscles: ['Obliques', 'Transverse Abdominis'],
        },
      ],
      cooldown: 'Puppy dog pose and gentle spinal twist for 5 mins',
    },
    {
      day: 7,
      dayName: 'Day 7: Full Rest, Mindful Recovery & Weekly Prep',
      focus: 'Systemic Regeneration & Mental Reset',
      isRestDay: true,
      estimatedDurationMinutes: 20,
      warmup: 'Gentle morning joint rotations',
      exercises: [
        {
          name: 'Leisurely Stroll & Fresh Air Sun Exposure',
          sets: 1,
          repsOrDuration: '20-30 mins',
          restSeconds: 0,
          tips: 'Enjoyable, zero-strain walk to clear lactic buildup and reset circadian rhythm',
          targetMuscles: ['Mind & Body', 'Cardiovascular System'],
        },
      ],
      cooldown: '10 mins foam rolling for quads, thoracic spine, and calves',
    },
  ];

  return {
    planTitle: `${user.name}’s 7-Day ${user.fitnessGoal} Blueprint`,
    weeklyGoalSummary: `Crafted for ${user.name} (${user.age} yo, ${user.weightKg}kg) focusing on ${user.fitnessGoal} at ${user.intensity} intensity. This 7-day cycle balances high-yield progressive training with deliberate active recovery to ensure continuous adaptation without overtraining.`,
    targetIntensity: user.intensity,
    days,
    nutritionTip: `Target approximately ${proteinGrams}g of high-quality protein daily (split into 3-4 meals of ~30-40g). Hydrate with at least ${waterLiters}L of water per day. Consume a balanced carbohydrate and protein snack 60 minutes before training to fuel performance.`,
    recoveryTip: `Aim for 7.5 to 8.5 hours of uninterrupted sleep in a dark, cool room (65-68°F). Prioritize active recovery days (Day 3 & Day 7) with light walking and foam rolling to boost capillary blood flow and eliminate DOMS.`,
  };
}

function generateFallbackPlanUpdate(
  user: UserProfile,
  originalPlan: WorkoutPlanData,
  feedback: string
): { updatedPlan: WorkoutPlanData; changeSummary: string } {
  const lowerFb = feedback.toLowerCase();
  const newDays = JSON.parse(JSON.stringify(originalPlan.days)) as WorkoutPlanData['days'];
  let changeSummary = `Successfully updated your plan based on: "${feedback}".`;

  if (lowerFb.includes('cardio') || lowerFb.includes('aerobic') || lowerFb.includes('run')) {
    changeSummary = 'Added targeted cardio intervals, increased warm-up heart rate elevation, and added a dedicated 20-minute cardio conditioning block.';
    newDays.forEach((d) => {
      if (!d.isRestDay) {
        d.exercises.push({
          name: 'Cardio Finisher: HIIT Treadmill / Jump Rope Sprints',
          sets: 4,
          repsOrDuration: '30s sprint / 30s rest',
          restSeconds: 30,
          tips: 'Give maximum effort on the sprint intervals to boost VO2 max',
          targetMuscles: ['Cardiovascular System', 'Full Body'],
        });
        d.estimatedDurationMinutes += 8;
      }
    });
  } else if (lowerFb.includes('yoga') || lowerFb.includes('stretch') || lowerFb.includes('flexib')) {
    changeSummary = 'Incorporated restorative Vinyasa yoga flows, deep hip mobility openers, and lengthened static cool-downs across all 7 days.';
    newDays[2].dayName = 'Day 3: Restorative Yoga & Hip Mobility';
    newDays[2].focus = 'Vinyasa Flow, Hip Openers & Balance';
    newDays[2].isRestDay = true;
    newDays[2].exercises = [
      {
        name: 'Sun Salutations Flow (Surya Namaskar A & B)',
        sets: 4,
        repsOrDuration: '5 breath cycles each',
        restSeconds: 30,
        tips: 'Synchronize breath with movement: inhale to expand, exhale to fold',
        targetMuscles: ['Full Body', 'Flexibility', 'Spine'],
      },
      {
        name: 'Pigeon Pose & Deep Dragon Low Lunge',
        sets: 3,
        repsOrDuration: '60s per side',
        restSeconds: 15,
        tips: 'Keep hips square and breathe into tight gluteal/hip flexor tissue',
        targetMuscles: ['Hips', 'Glutes', 'Iliopsoas'],
      },
    ];
  } else if (lowerFb.includes('reduce') || lowerFb.includes('less intense') || lowerFb.includes('easier') || lowerFb.includes('light')) {
    changeSummary = 'Scaled down overall workout volume, lengthened rest periods between sets by 25%, and adjusted exercises for safer joint load.';
    newDays.forEach((d) => {
      if (!d.isRestDay) {
        d.estimatedDurationMinutes = Math.max(25, d.estimatedDurationMinutes - 10);
        d.exercises.forEach((ex) => {
          ex.sets = Math.max(2, ex.sets - 1);
          ex.restSeconds = Math.round(ex.restSeconds * 1.25);
        });
      }
    });
  } else if (lowerFb.includes('rest') || lowerFb.includes('recovery')) {
    changeSummary = 'Added an extra dedicated restorative rest day on Day 5 and lightened midweek strain to prevent fatigue accumulation.';
    newDays[4].isRestDay = true;
    newDays[4].dayName = 'Day 5: Gentle Recovery & Mindful Breathing';
    newDays[4].focus = 'Active Rest & Recovery';
    newDays[4].estimatedDurationMinutes = 20;
    newDays[4].exercises = [
      {
        name: 'Relaxing 20-min Nature Walk',
        sets: 1,
        repsOrDuration: '20 mins',
        restSeconds: 0,
        tips: 'Keep effort low and enjoy natural surroundings',
        targetMuscles: ['Cardiovascular', 'Mind'],
      },
    ];
  } else if (lowerFb.includes('30 min') || lowerFb.includes('time') || lowerFb.includes('short')) {
    changeSummary = 'Condensed sessions into high-efficiency 30-minute supersets, eliminating downtime while preserving training stimulus.';
    newDays.forEach((d) => {
      d.estimatedDurationMinutes = 30;
      if (!d.isRestDay && d.exercises.length > 3) {
        d.exercises = d.exercises.slice(0, 3);
      }
    });
  } else if (lowerFb.includes('upper') || lowerFb.includes('arms') || lowerFb.includes('chest')) {
    changeSummary = 'Shifted training split to place heavy emphasis on upper body push/pull mechanics, shoulder posture, and arm development.';
    newDays[3].dayName = 'Day 4: Upper Body Hypertrophy & Arms';
    newDays[3].focus = 'Chest, Lats, Triceps & Biceps';
    newDays[3].exercises.push({
      name: 'Incline Dumbbell Bicep Curls & Skullcrushers Superset',
      sets: 3,
      repsOrDuration: '10-12 reps',
      restSeconds: 60,
      tips: 'Keep elbows strictly stationary to isolate biceps and triceps',
      targetMuscles: ['Biceps', 'Triceps'],
    });
  }

  const updatedPlan: WorkoutPlanData = {
    ...originalPlan,
    planTitle: `${originalPlan.planTitle} (Updated)`,
    weeklyGoalSummary: `${originalPlan.weeklyGoalSummary} [Refinement: ${changeSummary}]`,
    days: newDays,
  };

  return { updatedPlan, changeSummary };
}
