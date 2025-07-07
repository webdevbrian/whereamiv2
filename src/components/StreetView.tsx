import { useEffect, useRef } from 'react';

interface StreetViewProps {
  location: google.maps.LatLng | null;
  onPanoramaLoad?: (panorama: google.maps.StreetViewPanorama) => void;
}

const StreetView: React.FC<StreetViewProps> = ({ location, onPanoramaLoad }) => {
  const streetViewRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);

  useEffect(() => {
    if (!location || !streetViewRef.current) return;

    const streetViewService = new google.maps.StreetViewService();
    const STREETVIEW_MAX_DISTANCE = 100;

    streetViewService.getPanorama(
      { location: location, radius: STREETVIEW_MAX_DISTANCE },
      (_data: google.maps.StreetViewPanoramaData | null, status: google.maps.StreetViewStatus) => {
        if (status === google.maps.StreetViewStatus.OK && streetViewRef.current) {
          const panoramaOptions: google.maps.StreetViewPanoramaOptions = {
            position: location,
            addressControl: false,
            linksControl: false,
            pov: {
              heading: 270,
              pitch: -10
            },
            visible: true,
            motionTracking: false,
            motionTrackingControl: false
          };

          if (panoramaRef.current) {
            panoramaRef.current.setOptions(panoramaOptions);
          } else {
            panoramaRef.current = new google.maps.StreetViewPanorama(
              streetViewRef.current,
              panoramaOptions
            );
            
            // Notify parent component that panorama is loaded
            if (onPanoramaLoad) {
              onPanoramaLoad(panoramaRef.current);
            }
          }
        } else {
          console.error('Street View not available for this location');
        }
      }
    );
  }, [location]);

  return (
    <div
      ref={streetViewRef}
      data-street-view="true"
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 999
      }}
    />
  );
};

export default StreetView;