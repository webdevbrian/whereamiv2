export interface ClueData {
  text: string;
  confidence: number;
  isLoading: boolean;
  error?: string;
}

export interface VisionApiResponse {
  responses: Array<{
    textAnnotations?: Array<{
      description: string;
      locale?: string;
    }>;
    labelAnnotations?: Array<{
      description: string;
      score: number;
    }>;
    landmarkAnnotations?: Array<{
      description: string;
      score: number;
    }>;
    logoAnnotations?: Array<{
      description: string;
      score: number;
    }>;
    error?: {
      code: number;
      message: string;
    };
  }>;
}