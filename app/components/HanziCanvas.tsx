'use client';

import React, { useEffect, useRef } from 'react';
import HanziWriter from 'hanzi-writer';

interface HanziCanvasProps {
  character: string;
  onComplete?: (data: any) => void;
  onMistake?: (data: any) => void;
  onCorrectStroke?: (data: any) => void;
}

export default function HanziCanvas({ 
  character, 
  onComplete, 
  onMistake, 
  onCorrectStroke 
}: HanziCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<any>(null);
  const isCompletedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || !character) return;

    // If character was just completed, keep showing it
    if (isCompletedRef.current) {
      isCompletedRef.current = false;
      return;
    }

    // Clear previous instance
    if (writerRef.current) {
      writerRef.current.cancelQuiz();
    }

    containerRef.current.innerHTML = '';

    // Create new HanziWriter instance
    writerRef.current = HanziWriter.create(containerRef.current, character, {
      width: 320,
      height: 320,
      padding: 20,
      showCharacter: false,
      showOutline: true,
      strokeColor: '#d82d2d',
      outlineColor: '#ddd',
      drawingColor: '#333',
      drawingWidth: 3,
      highlightColor: '#aaf',
    });

    // Start quiz mode for writing practice
    writerRef.current.quiz({
      showHintAfterMisses: 2,
      highlightOnComplete: true,
      onMistake: (data: any) => {
        onMistake?.(data);
      },
      onCorrectStroke: (data: any) => {
        onCorrectStroke?.(data);
      },
      onComplete: (data: any) => {
        isCompletedRef.current = true;
        onComplete?.(data);
      },
    });

    return () => {
      if (writerRef.current) {
        writerRef.current.cancelQuiz();
      }
    };
  }, [character, onComplete, onMistake, onCorrectStroke]);

  const handleReset = () => {
    if (writerRef.current) {
      writerRef.current.cancelQuiz();
      writerRef.current.quiz({
        showHintAfterMisses: 2,
        highlightOnComplete: true,
        onMistake: onMistake,
        onCorrectStroke: onCorrectStroke,
        onComplete: onComplete,
      });
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div 
        ref={containerRef}
        className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700"
      />
      <button
        onClick={handleReset}
        className="px-6 py-2 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
      >
        Reset
      </button>
    </div>
  );
}
