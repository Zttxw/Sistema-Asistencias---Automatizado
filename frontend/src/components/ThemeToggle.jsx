import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={`toggle-switch-container ${className}`}>
      <div className="toggle-switch" title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
        <label className="switch-label">
          <input
            type="checkbox"
            className="checkbox"
            checked={theme === 'dark'}
            onChange={toggleTheme}
          />
          <span className="slider"></span>
        </label>
      </div>
    </div>
  );
}
