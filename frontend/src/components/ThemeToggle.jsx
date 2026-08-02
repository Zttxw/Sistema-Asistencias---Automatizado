import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <label
      className={`theme-switch ${className}`}
      title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <span className="theme__toggle-wrap">
        <input
          id="theme-toggle-input"
          className="theme__toggle"
          type="checkbox"
          role="switch"
          name="theme"
          checked={theme === 'dark'}
          onChange={toggleTheme}
        />
        {/* Símbolos minimalistas integrados en la pista */}
        <span className="theme__track-symbols">
          <Sun className="theme__symbol theme__symbol--sun" />
          <Moon className="theme__symbol theme__symbol--moon" />
        </span>
        <span className="theme__icon">
          <span className="theme__icon-part"></span>
          <span className="theme__icon-part"></span>
          <span className="theme__icon-part"></span>
          <span className="theme__icon-part"></span>
          <span className="theme__icon-part"></span>
          <span className="theme__icon-part"></span>
          <span className="theme__icon-part"></span>
          <span className="theme__icon-part"></span>
          <span className="theme__icon-part"></span>
        </span>
      </span>
    </label>
  );
}
