export interface PostAnalysis {
  overallScore: number;
  engagementScores: EngagementScores;
  contentMetrics: ContentMetrics;
  algorithmSignals: AlgorithmSignals;
  suggestions: Suggestion[];
  warnings: Warning[];
}

export interface EngagementScores {
  likeability: number;
  replyability: number;
  retweetability: number;
  quoteability: number;
  shareability: number;
  dwellPotential: number;
  followPotential: number;
}

export interface ContentMetrics {
  characterCount: number;
  wordCount: number;
  sentenceCount: number;
  readingTimeSeconds: number;
  hasMedia: boolean;
  mediaCount: number;
  hasQuestion: boolean;
  questionCount: number;
  hasHashtags: boolean;
  hashtagCount: number;
  hasMentions: boolean;
  mentionCount: number;
  hasLinks: boolean;
  linkCount: number;
  hasEmojis: boolean;
  emojiCount: number;
  hasCTA: boolean;
  isThread: boolean;
  threadLength: number;
}

export interface AlgorithmSignals {
  positiveSignals: SignalScore[];
  negativeSignals: SignalScore[];
  neutralSignals: SignalScore[];
}

export interface SignalScore {
  name: string;
  score: number;
  weight: number;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface Suggestion {
  type: SuggestionType;
  priority: 'high' | 'medium' | 'low';
  message: string;
  action?: string;
  potentialScoreIncrease: number;
}

export type SuggestionType =
  | 'add_question'
  | 'add_cta'
  | 'add_media'
  | 'reduce_length'
  | 'increase_length'
  | 'add_thread'
  | 'remove_hashtags'
  | 'add_hook'
  | 'improve_readability'
  | 'add_controversy'
  | 'add_value'
  | 'remove_links'
  | 'fix_formatting';

export interface Warning {
  type: WarningType;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  scoreImpact: number;
}

export type WarningType =
  | 'too_many_hashtags'
  | 'all_caps'
  | 'too_short'
  | 'too_long'
  | 'link_only'
  | 'spam_pattern'
  | 'low_engagement_pattern'
  | 'negative_sentiment';

export interface AnalysisHistory {
  id: string;
  postContent: string;
  analysis: PostAnalysis;
  createdAt: Date;
}
