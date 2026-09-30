import React from 'react';
import { Dumbbell, Sparkles, Shield, CalendarDays, Activity } from 'lucide-react';

interface NavbarProps {
  activeTab: 'generator' | 'plan' | 'admin';
  setActiveTab: (tab: 'generator' | 'plan' | 'admin') => void;
  hasActivePlan: boolean;
  activePlanTitle?: string;
  geminiModel?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  hasActivePlan,
  activePlanTitle,
  geminiModel = 'gemini-3.8-flash',
}) => {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/85 backdrop-blur-md border-b border-zinc-800 text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => setActiveTab('generator')}
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-zinc-900 rounded-[10px] flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                  FitBuddy
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">7-Day Workout & Nutrition Architect</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('generator')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'generator'
                  ? 'bg-zinc-800 text-emerald-400 border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>Create Plan</span>
            </button>

            <button
              onClick={() => setActiveTab('plan')}
              disabled={!hasActivePlan}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'plan'
                  ? 'bg-zinc-800 text-teal-400 border border-zinc-700 shadow-sm'
                  : hasActivePlan
                  ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  : 'text-zinc-600 cursor-not-allowed opacity-50'
              }`}
              title={hasActivePlan ? 'View generated workout plan' : 'Generate a plan first'}
            >
              <CalendarDays className="h-4 w-4 text-teal-400" />
              <span className="hidden sm:inline">Workout Plan</span>
              <span className="sm:hidden">Plan</span>
              {hasActivePlan && (
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'admin'
                  ? 'bg-zinc-800 text-amber-400 border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Shield className="h-4 w-4 text-amber-400" />
              <span className="hidden sm:inline">Admin Dashboard</span>
              <span className="sm:hidden">Admin</span>
            </button>
          </nav>

          {/* Model & DB Indicator */}
          <div className="hidden md:flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-300">
              <Activity className="h-3 w-3 text-emerald-400 animate-pulse" />
              <span className="font-mono text-[11px] text-zinc-400">{geminiModel}</span>
            </div>
            <div className="flex items-center space-x-1 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
              <span>SQLite</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
