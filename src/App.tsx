/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { PlanGenerator } from './components/PlanGenerator.js';
import { PlanView } from './components/PlanView.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { WorkoutPlanData } from './types.js';
import { Dumbbell, ShieldCheck, Cpu, Database } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'generator' | 'plan' | 'admin'>('generator');
  const [currentPlan, setCurrentPlan] = useState<WorkoutPlanData | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [changeSummary, setChangeSummary] = useState<string | undefined>(undefined);
  const [planHistory, setPlanHistory] = useState<
    Array<{ id: number; version: number; plan: WorkoutPlanData; changeSummary?: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geminiModel, setGeminiModel] = useState<string>('gemini-3.8-flash');

  useEffect(() => {
    // Check API status & model configuration
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.geminiModel) {
          setGeminiModel(data.geminiModel);
        }
      })
      .catch((err) => {
        console.warn('Could not contact API config:', err);
      });
  }, []);

  const handlePlanGenerated = (data: {
    planId: number;
    user: any;
    plan: WorkoutPlanData;
    version: number;
  }) => {
    setCurrentPlan(data.plan);
    setCurrentPlanId(data.planId);
    setCurrentUser(data.user);
    setCurrentVersion(data.version);
    setChangeSummary(undefined);
    setPlanHistory([
      {
        id: data.planId,
        version: data.version,
        plan: data.plan,
      },
    ]);
    setActiveTab('plan');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlanUpdated = (data: {
    newPlanId: number;
    plan: WorkoutPlanData;
    version: number;
    changeSummary: string;
    previousPlanId: number;
  }) => {
    setCurrentPlan(data.plan);
    setCurrentPlanId(data.newPlanId);
    setCurrentVersion(data.version);
    setChangeSummary(data.changeSummary);
    setPlanHistory((prev) => [
      ...prev,
      {
        id: data.newPlanId,
        version: data.version,
        plan: data.plan,
        changeSummary: data.changeSummary,
      },
    ]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectVersion = (item: {
    id: number;
    version: number;
    plan: WorkoutPlanData;
    changeSummary?: string;
  }) => {
    setCurrentPlan(item.plan);
    setCurrentPlanId(item.id);
    setCurrentVersion(item.version);
    setChangeSummary(item.changeSummary);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasActivePlan={Boolean(currentPlan && currentPlanId)}
        activePlanTitle={currentPlan?.planTitle}
        geminiModel={geminiModel}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'generator' && (
          <PlanGenerator
            onPlanGenerated={handlePlanGenerated}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            error={error}
            setError={setError}
          />
        )}

        {activeTab === 'plan' && currentPlan && currentPlanId && (
          <PlanView
            planId={currentPlanId}
            plan={currentPlan}
            user={currentUser}
            version={currentVersion}
            changeSummary={changeSummary}
            onPlanUpdated={handlePlanUpdated}
            planHistory={planHistory}
            onSelectVersion={handleSelectVersion}
          />
        )}

        {activeTab === 'admin' && <AdminDashboard />}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/90 py-6 mt-12 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Dumbbell className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-zinc-300">FitBuddy AI Fitness Architect</span>
            <span>•</span>
            <span>Free Tier Compatible</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span className="flex items-center space-x-1">
              <Cpu className="h-3 w-3 text-emerald-400" />
              <span>Model: {geminiModel}</span>
            </span>
            <span className="flex items-center space-x-1">
              <Database className="h-3 w-3 text-teal-400" />
              <span>Storage: Local SQLite</span>
            </span>
            <span className="flex items-center space-x-1">
              <ShieldCheck className="h-3 w-3 text-blue-400" />
              <span>Data Protection</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
