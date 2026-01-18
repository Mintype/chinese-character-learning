'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Profile() {
  const [user, setUser] = useState({
    name: 'Learner',
    email: '',
    level: 1,
    mastered: 0,
    learning: 0,
    streak: 0,
    totalPracticed: 0,
    avatar_url: null,
  });
  const [badges, setBadges] = useState<any[]>([]);
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) {
          setLoading(false);
          return;
        }

        // Fetch user profile
        const { data: profileData, error } = await supabase
          .from('user_profile')
          .select('username, level, mastered, learning, streak, total_characters_practiced, avatar_url')
          .eq('user_id', authUser.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          setLoading(false);
          return;
        }

        if (profileData) {
          setUser({
            name: profileData.username || 'Learner',
            email: authUser.email || '',
            level: profileData.level,
            mastered: profileData.mastered,
            learning: profileData.learning,
            streak: profileData.streak,
            totalPracticed: profileData.total_characters_practiced,
            avatar_url: profileData.avatar_url,
          });
          setEditName(profileData.username || '');
          setEditAvatar(profileData.avatar_url || '');
        }

        // Fetch all badges
        const { data: badgesData } = await supabase
          .from('badges')
          .select('*')
          .order('name');

        if (badgesData) {
          setBadges(badgesData);
        }

        // Fetch user's earned badges
        const { data: userBadgesData } = await supabase
          .from('user_badges')
          .select('badge_id, earned_at')
          .eq('user_id', authUser.id);

        if (userBadgesData) {
          setUserBadges(userBadgesData);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) return;

      const { error } = await supabase
        .from('user_profile')
        .update({
          username: editName,
          avatar_url: editAvatar,
        })
        .eq('user_id', authUser.id);

      if (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save profile');
      } else {
        setUser({ ...user, name: editName, avatar_url: editAvatar });
        setIsEditing(false);
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSaving(false);
    }
  };

  const hasEarnedBadge = (badgeId: string) => {
    return userBadges.some(ub => ub.badge_id === badgeId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800">
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Profile Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl mb-8">
          <div className="flex items-center gap-8 mb-8">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900 dark:to-red-800 rounded-full flex items-center justify-center border-4 border-red-200 dark:border-red-700">
                <span className="text-5xl">👤</span>
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">{user.name}</h1>
              <p className="text-slate-600 dark:text-slate-400 mb-4">{user.email}</p>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          </div>

          {/* Edit Form */}
          {isEditing && (
            <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Username</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Avatar URL</label>
                  <input
                    type="text"
                    value={editAvatar}
                    onChange={(e) => setEditAvatar(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="text-sm text-slate-600 dark:text-slate-400 font-semibold mb-2">LEVEL</div>
            <div className="text-4xl font-bold text-red-600 dark:text-red-400">{user.level}</div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="text-sm text-slate-600 dark:text-slate-400 font-semibold mb-2">MASTERED</div>
            <div className="text-4xl font-bold text-green-600 dark:text-green-400">{user.mastered}</div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="text-sm text-slate-600 dark:text-slate-400 font-semibold mb-2">LEARNING</div>
            <div className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">{user.learning}</div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="text-sm text-slate-600 dark:text-slate-400 font-semibold mb-2">STREAK 🔥</div>
            <div className="text-4xl font-bold text-orange-500">{user.streak}</div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Statistics</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">Total Characters Practiced</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{user.totalPracticed}</p>
            </div>
            <div>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">Learning Progress</p>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-yellow-500 to-green-500 h-full" 
                  style={{ width: `${user.mastered + user.learning > 0 ? (user.mastered / (user.mastered + user.learning)) * 100 : 0}%` }}
                />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{user.mastered} / {user.mastered + user.learning} mastered</p>
            </div>
          </div>
        </div>

        {/* Badges Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Badges</h2>
          <div className="grid grid-cols-4 gap-4">
            {badges.length > 0 ? (
              badges.map((badge) => {
                const earned = hasEarnedBadge(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`flex flex-col items-center p-4 rounded-lg transition ${
                      earned
                        ? 'bg-yellow-50 dark:bg-yellow-900/30'
                        : 'bg-slate-100 dark:bg-slate-700 opacity-50'
                    }`}
                  >
                    <span className="text-4xl mb-2">{badge.icon_emoji}</span>
                    <p className="text-sm font-semibold text-center text-slate-900 dark:text-white">{badge.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 text-center mt-1">{badge.description}</p>
                    {earned && <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-semibold">✓ Earned</p>}
                  </div>
                );
              })
            ) : (
              <p className="col-span-4 text-slate-600 dark:text-slate-400">No badges available yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
