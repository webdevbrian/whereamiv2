// Generate random coordinates with higher probability in populated areas
export const generateRandomLocation = (): google.maps.LatLng => {
  // Define regions with higher Street View coverage
  const regions = [
    // North America
    { minLat: 25, maxLat: 60, minLng: -130, maxLng: -60, weight: 0.25 },
    // Europe
    { minLat: 35, maxLat: 70, minLng: -10, maxLng: 40, weight: 0.25 },
    // East Asia
    { minLat: 20, maxLat: 50, minLng: 100, maxLng: 145, weight: 0.15 },
    // Australia/New Zealand
    { minLat: -45, maxLat: -10, minLng: 110, maxLng: 180, weight: 0.1 },
    // South America
    { minLat: -55, maxLat: 15, minLng: -80, maxLng: -35, weight: 0.1 },
    // Southeast Asia
    { minLat: -10, maxLat: 25, minLng: 95, maxLng: 140, weight: 0.1 },
    // Global fallback (less likely)
    { minLat: -60, maxLat: 70, minLng: -180, maxLng: 180, weight: 0.05 }
  ];

  // Select region based on weights
  const random = Math.random();
  let cumulativeWeight = 0;
  let selectedRegion = regions[regions.length - 1]; // fallback

  for (const region of regions) {
    cumulativeWeight += region.weight;
    if (random <= cumulativeWeight) {
      selectedRegion = region;
      break;
    }
  }

  // Generate random coordinates within the selected region
  const lat = selectedRegion.minLat + Math.random() * (selectedRegion.maxLat - selectedRegion.minLat);
  const lng = selectedRegion.minLng + Math.random() * (selectedRegion.maxLng - selectedRegion.minLng);

  return new google.maps.LatLng(lat, lng);
};

// Find a valid Street View location near the random coordinates
export const findValidStreetViewLocation = (
  initialLocation: google.maps.LatLng,
  maxAttempts: number = 10
): Promise<google.maps.LatLng> => {
  return new Promise((resolve, reject) => {
    const streetViewService = new google.maps.StreetViewService();
    let attempts = 0;

    const tryLocation = (location: google.maps.LatLng) => {
      attempts++;
      
      streetViewService.getPanorama(
        { 
          location: location, 
          radius: 100000, // 100km radius - much larger search area
          source: google.maps.StreetViewSource.OUTDOOR
        },
        (data: google.maps.StreetViewPanoramaData | null, status: google.maps.StreetViewStatus) => {
          if (status === google.maps.StreetViewStatus.OK && data?.location?.latLng) {
            resolve(data.location.latLng);
          } else if (attempts < maxAttempts) {
            // Try a new random location
            const newLocation = generateRandomLocation();
            console.log(`Attempt ${attempts}: Trying new location at ${newLocation.lat()}, ${newLocation.lng()}`);
            tryLocation(newLocation);
          } else {
            reject(new Error(`Could not find valid Street View location after ${maxAttempts} attempts`));
          }
        }
      );
    };

    tryLocation(initialLocation);
  });
};