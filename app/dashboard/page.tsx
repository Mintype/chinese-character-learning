'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import HanziCanvas from '../components/HanziCanvas';

export default function Dashboard() {
  const [user, setUser] = useState({ name: 'Learner', level: 1, mastered: 0, learning: 0 });
  const [streak, setStreak] = useState(0);
  const [currentCharacter] = useState({ character: '书', pinyin: 'shū', meaning: 'book', state: 'learning' });
  const [isCharacterComplete, setIsCharacterComplete] = useState(false);
  const [recentCharacters, setRecentCharacters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        // Get current user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) {
          setLoading(false);
          return;
        }

        // Fetch user profile
        const { data: profileData, error } = await supabase
          .from('user_profile')
          .select('username, level, mastered, learning, streak')
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
            level: profileData.level,
            mastered: profileData.mastered,
            learning: profileData.learning,
          });
          setStreak(profileData.streak);
        }

        // Fetch recent characters
        const { data: recentData, error: recentError } = await supabase
          .from('user_character_progress')
          .select('state, last_practiced, characters(character, meaning)')
          .eq('user_id', authUser.id)
          .order('last_practiced', { ascending: false })
          .limit(5);

        if (recentError) {
          console.error('Error fetching recent characters:', recentError);
        } else if (recentData) {
          const formattedRecent = recentData.map((item: any) => ({
            char: item.characters?.character || '?',
            meaning: item.characters?.meaning || '',
            state: item.state,
          }));
          setRecentCharacters(formattedRecent);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, []);

  const handleCharacterComplete = useCallback((data: any) => {
    console.log('Character completed!', data);
    setIsCharacterComplete(true);
  }, []);

  const handleMistake = useCallback((data: any) => {
    console.log('Mistake made:', data);
  }, []);

  const handleCorrectStroke = useCallback((data: any) => {
    console.log('Stroke correct!', data);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Header Stats */}
        <div className="grid grid-cols-4 gap-6 mb-12">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="text-sm text-slate-600 dark:text-slate-400 font-semibold mb-2">LEVEL</div>
            <div className="text-5xl font-bold text-red-600 dark:text-red-400">{user.level}</div>
            <div className="text-xs text-slate-500 dark:text-slate-500 mt-2">Next: 50 characters</div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="text-sm text-slate-600 dark:text-slate-400 font-semibold mb-2">MASTERED</div>
            <div className="text-5xl font-bold text-green-600 dark:text-green-400">{user.mastered}</div>
            <div className="text-xs text-slate-500 dark:text-slate-500 mt-2">Ready to go</div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="text-sm text-slate-600 dark:text-slate-400 font-semibold mb-2">LEARNING</div>
            <div className="text-5xl font-bold text-yellow-600 dark:text-yellow-400">{user.learning}</div>
            <div className="text-xs text-slate-500 dark:text-slate-500 mt-2">In progress</div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="text-sm text-slate-600 dark:text-slate-400 font-semibold mb-2">STREAK 🔥</div>
            <div className="text-5xl font-bold text-orange-500">{streak}</div>
            <div className="text-xs text-slate-500 dark:text-slate-500 mt-2">Days in a row</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Main Writing Area */}
          <div className="col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl">
              <div className="text-center mb-8">
                <p className="text-slate-600 dark:text-slate-400 text-sm font-semibold uppercase mb-4">Current Character </p>
                <div className="bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900 dark:to-red-800 rounded-xl p-16 mb-6 border-4 border-red-200 dark:border-red-700">
                  <div className="text-8xl font-bold text-red-600 dark:text-red-300">{currentCharacter.character}</div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">PINYIN</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{currentCharacter.pinyin}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">MEANING</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{currentCharacter.meaning}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">STATE</p>
                    <p className="text-xl font-bold uppercase text-yellow-600 dark:text-yellow-400">{currentCharacter.state}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-100 dark:bg-slate-700 rounded-xl p-8 flex items-center justify-center mb-6">
                <HanziCanvas 
                  character={currentCharacter.character}
                  onComplete={handleCharacterComplete}
                  onMistake={handleMistake}
                  onCorrectStroke={handleCorrectStroke}
                />
              </div>

              <div className="flex gap-4">
                <button 
                  disabled={!isCharacterComplete}
                  className={`flex-1 px-8 py-4 font-bold rounded-lg transition ${
                    isCharacterComplete 
                      ? 'bg-red-600 text-white hover:bg-red-700 cursor-pointer' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Next Character
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Progress */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Recent Characters</h3>
              <div className="space-y-3">
                {recentCharacters.length > 0 ? (
                  recentCharacters.map((item, idx) => {
                    const stateColors = {
                      mastered: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
                      learning: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300',
                    };
                    return (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                        <div className="text-3xl font-bold text-red-600 dark:text-red-300 flex-shrink-0">{item.char}</div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 dark:text-white text-sm">{item.meaning}</p>
                          <p className={`text-xs px-2 py-1 rounded w-fit ${stateColors[item.state as keyof typeof stateColors]}`}>{item.state}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-slate-600 dark:text-slate-400 text-sm">No characters practiced yet</p>
                )}
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Badges</h3>
              <div className="grid grid-cols-3 gap-3">
                {/* <div className="flex flex-col items-center p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                  <span className="text-3xl mb-1">⭐</span>
                  <p className="text-xs text-center text-slate-600 dark:text-slate-400">Rising Star</p>
                </div>
                <div className="flex flex-col items-center p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <span className="text-3xl mb-1">🔥</span>
                  <p className="text-xs text-center text-slate-600 dark:text-slate-400">On Fire</p>
                </div>
                <div className="flex flex-col items-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <span className="text-3xl mb-1">🎯</span>
                  <p className="text-xs text-center text-slate-600 dark:text-slate-400">Focused</p>
                </div> */}
                {/* say no badges */}
                  <p className="col-span-3 text-slate-600 dark:text-slate-400 text-sm">No badges earned yet</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Level Progress</h3>
              <div className="flex gap-1 mb-3">
                <div className="flex-1 bg-green-500 rounded-full h-2" style={{ width: `${(user.mastered / 67) * 100}%` }}></div>
                <div className="flex-1 bg-yellow-500 rounded-full h-2" style={{ width: `${(user.learning / 67) * 100}%` }}></div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p className="text-green-600 dark:text-green-400">Mastered: {user.mastered}</p>
                <p className="text-yellow-600 dark:text-yellow-400">Learning: {user.learning}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}