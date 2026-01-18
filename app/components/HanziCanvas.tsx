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
  const [canvasSize, setCanvasSize] = React.useState(320);

  // Update canvas size based on screen width
  React.useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setCanvasSize(200); // Mobile: small
      } else if (width < 1024) {
        setCanvasSize(280); // Tablet: medium
      } else {
        setCanvasSize(320); // Desktop: large
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

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
      width: canvasSize,
      height: canvasSize,
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
  }, [character, canvasSize, onComplete, onMistake, onCorrectStroke]);

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
    <div className="flex flex-col items-center gap-3 sm:gap-4 w-full max-w-full">
      <div 
        ref={containerRef}
        className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 w-full flex items-center justify-center"
        style={{ minHeight: `${canvasSize}px` }}
      />
      <button
        onClick={handleReset}
        className="px-4 sm:px-6 py-2 text-sm sm:text-base border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
      >
        Reset
      </button>
    </div>
  );
}
