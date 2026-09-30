import React, { useState } from 'react';
import {
  Sparkles,
  User,
  Hash,
  Scale,
  Calendar,
  Flame,
  Dumbbell,
  Target,
  Zap,
  Activity,
  CheckCircle2,
  AlertCircle,
  Wand2,
} from 'lucide-react';
import { UserProfile, WorkoutPlanData } from '../types.js';

interface PlanGeneratorProps {
  onPlanGenerated: (data: {
    planId: number;
    user: any;
    plan: WorkoutPlanData;
    version: number;
  }) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  error: string | null;
  setError: (val: string | null) => void;
}

const FITNESS_GOALS = [
  {
    id: 'Weight Loss & Fat Burn',
    title: 'Weight Loss & Fat Burn',
    desc: 'High metabolic output, cardio-conditioning & calorie-dense supersets',
    icon: Flame,
    color: 'from-amber-500/20 to-orange-500/10 border-orange-500/30 text-orange-400',
  },
  {
    id: 'Muscle Hypertrophy & Strength',
    title: 'Muscle Gain & Strength',
    desc: 'Progressive overload, compound movements & hypertrophy volume',
    icon: Dumbbell,
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
  },
  {
    id: 'Athletic Conditioning & Endurance',
    title: 'Athletic Endurance',
    desc: 'VO2 max conditioning, stamina, agility & sustained work capacity',
    icon: Zap,
    color: 'from-blue-500/20 to-cyan-500/10 border-cyan-500/30 text-cyan-400',
  },
  {
    id: 'Tone, Mobility & Posture',
    title: 'Tone & Mobility',
    desc: 'Joint resilience, core stability, Pilates-style control & deep posture',
    icon: Activity,
    color: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400',
  },
  {
    id: 'General Health & Longevity',
    title: 'General Longevity',
    desc: 'Cardiovascular health, functional movement patterns & stress recovery',
    icon: Target,
    color: 'from-teal-500/20 to-emerald-500/10 border-teal-500/30 text-teal-400',
  },
];

const INTENSITY_LEVELS = [
  { id: 'Low', label: 'Low', subtitle: '2-3 days, low joint stress' },
  { id: 'Moderate', label: 'Moderate', subtitle: '3-4 days, balanced pace' },
  { id: 'High', label: 'High', subtitle: '4-5 days, progressive overload' },
  { id: 'Extreme', label: 'Extreme', subtitle: '5-6 days, high athletic volume' },
];

const QUICK_PREFERENCES = [
  'Full Gym & Free Weights',
  'Home Dumbbells & Bench',
  'Bodyweight & Calisthenics Only',
  'Outdoor Cardio & Running',
  'Low Impact / No Jumping',
  'Under 45 Minutes Sessions',
];

const PRESETS = [
  {
    label: 'Sarah • Fat Loss & Tone',
    data: {
      name: 'Sarah Connor',
      userId: 'sarah_fitness',
      age: 32,
      weightKg: 64,
      fitnessGoal: 'Weight Loss & Fat Burn',
      intensity: 'High' as const,
      experienceLevel: 'Intermediate' as const,
      preferences: 'Home Dumbbells & Bench, Low Impact / No Jumping',
    },
  },
  {
    label: 'Marcus • Muscle Hypertrophy',
    data: {
      name: 'Marcus Vance',
      userId: 'marcus_gains',
      age: 27,
      weightKg: 82,
      fitnessGoal: 'Muscle Hypertrophy & Strength',
      intensity: 'High' as const,
      experienceLevel: 'Advanced' as const,
      preferences: 'Full Gym & Free Weights',
    },
  },
  {
    label: 'David • Longevity & Mobility',
    data: {
      name: 'David Miller',
      userId: 'david_m45',
      age: 46,
      weightKg: 79,
      fitnessGoal: 'Tone, Mobility & Posture',
      intensity: 'Moderate' as const,
      experienceLevel: 'Beginner' as const,
      preferences: 'Bodyweight & Calisthenics Only, Under 45 Minutes Sessions',
    },
  },
];

export const PlanGenerator: React.FC<PlanGeneratorProps> = ({
  onPlanGenerated,
  isLoading,
  setIsLoading,
  error,
  setError,
}) => {
  const [formData, setFormData] = useState<UserProfile>({
    name: 'Alex Rivera',
    userId: 'alex_fit_01',
    age: 29,
    weightKg: 72,
    fitnessGoal: 'Muscle Hypertrophy & Strength',
    intensity: 'High',
    experienceLevel: 'Intermediate',
    preferences: 'Full Gym & Free Weights',
  });

  const [customPref, setCustomPref] = useState('');

  const autoGenerateUserId = () => {
    const clean = formData.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15);
    const rand = Math.floor(100 + Math.random() * 900);
    setFormData((prev) => ({ ...prev, userId: `${clean || 'user'}_${rand}` }));
  };

  const handlePresetSelect = (preset: typeof PRESETS[0]) => {
    setFormData(preset.data);
    setError(null);
  };

  const toggleQuickPref = (pref: string) => {
    const current = formData.preferences || '';
    const prefsList = current ? current.split(', ').filter(Boolean) : [];
    if (prefsList.includes(pref)) {
      const filtered = prefsList.filter((p) => p !== pref);
      setFormData((prev) => ({ ...prev, preferences: filtered.join(', ') }));
    } else {
      prefsList.push(pref);
      setFormData((prev) => ({ ...prev, preferences: prefsList.join(', ') }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Please provide your name.');
      return;
    }
    if (!formData.userId.trim()) {
      setError('Please provide a unique User ID.');
      return;
    }
    if (formData.age < 12 || formData.age > 110) {
      setError('Age must be between 12 and 110.');
      return;
    }
    if (formData.weightKg < 25 || formData.weightKg > 300) {
      setError('Weight must be between 25 kg and 300 kg.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate workout plan');
      }

      onPlanGenerated({
        planId: data.planId,
        user: data.user,
        plan: data.plan,
        version: data.version,
      });
    } catch (err: unknown) {
      console.error('Plan generation failed:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while generating the plan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Top Banner & Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Gemini-Powered Fitness Engine</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Generate Your Precision <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">7-Day Workout Plan</span>
        </h1>
        <p className="text-zinc-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          Input your biometric stats, fitness targets, and intensity preferences. Our AI coach engineers a complete week of calibrated training, progressive loads, and nutrition insights.
        </p>

        {/* Quick Sample Presets */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-zinc-500 font-medium">Quick Presets:</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              className="text-xs px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-all"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl text-red-200 text-sm flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-red-300">Action Required</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-8 shadow-xl backdrop-blur-sm">
        {/* Section 1: Biometric Identity */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-zinc-800/80 pb-3">
            <User className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-zinc-100">1. User Identification & Biometrics</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Full Name <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Alex Rivera"
                  className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60"
                />
              </div>
            </div>

            {/* User ID */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  User ID (Database Key) <span className="text-emerald-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={autoGenerateUserId}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                >
                  <Wand2 className="h-3 w-3" />
                  <span>Auto-Gen</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  placeholder="e.g. alex_fitness"
                  className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 font-mono placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60"
                />
              </div>
            </div>

            {/* Age */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Age (Years) <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="12"
                  max="110"
                  required
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                  className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60"
                />
              </div>
            </div>

            {/* Weight in kg */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Weight in kg <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="20"
                  max="350"
                  required
                  value={formData.weightKg}
                  onChange={(e) => setFormData({ ...formData, weightKg: Number(e.target.value) })}
                  className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Fitness Goal */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-zinc-800/80 pb-3">
            <Target className="h-5 w-5 text-teal-400" />
            <h2 className="text-base font-semibold text-zinc-100">2. Primary Fitness Goal</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FITNESS_GOALS.map((goal) => {
              const Icon = goal.icon;
              const isSelected = formData.fitnessGoal === goal.id;
              return (
                <div
                  key={goal.id}
                  onClick={() => setFormData({ ...formData, fitnessGoal: goal.id })}
                  className={`cursor-pointer rounded-xl p-4 border transition-all relative ${
                    isSelected
                      ? `bg-zinc-800/90 border-emerald-500/60 shadow-lg shadow-emerald-500/10`
                      : 'bg-zinc-950/40 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/40'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg bg-zinc-900 border border-zinc-800 ${isSelected ? 'text-emerald-400' : 'text-zinc-400'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-zinc-100 flex items-center justify-between">
                        <span>{goal.title}</span>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-snug">{goal.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Intensity & Experience */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-zinc-800/80 pb-3">
            <Flame className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-semibold text-zinc-100">3. Workout Intensity & Experience</h2>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">
              Target Workout Intensity
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {INTENSITY_LEVELS.map((lvl) => {
                const isSelected = formData.intensity === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, intensity: lvl.id as any })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-sm'
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <div className="text-sm font-bold flex items-center justify-between">
                      <span>{lvl.label}</span>
                      {isSelected && <span className="h-2 w-2 rounded-full bg-emerald-400"></span>}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{lvl.subtitle}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-medium text-zinc-300 mb-2">
              Fitness Experience Level (Optional)
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(['Beginner', 'Intermediate', 'Advanced'] as const).map((exp) => {
                const isSelected = formData.experienceLevel === exp;
                return (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => setFormData({ ...formData, experienceLevel: exp })}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-zinc-800 border-zinc-600 text-emerald-400 font-semibold'
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {exp}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 4: Equipment & Preferences */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-zinc-800/80 pb-3">
            <Dumbbell className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-zinc-100">4. Workout Preferences & Equipment (Optional)</h2>
          </div>

          {/* Quick preference toggle tags */}
          <div className="flex flex-wrap gap-2">
            {QUICK_PREFERENCES.map((pref) => {
              const active = (formData.preferences || '').includes(pref);
              return (
                <button
                  key={pref}
                  type="button"
                  onClick={() => toggleQuickPref(pref)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    active
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-medium'
                      : 'bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  {active ? '✓ ' : '+ '}
                  {pref}
                </button>
              );
            })}
          </div>

          {/* Text Area for Specific Notes */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Specific notes or constraints (e.g., knee sensitivity, access to pull-up bar, preferred training time)
            </label>
            <input
              type="text"
              value={formData.preferences || ''}
              onChange={(e) => setFormData({ ...formData, preferences: e.target.value })}
              placeholder="e.g. Full Gym & Free Weights, avoid heavy overhead squats due to shoulder tightness"
              className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-4 px-6 rounded-xl font-bold text-base flex items-center justify-center space-x-2 shadow-xl transition-all ${
              isLoading
                ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed border border-zinc-700'
                : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-zinc-950 hover:shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center space-x-3">
                <div className="h-5 w-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
                <span>Crafting Your 7-Day Plan with Gemini AI...</span>
              </div>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                <span>Generate 7-Day Workout & Nutrition Plan</span>
              </>
            )}
          </button>
          <p className="text-center text-xs text-zinc-500 mt-2.5">
            Plans are stored in local SQLite database for future retrieval, feedback updates, and admin inspection.
          </p>
        </div>
      </form>
    </div>
  );
};
