export interface TimingRecommendation {
  optimalHours: OptimalHour[];
  timezone: string;
  dayOfWeek: DayRecommendation[];
  reasoning: string[];
}

export interface OptimalHour {
  hour: number;
  score: number;
  engagementMultiplier: number;
  audienceActivity: 'low' | 'medium' | 'high' | 'peak';
}

export interface DayRecommendation {
  day: DayOfWeek;
  bestHours: number[];
  overallScore: number;
  reasoning: string;
}

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface PostingSchedule {
  id: string;
  postContent: string;
  scheduledFor: Date;
  timezone: string;
  status: ScheduleStatus;
  createdAt: Date;
}

export type ScheduleStatus = 'pending' | 'posted' | 'failed' | 'cancelled';

export interface TimingAnalysis {
  currentTime: Date;
  timezone: string;
  isOptimalTime: boolean;
  currentScore: number;
  nextOptimalTime: Date;
  nextOptimalScore: number;
  waitTimeMinutes: number;
  recommendation: string;
}
