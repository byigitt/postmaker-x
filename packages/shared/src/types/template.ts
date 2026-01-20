export interface PostTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  template: string;
  placeholders: TemplatePlaceholder[];
  expectedScore: number;
  targetEngagement: TargetEngagementType[];
  examples: string[];
  tips: string[];
}

export type TemplateCategory =
  | 'question'
  | 'thread_starter'
  | 'hot_take'
  | 'story'
  | 'value_bomb'
  | 'cta'
  | 'engagement_hook'
  | 'controversy'
  | 'educational'
  | 'personal';

export type TargetEngagementType = 'likes' | 'replies' | 'retweets' | 'quotes' | 'shares';

export interface TemplatePlaceholder {
  key: string;
  label: string;
  description: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  required: boolean;
}

export interface TemplateUsage {
  templateId: string;
  filledContent: string;
  usedAt: Date;
  resultingScore: number;
}
