import type {
  PostAnalysis,
  GeneratedPost,
  PostGenerationRequest,
  TimingRecommendation,
  TimingAnalysis,
  PostTemplate,
} from '@postmaker/shared';

const API_BASE = '/api';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const KNOWN_ERROR_MESSAGES = new Set([
  'Invalid content',
  'Content is required',
  'Content too long',
  'Content too short',
  'Invalid request',
  'Invalid parameters',
  'Template not found',
  'Unauthorized',
  'Session expired',
  'Rate limit exceeded',
  'Service temporarily unavailable',
]);

const STATUS_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid request',
  401: 'Unauthorized',
  403: 'Access denied',
  404: 'Not found',
  429: 'Too many requests',
  500: 'Something went wrong',
  502: 'Service temporarily unavailable',
  503: 'Service temporarily unavailable',
  504: 'Request timed out',
};

function sanitizeErrorMessage(status: number, rawMessage?: string): string {
  if (rawMessage && KNOWN_ERROR_MESSAGES.has(rawMessage)) {
    return rawMessage;
  }
  return STATUS_ERROR_MESSAGES[status] ?? 'Something went wrong';
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const rawMessage = (errorData as { message?: string }).message;
    throw new ApiError(
      response.status,
      sanitizeErrorMessage(response.status, rawMessage)
    );
  }

  const json = await response.json() as ApiResponse<T> | T;

  // Unwrap { success, data } format if present
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return (json as ApiResponse<T>).data;
  }

  return json as T;
}

export const api = {
  analyze: (content: string): Promise<PostAnalysis> =>
    request('/analyze', {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  generate: (params: PostGenerationRequest): Promise<GeneratedPost> =>
    request('/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getTimingRecommendation: (timezone?: string): Promise<TimingRecommendation> =>
    request(`/timing${timezone ? `?timezone=${timezone}` : ''}`),

  analyzeCurrentTiming: (timezone?: string): Promise<TimingAnalysis> =>
    request(`/timing/now${timezone ? `?timezone=${timezone}` : ''}`),

  getTemplates: (category?: string): Promise<PostTemplate[]> =>
    request(`/templates${category ? `?category=${category}` : ''}`),

  getTemplate: (id: string): Promise<PostTemplate> =>
    request(`/templates/${id}`),
};
