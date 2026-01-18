'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Settings() {
  const [user, setUser] = useState({ email: '', username: '' });
  const [settings, setSettings] = useState({
    emailNotifications: true,
    streakReminders: true,
    dailyGoal: 10,
    theme: 'auto',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) {
          setLoading(false);
          return;
        }

        setUser({
          email: authUser.email || '',
          username: authUser.user_metadata?.name || '',
        });

        // Note: You may want to create a settings table in Supabase to store these preferences
        // For now, we're using local state
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      // Save settings (you'll need to implement this in your backend/database)
      // For now, just show a success message
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800">
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-8">Settings</h1>

        {message && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg">
            {message}
          </div>
        )}

        {/* Account Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Account</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-600 cursor-not-allowed"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Your email cannot be changed</p>
            </div>
          </div>
        </div>

        {/* Learning Preferences */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Learning Preferences</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Daily Goal</label>
              <select
                value={settings.dailyGoal}
                onChange={(e) => setSettings({ ...settings, dailyGoal: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-600"
              >
                <option value={5}>5 characters per day</option>
                <option value={10}>10 characters per day</option>
                <option value={20}>20 characters per day</option>
                <option value={50}>50 characters per day</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-600"
              >
                <option value="auto">Auto (System)</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Notifications</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Email Notifications</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Receive updates about achievements and milestones</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
                  {settings.emailNotifications ? 'On' : 'Off'}
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Streak Reminders</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Get reminded to practice to maintain your streak</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.streakReminders}
                  onChange={(e) => setSettings({ ...settings, streakReminders: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
                  {settings.streakReminders ? 'On' : 'Off'}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Privacy & Security</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <p className="font-semibold text-slate-900 dark:text-white mb-2">Profile Visibility</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Your profile is visible on the leaderboard</p>
              <button className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-600 rounded-lg transition">
                Make Private
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <p className="font-semibold text-slate-900 dark:text-white mb-2">Data Export</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Download all your learning data</p>
              <button className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-600 rounded-lg transition">
                Export Data
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 dark:bg-red-900/30 rounded-2xl p-8 shadow-xl border-2 border-red-200 dark:border-red-800">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-6">Danger Zone</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-lg">
              <p className="font-semibold text-slate-900 dark:text-white mb-2">Delete Account</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-8 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button className="px-8 py-3 border-2 border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 font-semibold rounded-lg hover:bg-red-50 dark:hover:bg-slate-700 transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
