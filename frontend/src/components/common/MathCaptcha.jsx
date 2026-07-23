'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiRefreshCw, FiCheck, FiShield } from 'react-icons/fi';

function generateMath() {
  const ops = ['+', '-', '*'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a, b, answer;

  if (op === '+') {
    a = Math.floor(Math.random() * 20) + 1;
    b = Math.floor(Math.random() * 20) + 1;
    answer = a + b;
  } else if (op === '-') {
    a = Math.floor(Math.random() * 20) + 5;
    b = Math.floor(Math.random() * Math.min(a, 15)) + 1;
    answer = a - b;
  } else {
    a = Math.floor(Math.random() * 10) + 1;
    b = Math.floor(Math.random() * 10) + 1;
    answer = a * b;
  }

  return { a, b, op, answer, question: `${a} ${op} ${b}` };
}

export default function MathCaptcha({ onVerify, onExpire }) {
  const [math, setMath] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const generateNew = useCallback(() => {
    setMath(generateMath());
    setUserInput('');
    setVerified(false);
    setError(false);
  }, []);

  useEffect(() => {
    generateNew();
  }, [generateNew]);

  useEffect(() => {
    if (verified && onVerify) onVerify(true);
  }, [verified, onVerify]);

  useEffect(() => {
    if (!verified && onExpire) onExpire();
  }, [verified, onExpire]);

  const handleChange = (e) => {
    const val = e.target.value.trim();
    setUserInput(val);
    setError(false);

    if (val === String(math.answer)) {
      setVerified(true);
    } else if (val.length > String(math.answer).length) {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setTimeout(() => generateNew(), 1200);
    }
  };

  if (!math) return null;

  return (
    <div className={`rounded-lg border transition-all ${
      verified
        ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-500/10'
        : error
        ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-500/10'
        : 'border-dark-200 dark:border-dark-700 bg-dark-50 dark:bg-dark-800'
    } p-3`}>
      <div className="flex items-center gap-2 mb-2">
        <FiShield className={`text-xs ${verified ? 'text-green-500' : 'text-dark-400'}`} />
        <span className="text-[10px] font-semibold text-dark-600 dark:text-dark-400 uppercase tracking-wide">
          Verify you are human
        </span>
        {verified && <FiCheck className="text-xs text-green-500 ml-auto" />}
      </div>

      <div className={`flex items-center gap-2 ${shake ? 'animate-shake' : ''}`}>
        <div className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-600">
          <span className="text-xl font-bold text-primary-600 dark:text-primary-400 select-none font-mono">
            {math.question}
          </span>
          <span className="text-lg text-dark-300 select-none font-mono">=</span>
          <span className="text-lg text-dark-300 select-none font-mono">?</span>
        </div>

        <input
          type="number"
          value={userInput}
          onChange={handleChange}
          disabled={verified}
          placeholder="?"
          autoFocus
          className={`w-16 text-center text-base font-bold py-2 px-2 rounded-lg border-2 transition-all outline-none font-mono ${
            verified
              ? 'border-green-400 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
              : error
              ? 'border-red-400 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
              : 'border-dark-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-dark-900 dark:text-white focus:border-primary-500'
          }`}
        />

        {!verified && (
          <button
            type="button"
            onClick={generateNew}
            className="p-2 rounded-lg border border-dark-200 dark:border-dark-600 hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors"
            title="New question"
          >
            <FiRefreshCw className="text-sm text-dark-400" />
          </button>
        )}
      </div>

      {error && (
        <p className="text-[10px] text-red-500 mt-1.5 text-center animate-pulse">
          Wrong answer. New question loading...
        </p>
      )}

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
