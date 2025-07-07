import { VisionApiResponse } from '../types/clue';

export const analyzeStreetViewImage = async (panorama: google.maps.StreetViewPanorama): Promise<string> => {
  const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Cloud Vision API key not found');
  }

  try {
    // Capture multiple high-quality images from different angles
    const images = await captureMultipleStreetViewImages(panorama);
    
    // Analyze all images and combine results
    const allResults = await Promise.all(
      images.map(async (imageData, index) => {
        const visionRequest = {
          requests: [
            {
              image: {
                content: imageData.split(',')[1] // Remove data:image/jpeg;base64, prefix
              },
              features: [
                { type: 'TEXT_DETECTION', maxResults: 15 },
                { type: 'LABEL_DETECTION', maxResults: 15 },
                { type: 'LANDMARK_DETECTION', maxResults: 10 },
                { type: 'LOGO_DETECTION', maxResults: 10 },
                { type: 'OBJECT_LOCALIZATION', maxResults: 10 }
              ]
            }
          ]
        };

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
          console.warn(`Vision API request ${index + 1} failed: ${response.statusText}`);
          return null;
        }

        const visionData: VisionApiResponse = await response.json();
        
        if (visionData.responses[0]?.error) {
          console.warn(`Vision API error for image ${index + 1}: ${visionData.responses[0].error.message}`);
          return null;
        }

        return visionData.responses[0];
      })
    );

    // Filter out failed requests and combine results
    const validResults = allResults.filter(result => result !== null);
    
    if (validResults.length === 0) {
      throw new Error('All Vision API requests failed');
    }

    // Process combined results into a helpful clue
    return generateEnhancedClueFromVisionData(validResults);

  } catch (error) {
    console.error('Vision API error:', error);
    throw error;
  }
};

const captureMultipleStreetViewImages = async (panorama: google.maps.StreetViewPanorama): Promise<string[]> => {
  try {
    const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!mapsApiKey) {
      throw new Error('Google Maps API key not found');
    }

    // Get current panorama state
    const position = panorama.getPosition();
    const currentPov = panorama.getPov();
    
    if (!position) {
      throw new Error('Could not get panorama position');
    }

    // Define multiple angles to capture more context
    const captureAngles = [
      { heading: currentPov.heading || 0, pitch: currentPov.pitch || 0, fov: 120 }, // Current view with wider FOV
      { heading: (currentPov.heading || 0) + 90, pitch: 0, fov: 90 }, // Right view
      { heading: (currentPov.heading || 0) - 90, pitch: 0, fov: 90 }, // Left view
    ];

    const imagePromises = captureAngles.map(async (angle) => {
      const params = new URLSearchParams({
        size: '1024x1024', // Higher resolution for better text detection
        location: `${position.lat()},${position.lng()}`,
        heading: angle.heading.toString(),
        pitch: angle.pitch.toString(),
        fov: angle.fov.toString(),
        key: mapsApiKey
      });

      const staticUrl = `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;

      try {
        const response = await fetch(staticUrl);
        
        if (!response.ok) {
          console.warn(`Street View Static API failed for angle ${angle.heading}: ${response.statusText}`);
          return null;
        }

        const blob = await response.blob();
        
        return new Promise<string>((resolve, reject) => {
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
        console.warn(`Failed to capture image at angle ${angle.heading}:`, error);
        return null;
      }
    });

    const results = await Promise.all(imagePromises);
    const validImages = results.filter(img => img !== null) as string[];
    
    if (validImages.length === 0) {
      throw new Error('Failed to capture any Street View images');
    }

    return validImages;

  } catch (error) {
    console.error('Failed to capture Street View images:', error);
    throw new Error('Could not capture Street View images');
  }
};

const generateEnhancedClueFromVisionData = (visionResponses: any[]): string => {
  const combinedFeatures = {
    languages: new Set<string>(),
    landmarks: [] as any[],
    labels: [] as string[],
    logos: [] as any[],
    textContent: [] as string[],
    objects: [] as string[]
  };
  
  // Combine all responses
  visionResponses.forEach(response => {
    // Process text detection with lower confidence threshold
    if (response.textAnnotations && response.textAnnotations.length > 0) {
      const texts = response.textAnnotations.slice(1, 8); // More text samples
      
      texts.forEach((text: any) => {
        if (text.locale) {
          combinedFeatures.languages.add(text.locale);
        }
        if (text.description && text.description.length > 1) {
          combinedFeatures.textContent.push(text.description.toLowerCase());
        }
      });
    }

    // Process landmarks with lower threshold
    if (response.landmarkAnnotations && response.landmarkAnnotations.length > 0) {
      const landmarks = response.landmarkAnnotations.filter((landmark: any) => landmark.score > 0.3);
      combinedFeatures.landmarks.push(...landmarks);
    }

    // Process labels with lower threshold
    if (response.labelAnnotations && response.labelAnnotations.length > 0) {
      const labels = response.labelAnnotations
        .filter((label: any) => label.score > 0.5)
        .map((label: any) => label.description.toLowerCase());
      combinedFeatures.labels.push(...labels);
    }

    // Process logos with lower threshold
    if (response.logoAnnotations && response.logoAnnotations.length > 0) {
      const logos = response.logoAnnotations.filter((logo: any) => logo.score > 0.4);
      combinedFeatures.logos.push(...logos);
    }

    // Process object localization
    if (response.localizedObjectAnnotations && response.localizedObjectAnnotations.length > 0) {
      const objects = response.localizedObjectAnnotations
        .filter((obj: any) => obj.score > 0.5)
        .map((obj: any) => obj.name.toLowerCase());
      combinedFeatures.objects.push(...objects);
    }
  });

  // Remove duplicates and generate enhanced regional guesses
  combinedFeatures.labels = [...new Set(combinedFeatures.labels)];
  combinedFeatures.objects = [...new Set(combinedFeatures.objects)];
  combinedFeatures.textContent = [...new Set(combinedFeatures.textContent)];

  return generateAdvancedRegionalGuesses(combinedFeatures);
};

const generateAdvancedRegionalGuesses = (features: any): string => {
  const guesses: Array<{ 
    location: string; 
    region?: string; 
    confidence: 'VERY HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';
    reasoning: string;
  }> = [];
  
  // Landmark-based guesses (highest confidence)
  if (features.landmarks.length > 0) {
    const topLandmarks = features.landmarks
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 2);
    
    topLandmarks.forEach((landmark: any) => {
      guesses.push({
        location: 'Landmark identified',
        region: landmark.description,
        confidence: 'VERY HIGH',
        reasoning: `Detected landmark: ${landmark.description}`
      });
    });
  }

  // Language-based guesses (very high confidence)
  if (features.languages.size > 0) {
    const languages = Array.from(features.languages) as string[];
    
    languages.forEach((lang: string) => {
      const languageRegions: { [key: string]: { 
        locations: Array<{location: string, region?: string}>, 
        confidence: 'VERY HIGH' | 'HIGH' | 'MEDIUM' 
      } } = {
        'ru': { 
          locations: [
            { location: 'Russia' },
            { location: 'Ukraine' },
            { location: 'Belarus' },
            { location: 'Kazakhstan' }
          ], 
          confidence: 'VERY HIGH' 
        },
        'zh': { 
          locations: [
            { location: 'China' },
            { location: 'Taiwan' },
            { location: 'Singapore' }
          ], 
          confidence: 'VERY HIGH' 
        },
        'ja': { locations: [{ location: 'Japan' }], confidence: 'VERY HIGH' },
        'ko': { locations: [{ location: 'South Korea' }], confidence: 'VERY HIGH' },
        'ar': { 
          locations: [
            { location: 'Saudi Arabia' },
            { location: 'UAE' },
            { location: 'Egypt' },
            { location: 'Jordan' }
          ], 
          confidence: 'VERY HIGH' 
        },
        'hi': { locations: [{ location: 'India' }], confidence: 'VERY HIGH' },
        'th': { locations: [{ location: 'Thailand' }], confidence: 'VERY HIGH' },
        'vi': { locations: [{ location: 'Vietnam' }], confidence: 'VERY HIGH' },
        'id': { locations: [{ location: 'Indonesia' }], confidence: 'VERY HIGH' },
        'ms': { locations: [{ location: 'Malaysia' }, { location: 'Indonesia' }], confidence: 'VERY HIGH' },
        'tl': { locations: [{ location: 'Philippines' }], confidence: 'VERY HIGH' },
        'de': { 
          locations: [
            { location: 'Germany' },
            { location: 'Austria' },
            { location: 'Switzerland' }
          ], 
          confidence: 'HIGH' 
        },
        'fr': { 
          locations: [
            { location: 'France' },
            { location: 'Belgium' },
            { location: 'Switzerland' },
            { location: 'Canada', region: 'Quebec' }
          ], 
          confidence: 'HIGH' 
        },
        'es': { 
          locations: [
            { location: 'Spain' },
            { location: 'Mexico' },
            { location: 'Argentina' },
            { location: 'Colombia' }
          ], 
          confidence: 'HIGH' 
        },
        'pt': { 
          locations: [
            { location: 'Brazil' },
            { location: 'Portugal' }
          ], 
          confidence: 'HIGH' 
        },
        'it': { locations: [{ location: 'Italy' }], confidence: 'HIGH' },
        'nl': { locations: [{ location: 'Netherlands' }, { location: 'Belgium' }], confidence: 'HIGH' },
        'sv': { locations: [{ location: 'Sweden' }], confidence: 'HIGH' },
        'no': { locations: [{ location: 'Norway' }], confidence: 'HIGH' },
        'da': { locations: [{ location: 'Denmark' }], confidence: 'HIGH' },
        'fi': { locations: [{ location: 'Finland' }], confidence: 'HIGH' },
        'pl': { locations: [{ location: 'Poland' }], confidence: 'HIGH' },
        'cs': { locations: [{ location: 'Czech Republic' }], confidence: 'HIGH' },
        'hu': { locations: [{ location: 'Hungary' }], confidence: 'HIGH' },
        'en': { 
          locations: [
            { location: 'United States' },
            { location: 'United Kingdom' },
            { location: 'Canada' },
            { location: 'Australia' },
            { location: 'New Zealand' }
          ], 
          confidence: 'MEDIUM' 
        }
      };
      
      if (languageRegions[lang]) {
        const { locations, confidence } = languageRegions[lang];
        locations.slice(0, 3).forEach(location => {
          guesses.push({
            location: location.location,
            region: location.region,
            confidence,
            reasoning: `Text detected in ${getLanguageName(lang)}`
          });
        });
      }
    });
  }

  // Text content analysis for specific clues
  const textAnalysis = analyzeTextContent(features.textContent);
  guesses.push(...textAnalysis);

  // Logo-based commercial guesses
  if (features.logos.length > 0) {
    const logoAnalysis = analyzeLogos(features.logos);
    guesses.push(...logoAnalysis);
  }

  // Environmental and architectural analysis
  const environmentalAnalysis = analyzeEnvironmentalFeatures(features.labels, features.objects);
  guesses.push(...environmentalAnalysis);

  // Sort by confidence and remove duplicates
  const confidenceOrder: { [key in 'VERY HIGH' | 'HIGH' | 'MEDIUM' | 'LOW']: number } = { 
    'VERY HIGH': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 
  };
  
  const uniqueGuesses = guesses.filter((guess, index, self) => 
    index === self.findIndex(g => g.location === guess.location && g.region === guess.region)
  );
  
  const sortedGuesses = uniqueGuesses
    .sort((a, b) => confidenceOrder[b.confidence] - confidenceOrder[a.confidence])
    .slice(0, 4);

  // Generate the enhanced clue text
  if (sortedGuesses.length === 0) {
    return "🤖 **My analysis**: Unable to determine location from current view\n\n🔍 **Suggestion**: Try adjusting your view to capture more text, signs, or distinctive features before requesting another clue!";
  }

  let clueText = "🤖 **My location analysis**:\n\n";
  
  sortedGuesses.forEach((guess, index) => {
    const confidenceEmoji = {
      'VERY HIGH': '🎯',
      'HIGH': '🎪', 
      'MEDIUM': '🎨',
      'LOW': '📍'
    }[guess.confidence];
    
    const priority = ['1st', '2nd', '3rd', '4th'][index];
    
    if (guess.region) {
      clueText += `${confidenceEmoji} **${priority} guess**: ${guess.location} (${guess.region})\n`;
    } else {
      clueText += `${confidenceEmoji} **${priority} guess**: ${guess.location}\n`;
    }
    clueText += `   *${guess.reasoning}* - ${guess.confidence} confidence\n\n`;
  });

  clueText += "💡 **Tip**: Look for license plates, road signs, architectural styles, and vegetation patterns to confirm!";
  
  return clueText;
};

const analyzeTextContent = (textContent: string[]): Array<{
  location: string; 
  region?: string; 
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;
}> => {
  const guesses = [];
  
  // Look for country/region indicators in text
  const locationKeywords = {
    'usa': { location: 'United States', confidence: 'HIGH' as const },
    'canada': { location: 'Canada', confidence: 'HIGH' as const },
    'australia': { location: 'Australia', confidence: 'HIGH' as const },
    'uk': { location: 'United Kingdom', confidence: 'HIGH' as const },
    'britain': { location: 'United Kingdom', confidence: 'HIGH' as const },
    'deutschland': { location: 'Germany', confidence: 'HIGH' as const },
    'france': { location: 'France', confidence: 'HIGH' as const },
    'italia': { location: 'Italy', confidence: 'HIGH' as const },
    'espana': { location: 'Spain', confidence: 'HIGH' as const },
    'brasil': { location: 'Brazil', confidence: 'HIGH' as const },
    'mexico': { location: 'Mexico', confidence: 'HIGH' as const },
    'japan': { location: 'Japan', confidence: 'HIGH' as const },
    'korea': { location: 'South Korea', confidence: 'HIGH' as const },
    'china': { location: 'China', confidence: 'HIGH' as const },
    'india': { location: 'India', confidence: 'HIGH' as const },
    'russia': { location: 'Russia', confidence: 'HIGH' as const },
  };

  textContent.forEach(text => {
    Object.entries(locationKeywords).forEach(([keyword, data]) => {
      if (text.includes(keyword)) {
        guesses.push({
          ...data,
          reasoning: `Text contains "${keyword}"`
        });
      }
    });
  });

  return guesses;
};

const analyzeLogos = (logos: any[]): Array<{
  location: string; 
  region?: string; 
  confidence: 'HIGH' | 'MEDIUM';
  reasoning: string;
}> => {
  const guesses = [];
  
  // Regional brand associations
  const brandRegions: { [key: string]: { location: string, region?: string, confidence: 'HIGH' | 'MEDIUM' } } = {
    'walmart': { location: 'United States', confidence: 'HIGH' },
    'target': { location: 'United States', confidence: 'HIGH' },
    'tim hortons': { location: 'Canada', confidence: 'HIGH' },
    'tesco': { location: 'United Kingdom', confidence: 'HIGH' },
    'carrefour': { location: 'France', confidence: 'HIGH' },
    'aldi': { location: 'Germany', confidence: 'MEDIUM' },
    'lidl': { location: 'Germany', confidence: 'MEDIUM' },
    'woolworths': { location: 'Australia', confidence: 'HIGH' },
    'coles': { location: 'Australia', confidence: 'HIGH' },
  };

  logos.forEach((logo: any) => {
    const logoName = logo.description.toLowerCase();
    Object.entries(brandRegions).forEach(([brand, data]) => {
      if (logoName.includes(brand)) {
        guesses.push({
          ...data,
          reasoning: `Detected ${logo.description} logo`
        });
      }
    });
  });

  return guesses;
};

const analyzeEnvironmentalFeatures = (labels: string[], objects: string[]): Array<{
  location: string; 
  region?: string; 
  confidence: 'MEDIUM' | 'LOW';
  reasoning: string;
}> => {
  const guesses = [];
  const allFeatures = [...labels, ...objects];

  // Vegetation-based regional indicators
  if (allFeatures.some(feature => ['palm', 'coconut', 'tropical'].some(term => feature.includes(term)))) {
    guesses.push({
      location: 'Tropical/Subtropical region',
      region: 'Southern US, Mediterranean, Southeast Asia, or Caribbean',
      confidence: 'MEDIUM' as const,
      reasoning: 'Tropical vegetation detected'
    });
  }

  if (allFeatures.some(feature => ['pine', 'conifer', 'evergreen', 'spruce'].some(term => feature.includes(term)))) {
    guesses.push({
      location: 'Northern temperate region',
      region: 'Scandinavia, Canada, Northern US, or Russia',
      confidence: 'MEDIUM' as const,
      reasoning: 'Coniferous trees suggest northern climate'
    });
  }

  // Architectural style indicators
  if (allFeatures.some(feature => ['pagoda', 'temple', 'shrine'].some(term => feature.includes(term)))) {
    guesses.push({
      location: 'East Asia',
      region: 'Japan, China, Korea, or Southeast Asia',
      confidence: 'MEDIUM' as const,
      reasoning: 'Asian architectural elements detected'
    });
  }

  // Vehicle and infrastructure indicators
  if (allFeatures.some(feature => ['double decker', 'red bus'].some(term => feature.includes(term)))) {
    guesses.push({
      location: 'United Kingdom',
      confidence: 'MEDIUM' as const,
      reasoning: 'British-style bus detected'
    });
  }

  return guesses;
};

const getLanguageName = (code: string): string => {
  const languageNames: { [key: string]: string } = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian',
    'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese',
    'ar': 'Arabic', 'hi': 'Hindi', 'th': 'Thai', 'vi': 'Vietnamese', 'id': 'Indonesian',
    'ms': 'Malay', 'tl': 'Filipino', 'nl': 'Dutch', 'sv': 'Swedish', 'no': 'Norwegian',
    'da': 'Danish', 'fi': 'Finnish', 'pl': 'Polish', 'cs': 'Czech', 'hu': 'Hungarian'
  };
  return languageNames[code] || code.toUpperCase();
};