import type {
  PostStyle,
  TargetEngagement,
  PostConstraints,
  GeneratedPost,
  EngagementPrediction,
  Suggestion,
} from '@postmaker/shared';
import { getGeminiModel, isGeminiConfigured } from './client.js';
import {
  getPostGenerationPrompt,
  getPostOptimizationPrompt,
  getThreadCreationPrompt,
  getSuggestionPrompt,
} from './prompts.js';
import { analyzePost } from '../analyzer/index.js';

export interface GeminiGenerationOptions {
  topic: string;
  style: PostStyle;
  targetEngagement: TargetEngagement;
  constraints?: PostConstraints;
}

export interface GeminiOptimizationResult {
  original: string;
  optimized: string;
  improvements: string[];
}

export interface ThreadPart {
  order: number;
  content: string;
}

export interface GeminiSuggestionResult {
  suggestions: Suggestion[];
  overallAssessment: string;
  estimatedScore: number;
}

/**
 * Generate a new post using Gemini AI optimized for X algorithm
 */
export async function generatePost(
  options: GeminiGenerationOptions
): Promise<GeneratedPost> {
  if (!isGeminiConfigured()) {
    throw new Error('Gemini API is not configured');
  }

  const { topic, style, targetEngagement, constraints } = options;
  const prompt = getPostGenerationPrompt(topic, style, targetEngagement, constraints);

  const model = getGeminiModel('gemini-1.5-flash');
  const result = await model.generateContent(prompt);
  const response = result.response;
  const content = response.text().trim();

  const analysis = analyzePost(content);

  const engagementPrediction: EngagementPrediction = {
    likes: analysis.engagementScores.likeability * 100,
    replies: analysis.engagementScores.replyability * 100,
    retweets: analysis.engagementScores.retweetability * 100,
    quotes: analysis.engagementScores.quoteability * 100,
    shares: analysis.engagementScores.shareability * 100,
    dwellTime: analysis.engagementScores.dwellPotential * 10,
  };

  return {
    content,
    score: analysis.overallScore,
    suggestions: analysis.suggestions.map((s) => s.message),
    engagementPrediction,
  };
}

/**
 * Optimize an existing post using Gemini AI
 */
export async function optimizePost(
  content: string,
  targetEngagement: TargetEngagement
): Promise<GeminiOptimizationResult> {
  if (!isGeminiConfigured()) {
    throw new Error('Gemini API is not configured');
  }

  const prompt = getPostOptimizationPrompt(content, targetEngagement);

  const model = getGeminiModel('gemini-1.5-flash');
  const result = await model.generateContent(prompt);
  const response = result.response;
  const optimized = response.text().trim();

  const originalAnalysis = analyzePost(content);
  const optimizedAnalysis = analyzePost(optimized);

  const improvements: string[] = [];

  if (optimizedAnalysis.overallScore > originalAnalysis.overallScore) {
    improvements.push(
      `Overall score improved from ${(originalAnalysis.overallScore * 100).toFixed(0)}% to ${(optimizedAnalysis.overallScore * 100).toFixed(0)}%`
    );
  }

  if (
    optimizedAnalysis.contentMetrics.characterCount !== originalAnalysis.contentMetrics.characterCount
  ) {
    const originalLen = originalAnalysis.contentMetrics.characterCount;
    const optimizedLen = optimizedAnalysis.contentMetrics.characterCount;
    if (originalLen < 80 && optimizedLen >= 80) {
      improvements.push('Length increased to optimal range');
    } else if (originalLen > 280 && optimizedLen <= 280) {
      improvements.push('Length reduced to within character limit');
    }
  }

  if (!originalAnalysis.contentMetrics.hasQuestion && optimizedAnalysis.contentMetrics.hasQuestion) {
    improvements.push('Added question to boost reply engagement (+12%)');
  }

  if (!originalAnalysis.contentMetrics.hasCTA && optimizedAnalysis.contentMetrics.hasCTA) {
    improvements.push('Added call-to-action');
  }

  if (
    originalAnalysis.contentMetrics.hashtagCount > 2 &&
    optimizedAnalysis.contentMetrics.hashtagCount <= 2
  ) {
    improvements.push('Reduced hashtags to avoid spam penalty');
  }

  const originalWarnings = originalAnalysis.warnings.length;
  const optimizedWarnings = optimizedAnalysis.warnings.length;
  if (optimizedWarnings < originalWarnings) {
    improvements.push(`Removed ${originalWarnings - optimizedWarnings} warning(s)`);
  }

  return {
    original: content,
    optimized,
    improvements,
  };
}

/**
 * Create a thread from longer content
 */
export async function createThread(
  content: string,
  maxParts: number = 7
): Promise<ThreadPart[]> {
  if (!isGeminiConfigured()) {
    throw new Error('Gemini API is not configured');
  }

  const prompt = getThreadCreationPrompt(content, maxParts);

  const model = getGeminiModel('gemini-1.5-flash');
  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text().trim();

  const threadParts: ThreadPart[] = [];
  const lines = text.split('\n').filter((line) => line.trim());

  for (const line of lines) {
    const match = line.match(/^(\d+)\/\d+:\s*(.+)$/);
    if (match) {
      const [, orderStr, partContent] = match;
      threadParts.push({
        order: parseInt(orderStr, 10),
        content: partContent.trim(),
      });
    }
  }

  if (threadParts.length === 0) {
    const parts = text.split('\n\n').filter((p) => p.trim());
    parts.slice(0, maxParts).forEach((part, index) => {
      threadParts.push({
        order: index + 1,
        content: part.trim().slice(0, 280),
      });
    });
  }

  return threadParts;
}

/**
 * Get AI-powered suggestions for improving a post
 */
export async function suggestImprovements(
  content: string
): Promise<GeminiSuggestionResult> {
  if (!isGeminiConfigured()) {
    throw new Error('Gemini API is not configured');
  }

  const prompt = getSuggestionPrompt(content);

  const model = getGeminiModel('gemini-1.5-flash');
  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text().trim();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      suggestions?: Array<{
        type: string;
        priority: string;
        message: string;
        action?: string;
        potentialScoreIncrease: number;
      }>;
      overallAssessment?: string;
      estimatedScore?: number;
    };

    return {
      suggestions: (parsed.suggestions ?? []).map((s) => ({
        type: s.type as Suggestion['type'],
        priority: s.priority as Suggestion['priority'],
        message: s.message,
        action: s.action,
        potentialScoreIncrease: s.potentialScoreIncrease,
      })),
      overallAssessment: parsed.overallAssessment ?? 'Unable to assess',
      estimatedScore: parsed.estimatedScore ?? 0.5,
    };
  } catch {
    const analysis = analyzePost(content);
    return {
      suggestions: analysis.suggestions,
      overallAssessment: 'AI suggestion parsing failed, using algorithmic analysis',
      estimatedScore: analysis.overallScore,
    };
  }
}

export { isGeminiConfigured } from './client.js';
