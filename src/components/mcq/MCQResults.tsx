'use client';

import React, { useState } from 'react';
import { MCQPaper, ExamResult } from '@/lib/types/mcq.types';
import { MCQQuestion } from './MCQQuestion';

interface MCQResultsProps {
  paper: MCQPaper;
  result: ExamResult;
  onRestart: () => void;
  onExit?: () => void;
}

export function MCQResults({ paper, result, onRestart, onExit }: MCQResultsProps) {
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);

  const percentage = result.score;
  const grade = percentage >= 90 ? 'A*' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'E';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              Exam Complete!
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              {paper.paperName}
            </p>
          </div>

          {/* Score Display */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 text-center border-2 border-blue-200 dark:border-blue-700">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">Total Score</p>
              <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">
                {result.correctAnswers}/{result.totalQuestions}
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 text-center border-2 border-green-200 dark:border-green-700">
              <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">Correct</p>
              <p className="text-4xl font-bold text-green-900 dark:text-green-100">
                {result.correctAnswers}
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl p-6 text-center border-2 border-red-200 dark:border-red-700">
              <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Incorrect</p>
              <p className="text-4xl font-bold text-red-900 dark:text-red-100">
                {result.incorrectAnswers}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 text-center border-2 border-purple-200 dark:border-purple-700">
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-2">Percentage</p>
              <p className="text-4xl font-bold text-purple-900 dark:text-purple-100">
                {percentage}%
              </p>
              <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mt-1">
                Grade: {grade}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={onRestart}
              className="px-8 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry Exam
              </div>
            </button>

            {onExit && (
              <button
                onClick={onExit}
                className="px-8 py-4 rounded-xl font-semibold text-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Exit
              </button>
            )}
          </div>
        </div>

        {/* All Questions Review - Scrollable List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
            All Questions Review
          </h2>

          <div className="space-y-8">
            {result.answers.map((answer, index) => (
              <div key={answer.questionNumber} className="border-b border-slate-200 dark:border-slate-700 pb-8 last:border-b-0">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Question {answer.questionNumber}
                  </h3>
                  <span className={`
                    px-4 py-2 rounded-lg font-semibold flex items-center gap-2
                    ${answer.isCorrect
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }
                  `}>
                    {answer.isCorrect ? (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Correct
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Incorrect
                      </>
                    )}
                  </span>
                </div>

                <MCQQuestion
                  question={paper.questions[index]}
                  selectedAnswer={answer.userAnswer || undefined}
                  onAnswerSelect={() => {}}
                  isSubmitted={true}
                  correctAnswer={answer.correctAnswer}
                />

                {!answer.isCorrect && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      <span className="font-bold">Your answer:</span> {answer.userAnswer || 'Not answered'}
                      {' • '}
                      <span className="font-bold">Correct answer:</span> {answer.correctAnswer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
