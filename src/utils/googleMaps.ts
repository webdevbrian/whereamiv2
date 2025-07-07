// Module-level variable to store the promise and prevent multiple script loads
let scriptPromise: Promise<void> | null = null;

export const loadGoogleMapsScript = (): Promise<void> => {
  // If we already have a promise (script is loading or loaded), return it
  if (scriptPromise) {
    return scriptPromise;
  }

  // If Google Maps is already loaded, return a resolved promise
  if ((window as any).google && (window as any).google.maps) {
    scriptPromise = Promise.resolve();
    return scriptPromise;
  }

  // Create a new promise for loading the script
  scriptPromise = new Promise((resolve, reject) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyAPWKAKs_6bAGx8p6l1As3IpZsX2VrA1xU';
    if (!apiKey) {
      reject(new Error('Google Maps API key not found. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file.'));
      return;
    }

    // Check if script is already in the DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Script already exists, wait for it to load
      if ((window as any).google && (window as any).google.maps) {
        resolve();
      } else {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')));
      }
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    
    document.head.appendChild(script);
  });

  return scriptPromise;
};