'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import HanziCanvas from '../components/HanziCanvas';

type LearningMode = 'menu' | 'new' | 'review' | 'select' | 'practice';

export default function Learn() {
  const [user, setUser] = useState({ name: 'Learner', level: 1, mastered: 0, learning: 0 });
  const [streak, setStreak] = useState(0);
  const [mode, setMode] = useState<LearningMode>('menu');
  const [loading, setLoading] = useState(true);
  const [characters, setCharacters] = useState<any[]>([]);
  const [currentCharacterIndex, setCurrentCharacterIndex] = useState(0);
  const [selectedCharacters, setSelectedCharacters] = useState<any[]>([]);
  const [isCharacterComplete, setIsCharacterComplete] = useState(false);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) {
          setLoading(false);
          return;
        }

        const { data: profileData } = await supabase
          .from('user_profile')
          .select('username, level, mastered, learning, streak')
          .eq('user_id', authUser.id)
          .single();

        if (profileData) {
          setUser({
            name: profileData.username || 'Learner',
            level: profileData.level,
            mastered: profileData.mastered,
            learning: profileData.learning,
          });
          setStreak(profileData.streak);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, []);

  const fetchNewCharacters = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) return;

      // Get characters user hasn't learned yet, ordered by frequency
      const { data: charData } = await supabase
        .from('characters')
        .select('id, character, pinyin, meaning')
        .order('frequency_rank', { ascending: true })
        .limit(10);

      if (charData) {
        setCharacters(charData);
        setCurrentCharacterIndex(0);
        setIsCharacterComplete(false);
        setMode('practice');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchReviewCharacters = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) return;

      // Get characters in learning state
      const { data: progressData } = await supabase
        .from('user_character_progress')
        .select('character_id, characters(id, character, pinyin, meaning)')
        .eq('user_id', authUser.id)
        .eq('state', 'learning')
        .order('last_practiced', { ascending: true });

      if (progressData) {
        const chars = progressData
          .map((p: any) => p.characters)
          .filter(Boolean);
        setCharacters(chars);
        setCurrentCharacterIndex(0);
        setIsCharacterComplete(false);
        setMode('practice');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchSelectCharacters = async () => {
    try {
      // Get all characters ordered by frequency
      const { data: charData } = await supabase
        .from('characters')
        .select('id, character, pinyin, meaning')
        .order('frequency_rank', { ascending: true });

      if (charData) {
        setCharacters(charData);
        setMode('select');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleStartPractice = () => {
    if (selectedCharacters.length > 0) {
      setCharacters(selectedCharacters);
      setCurrentCharacterIndex(0);
      setIsCharacterComplete(false);
      setMode('practice');
    }
  };

  const handleCharacterComplete = useCallback(async () => {
    console.log('🎯 Character completion started');
    setIsCharacterComplete(true);
    
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      console.log('👤 Auth user:', authUser?.id);
      
      if (!authUser || !currentCharacter) {
        console.log('❌ Missing auth user or current character');
        return;
      }

      console.log('📝 Completing character:', currentCharacter.character, 'ID:', currentCharacter.id);

      // Call complete_character function (handles INSERT if needed)
      const { data: completeResult, error: completeError } = await supabase
        .rpc('complete_character', {
          p_user_id: authUser.id,
          p_character_id: currentCharacter.id,
        });

      if (completeError) {
        console.error('❌ Error completing character:', completeError);
        return;
      }

      console.log('✅ Character completed. Result:', completeResult);

      // Call update_profile_after_completion to update all stats
      const { error: updateError } = await supabase
        .rpc('update_profile_after_completion', {
          p_user_id: authUser.id,
        });

      if (updateError) {
        console.error('❌ Error updating profile:', updateError);
        return;
      }

      console.log('✅ Profile updated');

      // Fetch updated user stats
      const { data: profileData } = await supabase
        .from('user_profile')
        .select('username, level, mastered, learning, streak')
        .eq('user_id', authUser.id)
        .single();

      console.log('📊 Updated stats:', profileData);

      if (profileData) {
        setUser({
          name: profileData.username || 'Learner',
          level: profileData.level,
          mastered: profileData.mastered,
          learning: profileData.learning,
        });
        setStreak(profileData.streak);
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }, [characters, currentCharacterIndex]);

  const handleNextCharacter = () => {
    if (currentCharacterIndex < characters.length - 1) {
      setCurrentCharacterIndex(currentCharacterIndex + 1);
      setIsCharacterComplete(false);
    } else {
      // End of practice session
      setMode('menu');
      setCharacters([]);
      setSelectedCharacters([]);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  const currentCharacter = characters[currentCharacterIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
        {/* Header Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8 md:mb-12">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-lg">
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-semibold mb-2">LEVEL</div>
            <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-red-600 dark:text-red-400">{user.level}</div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-lg">
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-semibold mb-2">MASTERED</div>
            <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-green-600 dark:text-green-400">{user.mastered}</div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-lg">
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-semibold mb-2">LEARNING</div>
            <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-yellow-600 dark:text-yellow-400">{user.learning}</div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 sm:p-6 shadow-lg">
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-semibold mb-2">STREAK 🔥</div>
            <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-orange-500">{streak}</div>
          </div>
        </div>

        {/* Menu Mode */}
        {mode === 'menu' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 md:p-12 shadow-xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-6 sm:mb-8 text-center">What would you like to study?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              <button
                onClick={fetchNewCharacters}
                className="p-6 sm:p-8 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-xl hover:shadow-lg transition border-2 border-blue-200 dark:border-blue-700"
              >
                <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">✨</div>
                <h3 className="text-lg sm:text-xl font-bold text-blue-900 dark:text-blue-100 mb-1 sm:mb-2">New Characters</h3>
                <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">Learn new characters in order of frequency</p>
              </button>

              <button
                onClick={fetchReviewCharacters}
                className="p-6 sm:p-8 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-xl hover:shadow-lg transition border-2 border-purple-200 dark:border-purple-700"
              >
                <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🔄</div>
                <h3 className="text-lg sm:text-xl font-bold text-purple-900 dark:text-purple-100 mb-1 sm:mb-2">Review</h3>
                <p className="text-xs sm:text-sm text-purple-700 dark:text-purple-300">Review characters you're currently learning</p>
              </button>

              <button
                onClick={fetchSelectCharacters}
                className="p-6 sm:p-8 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-xl hover:shadow-lg transition border-2 border-green-200 dark:border-green-700"
              >
                <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🎯</div>
                <h3 className="text-lg sm:text-xl font-bold text-green-900 dark:text-green-100 mb-1 sm:mb-2">Select</h3>
                <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">Choose specific characters to practice</p>
              </button>
            </div>
          </div>
        )}

        {/* Select Mode */}
        {mode === 'select' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4 sm:mb-6">Select Characters to Study</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3 mb-6 md:mb-8 max-h-96 overflow-y-auto">
              {characters.map((char, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (selectedCharacters.find(c => c.id === char.id)) {
                      setSelectedCharacters(selectedCharacters.filter(c => c.id !== char.id));
                    } else {
                      setSelectedCharacters([...selectedCharacters, char]);
                    }
                  }}
                  className={`p-2 sm:p-3 md:p-4 rounded-lg border-2 transition text-center ${
                    selectedCharacters.find(c => c.id === char.id)
                      ? 'bg-red-100 dark:bg-red-900 border-red-600 dark:border-red-400'
                      : 'bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:border-red-400'
                  }`}
                >
                  <div className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-300 mb-1">{char.character}</div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{char.pinyin}</p>
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={handleStartPractice}
                disabled={selectedCharacters.length === 0}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Practice ({selectedCharacters.length} selected)
              </button>
              <button
                onClick={() => setMode('menu')}
                className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base border-2 border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 font-bold rounded-lg hover:bg-red-50 dark:hover:bg-slate-700 transition"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Practice Mode */}
        {mode === 'practice' && currentCharacter && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl">
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Character {currentCharacterIndex + 1} of {characters.length}
              </div>
              <button
                onClick={() => setMode('menu')}
                className="text-xs sm:text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Back to Menu
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Character Info */}
              <div>
                <div className="bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900 dark:to-red-800 rounded-xl p-8 sm:p-12 mb-4 sm:mb-6 border-4 border-red-200 dark:border-red-700">
                  <div className="text-6xl sm:text-7xl md:text-8xl font-bold text-red-600 dark:text-red-300 text-center">{currentCharacter.character}</div>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 sm:p-4">
                    <p className="text-xs text-slate-600 dark:text-slate-400 uppercase mb-1">Pinyin</p>
                    <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">{currentCharacter.pinyin}</p>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 sm:p-4">
                    <p className="text-xs text-slate-600 dark:text-slate-400 uppercase mb-1">Meaning</p>
                    <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">{currentCharacter.meaning}</p>
                  </div>
                </div>
              </div>

              {/* Canvas */}
              <div className="flex flex-col">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-2 sm:mb-4 font-semibold">Draw the character below:</p>
                <div className="bg-gray-100 dark:bg-slate-700 rounded-xl p-3 sm:p-4 flex-1 flex items-center justify-center mb-4 sm:mb-6">
                  <HanziCanvas 
                    character={currentCharacter.character}
                    onComplete={handleCharacterComplete}
                    onMistake={() => console.log('Mistake')}
                    onCorrectStroke={() => console.log('Correct')}
                  />
                </div>

                <button
                  onClick={handleNextCharacter}
                  disabled={!isCharacterComplete}
                  className={`px-4 sm:px-6 py-2 sm:py-4 text-sm sm:text-base font-bold rounded-lg transition ${
                    isCharacterComplete
                      ? 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {currentCharacterIndex === characters.length - 1 ? 'Finish' : 'Next Character'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
