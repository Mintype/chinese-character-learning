'use client';

import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import Link from 'next/link';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) console.error('Sign in error:', error);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-8 py-6">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400">HanziLern</h1>
        <div className="space-x-4">
          {!checkingAuth && isAuthenticated ? (
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="px-6 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                Get Started
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-8 py-20">
        <div className="grid grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <h2 className="text-5xl font-bold text-slate-900 dark:text-white mb-6">
              Master Chinese Characters Through Writing
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-8">
              Write Hanzi characters, earn levels, and unlock achievements. Make learning fun with our gamified approach to character mastery.
            </p>
            
            {/* Features */}
            <div className="space-y-4 mb-10">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">✏️</span>
                <span className="text-lg text-slate-700 dark:text-slate-200">Write characters with precision</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-2xl">⭐</span>
                <span className="text-lg text-slate-700 dark:text-slate-200">Earn levels and badges</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📈</span>
                <span className="text-lg text-slate-700 dark:text-slate-200">Track your progress</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🏆</span>
                <span className="text-lg text-slate-700 dark:text-slate-200">Compete with others</span>
              </div>
            </div>

            <div className="space-x-4">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="px-8 py-5 bg-red-600 text-white text-lg font-semibold rounded-lg hover:bg-red-700 transition"
                >
                  Dashboard
                </Link>
              ) : (
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="px-8 py-4 bg-red-600 text-white text-lg font-semibold rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Signing in...' : 'Start Learning'}
                </button>
              )}
              <button className="px-8 py-4 border-2 border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 text-lg font-semibold rounded-lg hover:bg-red-50 dark:hover:bg-slate-700 transition">
                Learn More
              </button>
            </div>
          </div>

          {/* Right - Visual Section */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl">
            <div className="text-center">
              <div className="bg-gradient-to-br from-red-100 to-red-100 dark:from-red-900 dark:to-red-900 rounded-xl p-12 mb-6">
                <div className="text-6xl font-bold text-red-600 dark:text-red-300">书</div>
                <p className="text-sm text-slate-600 dark:text-slate-200 mt-2">Write this character</p>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-4">
                  <span className="text-3xl">⭐</span>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-2">50 Mastered</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900 rounded-lg p-4">
                  <span className="text-3xl">🔥</span>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-2">5 Streak</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4">
                  <span className="text-3xl">🎯</span>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-2">Level 12</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
