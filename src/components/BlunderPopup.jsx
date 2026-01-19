import React from 'react';
import './BlunderPopup.css';

const BlunderPopup = ({ onClose }) => {
  return (
    <div className="blunder-popup-overlay" onClick={onClose}>
      <div className="blunder-popup" onClick={(e) => e.stopPropagation()}>
        <div className="blunder-popup-header">
          <span className="blunder-icon">⚠️</span>
          <h3>Wait! That was a blunder.</h3>
        </div>
        <p className="blunder-message">Can you see why?</p>
        <button className="blunder-close-button" onClick={onClose}>
          I'll think about it
        </button>
      </div>
    </div>
  );
};

export default BlunderPopup;
