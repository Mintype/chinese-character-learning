'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

// Types
interface FlashcardSet {
  id: string;
  title: string;
  description: string | null;
  card_count: number;
  is_public: boolean;
  created_at: string;
}

interface Flashcard {
  id: string;
  term: string;
  definition: string;
  position: number;
  is_starred: boolean;
  is_mastered: boolean;
  times_correct: number;
  times_incorrect: number;
  last_practiced: string | null;
}

type ViewMode = 'sets' | 'create-set' | 'import-set' | 'view-set' | 'edit-set' | 'study' | 'quiz-written' | 'quiz-mc' | 'results';

export default function TraditionalPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('sets');
  
  // Sets state
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  const [currentSet, setCurrentSet] = useState<FlashcardSet | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  
  // Create/Edit set state
  const [setTitle, setSetTitle] = useState('');
  const [setDescription, setSetDescription] = useState('');
  const [editingCards, setEditingCards] = useState<{ term: string; definition: string }[]>([{ term: '', definition: '' }]);
  
  // Import state
  const [importText, setImportText] = useState('');
  const [importTitle, setImportTitle] = useState('');
  const [importDelimiter, setImportDelimiter] = useState('tab');
  
  // Study/Quiz options
  const [shuffled, setShuffled] = useState(false);
  const [swapTermDef, setSwapTermDef] = useState(false);
  const [studyStarredOnly, setStudyStarredOnly] = useState(false);
  
  // Study/Quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [studyCards, setStudyCards] = useState<Flashcard[]>([]);
  
  // Quiz state
  const [userAnswer, setUserAnswer] = useState('');
  const [quizResults, setQuizResults] = useState<{ card: Flashcard; correct: boolean; userAnswer: string }[]>([]);
  const [mcOptions, setMcOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showQuizFeedback, setShowQuizFeedback] = useState(false);
  
  // Retype state for wrong answers
  const [mustRetype, setMustRetype] = useState(false);
  const [retypeAnswer, setRetypeAnswer] = useState('');

  // Helper to get question and answer based on swap setting
  const getQuestion = (card: Flashcard) => swapTermDef ? card.definition : card.term;
  const getAnswer = (card: Flashcard) => swapTermDef ? card.term : card.definition;

  // Fetch user and sets on mount
  useEffect(() => {
    const fetchUserAndSets = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          setLoading(false);
          return;
        }
        setUser(authUser);
        await fetchFlashcardSets(authUser.id);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserAndSets();
  }, []);

  const fetchFlashcardSets = async (userId: string) => {
    const { data, error } = await supabase
      .from('flashcard_sets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sets:', error);
      return;
    }
    setFlashcardSets(data || []);
  };

  const fetchFlashcards = async (setId: string) => {
    const { data, error } = await supabase
      .rpc('get_flashcards_with_progress', { p_set_id: setId });

    if (error) {
      console.error('Error fetching flashcards:', error);
      return;
    }
    setFlashcards(data || []);
  };

  const openSet = async (set: FlashcardSet) => {
    setCurrentSet(set);
    await fetchFlashcards(set.id);
    setViewMode('view-set');
  };

  // Create new set
  const createSet = async () => {
    if (!user || !setTitle.trim()) {
      alert('Please enter a title');
      return;
    }

    const validCards = editingCards.filter(c => c.term.trim() && c.definition.trim());
    if (validCards.length === 0) {
      alert('Please add at least one card with both term and definition');
      return;
    }

    const { data: newSet, error: setError } = await supabase
      .from('flashcard_sets')
      .insert({
        user_id: user.id,
        title: setTitle.trim(),
        description: setDescription.trim() || null,
      })
      .select()
      .single();

    if (setError) {
      console.error('Error creating set:', setError);
      alert('Failed to create set. Title might already exist.');
      return;
    }

    const cardsToInsert = validCards.map((card, index) => ({
      set_id: newSet.id,
      term: card.term.trim(),
      definition: card.definition.trim(),
      position: index + 1,
    }));

    const { error: cardsError } = await supabase
      .from('flashcards')
      .insert(cardsToInsert);

    if (cardsError) {
      console.error('Error adding cards:', cardsError);
    }

    setSetTitle('');
    setSetDescription('');
    setEditingCards([{ term: '', definition: '' }]);
    await fetchFlashcardSets(user.id);
    setViewMode('sets');
  };

  // Import set
  const importSet = async () => {
    if (!user || !importTitle.trim() || !importText.trim()) {
      alert('Please enter a title and import data');
      return;
    }

    const delimiter = importDelimiter === 'tab' ? '\t' : importDelimiter === 'comma' ? ',' : ';';
    const lines = importText.trim().split('\n').filter(line => line.trim());
    const parsedCards: { term: string; definition: string }[] = [];

    for (const line of lines) {
      const parts = line.split(delimiter);
      if (parts.length >= 2) {
        parsedCards.push({
          term: parts[0].trim(),
          definition: parts.slice(1).join(delimiter).trim(),
        });
      }
    }

    if (parsedCards.length === 0) {
      alert('No valid cards found. Make sure each line has term and definition separated by the chosen delimiter.');
      return;
    }

    const { data: newSet, error: setError } = await supabase
      .from('flashcard_sets')
      .insert({
        user_id: user.id,
        title: importTitle.trim(),
        description: `Imported ${parsedCards.length} cards`,
      })
      .select()
      .single();

    if (setError) {
      console.error('Error creating set:', setError);
      alert('Failed to create set. Title might already exist.');
      return;
    }

    const cardsToInsert = parsedCards.map((card, index) => ({
      set_id: newSet.id,
      term: card.term,
      definition: card.definition,
      position: index + 1,
    }));

    const { error: cardsError } = await supabase
      .from('flashcards')
      .insert(cardsToInsert);

    if (cardsError) {
      console.error('Error adding cards:', cardsError);
    }

    setImportTitle('');
    setImportText('');
    await fetchFlashcardSets(user.id);
    alert(`Successfully imported ${parsedCards.length} cards!`);
    setViewMode('sets');
  };

  // Delete set
  const deleteSet = async (setId: string) => {
    if (!confirm('Are you sure you want to delete this set? This cannot be undone.')) return;

    const { error } = await supabase
      .from('flashcard_sets')
      .delete()
      .eq('id', setId);

    if (error) {
      console.error('Error deleting set:', error);
      return;
    }

    setFlashcardSets(flashcardSets.filter(s => s.id !== setId));
    if (currentSet?.id === setId) {
      setCurrentSet(null);
      setViewMode('sets');
    }
  };

  // Toggle star
  const toggleStar = async (cardId: string) => {
    const { data, error } = await supabase
      .rpc('toggle_flashcard_star', { p_flashcard_id: cardId });

    if (error) {
      console.error('Error toggling star:', error);
      return;
    }

    setFlashcards(flashcards.map(c => 
      c.id === cardId ? { ...c, is_starred: data } : c
    ));
    setStudyCards(studyCards.map(c => 
      c.id === cardId ? { ...c, is_starred: data } : c
    ));
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Start study mode (Flashcards)
  const startStudy = (starredOnly: boolean = false) => {
    let cards = starredOnly ? flashcards.filter(c => c.is_starred) : [...flashcards];
    if (cards.length === 0) {
      alert(starredOnly ? 'No starred cards to study!' : 'No cards in this set!');
      return;
    }
    if (shuffled) {
      cards = shuffleArray(cards);
    }
    setStudyCards(cards);
    setStudyStarredOnly(starredOnly);
    setCurrentIndex(0);
    setShowAnswer(false);
    setViewMode('study');
  };

  // Start Written Quiz
  const startWrittenQuiz = (starredOnly: boolean = false) => {
    let cards = starredOnly ? flashcards.filter(c => c.is_starred) : [...flashcards];
    if (cards.length === 0) {
      alert(starredOnly ? 'No starred cards to quiz!' : 'No cards in this set!');
      return;
    }
    if (shuffled) {
      cards = shuffleArray(cards);
    }
    setStudyCards(cards);
    setStudyStarredOnly(starredOnly);
    setCurrentIndex(0);
    setUserAnswer('');
    setQuizResults([]);
    setShowQuizFeedback(false);
    setMustRetype(false);
    setRetypeAnswer('');
    setViewMode('quiz-written');
  };

  // Start Multiple Choice Quiz
  const startMCQuiz = (starredOnly: boolean = false) => {
    let cards = starredOnly ? flashcards.filter(c => c.is_starred) : [...flashcards];
    if (cards.length === 0) {
      alert(starredOnly ? 'No starred cards to quiz!' : 'No cards in this set!');
      return;
    }
    if (shuffled) {
      cards = shuffleArray(cards);
    }
    setStudyCards(cards);
    setStudyStarredOnly(starredOnly);
    setCurrentIndex(0);
    setQuizResults([]);
    setSelectedOption(null);
    setShowQuizFeedback(false);
    generateMCOptions(cards, 0);
    setViewMode('quiz-mc');
  };

  const generateMCOptions = (cards: Flashcard[], index: number) => {
    const currentCard = cards[index];
    const correctAnswer = getAnswer(currentCard);
    const otherAnswers = cards
      .filter((_, i) => i !== index)
      .map(c => getAnswer(c));
    
    // Get 3 random wrong answers
    const wrongAnswers = shuffleArray(otherAnswers).slice(0, 3);
    
    // Combine with correct answer and shuffle
    const options = shuffleArray([correctAnswer, ...wrongAnswers]);
    setMcOptions(options);
  };

  // Submit written answer
  const submitWrittenAnswer = async () => {
    const currentCard = studyCards[currentIndex];
    const correctAnswer = getAnswer(currentCard);
    const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    
    // Record the answer
    await supabase.rpc('record_flashcard_answer', {
      p_flashcard_id: currentCard.id,
      p_is_correct: isCorrect,
    });

    setQuizResults([...quizResults, { card: currentCard, correct: isCorrect, userAnswer: userAnswer.trim() }]);
    setShowQuizFeedback(true);
    
    // If wrong, require retype
    if (!isCorrect) {
      setMustRetype(true);
      setRetypeAnswer('');
    }
  };

  const handleRetypeSubmit = () => {
    const currentCard = studyCards[currentIndex];
    const correctAnswer = getAnswer(currentCard);
    if (retypeAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
      setMustRetype(false);
      setRetypeAnswer('');
    }
  };

  const nextWrittenQuestion = () => {
    if (currentIndex < studyCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer('');
      setShowQuizFeedback(false);
      setMustRetype(false);
      setRetypeAnswer('');
    } else {
      setViewMode('results');
    }
  };

  // Submit MC answer
  const submitMCAnswer = async (option: string) => {
    setSelectedOption(option);
    const currentCard = studyCards[currentIndex];
    const correctAnswer = getAnswer(currentCard);
    const isCorrect = option === correctAnswer;
    
    await supabase.rpc('record_flashcard_answer', {
      p_flashcard_id: currentCard.id,
      p_is_correct: isCorrect,
    });

    setQuizResults([...quizResults, { card: currentCard, correct: isCorrect, userAnswer: option }]);
    setShowQuizFeedback(true);
  };

  const nextMCQuestion = () => {
    if (currentIndex < studyCards.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setSelectedOption(null);
      setShowQuizFeedback(false);
      generateMCOptions(studyCards, nextIndex);
    } else {
      setViewMode('results');
    }
  };

  // Edit set
  const startEditSet = () => {
    if (!currentSet) return;
    setSetTitle(currentSet.title);
    setSetDescription(currentSet.description || '');
    setEditingCards(flashcards.map(c => ({ term: c.term, definition: c.definition })));
    if (editingCards.length === 0) {
      setEditingCards([{ term: '', definition: '' }]);
    }
    setViewMode('edit-set');
  };

  const saveEditSet = async () => {
    if (!user || !currentSet || !setTitle.trim()) {
      alert('Please enter a title');
      return;
    }

    const validCards = editingCards.filter(c => c.term.trim() && c.definition.trim());
    if (validCards.length === 0) {
      alert('Please add at least one card');
      return;
    }

    const { error: setError } = await supabase
      .from('flashcard_sets')
      .update({
        title: setTitle.trim(),
        description: setDescription.trim() || null,
      })
      .eq('id', currentSet.id);

    if (setError) {
      console.error('Error updating set:', setError);
      alert('Failed to update set');
      return;
    }

    await supabase
      .from('flashcards')
      .delete()
      .eq('set_id', currentSet.id);

    const cardsToInsert = validCards.map((card, index) => ({
      set_id: currentSet.id,
      term: card.term.trim(),
      definition: card.definition.trim(),
      position: index + 1,
    }));

    const { error: cardsError } = await supabase
      .from('flashcards')
      .insert(cardsToInsert);

    if (cardsError) {
      console.error('Error adding cards:', cardsError);
    }

    await fetchFlashcardSets(user.id);
    await fetchFlashcards(currentSet.id);
    setCurrentSet({ ...currentSet, title: setTitle.trim(), description: setDescription.trim() || null });
    setViewMode('view-set');
  };

  const addCardRow = () => {
    setEditingCards([...editingCards, { term: '', definition: '' }]);
  };

  const removeCardRow = (index: number) => {
    if (editingCards.length > 1) {
      setEditingCards(editingCards.filter((_, i) => i !== index));
    }
  };

  const updateCardRow = (index: number, field: 'term' | 'definition', value: string) => {
    const updated = [...editingCards];
    updated[index][field] = value;
    setEditingCards(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-xl text-slate-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">Please sign in</h1>
          <a href="/" className="text-red-600 hover:underline">Go to home page</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Sets List View */}
        {viewMode === 'sets' && (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Traditional Flashcards</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Create and study flashcard sets</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSetTitle('');
                    setSetDescription('');
                    setEditingCards([{ term: '', definition: '' }]);
                    setViewMode('create-set');
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                >
                  + Create Set
                </button>
                <button
                  onClick={() => {
                    setImportTitle('');
                    setImportText('');
                    setViewMode('import-set');
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-medium transition"
                >
                  Import Set
                </button>
              </div>
            </div>

            {flashcardSets.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                <div className="text-6xl mb-4">📚</div>
                <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">No flashcard sets yet</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Create your first set to start studying!</p>
                <button
                  onClick={() => setViewMode('create-set')}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                >
                  Create Your First Set
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {flashcardSets.map(set => (
                  <div
                    key={set.id}
                    className="bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer p-6"
                    onClick={() => openSet(set)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">{set.title}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSet(set.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-500 transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    {set.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{set.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">{set.card_count} cards</span>
                      <span>{new Date(set.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Create Set View */}
        {viewMode === 'create-set' && (
          <>
            <button
              onClick={() => setViewMode('sets')}
              className="mb-6 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-red-600 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Sets
            </button>

            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6">Create New Flashcard Set</h1>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Title</label>
                <input
                  type="text"
                  value={setTitle}
                  onChange={(e) => setSetTitle(e.target.value)}
                  placeholder="Enter a title..."
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description (optional)</label>
                <input
                  type="text"
                  value={setDescription}
                  onChange={(e) => setSetDescription(e.target.value)}
                  placeholder="Enter a description..."
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Cards</h2>

            <div className="space-y-3 mb-6">
              {editingCards.map((card, index) => (
                <div key={index} className="flex gap-3 items-start bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
                  <span className="text-sm font-medium text-slate-400 mt-2 w-6">{index + 1}</span>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={card.term}
                      onChange={(e) => updateCardRow(index, 'term', e.target.value)}
                      placeholder="Term"
                      className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={card.definition}
                      onChange={(e) => updateCardRow(index, 'definition', e.target.value)}
                      placeholder="Definition"
                      className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={() => removeCardRow(index)}
                    className="p-2 text-slate-400 hover:text-red-500 transition"
                    disabled={editingCards.length === 1}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={addCardRow}
                className="px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:border-red-500 hover:text-red-500 transition"
              >
                + Add Card
              </button>
              <button
                onClick={createSet}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
              >
                Create Set
              </button>
            </div>
          </>
        )}

        {/* Import Set View */}
        {viewMode === 'import-set' && (
          <>
            <button
              onClick={() => setViewMode('sets')}
              className="mb-6 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-red-600 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Sets
            </button>

            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6">Import Flashcard Set</h1>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Set Title</label>
                <input
                  type="text"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  placeholder="Enter a title for this set..."
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Delimiter</label>
                <div className="flex gap-4">
                  {[
                    { value: 'tab', label: 'Tab' },
                    { value: 'comma', label: 'Comma' },
                    { value: 'semicolon', label: 'Semicolon' },
                  ].map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="delimiter"
                        value={opt.value}
                        checked={importDelimiter === opt.value}
                        onChange={(e) => setImportDelimiter(e.target.value)}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span className="text-slate-700 dark:text-slate-300">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Import Data (one card per line: term{importDelimiter === 'tab' ? '[TAB]' : importDelimiter === 'comma' ? ',' : ';'}definition)
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`Example:\nhello${importDelimiter === 'tab' ? '\t' : importDelimiter === 'comma' ? ',' : ';'}你好\ngoodbye${importDelimiter === 'tab' ? '\t' : importDelimiter === 'comma' ? ',' : ';'}再见`}
                  rows={10}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
                />
              </div>

              <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4 mb-4">
                <h3 className="font-medium text-slate-800 dark:text-slate-200 mb-2">Import from Quizlet</h3>
                <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-decimal list-inside">
                  <li>Open your Quizlet set</li>
                  <li>Click the three dots menu (...) and select "Export"</li>
                  <li>Copy the exported text and paste it above</li>
                  <li>Make sure to select the correct delimiter</li>
                </ol>
              </div>

              <button
                onClick={importSet}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
              >
                Import Set
              </button>
            </div>
          </>
        )}

        {/* View Set */}
        {viewMode === 'view-set' && currentSet && (
          <>
            <button
              onClick={() => setViewMode('sets')}
              className="mb-6 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-red-600 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Sets
            </button>

            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{currentSet.title}</h1>
                {currentSet.description && (
                  <p className="text-slate-600 dark:text-slate-400 mt-1">{currentSet.description}</p>
                )}
                <p className="text-sm text-slate-500 mt-2">{flashcards.length} cards • {flashcards.filter(c => c.is_starred).length} starred</p>
              </div>
              <button
                onClick={startEditSet}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Edit Set
              </button>
            </div>

            {/* Study Options */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Study Options</h2>
              
              <div className="flex flex-wrap items-center gap-6 mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffled}
                    onChange={(e) => setShuffled(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300">🔀 Randomize</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={swapTermDef}
                    onChange={(e) => setSwapTermDef(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300">🔄 Swap Term & Definition</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Flashcards */}
                <div className="space-y-2">
                  <h3 className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className="text-xl">📇</span> Flashcards
                  </h3>
                  <button
                    onClick={() => startStudy(false)}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                  >
                    Study All
                  </button>
                  <button
                    onClick={() => startStudy(true)}
                    className="w-full px-4 py-3 border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg font-medium transition"
                  >
                    ⭐ Study Starred
                  </button>
                </div>

                {/* Written */}
                <div className="space-y-2">
                  <h3 className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className="text-xl">✍️</span> Written
                  </h3>
                  <button
                    onClick={() => startWrittenQuiz(false)}
                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
                  >
                    Quiz All
                  </button>
                  <button
                    onClick={() => startWrittenQuiz(true)}
                    className="w-full px-4 py-3 border border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-slate-700 rounded-lg font-medium transition"
                  >
                    ⭐ Quiz Starred
                  </button>
                </div>

                {/* Multiple Choice */}
                <div className="space-y-2">
                  <h3 className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className="text-xl">🔘</span> Multiple Choice
                  </h3>
                  <button
                    onClick={() => startMCQuiz(false)}
                    className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
                  >
                    Quiz All
                  </button>
                  <button
                    onClick={() => startMCQuiz(true)}
                    className="w-full px-4 py-3 border border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-700 rounded-lg font-medium transition"
                  >
                    ⭐ Quiz Starred
                  </button>
                </div>
              </div>
            </div>

            {/* Cards List */}
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Cards in this Set</h2>
            <div className="space-y-3">
              {flashcards.map((card, index) => (
                <div key={card.id} className="flex items-center gap-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
                  <span className="text-sm font-medium text-slate-400 w-6">{index + 1}</span>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-500 uppercase mb-1">Term</div>
                      <div className="text-slate-800 dark:text-slate-200">{card.term}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase mb-1">Definition</div>
                      <div className="text-slate-800 dark:text-slate-200">{card.definition}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleStar(card.id)}
                    className={`p-2 transition ${card.is_starred ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-500'}`}
                  >
                    <svg className="w-6 h-6" fill={card.is_starred ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                  {card.times_correct > 0 || card.times_incorrect > 0 ? (
                    <div className="text-xs text-slate-500">
                      {card.times_correct}✓ {card.times_incorrect}✗
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Edit Set View */}
        {viewMode === 'edit-set' && currentSet && (
          <>
            <button
              onClick={() => setViewMode('view-set')}
              className="mb-6 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-red-600 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Set
            </button>

            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6">Edit Set</h1>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Title</label>
                <input
                  type="text"
                  value={setTitle}
                  onChange={(e) => setSetTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
                <input
                  type="text"
                  value={setDescription}
                  onChange={(e) => setSetDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Cards</h2>

            <div className="space-y-3 mb-6">
              {editingCards.map((card, index) => (
                <div key={index} className="flex gap-3 items-start bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
                  <span className="text-sm font-medium text-slate-400 mt-2 w-6">{index + 1}</span>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={card.term}
                      onChange={(e) => updateCardRow(index, 'term', e.target.value)}
                      placeholder="Term"
                      className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={card.definition}
                      onChange={(e) => updateCardRow(index, 'definition', e.target.value)}
                      placeholder="Definition"
                      className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={() => removeCardRow(index)}
                    className="p-2 text-slate-400 hover:text-red-500 transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={addCardRow}
                className="px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 hover:border-red-500 hover:text-red-500 transition"
              >
                + Add Card
              </button>
              <button
                onClick={saveEditSet}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
              >
                Save Changes
              </button>
            </div>
          </>
        )}

        {/* Study Mode (Flashcards) */}
        {viewMode === 'study' && studyCards.length > 0 && (
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => setViewMode('view-set')}
                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-red-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Exit
              </button>
              <div className="text-slate-600 dark:text-slate-400">
                {currentIndex + 1} / {studyCards.length}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
              {/* Progress bar */}
              <div className="h-2 bg-slate-200 dark:bg-slate-700">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / studyCards.length) * 100}%` }}
                />
              </div>

              {/* Card */}
              <div 
                className="p-8 min-h-[300px] flex flex-col items-center justify-center cursor-pointer"
                onClick={() => setShowAnswer(!showAnswer)}
              >
                <div className="text-center">
                  <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                    {showAnswer ? (swapTermDef ? 'Term' : 'Definition') : (swapTermDef ? 'Definition' : 'Term')}
                  </div>
                  <div className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4">
                    {showAnswer ? getAnswer(studyCards[currentIndex]) : getQuestion(studyCards[currentIndex])}
                  </div>
                  <div className="text-sm text-slate-500">
                    {showAnswer ? 'Click to see question' : 'Click to reveal answer'}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="border-t border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center">
                <button
                  onClick={() => toggleStar(studyCards[currentIndex].id)}
                  className={`p-2 transition ${studyCards[currentIndex].is_starred ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-500'}`}
                >
                  <svg className="w-6 h-6" fill={studyCards[currentIndex].is_starred ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      if (currentIndex > 0) {
                        setCurrentIndex(currentIndex - 1);
                        setShowAnswer(false);
                      }
                    }}
                    disabled={currentIndex === 0}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => {
                      if (currentIndex < studyCards.length - 1) {
                        setCurrentIndex(currentIndex + 1);
                        setShowAnswer(false);
                      }
                    }}
                    disabled={currentIndex === studyCards.length - 1}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Written Quiz Mode */}
        {viewMode === 'quiz-written' && studyCards.length > 0 && (
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => setViewMode('view-set')}
                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-red-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Exit Quiz
              </button>
              <div className="text-slate-600 dark:text-slate-400">
                {currentIndex + 1} / {studyCards.length}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
              {/* Progress bar */}
              <div className="h-2 bg-slate-200 dark:bg-slate-700">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / studyCards.length) * 100}%` }}
                />
              </div>

              <div className="p-8">
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                  {swapTermDef ? 'Definition' : 'Term'}
                </div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6">
                  {getQuestion(studyCards[currentIndex])}
                </div>

                {!showQuizFeedback ? (
                  <>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      Type the {swapTermDef ? 'term' : 'definition'}:
                    </div>
                    <input
                      type="text"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && userAnswer.trim()) {
                          submitWrittenAnswer();
                        }
                      }}
                      placeholder="Your answer..."
                      autoFocus
                      className="w-full px-4 py-3 text-lg border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <button
                      onClick={submitWrittenAnswer}
                      disabled={!userAnswer.trim()}
                      className="mt-4 w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:opacity-50"
                    >
                      Check Answer
                    </button>
                  </>
                ) : (
                  <div>
                    {quizResults[quizResults.length - 1]?.correct ? (
                      <div className="p-4 bg-green-100 dark:bg-green-900/30 border border-green-500 rounded-lg mb-4">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold mb-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Correct!
                        </div>
                        <div className="text-slate-700 dark:text-slate-300">{getAnswer(studyCards[currentIndex])}</div>
                      </div>
                    ) : (
                      <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-500 rounded-lg mb-4">
                        <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold mb-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Incorrect
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Your answer:</div>
                        <div className="text-slate-700 dark:text-slate-300 line-through mb-2">{userAnswer}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Correct answer:</div>
                        <div className="text-slate-800 dark:text-slate-200 font-medium">{getAnswer(studyCards[currentIndex])}</div>
                      </div>
                    )}

                    {/* Retype required for wrong answers */}
                    {mustRetype ? (
                      <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-500 rounded-lg mb-4">
                        <div className="text-yellow-700 dark:text-yellow-400 font-semibold mb-2">
                          Type the correct answer to continue:
                        </div>
                        <input
                          type="text"
                          value={retypeAnswer}
                          onChange={(e) => setRetypeAnswer(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRetypeSubmit();
                            }
                          }}
                          placeholder="Type the correct answer..."
                          autoFocus
                          className="w-full px-4 py-3 text-lg border border-yellow-400 dark:border-yellow-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        />
                        <button
                          onClick={handleRetypeSubmit}
                          className="mt-2 w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition"
                        >
                          Submit
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={nextWrittenQuestion}
                        className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
                      >
                        {currentIndex < studyCards.length - 1 ? 'Next Question' : 'See Results'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Multiple Choice Quiz Mode */}
        {viewMode === 'quiz-mc' && studyCards.length > 0 && (
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => setViewMode('view-set')}
                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-red-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Exit Quiz
              </button>
              <div className="text-slate-600 dark:text-slate-400">
                {currentIndex + 1} / {studyCards.length}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
              {/* Progress bar */}
              <div className="h-2 bg-slate-200 dark:bg-slate-700">
                <div 
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / studyCards.length) * 100}%` }}
                />
              </div>

              <div className="p-8">
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                  {swapTermDef ? 'Definition' : 'Term'}
                </div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6">
                  {getQuestion(studyCards[currentIndex])}
                </div>

                <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Choose the correct {swapTermDef ? 'term' : 'definition'}:
                </div>

                <div className="space-y-3">
                  {mcOptions.map((option, index) => {
                    const correctAnswer = getAnswer(studyCards[currentIndex]);
                    const isCorrect = option === correctAnswer;
                    const isSelected = selectedOption === option;
                    
                    let buttonClass = 'w-full p-4 text-left rounded-lg border-2 transition ';
                    
                    if (showQuizFeedback) {
                      if (isCorrect) {
                        buttonClass += 'border-green-500 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
                      } else if (isSelected && !isCorrect) {
                        buttonClass += 'border-red-500 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
                      } else {
                        buttonClass += 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400';
                      }
                    } else {
                      buttonClass += 'border-slate-200 dark:border-slate-600 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200';
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => !showQuizFeedback && submitMCAnswer(option)}
                        disabled={showQuizFeedback}
                        className={buttonClass}
                      >
                        <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                        {option}
                        {showQuizFeedback && isCorrect && (
                          <svg className="w-5 h-5 inline ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {showQuizFeedback && isSelected && !isCorrect && (
                          <svg className="w-5 h-5 inline ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>

                {showQuizFeedback && (
                  <button
                    onClick={nextMCQuestion}
                    className="mt-6 w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
                  >
                    {currentIndex < studyCards.length - 1 ? 'Next Question' : 'See Results'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results View */}
        {viewMode === 'results' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
              <div className="p-8 text-center">
                <div className="text-6xl mb-4">
                  {quizResults.filter(r => r.correct).length === quizResults.length ? '🎉' : 
                   quizResults.filter(r => r.correct).length >= quizResults.length * 0.7 ? '👍' : '📚'}
                </div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Quiz Complete!</h1>
                <div className="text-4xl font-bold text-red-600 mb-4">
                  {quizResults.filter(r => r.correct).length} / {quizResults.length}
                </div>
                <div className="text-slate-600 dark:text-slate-400 mb-6">
                  {Math.round((quizResults.filter(r => r.correct).length / quizResults.length) * 100)}% correct
                </div>

                <div className="flex gap-4 justify-center mb-8">
                  <button
                    onClick={() => setViewMode('view-set')}
                    className="px-6 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    Back to Set
                  </button>
                  <button
                    onClick={() => {
                      setCurrentIndex(0);
                      setQuizResults([]);
                      setUserAnswer('');
                      setShowQuizFeedback(false);
                      setSelectedOption(null);
                      setMustRetype(false);
                      setRetypeAnswer('');
                      setViewMode('view-set');
                    }}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
                  >
                    Study Again
                  </button>
                </div>

                {/* Results breakdown */}
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Results Breakdown</h2>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {quizResults.map((result, index) => (
                      <div 
                        key={index}
                        className={`p-4 rounded-lg border ${
                          result.correct 
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                            : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`text-xl ${result.correct ? 'text-green-500' : 'text-red-500'}`}>
                            {result.correct ? '✓' : '✗'}
                          </span>
                          <div className="flex-1">
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {getQuestion(result.card)}
                            </div>
                            {!result.correct && (
                              <>
                                <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                                  Your answer: {result.userAnswer}
                                </div>
                                <div className="text-sm text-green-600 dark:text-green-400">
                                  Correct: {getAnswer(result.card)}
                                </div>
                              </>
                            )}
                            {result.correct && (
                              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                {getAnswer(result.card)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
