import { useState, useEffect, useCallback } from 'react';
import { GameState, GameRound } from './types/game';
import { loadGoogleMapsScript } from './utils/googleMaps';
import { COORDINATES } from './data/coordinates';
import StreetView from './components/StreetView';
import MiniMap from './components/MiniMap';
import ScoreBoard from './components/ScoreBoard';
import Timer from './components/Timer';
import GuessButton from './components/GuessButton';
import RoundEndModal from './components/RoundEndModal';
import GameEndModal from './components/GameEndModal';
import { calculateDistance, calculatePoints } from './utils/scoring';
import './App.css';

const TIMER_DURATION = 15;
const MAX_ROUNDS = 5;

function App() {
  const [gameState, setGameState] = useState<GameState>({
    currentRound: 1,
    totalScore: 0,
    rounds: [],
    isGameEnded: false,
    isRoundEnded: false,
    timerCount: TIMER_DURATION,
    isTimerRunning: false
  });

  const [currentLocation, setCurrentLocation] = useState<google.maps.LatLng | null>(null);
  const [guessLocation, setGuessLocation] = useState<google.maps.LatLng | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  // Load Google Maps
  useEffect(() => {
    loadGoogleMapsScript().then(() => {
      setMapsLoaded(true);
    }).catch(console.error);
  }, []);

  // Initialize new round
  const initializeRound = useCallback(() => {
    if (!mapsLoaded) return;

    const randomCoord = COORDINATES[Math.floor(Math.random() * COORDINATES.length)];
    const [lat, lng] = randomCoord.split(',').map(Number);
    const location = new google.maps.LatLng(lat, lng);
    
    setCurrentLocation(location);
    setGuessLocation(null);
    setGameState(prev => ({
      ...prev,
      isRoundEnded: false,
      timerCount: TIMER_DURATION,
      isTimerRunning: true
    }));
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
    if (mapsLoaded && gameState.currentRound === 1 && gameState.rounds.length === 0) {
      initializeRound();
    }
  }, [mapsLoaded, gameState.currentRound, gameState.rounds.length, initializeRound]);

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
        isRoundEnded: false
      }));
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
      isTimerRunning: false
    });
    initializeRound();
  };

  const handleMapClick = (latLng: google.maps.LatLng) => {
    setGuessLocation(latLng);
  };

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
      <StreetView location={currentLocation} />
      
      <MiniMap 
        onMapClick={handleMapClick}
        guessLocation={guessLocation}
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