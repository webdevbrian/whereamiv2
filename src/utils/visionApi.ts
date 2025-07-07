import html2canvas from 'html2canvas';
import { VisionApiResponse } from '../types/clue';

export const analyzeStreetViewImage = async (panorama: google.maps.StreetViewPanorama): Promise<string> => {
  const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Cloud Vision API key not found');
  }

  try {
    // Capture the current Street View as an image
    const imageData = await captureStreetView(panorama);
    
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

const captureStreetView = async (panorama: google.maps.StreetViewPanorama): Promise<string> => {
  try {
    // Get the Street View div using the panorama's container
    const streetViewDiv = (panorama as any).getDiv?.() || document.querySelector('[data-street-view]') as HTMLElement;
    
    if (!streetViewDiv) {
      // Fallback: try to find the Street View container in the DOM
      const containers = document.querySelectorAll('div[style*="position"]');
      let foundContainer: HTMLElement | null = null;
      
      for (const container of containers) {
        const element = container as HTMLElement;
        if (element.style.position === 'absolute' && 
            element.style.width === '100%' && 
            element.style.height === '100%') {
          foundContainer = element;
          break;
        }
      }
      
      if (!foundContainer) {
        throw new Error('Could not find Street View container');
      }
      
      // Use html2canvas to capture the Street View
      const canvas = await html2canvas(foundContainer, {
        width: 640,
        height: 480,
        useCORS: true,
        allowTaint: true,
        scale: 1,
        logging: false
      });

      return canvas.toDataURL('image/jpeg', 0.8);
    }

    // Use html2canvas to capture the Street View
    const canvas = await html2canvas(streetViewDiv, {
      width: 640,
      height: 480,
      useCORS: true,
      allowTaint: true,
      scale: 1,
      logging: false
    });

    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (error) {
    console.error('Failed to capture Street View:', error);
    throw new Error('Could not capture Street View image');
  }
};

const generateClueFromVisionData = (visionResponse: any): string => {
  const clues: string[] = [];
  
  // Process text detection
  if (visionResponse.textAnnotations && visionResponse.textAnnotations.length > 0) {
    const texts = visionResponse.textAnnotations.slice(1, 4); // Skip the first one (full text)
    const languages = new Set<string>();
    
    texts.forEach((text: any) => {
      if (text.locale) {
        languages.add(text.locale);
      }
    });

    if (languages.size > 0) {
      const languageNames = Array.from(languages).map(lang => {
        const langMap: { [key: string]: string } = {
          'en': 'English',
          'es': 'Spanish',
          'fr': 'French',
          'de': 'German',
          'it': 'Italian',
          'pt': 'Portuguese',
          'ru': 'Russian',
          'ja': 'Japanese',
          'ko': 'Korean',
          'zh': 'Chinese',
          'ar': 'Arabic',
          'hi': 'Hindi'
        };
        return langMap[lang] || lang;
      });
      clues.push(`I can see text in ${languageNames.join(', ')}`);
    }
  }

  // Process landmarks
  if (visionResponse.landmarkAnnotations && visionResponse.landmarkAnnotations.length > 0) {
    const landmark = visionResponse.landmarkAnnotations[0];
    if (landmark.score > 0.5) {
      clues.push(`This looks like it might be near ${landmark.description}`);
    }
  }

  // Process labels for environmental clues
  if (visionResponse.labelAnnotations && visionResponse.labelAnnotations.length > 0) {
    const relevantLabels = visionResponse.labelAnnotations
      .filter((label: any) => label.score > 0.7)
      .slice(0, 3)
      .map((label: any) => label.description.toLowerCase());

    // Look for driving side clues
    if (relevantLabels.some((label: string) => label.includes('car') || label.includes('vehicle') || label.includes('road'))) {
      clues.push("I can see vehicles and roads");
    }

    // Look for architectural clues
    const architecturalTerms = ['building', 'architecture', 'house', 'structure'];
    if (relevantLabels.some((label: string) => architecturalTerms.some(term => label.includes(term)))) {
      clues.push("The architecture might give away the region");
    }

    // Look for vegetation clues
    const vegetationTerms = ['tree', 'plant', 'vegetation', 'palm', 'pine'];
    if (relevantLabels.some((label: string) => vegetationTerms.some(term => label.includes(term)))) {
      clues.push("The vegetation suggests a specific climate zone");
    }
  }

  // Process logos for commercial clues
  if (visionResponse.logoAnnotations && visionResponse.logoAnnotations.length > 0) {
    const logos = visionResponse.logoAnnotations
      .filter((logo: any) => logo.score > 0.6)
      .slice(0, 2);
    
    if (logos.length > 0) {
      clues.push("I can spot some commercial signage that might indicate the region");
    }
  }

  // Generate final clue
  if (clues.length === 0) {
    return "I'm analyzing the visual clues, but this location is quite challenging to identify from the imagery alone. Look for architectural styles, vegetation, and any visible text or signs!";
  }

  const clueText = clues.join(', ') + '. ';
  const suggestions = [
    "Look for license plates, road signs, or architectural styles",
    "Pay attention to the driving side and road markings",
    "Check for any visible text or commercial signage",
    "Notice the vegetation and landscape features"
  ];

  const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
  
  return `${clueText}${randomSuggestion}!`;
};