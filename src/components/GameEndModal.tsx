import { } from 'react';

interface GameEndModalProps {
  totalScore: number;
  onPlayAgain: () => void;
}

const GameEndModal: React.FC<GameEndModalProps> = ({ totalScore, onPlayAgain }) => {
  const shareText = `I just scored ${totalScore.toLocaleString()} points playing Whereami!`;
  const shareUrl = window.location.href;

  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h1>🎉 Congratulations!</h1>
        <h2>Your final score was:</h2>
        <h1 style={{ color: '#059669', fontSize: '3rem', margin: '1rem 0' }}>
          {totalScore.toLocaleString()}
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