import { } from 'react';

interface StartGameModalProps {
  onStartGame: () => void;
}

const StartGameModal: React.FC<StartGameModalProps> = ({ onStartGame }) => {
  return (
    <div className="modal-overlay" style={{
      backgroundImage: 'url(https://i.imgur.com/UWUfKZH.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.4)'
      }} />
      <div className="modal-content" style={{ 
        maxWidth: '600px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        position: 'relative',
        zIndex: 1
      }}>
        <h1 style={{ 
          color: 'white', 
          fontSize: '3rem', 
          margin: '0 0 0.5rem 0',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          Where Am I?
        </h1>
        <div style={{ 
          color: 'white', 
          fontSize: '1.1rem', 
          marginBottom: '2rem',
          fontWeight: '400',
          textAlign: 'center',
          textShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }}>
          <p style={{ margin: '0 0 0.5rem 0' }}>
            A project by{' '}
            <a 
              href="https://github.com/webdevbrian/whereamiv2" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                color: '#10b981', 
                textDecoration: 'underline',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = '#34d399';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = '#10b981';
              }}
            >
              Brian Kinney
            </a>{' '}
            based off of GeoGuessr
          </p>
          <p style={{ 
            margin: 0, 
            fontSize: '0.9rem', 
            color: 'rgba(255,255,255,0.5)',
            fontStyle: 'italic',
            textShadow: '0 1px 2px rgba(0,0,0,0.2)'
          }}>
            Built with React, TypeScript, Google Maps API & Vite
          </p>
        </div>
        
        <button 
          className="btn btn-large" 
          onClick={onStartGame}
          style={{ 
            fontSize: '1.3rem', 
            padding: '18px 48px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            marginBottom: '2rem',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
            transform: 'translateY(0)',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.6)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.4)';
          }}
        >
          🌍 Start Game
        </button>
        
        <div style={{ 
          textAlign: 'left', 
          marginBottom: '1.5rem',
          background: 'rgba(255,255,255,0.1)',
          padding: '1.5rem',
          borderRadius: '12px',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ 
            color: 'white', 
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            🎮 How to Play
          </h3>
          <ul style={{ 
            color: 'rgba(255,255,255,0.9)', 
            lineHeight: '1.8', 
            paddingLeft: '1.5rem',
            listStyle: 'none'
          }}>
            <li style={{ marginBottom: '0.5rem' }}>🗺️ Explore the Street View location</li>
            <li style={{ marginBottom: '0.5rem' }}>⏱️ You have <strong>15 seconds</strong> per round</li>
            <li style={{ marginBottom: '0.5rem' }}>📍 Click the mini-map to place your guess</li>
            <li style={{ marginBottom: '0.5rem' }}>🎯 Complete <strong>5 rounds</strong> total</li>
          </ul>
        </div>

        <div style={{ 
          textAlign: 'left',
          background: 'rgba(255,255,255,0.1)',
          padding: '1.5rem',
          borderRadius: '12px',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ 
            color: 'white', 
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            🏆 Scoring System
          </h3>
          <div style={{ color: 'rgba(255,255,255,0.9)', lineHeight: '1.6' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '0.5rem',
              fontSize: '0.9rem'
            }}>
              <div>🎯 <strong>1-10 km:</strong> 7,000-10,000 pts</div>
              <div>🎪 <strong>11-200 km:</strong> 3,000-4,000 pts</div>
              <div>🎨 <strong>201-800 km:</strong> 1,000-2,000 pts</div>
              <div>⏰ <strong>Time out:</strong> 0 pts</div>
            </div>
            <p style={{ 
              marginTop: '1rem', 
              fontSize: '0.85rem', 
              fontStyle: 'italic',
              color: 'rgba(255,255,255,0.8)'
            }}>
              The closer your guess, the higher your score!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartGameModal;