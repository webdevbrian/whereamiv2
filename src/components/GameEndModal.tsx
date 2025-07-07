import { useState, useEffect } from 'react';

interface GameEndModalProps {
  totalScore: number;
  onPlayAgain: () => void;
}

const GameEndModal: React.FC<GameEndModalProps> = ({ totalScore, onPlayAgain }) => {
  const [displayScore, setDisplayScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = totalScore / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const newScore = Math.min(Math.floor(increment * currentStep), totalScore);
      setDisplayScore(newScore);

      if (currentStep >= steps) {
        clearInterval(timer);
        setShowConfetti(true);
        // Hide confetti after 3 seconds
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [totalScore]);

  const shareText = `I just scored ${totalScore.toLocaleString()} points playing Whereami!`;
  const shareUrl = window.location.href;

  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {showConfetti && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            zIndex: 1000
          }}>
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: '10px',
                  height: '10px',
                  backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'][i % 6],
                  left: `${20 + Math.random() * 60}%`,
                  bottom: '0px',
                  animationName: `confetti-explode-${i}`,
                  animationDuration: '3s',
                  animationTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  animationIterationCount: '1',
                  animationDelay: `${Math.random() * 0.5}s`,
                  borderRadius: '50%',
                  animationFillMode: 'forwards'
                }}
              />
            ))}
          </div>
        )}
        
        <h1>Congratulations!</h1>
        <h2>Your final score was:</h2>
        <h1 style={{ color: '#059669', fontSize: '3rem', margin: '1rem 0' }}>
          {displayScore.toLocaleString()}
        </h1>
        
        <p>Share your achievement:</p>
        
        <div className="social-buttons">
          <a 
            href={facebookShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="facebook"
          >
            Share on Facebook
          </a>
          <a 
            href={twitterShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="twitter"
          >
            Share on Twitter
          </a>
        </div>
        
        <button className="btn btn-success btn-large" onClick={onPlayAgain}>
          Play Again?
        </button>
        
        <style>
          {`
            ${Array.from({ length: 50 }).map((_, i) => {
              const randomX1 = (Math.random() - 0.5) * 300; // Random horizontal spread
              const randomY1 = -(150 + Math.random() * 200); // Random peak height
              const randomX2 = randomX1 + (Math.random() - 0.5) * 100; // Drift during fall
              const randomY2 = 50 + Math.random() * 100; // Random fall distance
              const randomRotation = 360 + Math.random() * 720; // Random rotation
              
              return `
                @keyframes confetti-explode-${i} {
                  0% {
                    transform: translateY(0) translateX(0) rotate(0deg);
                    opacity: 1;
                  }
                  25% {
                    transform: translateY(${randomY1 * 0.7}px) translateX(${randomX1 * 0.7}px) rotate(${randomRotation * 0.3}deg);
                    opacity: 1;
                  }
                  50% {
                    transform: translateY(${randomY1}px) translateX(${randomX1}px) rotate(${randomRotation * 0.6}deg);
                    opacity: 1;
                  }
                  100% {
                    transform: translateY(${randomY2}px) translateX(${randomX2}px) rotate(${randomRotation}deg);
                    opacity: 0;
                  }
                }
              `;
            }).join('')}
          `}
        </style>
      </div>
    </div>
  );
};

export default GameEndModal;