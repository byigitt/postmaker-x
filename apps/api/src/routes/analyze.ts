import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { db, schema } from '../db/index.js';
import { analyzePost } from '../services/analyzer/index.js';
import type { PostAnalysis } from '@postmaker/shared';

const router = Router();

const analyzeRequestSchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000, 'Content too long'),
  hasMedia: z.boolean().optional().default(false),
  saveHistory: z.boolean().optional().default(true),
});

router.post('/', async (req, res, next) => {
  try {
    const { content, hasMedia, saveHistory } = analyzeRequestSchema.parse(req.body);

    // Convert hasMedia boolean to mediaUrls array format expected by analyzer
    const mediaUrls = hasMedia ? ['media'] : undefined;
    const analysis: PostAnalysis = analyzePost(content, mediaUrls);

    if (saveHistory) {
      const id = randomUUID();
      await db.insert(schema.analysisHistory).values({
        id,
        postContent: content,
        analysis: JSON.stringify(analysis),
      });
    }

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/history', async (_req, res, next) => {
  try {
    const history = await db.query.analysisHistory.findMany({
      orderBy: (records, { desc }) => [desc(records.createdAt)],
      limit: 50,
    });

    const parsed = history.map(record => ({
      id: record.id,
      postContent: record.postContent,
      analysis: typeof record.analysis === 'string'
        ? JSON.parse(record.analysis) as PostAnalysis
        : record.analysis,
      createdAt: record.createdAt,
    }));

    res.json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
