export interface GameRound {
  roundNumber: number;
  actualLocation: google.maps.LatLng;
  guessLocation: google.maps.LatLng | null;
  distance: number;
  points: number;
  timedOut: boolean;
}

export interface GameState {
  currentRound: number;
  totalScore: number;
  rounds: GameRound[];
  isGameEnded: boolean;
  isRoundEnded: boolean;
  timerCount: number;
  isTimerRunning: boolean;
}