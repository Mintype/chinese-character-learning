'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import HanziCanvas from '../components/HanziCanvas';

type LearningMode = 'menu' | 'new' | 'review' | 'select' | 'practice' | 'finished' | 'study-sets' | 'create-set' | 'view-set' | 'import-set';

interface StudySet {
  id: string;
  name: string;
  description: string | null;
  character_count: number;
  created_at: string;
}

interface StudySetCharacter {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  position: number;
  is_custom: boolean;
  character_id: string | null;
}

export default function Learn() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState({ name: 'Learner', level: 1, mastered: 0, learning: 0 });
  const [streak, setStreak] = useState(0);
  const [mode, setMode] = useState<LearningMode>('menu');
  const [loading, setLoading] = useState(true);
  const [characters, setCharacters] = useState<any[]>([]);
  const [currentCharacterIndex, setCurrentCharacterIndex] = useState(0);
  const [selectedCharacters, setSelectedCharacters] = useState<any[]>([]);
  const [isCharacterComplete, setIsCharacterComplete] = useState(false);
  const [practicedCharacters, setPracticedCharacters] = useState<any[]>([]);
  const [isCanvasExpanded, setIsCanvasExpanded] = useState(false);
  const [expandedSize, setExpandedSize] = useState(400);
  
  // Study sets state
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [currentStudySet, setCurrentStudySet] = useState<StudySet | null>(null);
  const [studySetCharacters, setStudySetCharacters] = useState<StudySetCharacter[]>([]);
  const [newSetName, setNewSetName] = useState('');
  const [newSetDescription, setNewSetDescription] = useState('');
  const [importText, setImportText] = useState('');
  const [importSetName, setImportSetName] = useState('');
  const [authUser, setAuthUser] = useState<any>(null);
  
  // Convert to study set modal state
  const [showConvertToSetModal, setShowConvertToSetModal] = useState(false);
  const [convertSetName, setConvertSetName] = useState('');

  // Update expanded canvas size on resize
  useEffect(() => {
    const updateExpandedSize = () => {
      const size = Math.min(window.innerWidth - 80, window.innerHeight - 250, 500);
      setExpandedSize(Math.max(size, 280));
    };
    
    updateExpandedSize();
    window.addEventListener('resize', updateExpandedSize);
    return () => window.removeEventListener('resize', updateExpandedSize);
  }, []);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const { data: { user: authUserData } } = await supabase.auth.getUser();
        
        if (!authUserData) {
          setLoading(false);
          return;
        }

        setAuthUser(authUserData);

        const { data: profileData } = await supabase
          .from('user_profile')
          .select('username, level, mastered, learning, streak')
          .eq('user_id', authUserData.id)
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

        // Check for import parameter
        const importParam = searchParams.get('import');
        if (importParam) {
          try {
            const decoded = decodeURIComponent(importParam);
            setImportText(decoded);
            setMode('import-set');
          } catch (e) {
            console.error('Failed to decode import parameter');
          }
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [searchParams]);

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

  const fetchStudySets = async () => {
    try {
      if (!authUser) return;

      const { data: sets, error } = await supabase
        .from('study_sets')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching study sets:', error);
        return;
      }

      setStudySets(sets || []);
      setMode('study-sets');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchStudySetCharacters = async (studySet: StudySet) => {
    try {
      const { data, error } = await supabase
        .rpc('get_study_set_characters', { p_study_set_id: studySet.id });

      if (error) {
        console.error('Error fetching study set characters:', error);
        return;
      }

      setStudySetCharacters(data || []);
      setCurrentStudySet(studySet);
      setMode('view-set');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const createStudySet = async () => {
    try {
      if (!authUser || !newSetName.trim()) return;

      const { data, error } = await supabase
        .from('study_sets')
        .insert({
          user_id: authUser.id,
          name: newSetName.trim(),
          description: newSetDescription.trim() || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating study set:', error);
        alert('Failed to create study set. Name might already exist.');
        return;
      }

      setNewSetName('');
      setNewSetDescription('');
      await fetchStudySets();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const deleteStudySet = async (setId: string) => {
    if (!confirm('Are you sure you want to delete this study set?')) return;

    try {
      const { error } = await supabase
        .from('study_sets')
        .delete()
        .eq('id', setId);

      if (error) {
        console.error('Error deleting study set:', error);
        return;
      }

      setStudySets(studySets.filter(s => s.id !== setId));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const convertSelectedToStudySet = async () => {
    try {
      if (!authUser || !convertSetName.trim() || selectedCharacters.length === 0) {
        alert('Please provide a set name and select at least one character.');
        return;
      }

      // Create the study set
      const { data: newSet, error: setError } = await supabase
        .from('study_sets')
        .insert({
          user_id: authUser.id,
          name: convertSetName.trim(),
          description: `${selectedCharacters.length} selected characters`,
        })
        .select()
        .single();

      if (setError) {
        console.error('Error creating study set:', setError);
        alert('Failed to create study set. Name might already exist.');
        return;
      }

      // Add characters to the set (using study_set_characters table since these are from the characters table)
      const setChars = selectedCharacters.map((char, index) => ({
        study_set_id: newSet.id,
        character_id: char.id,
        position: index + 1,
      }));

      const { error: charError } = await supabase
        .from('study_set_characters')
        .insert(setChars);

      if (charError) {
        console.error('Error adding characters:', charError);
        alert('Study set created but failed to add some characters.');
      }

      // Reset state and close modal
      setConvertSetName('');
      setShowConvertToSetModal(false);
      setSelectedCharacters([]);
      alert(`Successfully created study set "${newSet.name}" with ${selectedCharacters.length} characters!`);
      
      // Optionally navigate to study sets
      await fetchStudySets();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const importStudySet = async () => {
    try {
      if (!authUser || !importSetName.trim() || !importText.trim()) {
        alert('Please provide a set name and import data.');
        return;
      }

      // Parse the import text (format: term,def per line)
      const lines = importText.trim().split('\n').filter(line => line.trim());
      const parsedCharacters: { character: string; pinyin: string; meaning: string }[] = [];

      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          parsedCharacters.push({
            character: parts[0],
            pinyin: parts[1] || '',
            meaning: parts.slice(2).join(',') || parts[1] || '',
          });
        }
      }

      if (parsedCharacters.length === 0) {
        alert('No valid characters found. Format: character,pinyin or character,pinyin,meaning');
        return;
      }

      // Create the study set
      const { data: newSet, error: setError } = await supabase
        .from('study_sets')
        .insert({
          user_id: authUser.id,
          name: importSetName.trim(),
          description: `Imported ${parsedCharacters.length} characters`,
        })
        .select()
        .single();

      if (setError) {
        console.error('Error creating study set:', setError);
        alert('Failed to create study set. Name might already exist.');
        return;
      }

      // Add custom characters to the set
      const customChars = parsedCharacters.map((char, index) => ({
        study_set_id: newSet.id,
        character: char.character,
        pinyin: char.pinyin,
        meaning: char.meaning,
        position: index + 1,
      }));

      const { error: charError } = await supabase
        .from('study_set_custom_characters')
        .insert(customChars);

      if (charError) {
        console.error('Error adding characters:', charError);
        alert('Study set created but failed to add some characters.');
      }

      setImportText('');
      setImportSetName('');
      await fetchStudySets();
      alert(`Successfully imported ${parsedCharacters.length} characters!`);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const practiceStudySet = () => {
    if (studySetCharacters.length === 0) return;

    // Convert study set characters to practice format
    const practiceChars = studySetCharacters.map(char => ({
      id: char.character_id || char.id,
      character: char.hanzi,
      pinyin: char.pinyin,
      meaning: char.meaning,
      isCustom: char.is_custom,
    }));

    setCharacters(practiceChars);
    setCurrentCharacterIndex(0);
    setIsCharacterComplete(false);
    setMode('practice');
  };

  const removeCharacterFromSet = async (charId: string, isCustom: boolean) => {
    if (!currentStudySet) return;

    try {
      const table = isCustom ? 'study_set_custom_characters' : 'study_set_characters';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', charId);

      if (error) {
        console.error('Error removing character:', error);
        return;
      }

      setStudySetCharacters(studySetCharacters.filter(c => c.id !== charId));
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
      // End of practice session - show finished screen
      setPracticedCharacters([...characters]);
      setMode('finished');
    }
  };

  const handleRepeatPractice = () => {
    setCharacters([...practicedCharacters]);
    setCurrentCharacterIndex(0);
    setIsCharacterComplete(false);
    setMode('practice');
  };

  const handleBackToMenu = () => {
    setMode('menu');
    setCharacters([]);
    setSelectedCharacters([]);
    setPracticedCharacters([]);
    setCurrentStudySet(null);
    setStudySetCharacters([]);
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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

              <button
                onClick={fetchStudySets}
                className="p-6 sm:p-8 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-xl hover:shadow-lg transition border-2 border-orange-200 dark:border-orange-700"
              >
                <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">📚</div>
                <h3 className="text-lg sm:text-xl font-bold text-orange-900 dark:text-orange-100 mb-1 sm:mb-2">My Study Sets</h3>
                <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-300">Create and study your custom character sets</p>
              </button>

              <button
                onClick={() => setMode('import-set')}
                className="p-6 sm:p-8 bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900 dark:to-cyan-800 rounded-xl hover:shadow-lg transition border-2 border-cyan-200 dark:border-cyan-700"
              >
                <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">📥</div>
                <h3 className="text-lg sm:text-xl font-bold text-cyan-900 dark:text-cyan-100 mb-1 sm:mb-2">Import Set</h3>
                <p className="text-xs sm:text-sm text-cyan-700 dark:text-cyan-300">Import characters via copy/paste</p>
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
                onClick={() => setShowConvertToSetModal(true)}
                disabled={selectedCharacters.length === 0}
                className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📚 Convert to Study Set
              </button>
              <button
                onClick={() => setMode('menu')}
                className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base border-2 border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 font-bold rounded-lg hover:bg-red-50 dark:hover:bg-slate-700 transition"
              >
                Back
              </button>
            </div>

            {/* Convert to Study Set Modal */}
            {showConvertToSetModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Create Study Set</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Create a new study set with {selectedCharacters.length} selected character{selectedCharacters.length !== 1 ? 's' : ''}.
                  </p>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Set Name *
                    </label>
                    <input
                      type="text"
                      value={convertSetName}
                      onChange={(e) => setConvertSetName(e.target.value)}
                      placeholder="e.g., My Selected Characters"
                      className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={convertSelectedToStudySet}
                      disabled={!convertSetName.trim()}
                      className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create Set
                    </button>
                    <button
                      onClick={() => {
                        setShowConvertToSetModal(false);
                        setConvertSetName('');
                      }}
                      className="px-4 py-3 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Study Sets Mode */}
        {mode === 'study-sets' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">My Study Sets</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('create-set')}
                  className="px-4 py-2 text-sm bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition"
                >
                  + Create New Set
                </button>
                <button
                  onClick={() => setMode('import-set')}
                  className="px-4 py-2 text-sm border-2 border-red-600 text-red-600 dark:text-red-400 font-bold rounded-lg hover:bg-red-50 dark:hover:bg-slate-700 transition"
                >
                  📥 Import
                </button>
              </div>
            </div>

            {studySets.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">📚</div>
                <p className="text-slate-600 dark:text-slate-400 mb-4">You haven't created any study sets yet.</p>
                <button
                  onClick={() => setMode('create-set')}
                  className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition"
                >
                  Create Your First Set
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {studySets.map((set) => (
                  <div
                    key={set.id}
                    className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 border-2 border-slate-200 dark:border-slate-600 hover:border-red-400 transition cursor-pointer"
                    onClick={() => fetchStudySetCharacters(set)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{set.name}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteStudySet(set.id);
                        }}
                        className="text-slate-400 hover:text-red-500 transition"
                      >
                        🗑️
                      </button>
                    </div>
                    {set.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{set.description}</p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      {set.character_count} character{set.character_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={() => setMode('menu')}
                className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base border-2 border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 font-bold rounded-lg hover:bg-red-50 dark:hover:bg-slate-700 transition"
              >
                Back to Menu
              </button>
            </div>
          </div>
        )}

        {/* Create Set Mode */}
        {mode === 'create-set' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-6">Create New Study Set</h2>
            
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Set Name *
                </label>
                <input
                  type="text"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  placeholder="e.g., HSK 1 Vocabulary"
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newSetDescription}
                  onChange={(e) => setNewSetDescription(e.target.value)}
                  placeholder="Describe what this set is for..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6">
              <button
                onClick={createStudySet}
                disabled={!newSetName.trim()}
                className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Set
              </button>
              <button
                onClick={() => {
                  setNewSetName('');
                  setNewSetDescription('');
                  setMode('study-sets');
                }}
                className="px-6 py-3 border-2 border-red-600 text-red-600 dark:text-red-400 font-bold rounded-lg hover:bg-red-50 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* View Set Mode */}
        {mode === 'view-set' && currentStudySet && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{currentStudySet.name}</h2>
                {currentStudySet.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{currentStudySet.description}</p>
                )}
              </div>
              <button
                onClick={practiceStudySet}
                disabled={studySetCharacters.length === 0}
                className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ▶️ Start Practice
              </button>
            </div>

            {studySetCharacters.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">✍️</div>
                <p className="text-slate-600 dark:text-slate-400 mb-4">This set is empty. Add some characters!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6 max-h-96 overflow-y-auto">
                {studySetCharacters.map((char) => (
                  <div
                    key={char.id}
                    className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-center relative group"
                  >
                    <button
                      onClick={() => removeCharacterFromSet(char.id, char.is_custom)}
                      className="absolute top-1 right-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                    >
                      ✕
                    </button>
                    <div className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-300 mb-1">{char.hanzi}</div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{char.pinyin}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 truncate">{char.meaning}</p>
                    {char.is_custom && (
                      <span className="text-xs text-cyan-600 dark:text-cyan-400">custom</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={fetchStudySets}
                className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base border-2 border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 font-bold rounded-lg hover:bg-red-50 dark:hover:bg-slate-700 transition"
              >
                Back to Sets
              </button>
            </div>
          </div>
        )}

        {/* Import Set Mode */}
        {mode === 'import-set' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">Import Study Set</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Paste your characters below. Format: <code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">character,pinyin</code> or <code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">character,pinyin,meaning</code> (one per line)
            </p>
            
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Set Name *
                </label>
                <input
                  type="text"
                  value={importSetName}
                  onChange={(e) => setImportSetName(e.target.value)}
                  placeholder="e.g., My Imported Characters"
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-red-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Characters (paste below) *
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`你,nǐ,you
好,hǎo,good
我,wǒ,I/me
是,shì,to be`}
                  rows={10}
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-red-500 focus:outline-none font-mono text-sm"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold mb-2">Preview:</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {importText.trim().split('\n').filter(l => l.includes(',')).length} valid lines detected
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6">
              <button
                onClick={importStudySet}
                disabled={!importSetName.trim() || !importText.trim()}
                className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📥 Import Set
              </button>
              <button
                onClick={() => {
                  setImportText('');
                  setImportSetName('');
                  setMode('menu');
                }}
                className="px-6 py-3 border-2 border-red-600 text-red-600 dark:text-red-400 font-bold rounded-lg hover:bg-red-50 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
            </div>

            <div className="mt-6 p-4 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg">
              <p className="text-sm text-cyan-800 dark:text-cyan-200 font-semibold mb-2">💡 Tip: Share via URL</p>
              <p className="text-xs text-cyan-700 dark:text-cyan-300">
                You can also import by adding <code className="bg-cyan-100 dark:bg-cyan-800 px-1 rounded">?import=...</code> to the URL with URL-encoded data.
              </p>
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
                <div className="flex justify-between items-center mb-2 sm:mb-4">
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-semibold">Draw the character below:</p>
                  <button
                    onClick={() => setIsCanvasExpanded(!isCanvasExpanded)}
                    className="text-xs sm:text-sm px-3 py-1 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition"
                  >
                    {isCanvasExpanded ? '⬜ Minimize' : '⬛ Expand'}
                  </button>
                </div>
                <div className={`bg-gray-100 dark:bg-slate-700 rounded-xl p-3 sm:p-4 flex items-center justify-center mb-4 sm:mb-6 transition-all duration-300 ${
                  isCanvasExpanded ? 'min-h-[70vh]' : 'flex-1'
                }`}>
                  <HanziCanvas 
                    character={currentCharacter.character}
                    onComplete={handleCharacterComplete}
                    onMistake={() => console.log('Mistake')}
                    onCorrectStroke={() => console.log('Correct')}
                    size={isCanvasExpanded ? expandedSize : undefined}
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

        {/* Finished Mode */}
        {mode === 'finished' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 md:p-12 shadow-xl text-center">
            <div className="text-6xl sm:text-7xl md:text-8xl mb-4 sm:mb-6">🎉</div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4">Great job!</h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 mb-6 sm:mb-8">
              You finished practicing {practicedCharacters.length} character{practicedCharacters.length !== 1 ? 's' : ''}!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-md mx-auto">
              <button
                onClick={handleRepeatPractice}
                className="flex-1 px-6 py-3 sm:py-4 text-sm sm:text-base bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition"
              >
                🔄 Repeat Practice
              </button>
              <button
                onClick={handleBackToMenu}
                className="flex-1 px-6 py-3 sm:py-4 text-sm sm:text-base border-2 border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 font-bold rounded-lg hover:bg-red-50 dark:hover:bg-slate-700 transition"
              >
                Back to Menu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
