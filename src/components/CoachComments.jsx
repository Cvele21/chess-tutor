import React from 'react';
import './CoachComments.css';

const CoachComments = ({ comment }) => {
  if (!comment) {
    return (
      <div className="coach-comments">
        <h3>Coach's Comments</h3>
        <div className="coach-message neutral">
          <p>Make a move to see feedback...</p>
        </div>
      </div>
    );
  }

  const { type, message } = comment;

  return (
    <div className="coach-comments">
      <h3>Coach's Comments</h3>
      <div className={`coach-message ${type}`}>
        <div className="coach-icon">
          {type === 'error' && '⚠️'}
          {type === 'warning' && '⚠️'}
          {type === 'caution' && '💡'}
          {type === 'success' && '✅'}
          {type === 'info' && '💡'}
        </div>
        <p>{message}</p>
      </div>
    </div>
  );
};

export default CoachComments;
