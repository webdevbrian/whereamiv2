import { VisionApiResponse } from '../types/clue';

export const analyzeStreetViewImage = async (panorama: google.maps.StreetViewPanorama): Promise<string> => {
  const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Cloud Vision API key not found');
  }

  try {
    // Capture the current Street View as an image using Static API
    const imageData = await captureStreetViewStatic(panorama);
    
    // Prepare the Vision API request
    const visionRequest = {
      requests: [
        {
          image: {
            content: imageData.split(',')[1] // Remove data:image/jpeg;base64, prefix
          },
          features: [
            { type: 'TEXT_DETECTION', maxResults: 10 },
            { type: 'LABEL_DETECTION', maxResults: 10 },
            { type: 'LANDMARK_DETECTION', maxResults: 5 },
            { type: 'LOGO_DETECTION', maxResults: 5 }
          ]
        }
      ]
    };

    // Call Google Cloud Vision API
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(visionRequest)
      }
    );

    if (!response.ok) {
      throw new Error(`Vision API request failed: ${response.statusText}`);
    }

    const visionData: VisionApiResponse = await response.json();
    
    if (visionData.responses[0]?.error) {
      throw new Error(`Vision API error: ${visionData.responses[0].error.message}`);
    }

    // Process the Vision API response into a helpful clue
    return generateClueFromVisionData(visionData.responses[0]);

  } catch (error) {
    console.error('Vision API error:', error);
    throw error;
  }
};

const captureStreetViewStatic = async (panorama: google.maps.StreetViewPanorama): Promise<string> => {
  try {
    const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!mapsApiKey) {
      throw new Error('Google Maps API key not found');
    }

    // Get current panorama state
    const position = panorama.getPosition();
    const pov = panorama.getPov();
    
    if (!position) {
      throw new Error('Could not get panorama position');
    }

    // Build Street View Static API URL
    const params = new URLSearchParams({
      size: '640x640', // Square format works well for Vision API
      location: `${position.lat()},${position.lng()}`,
      heading: pov.heading?.toString() || '0',
      pitch: pov.pitch?.toString() || '0',
      fov: '90', // Field of view - 90 degrees is a good balance
      key: mapsApiKey
    });

    const staticUrl = `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;

    // Fetch the image and convert to base64
    const response = await fetch(staticUrl);
    
    if (!response.ok) {
      throw new Error(`Street View Static API failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert image to base64'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read image blob'));
      reader.readAsDataURL(blob);
    });

  } catch (error) {
    console.error('Failed to capture Street View:', error);
    throw new Error('Could not capture Street View image');
  }
};

const generateClueFromVisionData = (visionResponse: any): string => {
  const detectedFeatures = {
    languages: new Set<string>(),
    landmarks: [] as any[],
    labels: [] as string[],
    logos: [] as any[]
  };
  
  // Process text detection
  if (visionResponse.textAnnotations && visionResponse.textAnnotations.length > 0) {
    const texts = visionResponse.textAnnotations.slice(1, 4); // Skip the first one (full text)
    
    texts.forEach((text: any) => {
      if (text.locale) {
        detectedFeatures.languages.add(text.locale);
      }
    });
  }

  // Process landmarks
  if (visionResponse.landmarkAnnotations && visionResponse.landmarkAnnotations.length > 0) {
    detectedFeatures.landmarks = visionResponse.landmarkAnnotations.filter((landmark: any) => landmark.score > 0.4);
  }

  // Process labels for environmental clues
  if (visionResponse.labelAnnotations && visionResponse.labelAnnotations.length > 0) {
    detectedFeatures.labels = visionResponse.labelAnnotations
      .filter((label: any) => label.score > 0.7)
      .slice(0, 5)
      .map((label: any) => label.description.toLowerCase());
  }

  // Process logos for commercial clues
  if (visionResponse.logoAnnotations && visionResponse.logoAnnotations.length > 0) {
    detectedFeatures.logos = visionResponse.logoAnnotations.filter((logo: any) => logo.score > 0.6);
  }

  // Generate regional guesses based on detected features
  return generateRegionalGuesses(detectedFeatures);
};

const generateRegionalGuesses = (features: any): string => {
  const guesses: Array<{ country: string; region?: string; confidence: 'HIGH' | 'MEDIUM' }> = [];
  
  // Language-based guesses (highest confidence)
  if (features.languages.size > 0) {
    const languages = Array.from(features.languages) as string[];
    
    languages.forEach((lang: string) => {
      const languageCountries: { [key: string]: { countries: Array<{country: string, region?: string}>, confidence: 'HIGH' | 'MEDIUM' } } = {
        'ru': { 
          countries: [
            { country: 'Russia' },
            { country: 'Ukraine' },
            { country: 'Belarus' }
          ], 
          confidence: 'HIGH' 
        },
        'zh': { 
          countries: [
            { country: 'China' },
            { country: 'Taiwan' }
          ], 
          confidence: 'HIGH' 
        },
        'ja': { countries: [{ country: 'Japan' }], confidence: 'HIGH' },
        'ko': { countries: [{ country: 'South Korea' }], confidence: 'HIGH' },
        'ar': { 
          countries: [
            { country: 'Saudi Arabia' },
            { country: 'UAE' },
            { country: 'Egypt' }
          ], 
          confidence: 'HIGH' 
        },
        'hi': { countries: [{ country: 'India' }], confidence: 'HIGH' },
        'th': { countries: [{ country: 'Thailand' }], confidence: 'HIGH' },
        'de': { 
          countries: [
            { country: 'Germany' },
            { country: 'Austria' },
            { country: 'Switzerland' }
          ], 
          confidence: 'MEDIUM' 
        },
        'fr': { 
          countries: [
            { country: 'France' },
            { country: 'Belgium' },
            { country: 'Switzerland' }
          ], 
          confidence: 'MEDIUM' 
        },
        'es': { 
          countries: [
            { country: 'Spain' },
            { country: 'Mexico' },
            { country: 'Argentina' }
          ], 
          confidence: 'MEDIUM' 
        },
        'pt': { 
          countries: [
            { country: 'Brazil' },
            { country: 'Portugal' }
          ], 
          confidence: 'MEDIUM' 
        },
        'it': { countries: [{ country: 'Italy' }], confidence: 'MEDIUM' },
        'en': { 
          countries: [
            { country: 'United States' },
            { country: 'United Kingdom' },
            { country: 'Canada' },
            { country: 'Australia' }
          ], 
          confidence: 'MEDIUM' 
        }
      };
      
      if (languageCountries[lang]) {
        const { countries, confidence } = languageCountries[lang];
        countries.slice(0, 2).forEach(location => {
          guesses.push({
            country: location.country,
            region: location.region,
            confidence,
          });
        });
      }
    });
  }
  
  // Landmark-based guesses (very high confidence)
  if (features.landmarks.length > 0) {
    features.landmarks.slice(0, 1).forEach((landmark: any) => {
      guesses.push({
        country: 'Location identified',
        region: landmark.description,
        confidence: 'HIGH',
      });
    });
  }
  
  // Environmental clues for broader regional guesses
  // Palm trees suggest tropical/subtropical regions
  if (features.labels.some((label: string) => label.includes('palm'))) {
    guesses.push({
      country: 'Tropical region',
      region: 'Southern US, Mediterranean, or Southeast Asia',
      confidence: 'MEDIUM',
    });
  }
  
  // Pine/coniferous trees suggest northern regions
  if (features.labels.some((label: string) => ['pine', 'conifer', 'evergreen'].some(term => label.includes(term)))) {
    guesses.push({
      country: 'Northern region',
      region: 'Scandinavia, Canada, Northern US, or Russia',
      confidence: 'MEDIUM',
    });
  }
  
  // Sort by confidence and take top 3
  const confidenceOrder: { [key in 'HIGH' | 'MEDIUM']: number } = { 'HIGH': 3, 'MEDIUM': 2 };
  const sortedGuesses = guesses
    .sort((a, b) => confidenceOrder[b.confidence] - confidenceOrder[a.confidence])
    .slice(0, 3);
  
  // Generate the clue text
  if (sortedGuesses.length === 0) {
    return "🤖 **My location guess**: Unable to determine from current view\n\n🔍 **Confidence**: LOW - No clear identifying features detected";
  }
  
  let clueText = "🤖 **My location guesses**:\n\n";
  
  sortedGuesses.forEach((guess, index) => {
    const confidenceEmoji = guess.confidence === 'HIGH' ? '🎯' : '🎪';
    const priority = index === 0 ? '1st' : index === 1 ? '2nd' : '3rd';
    
    if (guess.region) {
      clueText += `${confidenceEmoji} **${priority} guess**: ${guess.country} (${guess.region}) - ${guess.confidence} confidence\n`;
    } else {
      clueText += `${confidenceEmoji} **${priority} guess**: ${guess.country} - ${guess.confidence} confidence\n`;
    }
  });
  
  return clueText;
};