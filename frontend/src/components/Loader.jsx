import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function Loader({ inline = false }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`${inline ? 'loader-inline' : 'loader-wrapper'} ${isDark ? 'loader-dark' : 'loader-light'}`}>
      {isDark && (
        <div className="clouds">
          <div className="cloud cloud1"></div>
          <div className="cloud cloud2"></div>
          <div className="cloud cloud3"></div>
          <div className="cloud cloud4"></div>
          <div className="cloud cloud5"></div>
        </div>
      )}

      <div className="longfazers">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>

      <div className="speeder">
        <span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </span>
        <div className="base">
          <span></span>
          <div className="face"></div>
        </div>
      </div>
    </div>
  );
}
