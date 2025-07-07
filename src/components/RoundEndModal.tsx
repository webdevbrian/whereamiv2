import { useEffect, useRef } from 'react';
import { GameRound } from '../types/game';

interface RoundEndModalProps {
  round: GameRound;
  onContinue: () => void;
}

const getScoreDescription = (distance: number, points: number): string => {
  if (points >= 7000) return "🎯 Excellent guess! You were very close!";
  if (points >= 4000) return "🎪 Great job! That's a solid guess!";
  if (points >= 2000) return "🎨 Not bad! You're in the right region!";
  if (points >= 1000) return "📍 Getting warmer! Keep practicing!";
  if (points >= 500) return "🌍 That's quite far, but you're learning!";
  if (points > 0) return "🗺️ Way off, but every guess teaches you something!";
  return "❌ No points this time, but don't give up!";
};

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
    const actualMarker = new google.maps.Marker({
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

    // Add persistent tooltip for actual location
    const actualInfoWindow = new google.maps.InfoWindow({
      content: '<div style="font-weight: bold; color: #10b981;">✅ Actual Location</div>',
      disableAutoPan: true
    });
    actualInfoWindow.open(map, actualMarker);

    // Add guess location marker if it exists
    if (round.guessLocation) {
      const guessMarker = new google.maps.Marker({
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

      // Add persistent tooltip for guess location
      const guessInfoWindow = new google.maps.InfoWindow({
        content: '<div style="font-weight: bold; color: #ef4444;">📍 Your Guess</div>',
        disableAutoPan: true
      });
      guessInfoWindow.open(map, guessMarker);

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
          <div style={{ 
            background: '#fef2f2', 
            padding: '1rem', 
            borderRadius: '8px', 
            margin: '1rem 0',
            border: '1px solid #fecaca'
          }}>
            <h3 style={{ 
              color: '#dc2626', 
              margin: '0 0 0.5rem 0', 
              fontSize: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              ⏰ Round {round.roundNumber} Score
            </h3>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: '#dc2626',
              margin: '0.5rem 0'
            }}>
              0 points
            </div>
            <div style={{ 
              fontSize: '0.9rem', 
              color: '#6b7280',
              fontStyle: 'italic'
            }}>
              ⏱️ Time ran out - no points awarded
            </div>
          </div>
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
        <p>Your guess was <strong>{round.distance.toLocaleString()} km</strong> away from the actual location.</p>
        
        <div ref={mapRef} className="round-map" />
        
        <div style={{ 
          background: '#f8f9fa', 
          padding: '1rem', 
          borderRadius: '8px', 
          margin: '1rem 0',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ 
            color: '#059669', 
            margin: '0 0 0.5rem 0', 
            fontSize: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            🏆 Round {round.roundNumber} Score
          </h3>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            color: '#059669',
            margin: '0.5rem 0'
          }}>
            {round.points.toLocaleString()} points
          </div>
          <div style={{ 
            fontSize: '0.9rem', 
            color: '#6b7280',
            fontStyle: 'italic'
          }}>
            {getScoreDescription(round.distance, round.points)}
          </div>
        </div>
        
        <button className="btn btn-primary" onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
};

export default RoundEndModal;