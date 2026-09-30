import React, { useState } from 'react';
import {
  CalendarDays,
  Clock,
  Dumbbell,
  Flame,
  CheckCircle2,
  Share2,
  Printer,
  Sparkles,
  MessageSquare,
  ArrowRight,
  Salad,
  BedDouble,
  ChevronRight,
  ShieldAlert,
  History,
  Check,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { WorkoutPlanData, DayWorkoutPlan } from '../types.js';
import { RestTimer } from './RestTimer.js';

interface PlanViewProps {
  planId: number;
  plan: WorkoutPlanData;
  user: any;
  version: number;
  changeSummary?: string;
  onPlanUpdated: (updatedData: {
    newPlanId: number;
    plan: WorkoutPlanData;
    version: number;
    changeSummary: string;
    previousPlanId: number;
  }) => void;
  planHistory?: Array<{ id: number; version: number; plan: WorkoutPlanData; changeSummary?: string }>;
  onSelectVersion?: (item: { id: number; version: number; plan: WorkoutPlanData; changeSummary?: string }) => void;
}

const FEEDBACK_SUGGESTIONS = [
  'Add more cardio',
  'Reduce workout intensity',
  'Include more rest days',
  'Add yoga',
  'Focus more on upper body',
  'I have only 30 minutes per day',
  'Switch to bodyweight exercises',
  'Increase core and ab work',
];

export const PlanView: React.FC<PlanViewProps> = ({
  planId,
  plan,
  user,
  version,
  changeSummary,
  onPlanUpdated,
  planHistory = [],
  onSelectVersion,
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [completedDays, setCompletedDays] = useState<Record<number, boolean>>({});
  const [feedbackText, setFeedbackText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTimerSeconds, setActiveTimerSeconds] = useState<number | null>(null);

  const days = plan.days || [];
  const currentDay: DayWorkoutPlan | undefined = days[selectedDayIndex] || days[0];

  const toggleDayCompletion = (dayNum: number) => {
    setCompletedDays((prev) => ({
      ...prev,
      [dayNum]: !prev[dayNum],
    }));
  };

  const handleCopyPlan = () => {
    let text = `${plan.planTitle} (Version ${version})\n`;
    text += `Target Goal: ${user?.fitness_goal || user?.fitnessGoal || 'Fitness'}\n`;
    text += `Intensity: ${plan.targetIntensity}\n\n`;
    text += `Summary: ${plan.weeklyGoalSummary}\n\n`;

    days.forEach((d) => {
      text += `=== ${d.dayName} (${d.estimatedDurationMinutes}m) ===\n`;
      text += `Focus: ${d.focus} ${d.isRestDay ? '[REST/RECOVERY]' : ''}\n`;
      text += `Warmup: ${d.warmup}\n`;
      d.exercises.forEach((ex, idx) => {
        text += `  ${idx + 1}. ${ex.name} - ${ex.sets} sets x ${ex.repsOrDuration} (Rest: ${ex.restSeconds}s)\n`;
      });
      text += `Cooldown: ${d.cooldown}\n\n`;
    });

    text += `Nutrition Tip: ${plan.nutritionTip}\n`;
    text += `Recovery Tip: ${plan.recoveryTip}\n`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const response = await fetch('/api/update-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          feedback: feedbackText.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update plan based on feedback');
      }

      setFeedbackText('');
      onPlanUpdated({
        newPlanId: data.newPlanId,
        plan: data.plan,
        version: data.version,
        changeSummary: data.changeSummary,
        previousPlanId: data.previousPlanId,
      });
    } catch (err: unknown) {
      console.error('Feedback update error:', err);
      setUpdateError(err instanceof Error ? err.message : 'Error updating plan');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Top Header Card */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-6">
        {/* Meta Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold font-mono">
              Plan #{planId}
            </span>
            <span className="px-2.5 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-bold">
              Version {version}
            </span>
            <span className="text-xs text-zinc-400">
              User: <span className="font-mono text-zinc-200">{user?.name || 'Athlete'} ({user?.user_id || user?.userId})</span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyPlan}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition-all"
              title="Copy entire plan to clipboard"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Plan'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition-all"
              title="Print or Save as PDF"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Plan Title & Summary */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {plan.planTitle}
          </h1>
          <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
            {plan.weeklyGoalSummary}
          </p>
        </div>

        {/* Version History Chips if available */}
        {planHistory.length > 1 && (
          <div className="flex items-center space-x-2 pt-1 border-t border-zinc-800/60">
            <div className="flex items-center space-x-1 text-xs text-zinc-400">
              <History className="h-3.5 w-3.5 text-zinc-400" />
              <span>Version History:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {planHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectVersion && onSelectVersion(item)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-mono font-medium transition-all ${
                    item.version === version
                      ? 'bg-emerald-500 text-zinc-950 font-bold shadow'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  v{item.version}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Change summary banner if this is an updated plan */}
        {changeSummary && (
          <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs sm:text-sm flex items-start space-x-2.5">
            <Sparkles className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-300">Feedback Changes Applied: </span>
              {changeSummary}
            </div>
          </div>
        )}
      </div>

      {/* 7-Day Day Selector Strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1 font-medium">
          <span>7-Day Workout Schedule</span>
          <span>Click a day to view exercises</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {days.map((dayItem, idx) => {
            const isSelected = selectedDayIndex === idx;
            const isDone = completedDays[dayItem.day];
            return (
              <button
                key={dayItem.day}
                onClick={() => setSelectedDayIndex(idx)}
                className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between min-h-[92px] ${
                  isSelected
                    ? 'bg-zinc-800 border-emerald-500 shadow-md shadow-emerald-500/10'
                    : isDone
                    ? 'bg-zinc-900/90 border-emerald-500/40'
                    : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-zinc-300">
                      Day {dayItem.day}
                    </span>
                    {dayItem.isRestDay ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                        Rest
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400 flex items-center space-x-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{dayItem.estimatedDurationMinutes}m</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-zinc-100 mt-1.5 line-clamp-1">
                    {dayItem.focus}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[10px] text-zinc-400">
                    {dayItem.exercises?.length || 0} exercises
                  </div>
                  {isDone && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Day Detail Display */}
      {currentDay && (
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Day Title Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-emerald-400">
                  Day {currentDay.day} of 7
                </span>
                {currentDay.isRestDay && (
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Active Recovery Protocol
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                {currentDay.dayName}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                Primary Focus: <span className="text-emerald-400 font-medium">{currentDay.focus}</span> • Estimated Duration: {currentDay.estimatedDurationMinutes} minutes
              </p>
            </div>

            <button
              onClick={() => toggleDayCompletion(currentDay.day)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                completedDays[currentDay.day]
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{completedDays[currentDay.day] ? 'Workout Completed ✓' : 'Mark Day as Completed'}</span>
            </button>
          </div>

          {/* Dynamic Warm-up */}
          <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 space-y-1">
            <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Flame className="h-4 w-4" />
              <span>Dynamic Warm-Up Routine</span>
            </div>
            <p className="text-sm text-zinc-200 leading-relaxed">
              {currentDay.warmup}
            </p>
          </div>

          {/* Rest Timer Widget if triggered */}
          {activeTimerSeconds !== null && (
            <RestTimer
              initialSeconds={activeTimerSeconds}
              onClose={() => setActiveTimerSeconds(null)}
            />
          )}

          {/* Exercise Cards */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
              <span>Main Workout Progression ({currentDay.exercises?.length || 0} Movements)</span>
              <span className="text-[11px] text-zinc-500">Tap timer to start rest clock</span>
            </div>

            <div className="space-y-3">
              {currentDay.exercises?.map((ex, exIdx) => (
                <div
                  key={ex.name + exIdx}
                  className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 sm:p-5 hover:border-zinc-700 transition-all space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center font-mono">
                          {exIdx + 1}
                        </span>
                        <h3 className="text-base font-bold text-zinc-100">{ex.name}</h3>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {ex.targetMuscles?.map((muscle) => (
                          <span
                            key={muscle}
                            className="px-2 py-0.5 text-[10px] rounded bg-zinc-800 text-zinc-300 font-medium"
                          >
                            {muscle}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-400 font-mono">
                          {ex.sets} sets × {ex.repsOrDuration}
                        </span>
                        <div className="text-[11px] text-zinc-500">
                          {ex.restSeconds}s rest
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTimerSeconds(ex.restSeconds || 60)}
                        className="px-2.5 py-1.5 bg-zinc-800 hover:bg-emerald-500/20 hover:text-emerald-400 text-zinc-400 rounded-lg text-xs font-medium transition-all flex items-center space-x-1"
                        title="Open rest timer"
                      >
                        <Clock className="h-3 w-3" />
                        <span>Timer</span>
                      </button>
                    </div>
                  </div>

                  {/* Form & Biomechanics Tip */}
                  <div className="text-xs text-zinc-400 bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800/80 flex items-start space-x-2">
                    <span className="font-semibold text-zinc-300 shrink-0">Cue:</span>
                    <span className="leading-relaxed">{ex.tips}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cooldown Routine */}
          <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-4 space-y-1">
            <div className="flex items-center space-x-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
              <Activity className="h-4 w-4" />
              <span>Cool-Down & Joint Decompression</span>
            </div>
            <p className="text-sm text-zinc-200 leading-relaxed">
              {currentDay.cooldown}
            </p>
          </div>
        </div>
      )}

      {/* Dual Insights: Nutrition & Recovery */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nutrition Card */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Salad className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Targeted Nutrition Guidance</h3>
              <p className="text-xs text-zinc-400">Calibrated for {user?.weight_kg || user?.weightKg || 'athlete'} kg & {user?.fitness_goal || user?.fitnessGoal}</p>
            </div>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/80">
            {plan.nutritionTip}
          </p>
        </div>

        {/* Recovery Card */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <BedDouble className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Sleep & Regeneration Protocol</h3>
              <p className="text-xs text-zinc-400">Soreness mitigation & central nervous recovery</p>
            </div>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/80">
            {plan.recoveryTip}
          </p>
        </div>
      </div>

      {/* Plan Refinement & Feedback Loop */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Iterative Feedback & Plan Refinement Loop
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Need changes? Provide feedback and Gemini AI will recalibrate your 7-day schedule while preserving your profile.
            </p>
          </div>
        </div>

        {/* Quick Feedback Chips */}
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-2">
            Suggested Adjustments (Click to apply):
          </label>
          <div className="flex flex-wrap gap-2">
            {FEEDBACK_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setFeedbackText(suggestion)}
                className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/80 text-zinc-200 transition-all"
              >
                + {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Input Form */}
        <form onSubmit={handleFeedbackSubmit} className="space-y-4">
          <div>
            <textarea
              required
              rows={3}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="e.g. Add more cardio on Day 4, include yoga on rest days, reduce sets for legs because my knees are sore..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/60"
            />
          </div>

          {updateError && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-red-200 text-xs">
              {updateError}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              Saves updated plan as Version {version + 1} in SQLite database
            </span>
            <button
              type="submit"
              disabled={isUpdating || !feedbackText.trim()}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center space-x-2 transition-all shadow-lg ${
                isUpdating || !feedbackText.trim()
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                  : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-zinc-950 hover:shadow-teal-500/20 active:scale-95'
              }`}
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Refining Plan with Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Update Plan with Feedback</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
