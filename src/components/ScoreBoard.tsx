import React from 'react';

interface ScoreBoardProps {
  currentRound: number;
  maxRounds: number;
  lastRoundScore: number;
  totalScore: number;
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({
  currentRound,
  maxRounds,
  lastRoundScore,
  totalScore
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '45px',
        left: '20px',
        width: '200px',
        padding: '15px',
        background: 'white',
        boxShadow: '0px 0px 20px rgba(0, 0, 0, 0.9)',
        zIndex: 1000,
        borderRadius: '8px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', color: '#666' }}>Current Round: </span>
        <strong style={{ color: '#333' }}>{currentRound}/{maxRounds}</strong>
      </div>
      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', color: '#666' }}>Last Round Score: </span>
        <strong style={{ color: '#059669' }}>{lastRoundScore.toLocaleString()}</strong>
      </div>
      <div>
        <span style={{ fontSize: '14px', color: '#666' }}>Total Score: </span>
        <strong style={{ color: '#1f2937', fontSize: '16px' }}>{totalScore.toLocaleString()}</strong>
      </div>
    </div>
  );
};

export default ScoreBoard;