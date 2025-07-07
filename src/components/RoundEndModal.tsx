import { useEffect, useRef } from 'react';
import { GameRound } from '../types/game';

interface RoundEndModalProps {
  round: GameRound;
  onContinue: () => void;
}

const RoundEndModal: React.FC<RoundEndModalProps> = ({ round, onContinue }) => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current || !round.actualLocation) return;

    const mapOptions: google.maps.MapOptions = {
      zoom: 2,
      center: round.actualLocation,
      mapTypeControl: false,
      streetViewControl: false,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    const map = new google.maps.Map(mapRef.current, mapOptions);

    // Add actual location marker
    new google.maps.Marker({
      position: round.actualLocation,
      map: map,
      title: 'Actual Location',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#10b981" stroke="white" stroke-width="2"/>
            <circle cx="16" cy="16" r="4" fill="white"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16)
      }
    });

    // Add guess location marker if it exists
    if (round.guessLocation) {
      new google.maps.Marker({
        position: round.guessLocation,
        map: map,
        title: 'Your Guess',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="#ef4444" stroke="white" stroke-width="2"/>
              <circle cx="16" cy="16" r="4" fill="white"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16)
        }
      });

      // Draw line between points
      new google.maps.Polyline({
        path: [round.actualLocation, round.guessLocation],
        geodesic: true,
        strokeColor: '#6b7280',
        strokeOpacity: 1.0,
        strokeWeight: 2,
        map: map
      });

      // Adjust bounds to show both markers
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(round.actualLocation);
      bounds.extend(round.guessLocation);
      map.fitBounds(bounds);
    }
  }, [round]);

  if (round.timedOut) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>Time's Up! ⏰</h2>
          <p>You took too long to make a guess!</p>
          <p>You didn't score any points this round.</p>
          <button className="btn btn-primary" onClick={onContinue}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Round {round.roundNumber} Results</h2>
        <p>Your guess was</p>
        <h1>{round.distance.toLocaleString()} km</h1>
        <p>away from the actual location.</p>
        
        <div ref={mapRef} className="round-map" />
        
        <p>You scored</p>
        <h1 style={{ color: '#059669' }}>{round.points.toLocaleString()}</h1>
        <p>points this round!</p>
        
        <button className="btn btn-primary" onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
};

export default RoundEndModal;