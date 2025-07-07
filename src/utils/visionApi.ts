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
  const guesses: Array<{ region: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW'; reasoning: string }> = [];
  
  // Language-based guesses (highest confidence)
  if (features.languages.size > 0) {
    const languages = Array.from(features.languages) as string[];
    
    languages.forEach((lang: string) => {
      const languageRegions: { [key: string]: { regions: string[], confidence: 'HIGH' | 'MEDIUM' } } = {
        'ru': { regions: ['Russia', 'Eastern Europe (Ukraine, Belarus)'], confidence: 'HIGH' },
        'zh': { regions: ['China', 'Taiwan'], confidence: 'HIGH' },
        'ja': { regions: ['Japan'], confidence: 'HIGH' },
        'ko': { regions: ['South Korea'], confidence: 'HIGH' },
        'ar': { regions: ['Middle East', 'North Africa'], confidence: 'HIGH' },
        'hi': { regions: ['India'], confidence: 'HIGH' },
        'th': { regions: ['Thailand'], confidence: 'HIGH' },
        'de': { regions: ['Germany', 'Austria', 'Switzerland'], confidence: 'MEDIUM' },
        'fr': { regions: ['France', 'Belgium', 'Switzerland'], confidence: 'MEDIUM' },
        'es': { regions: ['Spain', 'Latin America'], confidence: 'MEDIUM' },
        'pt': { regions: ['Portugal', 'Brazil'], confidence: 'MEDIUM' },
        'it': { regions: ['Italy'], confidence: 'MEDIUM' },
        'en': { regions: ['English-speaking countries'], confidence: 'LOW' }
      };
      
      if (languageRegions[lang]) {
        const { regions, confidence } = languageRegions[lang];
        regions.forEach(region => {
          guesses.push({
            region,
            confidence,
            reasoning: `Cyrillic/Asian/Arabic script detected` // Will be refined below
          });
        });
      }
    });
  }
  
  // Landmark-based guesses (very high confidence)
  if (features.landmarks.length > 0) {
    features.landmarks.slice(0, 2).forEach((landmark: any) => {
      guesses.push({
        region: `Near ${landmark.description}`,
        confidence: 'HIGH',
        reasoning: 'Landmark recognition'
      });
    });
  }
  
  // Architecture and environment-based guesses (lower confidence)
  // Palm trees suggest tropical/subtropical regions
  if (features.labels.some((label: string) => label.includes('palm'))) {
    guesses.push({
      region: 'Tropical/subtropical region (Southern US, Mediterranean, Southeast Asia)',
      confidence: 'MEDIUM',
      reasoning: 'Palm trees visible'
    });
  }
  
  // Pine/coniferous trees suggest northern regions
  if (features.labels.some((label: string) => ['pine', 'conifer', 'evergreen'].some(term => label.includes(term)))) {
    guesses.push({
      region: 'Northern regions (Scandinavia, Canada, Northern US, Russia)',
      confidence: 'MEDIUM',
      reasoning: 'Coniferous vegetation'
    });
  }
  
  // Road and vehicle analysis
  const vehicleClues = features.labels.filter((label: string) => 
    ['car', 'vehicle', 'truck', 'road', 'street'].some(term => label.includes(term))
  );
  
  if (vehicleClues.length > 0) {
    guesses.push({
      region: 'Developed country with modern infrastructure',
      confidence: 'MEDIUM',
      reasoning: 'Modern vehicles and roads visible'
    });
  }
  
  // Logo-based guesses
  if (features.logos.length > 0) {
    guesses.push({
      region: 'Commercial area in developed country',
      confidence: 'MEDIUM',
      reasoning: 'Commercial signage detected'
    });
  }
  
  // Sort by confidence and take top 3
  const confidenceOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
  const sortedGuesses = guesses
    .sort((a, b) => confidenceOrder[b.confidence] - confidenceOrder[a.confidence])
    .slice(0, 3);
  
  // Generate the clue text
  if (sortedGuesses.length === 0) {
    return "🤖 I'm having trouble identifying specific regional clues from this view. Look for text, license plates, architectural styles, or vegetation that might indicate the location!";
  }
  
  let clueText = "🤖 Based on what I can see:\n\n";
  
  sortedGuesses.forEach((guess) => {
    const confidenceEmoji = guess.confidence === 'HIGH' ? '🎯' : '🎪';
    clueText += `${confidenceEmoji} **${guess.confidence} CONFIDENCE**: This could be ${guess.region}\n`;
  });
  
  // Add specific observations
  const observations: string[] = [];
  
  if (features.languages.size > 0) {
    const languageNames = Array.from(features.languages).map((lang: unknown) => {
      const langCode = lang as string;
      const langMap: { [key: string]: string } = {
        'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
        'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
        'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi', 'th': 'Thai'
      };
      return langMap[langCode] || langCode;
    });
    observations.push(`Text detected in: ${languageNames.join(', ')}`);
  }
  
  if (features.landmarks.length > 0) {
    observations.push(`Landmarks: ${features.landmarks.map((l: any) => l.description).join(', ')}`);
  }
  
  if (observations.length > 0) {
    clueText += `\n📋 **Key observations**: ${observations.join(' • ')}`;
  }

  return clueText;
};