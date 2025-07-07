import { VisionApiResponse } from '../types/clue';

interface LocationGuess {
  location: string;
  region?: string;
  confidence: 'VERY HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;
}

export const analyzeStreetViewImage = async (panorama: google.maps.StreetViewPanorama): Promise<string> => {
  const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Cloud Vision API key not found');
  }

  try {
    // Capture the exact current view at multiple resolutions
    const images = await captureCurrentViewMultipleResolutions(panorama);
    
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
                { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 20 }, // Better for text in images
                { type: 'TEXT_DETECTION', maxResults: 20 },
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

const captureCurrentViewMultipleResolutions = async (panorama: google.maps.StreetViewPanorama): Promise<string[]> => {
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

    // Capture the exact current view at different resolutions for better text detection
    const resolutions = [
      { size: '1024x1024', fov: 90 },  // High resolution, normal FOV
      { size: '800x800', fov: 60 },    // Medium resolution, narrow FOV for text
      { size: '640x640', fov: 45 }     // Lower resolution, very narrow FOV for signs
    ];

    const imagePromises = resolutions.map(async (config) => {
      const params = new URLSearchParams({
        size: config.size,
        location: `${position.lat()},${position.lng()}`,
        heading: (currentPov.heading || 0).toString(),
        pitch: (currentPov.pitch || 0).toString(),
        fov: config.fov.toString(),
        key: mapsApiKey
      });

      const staticUrl = `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;

      try {
        const response = await fetch(staticUrl);
        
        if (!response.ok) {
          console.warn(`Street View Static API failed for resolution ${config.size}: ${response.statusText}`);
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
        console.warn(`Failed to capture image at resolution ${config.size}:`, error);
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
    objects: [] as string[],
    documentText: [] as string[]
  };
  
  // Combine all responses
  visionResponses.forEach(response => {
    // Process document text detection (better for signs and text)
    if (response.fullTextAnnotation && response.fullTextAnnotation.text) {
      const fullText = response.fullTextAnnotation.text.toLowerCase();
      const filteredText = filterGoogleCopyright(fullText);
      if (filteredText) {
        combinedFeatures.documentText.push(filteredText);
      }
      
      // Extract language from document text
      if (response.fullTextAnnotation.pages && response.fullTextAnnotation.pages[0]) {
        const page = response.fullTextAnnotation.pages[0];
        if (page.property && page.property.detectedLanguages) {
          page.property.detectedLanguages.forEach((lang: any) => {
            combinedFeatures.languages.add(lang.languageCode);
          });
        }
      }
    }

    // Process regular text detection with very low confidence threshold
    if (response.textAnnotations && response.textAnnotations.length > 0) {
      const texts = response.textAnnotations.slice(1, 10); // More text samples
      
      texts.forEach((text: any) => {
        if (text.locale) {
          combinedFeatures.languages.add(text.locale);
        }
        if (text.description && text.description.length > 0) {
          const filteredText = filterGoogleCopyright(text.description.toLowerCase());
          if (filteredText) {
            combinedFeatures.textContent.push(filteredText);
          }
        }
      });
    }

    // Process landmarks with very low threshold
    if (response.landmarkAnnotations && response.landmarkAnnotations.length > 0) {
      const landmarks = response.landmarkAnnotations.filter((landmark: any) => landmark.score > 0.1);
      combinedFeatures.landmarks.push(...landmarks);
    }

    // Process labels with low threshold
    if (response.labelAnnotations && response.labelAnnotations.length > 0) {
      const labels = response.labelAnnotations
        .filter((label: any) => label.score > 0.4)
        .map((label: any) => label.description.toLowerCase());
      combinedFeatures.labels.push(...labels);
    }

    // Process logos with very low threshold
    if (response.logoAnnotations && response.logoAnnotations.length > 0) {
      const logos = response.logoAnnotations.filter((logo: any) => logo.score > 0.2);
      combinedFeatures.logos.push(...logos);
    }

    // Process object localization
    if (response.localizedObjectAnnotations && response.localizedObjectAnnotations.length > 0) {
      const objects = response.localizedObjectAnnotations
        .filter((obj: any) => obj.score > 0.4)
        .map((obj: any) => obj.name.toLowerCase());
      combinedFeatures.objects.push(...objects);
    }
  });

  // Remove duplicates
  combinedFeatures.labels = [...new Set(combinedFeatures.labels)];
  combinedFeatures.objects = [...new Set(combinedFeatures.objects)];
  combinedFeatures.textContent = [...new Set(combinedFeatures.textContent)];
  combinedFeatures.documentText = [...new Set(combinedFeatures.documentText)];

  // Log detected features for debugging
  console.log('Detected features:', {
    languages: Array.from(combinedFeatures.languages),
    textContent: combinedFeatures.textContent,
    documentText: combinedFeatures.documentText,
    landmarks: combinedFeatures.landmarks.map(l => l.description),
    logos: combinedFeatures.logos.map(l => l.description)
  });

  return generateAdvancedRegionalGuesses(combinedFeatures);
};

const filterGoogleCopyright = (text: string): string | null => {
  // Remove Google copyright and watermark text - more comprehensive filtering
  const googleTerms = [
    'google',
    'gle', // Common OCR misread of "Google"
    '© google',
    '©google',
    'google inc',
    'google llc',
    'google 2022',
    'google 2023',
    'google 2024',
    'google 2025',
    '2022',
    '2023', 
    '2024',
    '2025',
    '02022',
    '02023',
    '02024', 
    '02025',
    '©',
    'copyright',
    'street view',
    'streetview',
    'maps',
    'map data',
    'mapdata',
    'imagery',
    'image',
    'satellite',
    'data',
    'terms',
    'report',
    'problem',
    'keyboard',
    'shortcuts'
  ];
  
  let filteredText = text.trim();
  
  // Split by common separators and filter each part
  const lines = filteredText.split('\n');
  const filteredLines = lines.filter(line => {
    const cleanLine = line.trim().toLowerCase();
    
    // Skip empty lines
    if (cleanLine.length === 0) return false;
    
    // Skip lines that are just years or partial years
    if (/^0?\d{4}$/.test(cleanLine)) return false;
    
    // Skip very short fragments that are likely OCR errors from Google watermark
    if (cleanLine.length <= 3 && /^[gl©e,\s\d]+$/.test(cleanLine)) return false;
    
    // Skip lines that contain only Google copyright terms
    const isGoogleCopyright = googleTerms.some(term => {
      return cleanLine === term || 
             cleanLine.startsWith(term + ' ') || 
             cleanLine.endsWith(' ' + term) ||
             (cleanLine.length <= 20 && cleanLine.includes(term)) ||
             // Handle common OCR misreads like "gle, 02024, gle"
             /^[gl©e,\s\d]+$/.test(cleanLine);
    });
    
    return !isGoogleCopyright;
  });
  
  filteredText = filteredLines.join(' ').trim();
  
  // Additional cleanup for remaining Google terms and OCR artifacts
  googleTerms.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    filteredText = filteredText.replace(regex, '').trim();
  });
  
  // Remove common OCR artifacts from Google watermark
  filteredText = filteredText
    .replace(/\bgle\b/gi, '') // Common misread of "Google"
    .replace(/\b0?202[2-5]\b/g, '') // Years with or without leading zero
    .replace(/[©,]+/g, '') // Copyright symbols and commas
    .replace(/\s+/g, ' ') // Multiple spaces
    .replace(/^[,\s]+|[,\s]+$/g, '') // Leading/trailing punctuation
    .trim();
  
  // Clean up extra spaces and punctuation
  filteredText = filteredText
    .replace(/\s+/g, ' ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();
  
  // Return null if the text is too short or empty after filtering
  return filteredText.length > 2 ? filteredText : null;
};

const generateAdvancedRegionalGuesses = (features: any): string => {
  const guesses: LocationGuess[] = [];
  
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
        'zh-cn': { locations: [{ location: 'China' }], confidence: 'VERY HIGH' },
        'zh-tw': { locations: [{ location: 'Taiwan' }], confidence: 'VERY HIGH' },
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
        'tr': { locations: [{ location: 'Turkey' }], confidence: 'HIGH' },
        'el': { locations: [{ location: 'Greece' }], confidence: 'HIGH' },
        'bg': { locations: [{ location: 'Bulgaria' }], confidence: 'HIGH' },
        'ro': { locations: [{ location: 'Romania' }], confidence: 'HIGH' },
        'hr': { locations: [{ location: 'Croatia' }], confidence: 'HIGH' },
        'sr': { locations: [{ location: 'Serbia' }], confidence: 'HIGH' },
        'sk': { locations: [{ location: 'Slovakia' }], confidence: 'HIGH' },
        'sl': { locations: [{ location: 'Slovenia' }], confidence: 'HIGH' },
        'et': { locations: [{ location: 'Estonia' }], confidence: 'HIGH' },
        'lv': { locations: [{ location: 'Latvia' }], confidence: 'HIGH' },
        'lt': { locations: [{ location: 'Lithuania' }], confidence: 'HIGH' },
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
  const textAnalysis = analyzeTextContent([...features.textContent, ...features.documentText]);
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

  // Show detected text even if no location guesses
  const detectedText = [...features.textContent, ...features.documentText]
    .filter(text => text.length > 1)
    .slice(0, 5);

  // Generate the enhanced clue text
  if (sortedGuesses.length === 0) {
    // Fall back on vegetation and environmental features when no strong location indicators
    const environmentalFeatures = getEnvironmentalFeatures(features.labels, features.objects);
    const vegetationGuess = getVegetationBasedGuess(features.labels, features.objects);
    
    if (vegetationGuess || environmentalFeatures.length > 0) {
      let fallbackText = "🤖 **Environmental Analysis**:\n\n";
      
      if (vegetationGuess) {
        fallbackText += `🌿 ${vegetationGuess}\n\n`;
      }
      
      if (environmentalFeatures.length > 0) {
        fallbackText += `🏞️ **Environment**: ${environmentalFeatures.join(', ')}\n\n`;
      }
      
      if (detectedText.length > 0) {
        fallbackText += `📝 **Text found**: ${detectedText.slice(0, 3).join(', ')}\n\n`;
      }
      
      fallbackText += "💡 Look for license plates, road signs, and architectural styles to narrow down the location!";
      return fallbackText;
    }
    
    if (detectedText.length > 0) {
      return `🤖 I can see some text but couldn't determine the location\n\n📝 **Text found**: ${detectedText.slice(0, 3).join(', ')}\n\n🔍 Try adjusting your view to capture more distinctive features!`;
    }
    return "🤖 Unable to determine location from current view\n\n🔍 Try adjusting your view to capture more text, signs, or distinctive features!";
  }

  let clueText = "🤖 **Location Analysis**:\n\n";
  
  sortedGuesses.forEach((guess, index) => {
    const confidenceEmoji = {
      'VERY HIGH': '🎯',
      'HIGH': '🎪', 
      'MEDIUM': '🎨',
      'LOW': '📍'
    }[guess.confidence];
    
    const priority = ['1st', '2nd', '3rd'][index];
    
    if (guess.region && guess.region !== guess.location) {
      clueText += `${confidenceEmoji} ${priority}: ${guess.location} (${guess.region})\n`;
    } else {
      clueText += `${confidenceEmoji} ${priority}: ${guess.location}\n`;
    }
    clueText += `   ${guess.reasoning}\n\n`;
  });

  // Add detected text if available
  if (detectedText.length > 0) {
    clueText += `📝 **Text found**: ${detectedText.slice(0, 3).join(', ')}\n\n`;
  }

  // Add environmental features if detected
  const environmentalFeatures = getEnvironmentalFeatures(features.labels, features.objects);
  if (environmentalFeatures.length > 0) {
    clueText += `🌿 **Environment**: ${environmentalFeatures.join(', ')}\n\n`;
  }

  clueText += "💡 Look for license plates, road signs, and architectural styles to confirm!";
  
  return clueText;
};

const getEnvironmentalFeatures = (labels: string[], objects: string[]): string[] => {
  const features: string[] = [];
  const allFeatures = [...labels, ...objects];

  // Vegetation
  if (allFeatures.some(f => ['palm', 'coconut', 'tropical'].some(term => f.includes(term)))) {
    features.push('tropical vegetation');
  }
  if (allFeatures.some(f => ['pine', 'conifer', 'evergreen', 'spruce'].some(term => f.includes(term)))) {
    features.push('coniferous trees');
  }
  if (allFeatures.some(f => ['deciduous', 'oak', 'maple', 'birch'].some(term => f.includes(term)))) {
    features.push('deciduous trees');
  }
  if (allFeatures.some(f => ['desert', 'cactus', 'arid'].some(term => f.includes(term)))) {
    features.push('desert landscape');
  }

  // Architecture
  if (allFeatures.some(f => ['pagoda', 'temple', 'shrine'].some(term => f.includes(term)))) {
    features.push('Asian architecture');
  }
  if (allFeatures.some(f => ['colonial', 'victorian', 'georgian'].some(term => f.includes(term)))) {
    features.push('colonial architecture');
  }
  if (allFeatures.some(f => ['modern', 'skyscraper', 'glass'].some(term => f.includes(term)))) {
    features.push('modern buildings');
  }

  // Climate indicators
  if (allFeatures.some(f => ['snow', 'ice', 'winter'].some(term => f.includes(term)))) {
    features.push('cold climate');
  }
  if (allFeatures.some(f => ['beach', 'ocean', 'coastal'].some(term => f.includes(term)))) {
    features.push('coastal area');
  }
  if (allFeatures.some(f => ['mountain', 'hill', 'alpine'].some(term => f.includes(term)))) {
    features.push('mountainous terrain');
  }

  // Urban vs rural
  if (allFeatures.some(f => ['city', 'urban', 'downtown', 'metropolitan'].some(term => f.includes(term)))) {
    features.push('urban environment');
  }
  if (allFeatures.some(f => ['rural', 'countryside', 'farm', 'field'].some(term => f.includes(term)))) {
    features.push('rural area');
  }

  return features.slice(0, 3); // Limit to 3 most relevant features
};

const getVegetationBasedGuess = (labels: string[], objects: string[]): string | null => {
  const allFeatures = [...labels, ...objects];

  // Tropical indicators
  if (allFeatures.some(f => ['palm', 'coconut', 'tropical', 'banana', 'mango'].some(term => f.includes(term)))) {
    return "Tropical climate suggests: Caribbean, Southeast Asia, Southern US, or Pacific islands";
  }

  // Temperate forest indicators
  if (allFeatures.some(f => ['oak', 'maple', 'deciduous', 'autumn', 'fall'].some(term => f.includes(term)))) {
    return "Deciduous forest suggests: Eastern US, Europe, or temperate regions";
  }

  // Coniferous forest indicators
  if (allFeatures.some(f => ['pine', 'spruce', 'fir', 'conifer', 'evergreen'].some(term => f.includes(term)))) {
    return "Coniferous forest suggests: Northern regions like Canada, Scandinavia, or Russia";
  }

  // Mediterranean indicators
  if (allFeatures.some(f => ['olive', 'cypress', 'lavender', 'rosemary'].some(term => f.includes(term)))) {
    return "Mediterranean vegetation suggests: Southern Europe, California, or similar climate zones";
  }

  // Desert indicators
  if (allFeatures.some(f => ['cactus', 'desert', 'arid', 'succulent', 'sage'].some(term => f.includes(term)))) {
    return "Desert vegetation suggests: Southwestern US, Mexico, Australia, or Middle East";
  }

  // Grassland indicators
  if (allFeatures.some(f => ['prairie', 'grassland', 'wheat', 'corn', 'farmland'].some(term => f.includes(term)))) {
    return "Agricultural landscape suggests: Midwest US, Central Europe, or farming regions";
  }

  return null;
};
const analyzeTextContent = (textContent: string[]): LocationGuess[] => {
  const guesses: LocationGuess[] = [];
  
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

const analyzeLogos = (logos: any[]): LocationGuess[] => {
  const guesses: LocationGuess[] = [];
  
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

const analyzeEnvironmentalFeatures = (labels: string[], objects: string[]): LocationGuess[] => {
  const guesses: LocationGuess[] = [];
  const allFeatures = [...labels, ...objects];

  // Vehicle and transportation analysis for regional identification
  const vehicleAnalysis = analyzeVehicleFeatures(allFeatures);
  guesses.push(...vehicleAnalysis);

  // Vegetation-based regional indicators
  if (allFeatures.some(feature => ['palm', 'coconut', 'tropical'].some(term => feature.includes(term)))) {
    guesses.push({
      location: 'Tropical/Subtropical region',
      region: 'Southern US, Mediterranean, Southeast Asia, or Caribbean',
      confidence: 'MEDIUM',
      reasoning: 'Tropical vegetation detected'
    });
  }

  if (allFeatures.some(feature => ['pine', 'conifer', 'evergreen', 'spruce'].some(term => feature.includes(term)))) {
    guesses.push({
      location: 'Northern temperate region',
      region: 'Scandinavia, Canada, Northern US, or Russia',
      confidence: 'MEDIUM',
      reasoning: 'Coniferous trees suggest northern climate'
    });
  }

  // Desert and arid climate indicators
  if (allFeatures.some(feature => ['desert', 'cactus', 'arid', 'sand', 'dune'].some(term => feature.includes(term)))) {
    guesses.push({
      location: 'Arid/Desert region',
      region: 'Southwestern US, Middle East, Australia, or North Africa',
      confidence: 'MEDIUM',
      reasoning: 'Desert landscape and arid vegetation detected'
    });
  }

  // Architectural style indicators
  if (allFeatures.some(feature => ['pagoda', 'temple', 'shrine'].some(term => feature.includes(term)))) {
    guesses.push({
      location: 'East Asia',
      region: 'Japan, China, Korea, or Southeast Asia',
      confidence: 'MEDIUM',
      reasoning: 'Asian architectural elements detected'
    });
  }

  // European architectural indicators
  if (allFeatures.some(feature => ['gothic', 'baroque', 'medieval', 'castle', 'cathedral'].some(term => feature.includes(term)))) {
    guesses.push({
      location: 'Europe',
      region: 'Western or Central Europe',
      confidence: 'MEDIUM',
      reasoning: 'European architectural style detected'
    });
  }

  return guesses;
};

const getLanguageName = (code: string): string => {
  const languageNames: { [key: string]: string } = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian',
    'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese',
    'zh-cn': 'Chinese (Simplified)', 'zh-tw': 'Chinese (Traditional)',
    'ar': 'Arabic', 'hi': 'Hindi', 'th': 'Thai', 'vi': 'Vietnamese', 'id': 'Indonesian',
    'ms': 'Malay', 'tl': 'Filipino', 'nl': 'Dutch', 'sv': 'Swedish', 'no': 'Norwegian',
    'da': 'Danish', 'fi': 'Finnish', 'pl': 'Polish', 'cs': 'Czech', 'hu': 'Hungarian',
    'tr': 'Turkish', 'el': 'Greek', 'bg': 'Bulgarian', 'ro': 'Romanian', 'hr': 'Croatian',
    'sr': 'Serbian', 'sk': 'Slovak', 'sl': 'Slovenian', 'et': 'Estonian', 'lv': 'Latvian',
    'lt': 'Lithuanian'
  };
  return languageNames[code] || code.toUpperCase();
};

const analyzeVehicleFeatures = (features: string[]): LocationGuess[] => {
  const guesses: LocationGuess[] = [];

  // European vehicle indicators
  if (features.some(f => ['mercedes', 'bmw', 'audi', 'volkswagen', 'volvo', 'peugeot', 'renault', 'fiat'].some(brand => f.includes(brand)))) {
    guesses.push({
      location: 'Europe',
      region: 'Likely Germany, France, Italy, or Scandinavia',
      confidence: 'HIGH',
      reasoning: 'European vehicle brands detected'
    });
  }

  // American vehicle indicators
  if (features.some(f => ['ford', 'chevrolet', 'dodge', 'cadillac', 'lincoln', 'jeep'].some(brand => f.includes(brand)))) {
    guesses.push({
      location: 'North America',
      region: 'United States or Canada',
      confidence: 'HIGH',
      reasoning: 'American vehicle brands detected'
    });
  }

  // Japanese vehicle indicators
  if (features.some(f => ['toyota', 'honda', 'nissan', 'mazda', 'subaru', 'mitsubishi', 'suzuki'].some(brand => f.includes(brand)))) {
    guesses.push({
      location: 'Asia-Pacific region',
      region: 'Japan, Southeast Asia, or Australia',
      confidence: 'MEDIUM',
      reasoning: 'Japanese vehicle brands detected'
    });
  }

  // Korean vehicle indicators
  if (features.some(f => ['hyundai', 'kia', 'genesis'].some(brand => f.includes(brand)))) {
    guesses.push({
      location: 'Asia or global market',
      region: 'South Korea or international location',
      confidence: 'MEDIUM',
      reasoning: 'Korean vehicle brands detected'
    });
  }

  // Truck and commercial vehicle analysis
  if (features.some(f => ['truck', 'lorry', 'semi', 'trailer'].some(term => f.includes(term)))) {
    // European truck characteristics
    if (features.some(f => ['scania', 'volvo truck', 'man truck', 'mercedes truck', 'iveco'].some(brand => f.includes(brand)))) {
      guesses.push({
        location: 'Europe',
        region: 'European trucking indicates EU region',
        confidence: 'HIGH',
        reasoning: 'European commercial vehicles detected'
      });
    }
    // American truck characteristics
    else if (features.some(f => ['peterbilt', 'kenworth', 'freightliner', 'mack truck'].some(brand => f.includes(brand)))) {
      guesses.push({
        location: 'North America',
        region: 'United States or Canada',
        confidence: 'HIGH',
        reasoning: 'American commercial vehicles detected'
      });
    }
  }

  // Bus and public transport indicators
  if (features.some(f => ['double decker', 'red bus'].some(term => f.includes(term)))) {
    guesses.push({
      location: 'United Kingdom',
      region: 'England, Scotland, Wales, or Northern Ireland',
      confidence: 'HIGH',
      reasoning: 'British-style double-decker bus detected'
    });
  }

  // Taxi indicators
  if (features.some(f => ['yellow cab', 'yellow taxi'].some(term => f.includes(term)))) {
    guesses.push({
      location: 'United States',
      region: 'Likely New York City or major US city',
      confidence: 'HIGH',
      reasoning: 'Yellow taxi cab detected'
    });
  }

  if (features.some(f => ['black cab', 'london taxi'].some(term => f.includes(term)))) {
    guesses.push({
      location: 'United Kingdom',
      region: 'London or major UK city',
      confidence: 'HIGH',
      reasoning: 'British black cab detected'
    });
  }

  // Motorcycle and scooter indicators
  if (features.some(f => ['vespa', 'scooter'].some(term => f.includes(term)))) {
    guesses.push({
      location: 'Mediterranean region',
      region: 'Italy, Greece, or Southern Europe',
      confidence: 'MEDIUM',
      reasoning: 'Scooter culture suggests Mediterranean region'
    });
  }

  // Bicycle infrastructure indicators
  if (features.some(f => ['bicycle lane', 'bike lane', 'cycling'].some(term => f.includes(term)))) {
    guesses.push({
      location: 'Northern Europe',
      region: 'Netherlands, Denmark, or Germany',
      confidence: 'MEDIUM',
      reasoning: 'Extensive cycling infrastructure detected'
    });
  }

  return guesses;
};