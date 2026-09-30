import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  CalendarDays,
  MessageSquare,
  Search,
  Trash2,
  Eye,
  RefreshCw,
  Download,
  AlertTriangle,
  X,
  CheckCircle,
  Database,
  Flame,
  ArrowUpRight,
  Activity,
  Layers,
} from 'lucide-react';
import { AdminStats, StoredPlanRecord, DayWorkoutPlan } from '../types.js';

interface AdminDashboardProps {
  onLoadPlanToMainView?: (planData: any) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLoadPlanToMainView }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<StoredPlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlanModal, setSelectedPlanModal] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'plan' | 'user';
    id: number | string;
    title: string;
  } | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, dataRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/data'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (dataRes.ok) {
        const dataJson = await dataRes.json();
        setUsers(dataJson.users || []);
        setPlans(dataJson.plans || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const openPlanDetails = async (planId: number) => {
    setModalLoading(true);
    setSelectedPlanModal({ id: planId });
    try {
      const res = await fetch(`/api/plans/${planId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPlanModal(data);
      }
    } catch (err) {
      console.error('Error fetching plan details:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirmation) return;

    try {
      if (deleteConfirmation.type === 'plan') {
        const res = await fetch(`/api/admin/plans/${deleteConfirmation.id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setActionSuccess(`Workout plan #${deleteConfirmation.id} deleted successfully.`);
          setPlans((prev) => prev.filter((p) => p.id !== deleteConfirmation.id));
        }
      } else {
        const res = await fetch(`/api/admin/users/${deleteConfirmation.id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setActionSuccess(`User ${deleteConfirmation.id} and associated plans deleted.`);
          setUsers((prev) => prev.filter((u) => u.user_id !== deleteConfirmation.id));
          setPlans((prev) => prev.filter((p) => p.user_id !== deleteConfirmation.id));
        }
      }
      setDeleteConfirmation(null);
      // Refresh stats
      const statsRes = await fetch('/api/admin/stats');
      if (statsRes.ok) setStats(await statsRes.json());
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.error('Delete operation failed:', err);
    }
  };

  const handleExportJson = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      stats,
      users,
      plans,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitbuddy_database_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredPlans = plans.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.plan_name.toLowerCase().includes(q) ||
      p.user_id.toLowerCase().includes(q) ||
      (p.user_name && p.user_name.toLowerCase().includes(q)) ||
      (p.fitness_goal && p.fitness_goal.toLowerCase().includes(q))
    );
  });

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.user_id.toLowerCase().includes(q) ||
      u.fitness_goal.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-4">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Shield className="h-3.5 w-3.5" />
            <span>SQLite Database Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Administrator Dashboard
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm">
            Inspect all stored athlete profiles, 7-day workout plans, feedback history logs, and database metrics.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium transition-all"
            title="Refresh database records"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportJson}
            className="flex items-center space-x-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 rounded-xl text-xs font-medium transition-all border border-zinc-700"
            title="Download full database JSON export"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Backup</span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Users</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white mt-2 font-mono">
            {stats?.totalUsers ?? '...'}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Saved in SQLite database</p>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Workout Plans</span>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white mt-2 font-mono">
            {stats?.totalPlans ?? '...'}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Total 7-day programs</p>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Feedback Revisions</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white mt-2 font-mono">
            {stats?.totalFeedback ?? '...'}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">User-requested refinements</p>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Top Goal</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-white mt-2 line-clamp-1">
            {stats?.goalBreakdown ? Object.keys(stats.goalBreakdown)[0] || 'Varied' : 'None yet'}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Leading fitness objective</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3.5 top-3.5 text-zinc-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by user name, user ID, plan title, or fitness goal..."
          className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
      </div>

      {/* Stored Workout Plans Table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="h-5 w-5 text-teal-400" />
            <h2 className="text-base font-bold text-zinc-100">
              Stored 7-Day Workout Plans ({filteredPlans.length})
            </h2>
          </div>
          <span className="text-xs text-zinc-500">Live SQLite records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-zinc-950/70 border-b border-zinc-800 text-zinc-400 uppercase text-[11px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Plan ID</th>
                <th className="py-3 px-4">Athlete / User ID</th>
                <th className="py-3 px-4">Plan Title</th>
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-4">Goal / Intensity</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    No workout plans found. Create one using the Plan Generator!
                  </td>
                </tr>
              ) : (
                filteredPlans.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      #{p.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-200">{p.user_name || 'Athlete'}</div>
                      <div className="text-[11px] text-zinc-400 font-mono">{p.user_id}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-zinc-200 font-medium">
                      {p.plan_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono text-xs font-bold">
                        v{p.version}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-zinc-300 text-xs">{p.fitness_goal || 'Custom'}</div>
                      <div className="text-[11px] text-zinc-500">{p.intensity || 'Standard'}</div>
                    </td>
                    <td className="py-3 px-4 text-zinc-400 text-xs whitespace-nowrap">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => openPlanDetails(p.id)}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-all"
                          title="Inspect full plan"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirmation({
                              type: 'plan',
                              id: p.id,
                              title: `Workout Plan #${p.id} (${p.plan_name})`,
                            })
                          }
                          className="p-1.5 bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 text-zinc-400 rounded-lg transition-all"
                          title="Delete plan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stored Users Table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-bold text-zinc-100">
              Registered Athletes / Users ({filteredUsers.length})
            </h2>
          </div>
          <span className="text-xs text-zinc-500">Persistent user profiles</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-zinc-950/70 border-b border-zinc-800 text-zinc-400 uppercase text-[11px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Age / Weight</th>
                <th className="py-3 px-4">Primary Goal</th>
                <th className="py-3 px-4">Intensity / Exp</th>
                <th className="py-3 px-4">Preferences</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    No users stored yet.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.user_id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-teal-400">
                      {u.user_id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-200">{u.name}</td>
                    <td className="py-3 px-4 text-zinc-300">
                      {u.age} yo • {u.weight_kg} kg
                    </td>
                    <td className="py-3 px-4 text-zinc-300">{u.fitness_goal}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-medium text-emerald-400">{u.intensity}</span>
                      <span className="text-[11px] text-zinc-500 block">{u.experience_level || 'Intermediate'}</span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400 text-xs max-w-xs truncate">
                      {u.preferences || 'Standard'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() =>
                          setDeleteConfirmation({
                            type: 'user',
                            id: u.user_id,
                            title: `User ${u.name} (${u.user_id}) and all associated workout plans`,
                          })
                        }
                        className="p-1.5 bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 text-zinc-400 rounded-lg transition-all"
                        title="Delete user & plans"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Inspection Modal */}
      {selectedPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  Plan #{selectedPlanModal.plan?.id || selectedPlanModal.id}
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  {selectedPlanModal.plan?.plan_name || 'Workout Plan Inspection'}
                </h3>
                <p className="text-xs text-zinc-400">
                  User: {selectedPlanModal.user?.name} ({selectedPlanModal.user?.user_id})
                </p>
              </div>
              <button
                onClick={() => setSelectedPlanModal(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalLoading ? (
              <div className="py-12 text-center text-zinc-400 space-y-2">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-400" />
                <p>Loading plan data...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Weekly Summary
                  </h4>
                  <p className="text-sm text-zinc-200">
                    {selectedPlanModal.plan?.summary}
                  </p>
                </div>

                {/* 7-Day Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    7-Day Schedule Overview
                  </h4>
                  <div className="space-y-2">
                    {selectedPlanModal.plan?.days?.map((day: DayWorkoutPlan) => (
                      <div
                        key={day.day}
                        className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/80 flex items-start justify-between gap-4"
                      >
                        <div>
                          <div className="font-semibold text-sm text-zinc-100 flex items-center space-x-2">
                            <span>{day.dayName}</span>
                            {day.isRestDay && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                                Rest
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-400 mt-0.5">
                            Focus: {day.focus} • {day.estimatedDurationMinutes} mins
                          </div>
                          <div className="text-xs text-zinc-300 mt-1">
                            {day.exercises?.map((e) => e.name).join(' • ')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Nutrition & Recovery */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                    <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                      Nutrition Tip
                    </h5>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {selectedPlanModal.plan?.nutrition_tip}
                    </p>
                  </div>
                  <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                    <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
                      Recovery Tip
                    </h5>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {selectedPlanModal.plan?.recovery_tip}
                    </p>
                  </div>
                </div>

                {/* Feedback History Chain if any */}
                {selectedPlanModal.feedbackList?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Feedback Revision History
                    </h4>
                    <div className="space-y-2">
                      {selectedPlanModal.feedbackList.map((fb: any) => (
                        <div
                          key={fb.id}
                          className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800 text-xs space-y-1"
                        >
                          <div className="text-zinc-200 font-semibold">
                            "{fb.feedback_text}"
                          </div>
                          {fb.changes_applied_summary && (
                            <div className="text-emerald-400">
                              Applied: {fb.changes_applied_summary}
                            </div>
                          )}
                          <div className="text-[10px] text-zinc-500">
                            {new Date(fb.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-red-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold text-white">Confirm Deletion</h3>
            </div>
            <p className="text-sm text-zinc-300">
              Are you sure you want to permanently delete:
            </p>
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-200">
              {deleteConfirmation.title}
            </div>
            <p className="text-xs text-zinc-500">
              This action cannot be undone and will be permanently removed from the SQLite database.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-red-600/20"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
