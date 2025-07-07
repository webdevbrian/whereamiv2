import { useState, useEffect, useCallback, useMemo } from 'react';
import { GameState, GameRound } from './types/game';
import { loadGoogleMapsScript } from './utils/googleMaps';
import { generateRandomLocation, findValidStreetViewLocation } from './utils/locationGenerator';
import StreetView from './components/StreetView';
import MiniMap from './components/MiniMap';
import ScoreBoard from './components/ScoreBoard';
import Timer from './components/Timer';
import GuessButton from './components/GuessButton';
import RoundEndModal from './components/RoundEndModal';
import GameEndModal from './components/GameEndModal';
import StartGameModal from './components/StartGameModal';
import CluePanel from './components/CluePanel';
import { calculateDistance, calculatePoints } from './utils/scoring';
import './App.css';

const TIMER_DURATION = 45;
const MAX_ROUNDS = 5;

function App() {
  const [gameState, setGameState] = useState<GameState>({
    currentRound: 1,
    totalScore: 0,
    rounds: [],
    isGameEnded: false,
    isRoundEnded: false,
    timerCount: TIMER_DURATION,
    isTimerRunning: false,
    hasGameStarted: false,
    clueRequested: false,
    clueUsed: false
  });

  const [currentLocation, setCurrentLocation] = useState<google.maps.LatLng | null>(null);
  const [guessLocation, setGuessLocation] = useState<google.maps.LatLng | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [panoramaRef, setPanoramaRef] = useState<google.maps.StreetViewPanorama | null>(null);
  const [showCluePanel, setShowCluePanel] = useState(false);

  // Load Google Maps
  useEffect(() => {
    loadGoogleMapsScript().then(() => {
      setMapsLoaded(true);
    }).catch(console.error);
  }, []);

  // Initialize new round
  const initializeRound = useCallback(() => {
    if (!mapsLoaded) return;

    // Generate a random location and find a valid Street View location
    const randomLocation = generateRandomLocation();
    
    findValidStreetViewLocation(randomLocation)
      .then((validLocation) => {
        setCurrentLocation(validLocation);
        setGuessLocation(null);
        setGameState(prev => ({
          ...prev,
          isRoundEnded: false,
          clueRequested: false,
          clueUsed: false,
          timerCount: TIMER_DURATION,
          isTimerRunning: true
        }));
        setShowCluePanel(false);
      })
      .catch((error) => {
        console.error('Failed to find valid location:', error);
        // Fallback: try again with a new random location
        setTimeout(() => initializeRound(), 1000);
      });
  }, [mapsLoaded]);

  // Timer effect
  useEffect(() => {
    let interval: number;
    
    if (gameState.isTimerRunning && gameState.timerCount > 0) {
      interval = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          timerCount: prev.timerCount - 1
        }));
      }, 1000);
    } else if (gameState.timerCount === 0 && gameState.isTimerRunning) {
      // Time's up
      handleTimeUp();
    }

    return () => clearInterval(interval);
  }, [gameState.isTimerRunning, gameState.timerCount]);

  // Initialize first round when maps are loaded
  useEffect(() => {
    if (mapsLoaded && gameState.currentRound === 1 && gameState.rounds.length === 0 && gameState.hasGameStarted) {
      initializeRound();
    }
  }, [mapsLoaded, gameState.currentRound, gameState.rounds.length, gameState.hasGameStarted, initializeRound]);

  const handleTimeUp = () => {
    setGameState(prev => ({ ...prev, isTimerRunning: false }));
    endRound(true);
  };

  const handleGuess = () => {
    if (!guessLocation || !currentLocation) return;
    
    setGameState(prev => ({ ...prev, isTimerRunning: false }));
    endRound(false);
  };

  const endRound = (timedOut: boolean) => {
    if (!currentLocation) return;

    let distance = 0;
    let points = 0;

    if (!timedOut && guessLocation) {
      distance = calculateDistance(currentLocation, guessLocation);
      points = calculatePoints(distance);
    }

    const round: GameRound = {
      roundNumber: gameState.currentRound,
      actualLocation: currentLocation,
      guessLocation: guessLocation,
      distance,
      points,
      timedOut
    };

    setGameState(prev => ({
      ...prev,
      rounds: [...prev.rounds, round],
      totalScore: prev.totalScore + points,
      isRoundEnded: true
    }));
  };

  const continueToNextRound = () => {
    if (gameState.currentRound >= MAX_ROUNDS) {
      setGameState(prev => ({ ...prev, isGameEnded: true, isRoundEnded: false }));
    } else {
      setGameState(prev => ({
        ...prev,
        currentRound: prev.currentRound + 1,
        isRoundEnded: false,
        clueRequested: false,
        clueUsed: false
      }));
      setShowCluePanel(false);
      initializeRound();
    }
  };

  const restartGame = () => {
    setGameState({
      currentRound: 1,
      totalScore: 0,
      rounds: [],
      isGameEnded: false,
      isRoundEnded: false,
      timerCount: TIMER_DURATION,
      isTimerRunning: false,
      hasGameStarted: false,
      clueRequested: false,
      clueUsed: false
    });
    setShowCluePanel(false);
  };

  const startGame = () => {
    setGameState(prev => ({ ...prev, hasGameStarted: true }));
  };

  const handleClueRequested = () => {
    setGameState(prev => ({ 
      ...prev, 
      clueRequested: true,
      clueUsed: true 
    }));
  };

  const toggleCluePanel = () => {
    setShowCluePanel(prev => !prev);
  };

  const handleMapClick = (latLng: google.maps.LatLng) => {
    setGuessLocation(latLng);
  };

  // Memoize the map click handler to prevent unnecessary re-renders
  const memoizedMapClick = useMemo(() => handleMapClick, []);

  if (!mapsLoaded) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h1>Loading Whereami...</h1>
          <p>Preparing your geography challenge</p>
        </div>
      </div>
    );
  }

  if (!gameState.hasGameStarted) {
    return <StartGameModal onStartGame={startGame} />;
  }

  if (!mapsLoaded) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h1>Loading Whereami...</h1>
          <p>Preparing your geography challenge</p>
        </div>
      </div>
    );
  }

  const currentRoundData = gameState.rounds[gameState.rounds.length - 1];

  return (
    <div className="app">
      <StreetView 
        location={currentLocation} 
        onPanoramaLoad={setPanoramaRef}
      />
      
      <MiniMap 
        onMapClick={memoizedMapClick}
        guessLocation={guessLocation}
        resetTrigger={gameState.currentRound}
      />
      
      <ScoreBoard 
        currentRound={gameState.currentRound}
        maxRounds={MAX_ROUNDS}
        lastRoundScore={currentRoundData?.points || 0}
        totalScore={gameState.totalScore}
      />
      
      <Timer count={gameState.timerCount} />
      
      <GuessButton 
        onClick={handleGuess}
        disabled={!guessLocation || gameState.isRoundEnded}
      />

      <button
        onClick={toggleCluePanel}
        style={{
          position: 'absolute',
          top: '20px',
          left: showCluePanel ? '360px' : '20px',
          zIndex: 1600,
          background: gameState.clueUsed 
            ? 'rgba(107, 114, 128, 0.9)' 
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: gameState.clueUsed ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          opacity: gameState.clueUsed ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
        onMouseOver={(e) => {
          if (!gameState.clueUsed) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)';
          }
        }}
        onMouseOut={(e) => {
          if (!gameState.clueUsed) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
          }
        }}
      >
        {gameState.clueUsed ? 'Clue Used' : 'AI Clue'}
      </button>

      <CluePanel
        panorama={panoramaRef}
        isVisible={showCluePanel}
        onClose={() => setShowCluePanel(false)}
        onClueRequested={handleClueRequested}
        canRequestClue={!gameState.clueUsed && gameState.isTimerRunning}
      />

      {gameState.isRoundEnded && currentRoundData && (
        <RoundEndModal
          round={currentRoundData}
          onContinue={continueToNextRound}
        />
      )}

      {gameState.isGameEnded && (
        <GameEndModal
          totalScore={gameState.totalScore}
          onPlayAgain={restartGame}
        />
      )}
    </div>
  );
}

export default App;