import {
  OPTIMAL_LENGTH,
  LIMITS,
  type PostAnalysis,
  type Suggestion,
  type TargetEngagement,
} from '@postmaker/shared';
import { analyzePost } from '../analyzer/index.js';
import {
  optimizePost as geminiOptimize,
  suggestImprovements as geminiSuggest,
  isGeminiConfigured,
} from '../gemini/index.js';

export interface OptimizationResult {
  original: string;
  optimized: string;
  originalAnalysis: PostAnalysis;
  optimizedAnalysis: PostAnalysis;
  improvements: OptimizationImprovement[];
  scoreChange: number;
  aiSuggestions: Suggestion[];
}

export interface OptimizationImprovement {
  category: 'length' | 'engagement' | 'format' | 'content' | 'warnings';
  description: string;
  impact: 'high' | 'medium' | 'low';
  applied: boolean;
}

export interface QuickOptimizationOptions {
  removeExcessHashtags?: boolean;
  addQuestion?: boolean;
  optimizeLength?: boolean;
  addHook?: boolean;
}

/**
 * Comprehensive post optimization combining AI and algorithmic analysis
 */
export async function optimizePostComprehensive(
  content: string,
  targetEngagement: TargetEngagement,
  useAI: boolean = true
): Promise<OptimizationResult> {
  const originalAnalysis = analyzePost(content);
  let optimized = content;
  const improvements: OptimizationImprovement[] = [];
  let aiSuggestions: Suggestion[] = [];

  if (useAI && isGeminiConfigured()) {
    try {
      const aiResult = await geminiOptimize(content, targetEngagement);
      optimized = aiResult.optimized;

      for (const improvement of aiResult.improvements) {
        improvements.push({
          category: categorizeImprovement(improvement),
          description: improvement,
          impact: 'medium',
          applied: true,
        });
      }

      const suggestionResult = await geminiSuggest(content);
      aiSuggestions = suggestionResult.suggestions;
    } catch (error) {
      console.error('AI optimization failed, falling back to algorithmic:', error);
      optimized = applyAlgorithmicOptimizations(content, originalAnalysis, targetEngagement);
    }
  } else {
    optimized = applyAlgorithmicOptimizations(content, originalAnalysis, targetEngagement);
  }

  const optimizedAnalysis = analyzePost(optimized);
  const scoreChange = optimizedAnalysis.overallScore - originalAnalysis.overallScore;

  addAlgorithmicImprovements(originalAnalysis, optimizedAnalysis, improvements);

  return {
    original: content,
    optimized,
    originalAnalysis,
    optimizedAnalysis,
    improvements,
    scoreChange,
    aiSuggestions,
  };
}

/**
 * Quick optimization without AI - pure algorithmic improvements
 */
export function quickOptimize(
  content: string,
  options: QuickOptimizationOptions = {}
): { content: string; changes: string[] } {
  let result = content;
  const changes: string[] = [];

  const {
    removeExcessHashtags = true,
    addQuestion = false,
    optimizeLength = true,
    addHook = false,
  } = options;

  if (removeExcessHashtags) {
    const hashtags = result.match(/#\w+/g) ?? [];
    if (hashtags.length > LIMITS.maxHashtags) {
      const excessCount = hashtags.length - LIMITS.maxHashtags;
      for (let i = 0; i < excessCount; i++) {
        const lastHashtag = hashtags[hashtags.length - 1 - i];
        result = result.replace(new RegExp(`\\s*${lastHashtag}`, 'g'), '');
      }
      changes.push(`Removed ${excessCount} excess hashtag(s)`);
    }
  }

  if (optimizeLength && result.length > 280) {
    const sentences = result.split(/(?<=[.!?])\s+/);
    if (sentences.length > 1) {
      result = sentences.slice(0, -1).join(' ').trim();
      if (result.length <= 280) {
        changes.push('Shortened post by removing last sentence');
      }
    }
  }

  if (addQuestion && !result.includes('?')) {
    if (result.length < 250) {
      result = result.trimEnd();
      if (!result.endsWith('.') && !result.endsWith('!') && !result.endsWith('?')) {
        result += '.';
      }
      result += ' What do you think?';
      changes.push('Added engaging question');
    }
  }

  if (addHook && !hasHook(result)) {
    const hooks = [
      "Here's the thing: ",
      'Hot take: ',
      'Real talk: ',
      "Most people don't know this: ",
    ];
    const hook = hooks[Math.floor(Math.random() * hooks.length)];
    if (result.length + hook.length <= 280) {
      result = hook + result.charAt(0).toLowerCase() + result.slice(1);
      changes.push('Added attention-grabbing hook');
    }
  }

  return { content: result.trim(), changes };
}

/**
 * Get prioritized action items for improving a post
 */
export function getPrioritizedActions(content: string): {
  mustFix: Suggestion[];
  shouldImprove: Suggestion[];
  niceToHave: Suggestion[];
  overallScore: number;
} {
  const analysis = analyzePost(content);

  const mustFix = analysis.suggestions.filter((s) => s.priority === 'high');
  const shouldImprove = analysis.suggestions.filter((s) => s.priority === 'medium');
  const niceToHave = analysis.suggestions.filter((s) => s.priority === 'low');

  for (const warning of analysis.warnings) {
    if (warning.severity === 'critical') {
      mustFix.unshift({
        type: warningToSuggestionType(warning.type),
        priority: 'high',
        message: warning.message,
        action: getWarningAction(warning.type),
        potentialScoreIncrease: Math.abs(warning.scoreImpact),
      });
    }
  }

  return {
    mustFix,
    shouldImprove,
    niceToHave,
    overallScore: analysis.overallScore,
  };
}

/**
 * Score comparison between original and modified content
 */
export function compareVersions(
  original: string,
  modified: string
): {
  originalScore: number;
  modifiedScore: number;
  improvement: number;
  betterVersion: 'original' | 'modified' | 'same';
  keyDifferences: string[];
} {
  const originalAnalysis = analyzePost(original);
  const modifiedAnalysis = analyzePost(modified);

  const improvement = modifiedAnalysis.overallScore - originalAnalysis.overallScore;
  const keyDifferences: string[] = [];

  if (modifiedAnalysis.contentMetrics.hasQuestion && !originalAnalysis.contentMetrics.hasQuestion) {
    keyDifferences.push('Added question (+12% reply potential)');
  }
  if (!modifiedAnalysis.contentMetrics.hasQuestion && originalAnalysis.contentMetrics.hasQuestion) {
    keyDifferences.push('Removed question (-12% reply potential)');
  }

  if (modifiedAnalysis.contentMetrics.hashtagCount < originalAnalysis.contentMetrics.hashtagCount) {
    keyDifferences.push(
      `Reduced hashtags from ${originalAnalysis.contentMetrics.hashtagCount} to ${modifiedAnalysis.contentMetrics.hashtagCount}`
    );
  }

  if (modifiedAnalysis.contentMetrics.isThread && !originalAnalysis.contentMetrics.isThread) {
    keyDifferences.push('Converted to thread format (+10% dwell time)');
  }

  const originalLen = originalAnalysis.contentMetrics.characterCount;
  const modifiedLen = modifiedAnalysis.contentMetrics.characterCount;
  if (originalLen < OPTIMAL_LENGTH.min && modifiedLen >= OPTIMAL_LENGTH.min) {
    keyDifferences.push('Length now in optimal range');
  }
  if (originalLen > 280 && modifiedLen <= 280) {
    keyDifferences.push('Length reduced to within character limit');
  }

  if (modifiedAnalysis.warnings.length < originalAnalysis.warnings.length) {
    keyDifferences.push(
      `Resolved ${originalAnalysis.warnings.length - modifiedAnalysis.warnings.length} warning(s)`
    );
  }

  let betterVersion: 'original' | 'modified' | 'same';
  if (Math.abs(improvement) < 0.02) {
    betterVersion = 'same';
  } else if (improvement > 0) {
    betterVersion = 'modified';
  } else {
    betterVersion = 'original';
  }

  return {
    originalScore: originalAnalysis.overallScore,
    modifiedScore: modifiedAnalysis.overallScore,
    improvement,
    betterVersion,
    keyDifferences,
  };
}

/**
 * Apply algorithmic optimizations without AI
 */
function applyAlgorithmicOptimizations(
  content: string,
  _analysis: PostAnalysis,
  _targetEngagement: TargetEngagement
): string {
  let result = content;

  const hashtags = result.match(/#\w+/g) ?? [];
  if (hashtags.length > LIMITS.maxHashtags) {
    const excessCount = hashtags.length - LIMITS.maxHashtags;
    for (let i = 0; i < excessCount; i++) {
      const lastHashtag = hashtags[hashtags.length - 1 - i];
      result = result.replace(new RegExp(`\\s*${lastHashtag}`, 'g'), '');
    }
  }

  if (result === result.toUpperCase() && result.length > 10) {
    result = result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
  }

  result = result.trim();

  return result;
}

/**
 * Check if content has a hook pattern
 */
function hasHook(content: string): boolean {
  const hookPatterns =
    /^(?:here's|this is|i just|breaking|unpopular opinion|hot take|thread|stop|wait|real talk|most people)/i;
  return hookPatterns.test(content);
}

/**
 * Categorize improvement description
 */
function categorizeImprovement(
  description: string
): 'length' | 'engagement' | 'format' | 'content' | 'warnings' {
  const lower = description.toLowerCase();
  if (lower.includes('length') || lower.includes('character')) return 'length';
  if (lower.includes('question') || lower.includes('engagement') || lower.includes('reply'))
    return 'engagement';
  if (lower.includes('format') || lower.includes('thread') || lower.includes('hashtag'))
    return 'format';
  if (lower.includes('warning') || lower.includes('removed')) return 'warnings';
  return 'content';
}

/**
 * Add algorithmic improvements to the list
 */
function addAlgorithmicImprovements(
  original: PostAnalysis,
  optimized: PostAnalysis,
  improvements: OptimizationImprovement[]
): void {
  if (optimized.contentMetrics.hasQuestion && !original.contentMetrics.hasQuestion) {
    improvements.push({
      category: 'engagement',
      description: 'Added question to boost replies',
      impact: 'high',
      applied: true,
    });
  }

  if (optimized.contentMetrics.hashtagCount < original.contentMetrics.hashtagCount) {
    improvements.push({
      category: 'format',
      description: 'Reduced hashtag count to avoid spam penalty',
      impact: 'high',
      applied: true,
    });
  }

  if (optimized.warnings.length < original.warnings.length) {
    improvements.push({
      category: 'warnings',
      description: `Resolved ${original.warnings.length - optimized.warnings.length} warning(s)`,
      impact: 'high',
      applied: true,
    });
  }
}

/**
 * Convert warning type to suggestion type
 */
function warningToSuggestionType(
  warningType: string
): Suggestion['type'] {
  const mapping: Record<string, Suggestion['type']> = {
    too_many_hashtags: 'remove_hashtags',
    all_caps: 'fix_formatting',
    too_short: 'increase_length',
    too_long: 'reduce_length',
    link_only: 'add_value',
    spam_pattern: 'fix_formatting',
    low_engagement_pattern: 'add_hook',
    negative_sentiment: 'improve_readability',
  };
  return mapping[warningType] ?? 'improve_readability';
}

/**
 * Get action for warning type
 */
function getWarningAction(warningType: string): string {
  const actions: Record<string, string> = {
    too_many_hashtags: 'Remove excess hashtags (keep 2 or fewer)',
    all_caps: 'Convert to sentence case',
    too_short: 'Add more context or value',
    too_long: 'Shorten or convert to thread',
    link_only: 'Add commentary to the link',
    spam_pattern: 'Remove spam-like language',
    low_engagement_pattern: 'Add hooks and questions',
    negative_sentiment: 'Reframe in a more positive way',
  };
  return actions[warningType] ?? 'Review and improve content';
}

export {
  analyzePost,
  type PostAnalysis,
} from '../analyzer/index.js';
