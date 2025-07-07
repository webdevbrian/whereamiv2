export const calculateDistance = (
  location1: google.maps.LatLng,
  location2: google.maps.LatLng
): number => {
  const distance = google.maps.geometry.spherical.computeDistanceBetween(location1, location2);
  return Math.ceil(distance / 1000); // Convert to kilometers
};

export const calculatePoints = (distanceKm: number): number => {
  if (distanceKm >= 1 && distanceKm <= 2) return 10000;
  if (distanceKm >= 3 && distanceKm <= 10) return 7000;
  if (distanceKm >= 11 && distanceKm <= 50) return 4000;
  if (distanceKm >= 51 && distanceKm <= 200) return 3000;
  if (distanceKm >= 201 && distanceKm <= 500) return 2000;
  if (distanceKm >= 501 && distanceKm <= 800) return 1000;
  if (distanceKm >= 801 && distanceKm <= 1300) return 500;
  if (distanceKm >= 1301 && distanceKm <= 1600) return 400;
  if (distanceKm >= 1601 && distanceKm <= 2300) return 300;
  if (distanceKm >= 2301 && distanceKm <= 2800) return 200;
  if (distanceKm >= 2801 && distanceKm <= 3200) return 100;
  if (distanceKm >= 3200 && distanceKm <= 4500) return 50;
  if (distanceKm >= 4501 && distanceKm <= 6000) return 25;
  return 0;
};