import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 border border-gray-300 dark:border-zinc-800 transition-colors duration-200 ease-in-out focus:outline-none ${
        isDark ? 'bg-zinc-900' : 'bg-gray-200'
      } ${className}`}
      title={isDark ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
      aria-label="Cambiar tema"
    >
      <span
        className={`pointer-events-none flex h-5.5 w-5.5 items-center justify-center rounded-full bg-white dark:bg-zinc-100 shadow-sm transform transition duration-200 ease-in-out ${
          isDark ? 'translate-x-5' : 'translate-x-0'
        }`}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-zinc-900" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        )}
      </span>
    </button>
  );
}
