export interface Post {
  id: string;
  content: string;
  mediaUrls?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PostDraft {
  content: string;
  mediaUrls?: string[];
  isThread?: boolean;
  threadParts?: string[];
}

export interface ThreadPost {
  order: number;
  content: string;
  mediaUrl?: string;
}

export interface GeneratedPost {
  content: string;
  threadParts?: string[];
  score: number;
  suggestions: string[];
  engagementPrediction: EngagementPrediction;
}

export interface EngagementPrediction {
  likes: number;
  replies: number;
  retweets: number;
  quotes: number;
  shares: number;
  dwellTime: number;
}

export type PostStyle = 'informative' | 'controversial' | 'question' | 'thread' | 'story' | 'hook';

export type TargetEngagement = 'likes' | 'replies' | 'retweets' | 'quotes' | 'shares' | 'all';

export interface PostGenerationRequest {
  topic: string;
  style: PostStyle;
  targetEngagement: TargetEngagement;
  constraints?: PostConstraints;
}

export interface PostConstraints {
  maxLength?: number;
  minLength?: number;
  includeHashtags?: boolean;
  maxHashtags?: number;
  includeEmojis?: boolean;
  includeCTA?: boolean;
  tone?: 'professional' | 'casual' | 'humorous' | 'provocative';
}
