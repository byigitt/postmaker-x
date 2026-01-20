/**
 * Scoring weights based on X algorithm research
 * These weights approximate the Phoenix ML model's weighted scorer
 */

export const ENGAGEMENT_WEIGHTS = {
  // High-value positive signals
  favorite: 0.15,
  reply: 0.18,
  retweet: 0.16,
  quote: 0.14,
  share: 0.12,
  shareViaDm: 0.08,
  shareViaCopyLink: 0.06,

  // Medium-value signals
  click: 0.04,
  profileClick: 0.06,
  photoExpand: 0.05,
  videoQualityView: 0.08,
  dwell: 0.10,
  dwellTime: 0.08,
  followAuthor: 0.10,

  // Negative signals (subtract from score)
  notInterested: -0.20,
  blockAuthor: -0.25,
  muteAuthor: -0.18,
  report: -0.30,
} as const;

/**
 * Content feature weights for local scoring
 */
export const CONTENT_WEIGHTS = {
  // Positive content features
  hasQuestion: 0.12,
  hasThread: 0.10,
  hasMedia: 0.08,
  optimalLength: 0.06,
  hasCTA: 0.08,
  hasHook: 0.10,
  goodReadability: 0.05,
  hasValue: 0.10,

  // Negative content features
  tooManyHashtags: -0.12,
  allCaps: -0.08,
  tooShort: -0.06,
  tooLong: -0.04,
  linkOnly: -0.10,
  spamPattern: -0.15,
  lowEffort: -0.08,
} as const;

/**
 * Author diversity decay parameters
 * Based on: multiplier(n) = (1 - floor) * decay^n + floor
 */
export const AUTHOR_DIVERSITY = {
  decayFactor: 0.75,
  floor: 0.15,
} as const;

/**
 * Out-of-network score multiplier
 */
export const OON_WEIGHT_FACTOR = 0.65;

/**
 * Optimal post length range
 */
export const OPTIMAL_LENGTH = {
  min: 80,
  max: 280,
  ideal: 180,
} as const;

/**
 * Maximum values before penalties
 */
export const LIMITS = {
  maxHashtags: 2,
  maxMentions: 3,
  maxLinks: 1,
  maxEmojis: 5,
  threadMaxLength: 10,
} as const;
