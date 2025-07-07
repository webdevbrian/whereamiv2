import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface GameEndModalProps {
  totalScore: number;
  onPlayAgain: () => void;
}

const GameEndModal: React.FC<GameEndModalProps> = ({ totalScore, onPlayAgain }) => {
  const [displayScore, setDisplayScore] = useState(0);
  const confettiContainerRef = useRef<HTMLDivElement>(null);

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
        // Trigger confetti after score animation completes
        triggerConfetti();
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [totalScore]);

  const triggerConfetti = () => {
    if (!confettiContainerRef.current) return;

    // Clear any existing confetti
    confettiContainerRef.current.innerHTML = '';

    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#f39c12', '#e74c3c', '#9b59b6', '#2ecc71'];
    const confettiCount = 80;

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      
      // Random confetti shape and size
      const size = Math.random() * 8 + 4; // 4-12px
      const isSquare = Math.random() > 0.5;
      
      confetti.style.position = 'absolute';
      confetti.style.width = `${size}px`;
      confetti.style.height = `${size}px`;
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.borderRadius = isSquare ? '0' : '50%';
      confetti.style.pointerEvents = 'none';
      
      // Starting position (bottom center area)
      const startX = window.innerWidth * (0.3 + Math.random() * 0.4); // Center 40% of screen
      const startY = window.innerHeight;
      
      confetti.style.left = `${startX}px`;
      confetti.style.top = `${startY}px`;
      
      confettiContainerRef.current.appendChild(confetti);

      // GSAP animation with realistic physics
      const tl = gsap.timeline();
      
      // Initial explosion phase
      const explosionForce = 0.8 + Math.random() * 0.4; // 0.8-1.2
      const angle = (Math.random() - 0.5) * Math.PI; // -90 to +90 degrees
      const velocity = 300 + Math.random() * 200; // 300-500px initial velocity
      
      const explosionX = Math.cos(angle) * velocity * explosionForce;
      const explosionY = -Math.abs(Math.sin(angle) * velocity * explosionForce) - 200; // Always upward
      
      // Explosion phase (0-0.8s)
      tl.to(confetti, {
        x: explosionX,
        y: explosionY,
        rotation: Math.random() * 360,
        duration: 0.8,
        ease: "power2.out"
      });
      
      // Gravity fall phase (0.8s-3s)
      tl.to(confetti, {
        y: window.innerHeight + 100, // Fall below screen
        x: `+=${(Math.random() - 0.5) * 100}`, // Slight horizontal drift
        rotation: `+=${360 + Math.random() * 720}`, // Continue rotating
        duration: 2.2,
        ease: "power1.in"
      }, 0.8);
      
      // Fade out near the end
      tl.to(confetti, {
        opacity: 0,
        duration: 0.5
      }, 2.5);
      
      // Clean up after animation
      tl.call(() => {
        if (confetti.parentNode) {
          confetti.parentNode.removeChild(confetti);
        }
      });
    }
  };

  const shareText = `I just scored ${totalScore.toLocaleString()} points playing Whereami!`;
  const shareUrl = window.location.href;

  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div 
          ref={confettiContainerRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 10000,
            overflow: 'hidden'
          }}
        />
        
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
      </div>
    </div>
  );
};

export default GameEndModal;