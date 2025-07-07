import { } from 'react';

interface GuessButtonProps {
  onClick: () => void;
  disabled: boolean;
}

const GuessButton: React.FC<GuessButtonProps> = ({ onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-danger btn-large ${disabled ? 'disabled' : ''}`}
      style={{
        width: '260px',
        position: 'absolute',
        top: '560px',
        right: '20px',
        zIndex: 1000,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease'
      }}
    >
      Make Your Guess
    </button>
  );
};

export default GuessButton;