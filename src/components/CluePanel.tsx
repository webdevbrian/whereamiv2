import { useState, useEffect } from 'react';
import { ClueData } from '../types/clue';
import { analyzeStreetViewImage } from '../utils/visionApi';

interface CluePanelProps {
  panorama: google.maps.StreetViewPanorama | null;
  isVisible: boolean;
  onClose: () => void;
  onClueRequested: () => void;
  canRequestClue: boolean;
}

const CluePanel: React.FC<CluePanelProps> = ({ 
  panorama, 
  isVisible, 
  onClose, 
  onClueRequested,
  canRequestClue 
}) => {
  const [clueData, setClueData] = useState<ClueData>({
    text: '',
    confidence: 0,
    isLoading: false
  });

  // Reset clue data when canRequestClue becomes true (new round)
  useEffect(() => {
    if (canRequestClue && clueData.text) {
      setClueData({ text: '', confidence: 0, isLoading: false });
    }
  }, [canRequestClue]);

  const requestClue = async () => {
    if (!panorama || !canRequestClue) return;

    setClueData({ text: '', confidence: 0, isLoading: true });
    onClueRequested();

    try {
      const clueText = await analyzeStreetViewImage(panorama);
      setClueData({
        text: clueText,
        confidence: 0.8, // Placeholder confidence
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to get clue:', error);
      setClueData({
        text: 'Sorry, I couldn\'t analyze this location. Try looking for road signs, license plates, architectural styles, or vegetation that might give away the region!',
        confidence: 0,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Auto-show panel after 10 seconds if clue hasn't been requested
  useEffect(() => {
    if (!canRequestClue) return;

    const timer = setTimeout(() => {
      if (canRequestClue && !clueData.text && !clueData.isLoading) {
        // Auto-show the panel but don't auto-request the clue
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [canRequestClue, clueData.text, clueData.isLoading]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        width: '320px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        zIndex: 1500,
        color: 'white',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '1.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🤖 AI Clue Companion
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            transition: 'background 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          ×
        </button>
      </div>

      {!clueData.text && !clueData.isLoading && canRequestClue && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ 
            marginBottom: '15px', 
            fontSize: '0.9rem',
            opacity: 0.9,
            lineHeight: '1.4'
          }}>
            Need a hint? I can analyze this Street View location and provide clues about the region!
          </p>
          <button
            onClick={requestClue}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#059669';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#10b981';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🔍 Get AI Clue
          </button>
        </div>
      )}

      {clueData.isLoading && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderTop: '3px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 15px'
          }} />
          <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>
            🤖 Analyzing location...
          </p>
        </div>
      )}

      {clueData.text && !clueData.isLoading && (
        <div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '10px',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <p style={{ 
              margin: 0, 
              fontSize: '0.9rem',
              lineHeight: '1.5'
            }}>
              {clueData.text}
            </p>
          </div>
          
          {clueData.error && (
            <p style={{ 
              margin: '10px 0 0 0', 
              fontSize: '0.8rem', 
              opacity: 0.7,
              fontStyle: 'italic'
            }}>
              ⚠️ Note: AI analysis had some limitations
            </p>
          )}
          
          <p style={{ 
            margin: '10px 0 0 0', 
            fontSize: '0.8rem', 
            opacity: 0.7,
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            💡 One clue per round
          </p>
        </div>
      )}

      {!canRequestClue && (
        <div style={{ textAlign: 'center', opacity: 0.7 }}>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            🚫 Clue already used this round
          </p>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default CluePanel;