import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { db, schema } from '../db/index.js';
import { analyzePost } from '../services/analyzer/index.js';
import { getGeminiModel, isGeminiConfigured } from '../services/gemini/client.js';
import { createError } from '../middleware/error.js';
import {
  STYLE_TARGETS,
  THREAD_GUIDELINES,
  type PostStyle,
  type TargetEngagement,
  type GeneratedPost,
} from '@postmaker/shared';

const router = Router();

const generateRequestSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(500, 'Topic too long'),
  style: z.enum(['informative', 'controversial', 'question', 'thread', 'story', 'hook']),
  targetEngagement: z.enum(['likes', 'replies', 'retweets', 'quotes', 'shares', 'all']),
  constraints: z
    .object({
      maxLength: z.number().optional(),
      minLength: z.number().optional(),
      includeHashtags: z.boolean().optional(),
      maxHashtags: z.number().optional(),
      includeEmojis: z.boolean().optional(),
      includeCTA: z.boolean().optional(),
      tone: z.enum(['professional', 'casual', 'humorous', 'provocative']).optional(),
    })
    .optional(),
});

function buildPrompt(
  topic: string,
  style: PostStyle,
  targetEngagement: TargetEngagement,
  constraints?: z.infer<typeof generateRequestSchema>['constraints']
): string {
  const styleConfig = STYLE_TARGETS[style];

  let prompt = `You are an expert X (Twitter) content strategist. Generate a high-engagement post about: "${topic}"

Style: ${style}
Primary engagement target: ${targetEngagement === 'all' ? styleConfig.primaryEngagement : targetEngagement}
Content pattern: ${styleConfig.contentPattern}

`;

  if (style === 'thread') {
    prompt += `Generate a thread with ${THREAD_GUIDELINES.optimalLength.min}-${THREAD_GUIDELINES.optimalLength.max} parts.
First tweet should hook the reader (max ${THREAD_GUIDELINES.firstTweetMaxChars} chars).
End with a strong CTA.

`;
  }

  if (constraints) {
    if (constraints.maxLength) {
      prompt += `Maximum length: ${constraints.maxLength} characters\n`;
    }
    if (constraints.minLength) {
      prompt += `Minimum length: ${constraints.minLength} characters\n`;
    }
    if (constraints.includeHashtags === false) {
      prompt += `Do NOT include hashtags\n`;
    } else if (constraints.maxHashtags) {
      prompt += `Use at most ${constraints.maxHashtags} hashtags\n`;
    }
    if (constraints.includeEmojis === false) {
      prompt += `Do NOT include emojis\n`;
    }
    if (constraints.includeCTA) {
      prompt += `Include a clear call-to-action\n`;
    }
    if (constraints.tone) {
      prompt += `Tone: ${constraints.tone}\n`;
    }
  }

  prompt += `
IMPORTANT:
- Make it feel authentic, not AI-generated
- Optimize for engagement and shares
- No generic advice - be specific and valuable
- ${style === 'question' ? 'End with an open-ended question that invites discussion' : ''}
- ${style === 'controversial' ? 'Take a strong stance but avoid being offensive' : ''}
- ${style === 'hook' ? 'Create a curiosity gap that makes people want to engage' : ''}

${style === 'thread' ? 'Format as: PART 1: [content]\\nPART 2: [content]\\n...' : 'Respond with ONLY the post content, nothing else.'}`;

  return prompt;
}

function parseThreadResponse(response: string): string[] {
  const parts = response.split(/PART \d+:/i).filter(Boolean);
  if (parts.length > 1) {
    return parts.map(p => p.trim());
  }
  return response.split(/\n\n+/).filter(p => p.trim().length > 0);
}

router.post('/', async (req, res, next) => {
  try {
    if (!isGeminiConfigured()) {
      throw createError('GEMINI_API_KEY not configured', 500, 'CONFIG_ERROR');
    }

    const { topic, style, targetEngagement, constraints } = generateRequestSchema.parse(
      req.body
    );

    const model = getGeminiModel('gemini-1.5-flash');
    const prompt = buildPrompt(topic, style, targetEngagement, constraints);
    const result = await model.generateContent(prompt);
    const generatedText = result.response.text().trim();

    let content: string;
    let threadParts: string[] | undefined;

    if (style === 'thread') {
      threadParts = parseThreadResponse(generatedText);
      content = threadParts[0] ?? generatedText;
    } else {
      content = generatedText;
    }

    const analysis = analyzePost(content);

    const generatedPost: GeneratedPost = {
      content,
      threadParts,
      score: analysis.overallScore,
      suggestions: analysis.suggestions.map(s => s.message),
      engagementPrediction: {
        likes: Math.round(analysis.engagementScores.likeability * 100),
        replies: Math.round(analysis.engagementScores.replyability * 100),
        retweets: Math.round(analysis.engagementScores.retweetability * 100),
        quotes: Math.round(analysis.engagementScores.quoteability * 100),
        shares: Math.round(analysis.engagementScores.shareability * 100),
        dwellTime: Math.round(analysis.engagementScores.dwellPotential * 30),
      },
    };

    const id = randomUUID();
    await db.insert(schema.posts).values({
      id,
      content,
      threadParts: threadParts ?? null,
      score: analysis.overallScore,
    });

    res.json({
      success: true,
      data: generatedPost,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/history', async (_req, res, next) => {
  try {
    const posts = await db.query.posts.findMany({
      orderBy: (records, { desc }) => [desc(records.createdAt)],
      limit: 50,
    });

    res.json({
      success: true,
      data: posts,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
