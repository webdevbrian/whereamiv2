import { } from 'react';

interface StartGameModalProps {
  onStartGame: () => void;
}

const StartGameModal: React.FC<StartGameModalProps> = ({ onStartGame }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <h1 style={{ color: '#1f2937', fontSize: '3rem', margin: '0 0 0.5rem 0' }}>
          Where Am I?
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.1rem', marginBottom: '2rem' }}>
          A project by Brian Kinney based off of GeoGuessr
        </p>
        
        <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
          <h3 style={{ color: '#1f2937', marginBottom: '1rem' }}>How to Play:</h3>
          <ul style={{ color: '#4b5563', lineHeight: '1.6', paddingLeft: '1.5rem' }}>
            <li>You'll be shown a Street View location somewhere in the world</li>
            <li>You have <strong>15 seconds</strong> to explore and make your guess</li>
            <li>Click on the mini-map to place your guess marker</li>
            <li>Click "Make Your Guess" to submit your answer</li>
            <li>Play through <strong>5 rounds</strong> to complete the game</li>
          </ul>
        </div>

        <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
          <h3 style={{ color: '#1f2937', marginBottom: '1rem' }}>Scoring:</h3>
          <div style={{ color: '#4b5563', lineHeight: '1.6' }}>
            <p style={{ marginBottom: '0.5rem' }}>Points are awarded based on how close your guess is:</p>
            <ul style={{ paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
              <li><strong>1-2 km:</strong> 10,000 points</li>
              <li><strong>3-10 km:</strong> 7,000 points</li>
              <li><strong>11-50 km:</strong> 4,000 points</li>
              <li><strong>51-200 km:</strong> 3,000 points</li>
              <li><strong>201-500 km:</strong> 2,000 points</li>
              <li><strong>501-800 km:</strong> 1,000 points</li>
              <li><strong>801+ km:</strong> Decreasing points down to 0</li>
            </ul>
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', fontStyle: 'italic' }}>
              If time runs out, you score 0 points for that round.
            </p>
          </div>
        </div>
        
        <button 
          className="btn btn-success btn-large" 
          onClick={onStartGame}
          style={{ fontSize: '1.2rem', padding: '16px 48px' }}
        >
          Start Game
        </button>
      </div>
    </div>
  );
};

export default StartGameModal;