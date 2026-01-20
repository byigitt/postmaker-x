import {
  ENGAGEMENT_WEIGHTS,
  CONTENT_WEIGHTS,
  OPTIMAL_LENGTH,
  LIMITS,
  POSITIVE_PATTERNS,
  NEGATIVE_PATTERNS,
  type PostAnalysis,
  type EngagementScores,
  type ContentMetrics,
  type AlgorithmSignals,
  type SignalScore,
  type Suggestion,
  type Warning,
  type SuggestionType,
  type WarningType,
} from '@postmaker/shared';

/**
 * Regex patterns for content analysis
 */
const PATTERNS = {
  question: /\?(?:\s|$)/,
  hashtag: /#\w+/g,
  mention: /@\w+/g,
  link: /https?:\/\/\S+/g,
  emoji: /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
  allCaps: /^[A-Z\s!?.]+$/,
  threadIndicator: /(?:thread|🧵|\d+\/\d+)/i,
  ctaPatterns: /(?:follow|like|retweet|share|comment|subscribe|check out|link|tap|click)/i,
  hookPatterns: /^(?:here's|this is|i just|breaking|unpopular opinion|hot take|thread|stop|wait)/i,
};

/**
 * Analyze a post and return comprehensive analysis
 */
export function analyzePost(content: string, mediaUrls?: string[]): PostAnalysis {
  const contentMetrics = calculateContentMetrics(content, mediaUrls);
  const algorithmSignals = calculateAlgorithmSignals(content, contentMetrics);
  const engagementScores = calculateEngagementScores(contentMetrics, algorithmSignals);
  const suggestions = generateSuggestions(contentMetrics, algorithmSignals, engagementScores);
  const warnings = generateWarnings(contentMetrics, algorithmSignals);
  const overallScore = calculateOverallScore(engagementScores, warnings);

  return {
    overallScore,
    engagementScores,
    contentMetrics,
    algorithmSignals,
    suggestions,
    warnings,
  };
}

/**
 * Calculate content metrics from post text
 */
function calculateContentMetrics(content: string, mediaUrls?: string[]): ContentMetrics {
  const characterCount = content.length;
  const words = content.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim());
  const sentenceCount = sentences.length || 1;

  const wordsPerMinute = 200;
  const readingTimeSeconds = Math.ceil((wordCount / wordsPerMinute) * 60);

  const hashtags = content.match(PATTERNS.hashtag) ?? [];
  const mentions = content.match(PATTERNS.mention) ?? [];
  const links = content.match(PATTERNS.link) ?? [];
  const emojis = content.match(PATTERNS.emoji) ?? [];
  const questions = content.match(PATTERNS.question);

  const hasMedia = Boolean(mediaUrls?.length);
  const isThread =
    PATTERNS.threadIndicator.test(content) || (content.includes('1/') && /\d+\//.test(content));
  const hasCTA = PATTERNS.ctaPatterns.test(content);

  return {
    characterCount,
    wordCount,
    sentenceCount,
    readingTimeSeconds,
    hasMedia,
    mediaCount: mediaUrls?.length ?? 0,
    hasQuestion: Boolean(questions),
    questionCount: questions?.length ?? 0,
    hasHashtags: hashtags.length > 0,
    hashtagCount: hashtags.length,
    hasMentions: mentions.length > 0,
    mentionCount: mentions.length,
    hasLinks: links.length > 0,
    linkCount: links.length,
    hasEmojis: emojis.length > 0,
    emojiCount: emojis.length,
    hasCTA,
    isThread,
    threadLength: isThread ? estimateThreadLength(content) : 0,
  };
}

/**
 * Estimate thread length from content
 */
function estimateThreadLength(content: string): number {
  const threadMatch = content.match(/(\d+)\/(\d+)/);
  if (threadMatch) {
    return parseInt(threadMatch[2], 10);
  }
  return content.includes('thread') || content.includes('🧵') ? 3 : 1;
}

/**
 * Calculate algorithm signals based on content patterns
 */
function calculateAlgorithmSignals(
  content: string,
  metrics: ContentMetrics
): AlgorithmSignals {
  const positiveSignals: SignalScore[] = [];
  const negativeSignals: SignalScore[] = [];
  const neutralSignals: SignalScore[] = [];

  for (const pattern of POSITIVE_PATTERNS) {
    if (pattern.pattern.test(content)) {
      positiveSignals.push({
        name: pattern.signal,
        score: pattern.boost,
        weight: pattern.boost,
        description: getSignalDescription(pattern.signal, true),
        impact: pattern.boost >= 0.1 ? 'high' : pattern.boost >= 0.07 ? 'medium' : 'low',
      });
    }
  }

  for (const pattern of NEGATIVE_PATTERNS) {
    if (pattern.pattern.test(content)) {
      negativeSignals.push({
        name: pattern.signal,
        score: pattern.penalty,
        weight: Math.abs(pattern.penalty),
        description: getSignalDescription(pattern.signal, false),
        impact: pattern.penalty <= -0.1 ? 'high' : pattern.penalty <= -0.07 ? 'medium' : 'low',
      });
    }
  }

  const lengthScore = calculateLengthScore(metrics.characterCount);
  if (lengthScore > 0) {
    positiveSignals.push({
      name: 'optimal_length',
      score: lengthScore,
      weight: CONTENT_WEIGHTS.optimalLength,
      description: 'Post length is within optimal range (80-280 chars)',
      impact: 'medium',
    });
  } else if (lengthScore < 0) {
    negativeSignals.push({
      name: 'suboptimal_length',
      score: lengthScore,
      weight: Math.abs(lengthScore),
      description:
        metrics.characterCount < OPTIMAL_LENGTH.min
          ? 'Post is too short (under 80 chars)'
          : 'Post exceeds optimal length',
      impact: 'low',
    });
  }

  if (metrics.hasQuestion) {
    positiveSignals.push({
      name: 'has_question',
      score: CONTENT_WEIGHTS.hasQuestion,
      weight: CONTENT_WEIGHTS.hasQuestion,
      description: 'Question increases reply probability by 12%',
      impact: 'high',
    });
  }

  if (metrics.isThread) {
    positiveSignals.push({
      name: 'is_thread',
      score: CONTENT_WEIGHTS.hasThread,
      weight: CONTENT_WEIGHTS.hasThread,
      description: 'Thread format increases dwell time by 10%',
      impact: 'high',
    });
  }

  if (metrics.hasMedia) {
    positiveSignals.push({
      name: 'has_media',
      score: CONTENT_WEIGHTS.hasMedia,
      weight: CONTENT_WEIGHTS.hasMedia,
      description: 'Media increases engagement and dwell time',
      impact: 'medium',
    });
  }

  if (metrics.hasCTA) {
    positiveSignals.push({
      name: 'has_cta',
      score: CONTENT_WEIGHTS.hasCTA,
      weight: CONTENT_WEIGHTS.hasCTA,
      description: 'Call-to-action encourages specific engagement',
      impact: 'medium',
    });
  }

  if (PATTERNS.hookPatterns.test(content)) {
    positiveSignals.push({
      name: 'has_hook',
      score: CONTENT_WEIGHTS.hasHook,
      weight: CONTENT_WEIGHTS.hasHook,
      description: 'Strong opening hook captures attention',
      impact: 'high',
    });
  }

  if (metrics.hashtagCount > LIMITS.maxHashtags) {
    negativeSignals.push({
      name: 'too_many_hashtags',
      score: CONTENT_WEIGHTS.tooManyHashtags,
      weight: Math.abs(CONTENT_WEIGHTS.tooManyHashtags),
      description: `${metrics.hashtagCount} hashtags exceeds recommended max of ${LIMITS.maxHashtags}`,
      impact: 'high',
    });
  }

  if (metrics.linkCount > LIMITS.maxLinks) {
    neutralSignals.push({
      name: 'multiple_links',
      score: 0,
      weight: 0.02,
      description: 'Multiple links may reduce engagement',
      impact: 'low',
    });
  }

  return {
    positiveSignals,
    negativeSignals,
    neutralSignals,
  };
}

/**
 * Calculate length score based on optimal range
 */
function calculateLengthScore(characterCount: number): number {
  if (characterCount < OPTIMAL_LENGTH.min) {
    return CONTENT_WEIGHTS.tooShort;
  }
  if (characterCount > 280) {
    return CONTENT_WEIGHTS.tooLong;
  }
  if (characterCount >= OPTIMAL_LENGTH.min && characterCount <= OPTIMAL_LENGTH.max) {
    const distanceFromIdeal = Math.abs(characterCount - OPTIMAL_LENGTH.ideal);
    const maxDistance = OPTIMAL_LENGTH.max - OPTIMAL_LENGTH.min;
    const normalizedScore = 1 - distanceFromIdeal / maxDistance;
    return CONTENT_WEIGHTS.optimalLength * normalizedScore;
  }
  return 0;
}

/**
 * Get human-readable description for a signal
 */
function getSignalDescription(signal: string, isPositive: boolean): string {
  const descriptions: Record<string, string> = {
    question: 'Post ends with a question, boosting reply engagement',
    thread: 'Thread indicator detected, increases dwell time',
    value: 'Value-signaling language detected (educational content)',
    controversy: 'Controversial framing detected, increases quotes and replies',
    listicle: 'Listicle format detected, easy to consume',
    too_many_hashtags: 'Excessive hashtags trigger spam detection',
    all_caps: 'All caps text appears aggressive, reduces engagement',
    link_only: 'Link-only posts have very low engagement',
    spam: 'Spam pattern detected, severely penalized',
    cta_spam: 'Promotional CTA detected, minor penalty',
  };

  return descriptions[signal] ?? `${isPositive ? 'Positive' : 'Negative'} signal: ${signal}`;
}

/**
 * Calculate engagement scores based on content and signals
 */
function calculateEngagementScores(
  metrics: ContentMetrics,
  signals: AlgorithmSignals
): EngagementScores {
  let baseScore = 0.5;

  for (const signal of signals.positiveSignals) {
    baseScore += signal.score;
  }
  for (const signal of signals.negativeSignals) {
    baseScore += signal.score;
  }

  baseScore = Math.max(0, Math.min(1, baseScore));

  const questionBoost = metrics.hasQuestion ? CONTENT_WEIGHTS.hasQuestion : 0;
  const threadBoost = metrics.isThread ? CONTENT_WEIGHTS.hasThread : 0;
  const mediaBoost = metrics.hasMedia ? CONTENT_WEIGHTS.hasMedia : 0;
  const hookBoost = signals.positiveSignals.some((s) => s.name === 'has_hook')
    ? CONTENT_WEIGHTS.hasHook
    : 0;
  const controversyBoost = signals.positiveSignals.some((s) => s.name === 'controversy') ? 0.1 : 0;
  const valueBoost = signals.positiveSignals.some((s) => s.name === 'value') ? 0.08 : 0;

  return {
    likeability: clamp(baseScore + mediaBoost * 0.5 + hookBoost * 0.3),
    replyability: clamp(baseScore + questionBoost + controversyBoost * 0.5),
    retweetability: clamp(baseScore + valueBoost + threadBoost * 0.5),
    quoteability: clamp(baseScore + controversyBoost + hookBoost * 0.3),
    shareability: clamp(baseScore + valueBoost * 0.8 + mediaBoost * 0.3),
    dwellPotential: clamp(baseScore + threadBoost + mediaBoost * 0.5),
    followPotential: clamp(baseScore * 0.7 + valueBoost + hookBoost * 0.2),
  };
}

/**
 * Clamp value between 0 and 1
 */
function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Generate improvement suggestions
 */
function generateSuggestions(
  metrics: ContentMetrics,
  signals: AlgorithmSignals,
  scores: EngagementScores
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (!metrics.hasQuestion && scores.replyability < 0.6) {
    suggestions.push({
      type: 'add_question' as SuggestionType,
      priority: 'high',
      message: 'Add a question to boost reply engagement by up to 12%',
      action: 'End your post with an open-ended question that invites discussion',
      potentialScoreIncrease: 0.12,
    });
  }

  if (!metrics.hasCTA) {
    suggestions.push({
      type: 'add_cta' as SuggestionType,
      priority: 'medium',
      message: 'Add a call-to-action to guide engagement',
      action: 'Include a specific ask (like, retweet, follow, comment)',
      potentialScoreIncrease: 0.08,
    });
  }

  if (!metrics.hasMedia) {
    suggestions.push({
      type: 'add_media' as SuggestionType,
      priority: 'medium',
      message: 'Adding an image or video can increase engagement',
      action: 'Include relevant visual content to capture attention',
      potentialScoreIncrease: 0.08,
    });
  }

  if (metrics.characterCount < OPTIMAL_LENGTH.min) {
    suggestions.push({
      type: 'increase_length' as SuggestionType,
      priority: 'high',
      message: `Post is too short (${metrics.characterCount} chars). Aim for 80-280 characters`,
      action: 'Add more context, examples, or a hook to reach optimal length',
      potentialScoreIncrease: 0.06,
    });
  }

  if (metrics.characterCount > 280) {
    suggestions.push({
      type: 'reduce_length' as SuggestionType,
      priority: 'high',
      message: `Post exceeds 280 characters (${metrics.characterCount}). Consider a thread`,
      action: 'Shorten the post or convert to a thread format',
      potentialScoreIncrease: 0.04,
    });
  }

  if (metrics.characterCount > 500 && !metrics.isThread) {
    suggestions.push({
      type: 'add_thread' as SuggestionType,
      priority: 'high',
      message: 'Long content would perform better as a thread',
      action: 'Break content into multiple tweets with thread indicator (1/n)',
      potentialScoreIncrease: 0.1,
    });
  }

  if (metrics.hashtagCount > LIMITS.maxHashtags) {
    suggestions.push({
      type: 'remove_hashtags' as SuggestionType,
      priority: 'high',
      message: `${metrics.hashtagCount} hashtags is too many. Use 2 or fewer`,
      action: 'Remove excess hashtags to avoid spam penalty (-12%)',
      potentialScoreIncrease: 0.12,
    });
  }

  if (!signals.positiveSignals.some((s) => s.name === 'has_hook')) {
    suggestions.push({
      type: 'add_hook' as SuggestionType,
      priority: 'medium',
      message: 'Add a strong opening hook to capture attention',
      action: "Start with phrases like 'Here's what...', 'Stop doing...', or a bold statement",
      potentialScoreIncrease: 0.1,
    });
  }

  if (scores.quoteability < 0.5 && !signals.positiveSignals.some((s) => s.name === 'controversy')) {
    suggestions.push({
      type: 'add_controversy' as SuggestionType,
      priority: 'low',
      message: 'A stronger opinion could increase quote tweets',
      action: "Consider adding 'unpopular opinion' or taking a clearer stance",
      potentialScoreIncrease: 0.1,
    });
  }

  if (!signals.positiveSignals.some((s) => s.name === 'value')) {
    suggestions.push({
      type: 'add_value' as SuggestionType,
      priority: 'medium',
      message: 'Add value-signaling language to increase retweets',
      action: "Use phrases like 'Here's what I learned', 'X tips for...', or share insights",
      potentialScoreIncrease: 0.08,
    });
  }

  if (metrics.linkCount > 1) {
    suggestions.push({
      type: 'remove_links' as SuggestionType,
      priority: 'low',
      message: 'Multiple links can reduce engagement',
      action: 'Keep to one link maximum, or move additional links to replies',
      potentialScoreIncrease: 0.03,
    });
  }

  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Generate warnings for problematic content
 */
function generateWarnings(
  metrics: ContentMetrics,
  signals: AlgorithmSignals
): Warning[] {
  const warnings: Warning[] = [];

  if (metrics.hashtagCount > LIMITS.maxHashtags) {
    warnings.push({
      type: 'too_many_hashtags' as WarningType,
      severity: 'warning',
      message: `${metrics.hashtagCount} hashtags will trigger spam detection (-12% score)`,
      scoreImpact: -0.12,
    });
  }

  if (signals.negativeSignals.some((s) => s.name === 'all_caps')) {
    warnings.push({
      type: 'all_caps' as WarningType,
      severity: 'warning',
      message: 'All caps text appears aggressive and reduces engagement',
      scoreImpact: -0.08,
    });
  }

  if (metrics.characterCount < 30) {
    warnings.push({
      type: 'too_short' as WarningType,
      severity: 'warning',
      message: 'Post is very short and may not provide enough value',
      scoreImpact: -0.06,
    });
  }

  if (metrics.characterCount > 280) {
    warnings.push({
      type: 'too_long' as WarningType,
      severity: 'critical',
      message: 'Post exceeds X character limit and cannot be posted',
      scoreImpact: -0.1,
    });
  }

  if (signals.negativeSignals.some((s) => s.name === 'link_only')) {
    warnings.push({
      type: 'link_only' as WarningType,
      severity: 'critical',
      message: 'Link-only posts have extremely low engagement',
      scoreImpact: -0.1,
    });
  }

  if (signals.negativeSignals.some((s) => s.name === 'spam')) {
    warnings.push({
      type: 'spam_pattern' as WarningType,
      severity: 'critical',
      message: 'Spam patterns detected. This content may be suppressed',
      scoreImpact: -0.15,
    });
  }

  return warnings.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Calculate overall score from engagement scores and warnings
 */
function calculateOverallScore(scores: EngagementScores, warnings: Warning[]): number {
  const avgEngagement =
    (scores.likeability +
      scores.replyability +
      scores.retweetability +
      scores.quoteability +
      scores.shareability +
      scores.dwellPotential) /
    6;

  const warningPenalty = warnings.reduce((sum, w) => sum + Math.abs(w.scoreImpact), 0);

  const weightedScore =
    scores.replyability * ENGAGEMENT_WEIGHTS.reply +
    scores.retweetability * ENGAGEMENT_WEIGHTS.retweet +
    scores.quoteability * ENGAGEMENT_WEIGHTS.quote +
    scores.shareability * ENGAGEMENT_WEIGHTS.share +
    scores.likeability * ENGAGEMENT_WEIGHTS.favorite +
    scores.dwellPotential * ENGAGEMENT_WEIGHTS.dwell;

  const combinedScore = (avgEngagement * 0.4 + weightedScore * 0.6) - warningPenalty;

  return Math.max(0, Math.min(1, combinedScore));
}

export type { PostAnalysis, ContentMetrics, EngagementScores, AlgorithmSignals };
