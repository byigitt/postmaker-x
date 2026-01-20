import {
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
} from '@postmaker/shared';

export function analyzePost(content: string, hasMedia = false): PostAnalysis {
  const metrics = calculateContentMetrics(content, hasMedia);
  const signals = analyzeAlgorithmSignals(content, metrics);
  const engagementScores = calculateEngagementScores(metrics, signals);
  const overallScore = calculateOverallScore(engagementScores, signals);
  const suggestions = generateSuggestions(metrics, signals, overallScore);
  const warnings = generateWarnings(metrics, signals);

  return {
    overallScore,
    engagementScores,
    contentMetrics: metrics,
    algorithmSignals: signals,
    suggestions,
    warnings,
  };
}

function calculateContentMetrics(content: string, hasMedia: boolean): ContentMetrics {
  const characterCount = content.length;
  const words = content.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentences = content.split(/[.!?]+/).filter(Boolean);
  const sentenceCount = sentences.length;
  const readingTimeSeconds = Math.ceil(wordCount / 3.5);

  const hashtagMatches = content.match(/#\w+/g) || [];
  const mentionMatches = content.match(/@\w+/g) || [];
  const linkMatches = content.match(/https?:\/\/\S+/g) || [];
  const emojiMatches = content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || [];
  const questionMatches = content.match(/\?/g) || [];

  const isThread = /thread|1\/\d|🧵/i.test(content);

  return {
    characterCount,
    wordCount,
    sentenceCount,
    readingTimeSeconds,
    hasMedia,
    mediaCount: hasMedia ? 1 : 0,
    hasQuestion: questionMatches.length > 0,
    questionCount: questionMatches.length,
    hasHashtags: hashtagMatches.length > 0,
    hashtagCount: hashtagMatches.length,
    hasMentions: mentionMatches.length > 0,
    mentionCount: mentionMatches.length,
    hasLinks: linkMatches.length > 0,
    linkCount: linkMatches.length,
    hasEmojis: emojiMatches.length > 0,
    emojiCount: emojiMatches.length,
    hasCTA: /follow|subscribe|check out|click|read more|learn more|sign up/i.test(content),
    isThread,
    threadLength: isThread ? 1 : 0,
  };
}

function analyzeAlgorithmSignals(content: string, metrics: ContentMetrics): AlgorithmSignals {
  const positiveSignals: SignalScore[] = [];
  const negativeSignals: SignalScore[] = [];
  const neutralSignals: SignalScore[] = [];

  for (const { pattern, signal, boost } of POSITIVE_PATTERNS) {
    if (pattern.test(content)) {
      positiveSignals.push({
        name: signal,
        score: boost,
        weight: boost,
        description: `Post contains ${signal} pattern`,
        impact: boost >= 0.1 ? 'high' : boost >= 0.06 ? 'medium' : 'low',
      });
    }
  }

  for (const { pattern, signal, penalty } of NEGATIVE_PATTERNS) {
    if (pattern.test(content)) {
      negativeSignals.push({
        name: signal,
        score: penalty,
        weight: Math.abs(penalty),
        description: `Post triggers ${signal} penalty`,
        impact: penalty <= -0.1 ? 'high' : penalty <= -0.06 ? 'medium' : 'low',
      });
    }
  }

  if (metrics.hasQuestion) {
    positiveSignals.push({
      name: 'question',
      score: CONTENT_WEIGHTS.hasQuestion,
      weight: CONTENT_WEIGHTS.hasQuestion,
      description: 'Post contains a question, encouraging replies',
      impact: 'high',
    });
  }

  if (metrics.hasMedia) {
    positiveSignals.push({
      name: 'media',
      score: CONTENT_WEIGHTS.hasMedia,
      weight: CONTENT_WEIGHTS.hasMedia,
      description: 'Post includes media content',
      impact: 'medium',
    });
  }

  if (metrics.hasCTA) {
    positiveSignals.push({
      name: 'cta',
      score: CONTENT_WEIGHTS.hasCTA,
      weight: CONTENT_WEIGHTS.hasCTA,
      description: 'Post contains a call-to-action',
      impact: 'medium',
    });
  }

  const isOptimalLength =
    metrics.characterCount >= OPTIMAL_LENGTH.min &&
    metrics.characterCount <= OPTIMAL_LENGTH.max;

  if (isOptimalLength) {
    positiveSignals.push({
      name: 'optimal_length',
      score: CONTENT_WEIGHTS.optimalLength,
      weight: CONTENT_WEIGHTS.optimalLength,
      description: `Post length (${metrics.characterCount}) is in optimal range`,
      impact: 'medium',
    });
  } else if (metrics.characterCount < OPTIMAL_LENGTH.min) {
    negativeSignals.push({
      name: 'too_short',
      score: CONTENT_WEIGHTS.tooShort,
      weight: Math.abs(CONTENT_WEIGHTS.tooShort),
      description: 'Post is too short for optimal engagement',
      impact: 'medium',
    });
  } else if (metrics.characterCount > OPTIMAL_LENGTH.max) {
    neutralSignals.push({
      name: 'long_form',
      score: CONTENT_WEIGHTS.tooLong,
      weight: Math.abs(CONTENT_WEIGHTS.tooLong),
      description: 'Post exceeds typical optimal length',
      impact: 'low',
    });
  }

  if (metrics.hashtagCount > LIMITS.maxHashtags) {
    negativeSignals.push({
      name: 'excessive_hashtags',
      score: CONTENT_WEIGHTS.tooManyHashtags,
      weight: Math.abs(CONTENT_WEIGHTS.tooManyHashtags),
      description: `Too many hashtags (${metrics.hashtagCount}/${LIMITS.maxHashtags})`,
      impact: 'high',
    });
  }

  return { positiveSignals, negativeSignals, neutralSignals };
}

function calculateEngagementScores(metrics: ContentMetrics, signals: AlgorithmSignals): EngagementScores {
  let baseScore = 0.5;

  for (const signal of signals.positiveSignals) {
    baseScore += signal.score;
  }
  for (const signal of signals.negativeSignals) {
    baseScore += signal.score;
  }

  baseScore = Math.max(0, Math.min(1, baseScore));

  const likeability = metrics.hasMedia ? baseScore * 1.1 : baseScore;
  const replyability = metrics.hasQuestion ? baseScore * 1.3 : baseScore * 0.8;
  const retweetability = metrics.isThread ? baseScore * 1.2 : baseScore;
  const quoteability = signals.positiveSignals.some(s => s.name === 'controversy')
    ? baseScore * 1.25
    : baseScore * 0.9;
  const shareability = signals.positiveSignals.some(s => s.name === 'value')
    ? baseScore * 1.15
    : baseScore;
  const dwellPotential = metrics.isThread || metrics.characterCount > 200
    ? baseScore * 1.2
    : baseScore * 0.9;
  const followPotential = signals.positiveSignals.some(s => s.name === 'value')
    ? baseScore * 1.1
    : baseScore * 0.95;

  const clamp = (n: number) => Math.max(0, Math.min(1, n));

  return {
    likeability: clamp(likeability),
    replyability: clamp(replyability),
    retweetability: clamp(retweetability),
    quoteability: clamp(quoteability),
    shareability: clamp(shareability),
    dwellPotential: clamp(dwellPotential),
    followPotential: clamp(followPotential),
  };
}

function calculateOverallScore(
  engagement: EngagementScores,
  signals: AlgorithmSignals
): number {
  const engagementAvg =
    (engagement.likeability +
      engagement.replyability * 1.2 +
      engagement.retweetability * 1.1 +
      engagement.quoteability * 1.0 +
      engagement.shareability * 0.9 +
      engagement.dwellPotential * 0.8 +
      engagement.followPotential * 0.7) /
    6.7;

  let signalBonus = 0;
  for (const signal of signals.positiveSignals) {
    signalBonus += signal.score * 0.5;
  }
  for (const signal of signals.negativeSignals) {
    signalBonus += signal.score * 0.5;
  }

  const rawScore = engagementAvg + signalBonus;
  return Math.round(Math.max(0, Math.min(100, rawScore * 100)));
}

function generateSuggestions(
  metrics: ContentMetrics,
  signals: AlgorithmSignals,
  currentScore: number
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (!metrics.hasQuestion) {
    suggestions.push({
      type: 'add_question',
      priority: 'high',
      message: 'Add a question to encourage replies and boost engagement',
      action: 'End your post with a question that invites discussion',
      potentialScoreIncrease: 8,
    });
  }

  if (!metrics.hasCTA && currentScore < 70) {
    suggestions.push({
      type: 'add_cta',
      priority: 'medium',
      message: 'Add a call-to-action to drive engagement',
      action: 'Ask readers to share, follow, or comment',
      potentialScoreIncrease: 5,
    });
  }

  if (!metrics.hasMedia) {
    suggestions.push({
      type: 'add_media',
      priority: 'medium',
      message: 'Adding an image or video can increase engagement',
      action: 'Include relevant visual content',
      potentialScoreIncrease: 6,
    });
  }

  if (metrics.characterCount < OPTIMAL_LENGTH.min) {
    suggestions.push({
      type: 'increase_length',
      priority: 'high',
      message: 'Your post is too short for optimal engagement',
      action: `Add more content to reach at least ${OPTIMAL_LENGTH.min} characters`,
      potentialScoreIncrease: 7,
    });
  }

  if (metrics.hashtagCount > LIMITS.maxHashtags) {
    suggestions.push({
      type: 'remove_hashtags',
      priority: 'high',
      message: `Too many hashtags hurt engagement (${metrics.hashtagCount}/${LIMITS.maxHashtags} max)`,
      action: 'Reduce to 1-2 relevant hashtags',
      potentialScoreIncrease: 10,
    });
  }

  if (!signals.positiveSignals.some(s => s.name === 'value') && currentScore < 60) {
    suggestions.push({
      type: 'add_value',
      priority: 'medium',
      message: 'Add actionable value or insights to your post',
      action: 'Include tips, lessons, or useful information',
      potentialScoreIncrease: 8,
    });
  }

  if (metrics.linkCount > LIMITS.maxLinks) {
    suggestions.push({
      type: 'remove_links',
      priority: 'medium',
      message: 'Multiple links can reduce reach',
      action: 'Keep only the most important link',
      potentialScoreIncrease: 4,
    });
  }

  return suggestions.sort((a, b) => b.potentialScoreIncrease - a.potentialScoreIncrease);
}

function generateWarnings(
  metrics: ContentMetrics,
  signals: AlgorithmSignals
): Warning[] {
  const warnings: Warning[] = [];

  if (metrics.hashtagCount > LIMITS.maxHashtags) {
    warnings.push({
      type: 'too_many_hashtags',
      severity: metrics.hashtagCount > 4 ? 'critical' : 'warning',
      message: `${metrics.hashtagCount} hashtags detected. Algorithm may limit reach.`,
      scoreImpact: -10,
    });
  }

  if (signals.negativeSignals.some(s => s.name === 'all_caps')) {
    warnings.push({
      type: 'all_caps',
      severity: 'warning',
      message: 'ALL CAPS text detected. This can appear spammy.',
      scoreImpact: -8,
    });
  }

  if (metrics.characterCount < 30) {
    warnings.push({
      type: 'too_short',
      severity: 'warning',
      message: 'Very short posts typically get less engagement.',
      scoreImpact: -6,
    });
  }

  if (signals.negativeSignals.some(s => s.name === 'link_only')) {
    warnings.push({
      type: 'link_only',
      severity: 'critical',
      message: 'Link-only posts are heavily penalized by the algorithm.',
      scoreImpact: -15,
    });
  }

  if (signals.negativeSignals.some(s => s.name === 'spam' || s.name === 'cta_spam')) {
    warnings.push({
      type: 'spam_pattern',
      severity: 'critical',
      message: 'Spam-like patterns detected. Post may be suppressed.',
      scoreImpact: -20,
    });
  }

  return warnings;
}
