import { } from 'react';

interface TimerProps {
  count: number;
}

const Timer: React.FC<TimerProps> = ({ count }) => {
  const getTimerColor = () => {
    if (count <= 5) return '#ef4444';
    if (count <= 10) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div
      style={{
        fontSize: '90px',
        lineHeight: '200px',
        textAlign: 'center',
        width: '300px',
        height: '200px',
        background: getTimerColor(),
        color: 'white',
        position: 'absolute',
        top: '340px',
        right: '20px',
        zIndex: 1000,
        boxShadow: '0px 0px 20px rgba(255, 255, 255, 0.9)',
        borderRadius: '8px',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease'
      }}
    >
      {count}
    </div>
  );
};

export default Timer;