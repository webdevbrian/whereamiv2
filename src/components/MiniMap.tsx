import { useEffect, useRef, memo } from 'react';

interface MiniMapProps {
  onMapClick: (latLng: google.maps.LatLng) => void;
  guessLocation: google.maps.LatLng | null;
}

const MiniMap: React.FC<MiniMapProps> = memo(({ onMapClick, guessLocation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const mapOptions: google.maps.MapOptions = {
      center: new google.maps.LatLng(0, 0),
      zoom: 1,
      mapTypeControl: false,
      streetViewControl: false,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      fullscreenControl: false,
      zoomControl: true,
      scaleControl: false
    };

    mapInstanceRef.current = new google.maps.Map(mapRef.current, mapOptions);

    // Add click listener
    mapInstanceRef.current.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        onMapClick(event.latLng);
      }
    });
  }, [onMapClick]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (guessLocation) {
      if (markerRef.current) {
        markerRef.current.setPosition(guessLocation);
      } else {
        markerRef.current = new google.maps.Marker({
          position: guessLocation,
          map: mapInstanceRef.current,
          title: 'Your guess',
          draggable: false
        });
      }
    } else if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
  }, [guessLocation]);

  return (
    <div
      ref={mapRef}
      style={{
        width: '300px',
        height: '300px',
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        boxShadow: '0px 0px 20px rgba(255, 255, 255, 0.9)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    />
  );
});

MiniMap.displayName = 'MiniMap';

export default MiniMap;