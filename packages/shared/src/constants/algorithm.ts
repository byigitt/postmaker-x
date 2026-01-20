/**
 * X Algorithm constants and insights
 * Derived from x-algorithm repository research
 */

/**
 * Content age thresholds
 */
export const CONTENT_AGE = {
  maxAgeDays: 7,
  freshnessBoostHours: 4,
  recencyDecayFactor: 0.95,
} as const;

/**
 * Engagement signal descriptions for UI
 */
export const SIGNAL_DESCRIPTIONS = {
  favorite: 'Probability user will like the post',
  reply: 'Probability user will reply to the post',
  retweet: 'Probability user will retweet the post',
  quote: 'Probability user will quote tweet',
  share: 'Probability user will share the post',
  dwell: 'Expected time user spends viewing',
  followAuthor: 'Probability user will follow after seeing',
  notInterested: 'Probability user marks "Not Interested"',
  blockAuthor: 'Probability user will block',
  muteAuthor: 'Probability user will mute',
  report: 'Probability user will report',
} as const;

/**
 * Engagement type categories
 */
export const ENGAGEMENT_CATEGORIES = {
  highValue: ['reply', 'retweet', 'quote', 'share'] as const,
  mediumValue: ['favorite', 'dwell', 'followAuthor'] as const,
  lowValue: ['click', 'profileClick', 'photoExpand'] as const,
  negative: ['notInterested', 'blockAuthor', 'muteAuthor', 'report'] as const,
} as const;

/**
 * Post style optimization targets
 */
export const STYLE_TARGETS = {
  informative: {
    primaryEngagement: 'retweet',
    secondaryEngagement: 'favorite',
    contentPattern: 'value_with_data',
  },
  controversial: {
    primaryEngagement: 'quote',
    secondaryEngagement: 'reply',
    contentPattern: 'hot_take_with_opinion',
  },
  question: {
    primaryEngagement: 'reply',
    secondaryEngagement: 'favorite',
    contentPattern: 'open_ended_question',
  },
  thread: {
    primaryEngagement: 'dwell',
    secondaryEngagement: 'retweet',
    contentPattern: 'educational_breakdown',
  },
  story: {
    primaryEngagement: 'dwell',
    secondaryEngagement: 'share',
    contentPattern: 'personal_narrative',
  },
  hook: {
    primaryEngagement: 'click',
    secondaryEngagement: 'reply',
    contentPattern: 'curiosity_gap',
  },
} as const;

/**
 * Optimal posting hours (24h format, UTC-based patterns)
 * Based on general X engagement patterns
 */
export const OPTIMAL_HOURS = {
  weekday: {
    morning: [7, 8, 9],
    lunch: [12, 13],
    evening: [17, 18, 19, 20],
  },
  weekend: {
    morning: [9, 10, 11],
    afternoon: [14, 15, 16],
    evening: [19, 20, 21],
  },
} as const;

/**
 * Day of week engagement multipliers
 */
export const DAY_MULTIPLIERS = {
  monday: 0.95,
  tuesday: 1.05,
  wednesday: 1.10,
  thursday: 1.08,
  friday: 0.98,
  saturday: 0.85,
  sunday: 0.88,
} as const;

/**
 * Thread optimization guidelines
 */
export const THREAD_GUIDELINES = {
  optimalLength: { min: 3, max: 7 },
  firstTweetMaxChars: 260,
  subsequentMaxChars: 280,
  hookRequired: true,
  ctaInLast: true,
  breakPoints: ['numbered_list', 'story_arc', 'lesson_breakdown'],
} as const;

/**
 * Content patterns that trigger positive signals
 */
export const POSITIVE_PATTERNS = [
  { pattern: /\?$/, signal: 'question', boost: 0.12 },
  { pattern: /thread|1\/\d|🧵/, signal: 'thread', boost: 0.10 },
  { pattern: /here's what|this is how|let me explain/i, signal: 'value', boost: 0.08 },
  { pattern: /unpopular opinion|hot take|controversial/i, signal: 'controversy', boost: 0.10 },
  { pattern: /\d+ (things|ways|tips|lessons)/i, signal: 'listicle', boost: 0.07 },
] as const;

/**
 * Content patterns that trigger negative signals
 */
export const NEGATIVE_PATTERNS = [
  { pattern: /#\w+\s#\w+\s#\w+\s#\w+/, signal: 'too_many_hashtags', penalty: -0.12 },
  { pattern: /^[A-Z\s!]+$/, signal: 'all_caps', penalty: -0.08 },
  { pattern: /^https?:\/\/\S+$/, signal: 'link_only', penalty: -0.10 },
  { pattern: /follow for follow|f4f|like4like/i, signal: 'spam', penalty: -0.15 },
  { pattern: /dm me|link in bio/i, signal: 'cta_spam', penalty: -0.05 },
] as const;
