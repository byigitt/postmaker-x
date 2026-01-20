import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { createError } from '../middleware/error.js';
import type { PostTemplate, TemplateCategory, TemplatePlaceholder } from '@postmaker/shared';

const router = Router();

const placeholderSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  description: z.string(),
  type: z.enum(['text', 'number', 'select']),
  options: z.array(z.string()).optional(),
  required: z.boolean(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().min(1, 'Description is required').max(500),
  category: z.enum([
    'question',
    'thread_starter',
    'hot_take',
    'story',
    'value_bomb',
    'cta',
    'engagement_hook',
    'controversy',
    'educational',
    'personal',
  ]),
  template: z.string().min(1, 'Template is required').max(5000),
  placeholders: z.array(placeholderSchema),
});

const DEFAULT_TEMPLATES: Omit<PostTemplate, 'id'>[] = [
  {
    name: 'Question Hook',
    description: 'Drives replies with an engaging open-ended question',
    category: 'question',
    template: 'What if I told you that {{topic}} is completely wrong?\n\n{{supporting_point}}\n\nWhat do you think?',
    placeholders: [
      { key: 'topic', label: 'Topic', description: 'The controversial topic', type: 'text', required: true },
      { key: 'supporting_point', label: 'Supporting Point', description: 'A point that backs up your claim', type: 'text', required: true },
    ],
    expectedScore: 75,
    targetEngagement: ['replies', 'quotes'],
    examples: ['What if I told you that working 60+ hours a week actually makes you LESS productive?'],
    tips: ['Keep the question open-ended', 'Make it slightly controversial'],
  },
  {
    name: 'Thread Starter',
    description: 'Perfect hook for educational threads',
    category: 'thread_starter',
    template: 'I spent {{time_period}} studying {{topic}}.\n\nHere are {{number}} things nobody talks about:\n\n(A thread)',
    placeholders: [
      { key: 'time_period', label: 'Time Period', description: 'How long you studied', type: 'text', required: true },
      { key: 'topic', label: 'Topic', description: 'What you studied', type: 'text', required: true },
      { key: 'number', label: 'Number of Items', description: 'How many insights', type: 'number', required: true },
    ],
    expectedScore: 82,
    targetEngagement: ['retweets', 'likes'],
    examples: ['I spent 3 years studying the X algorithm. Here are 7 things nobody talks about:'],
    tips: ['Use specific numbers', 'Promise insider knowledge'],
  },
  {
    name: 'Hot Take',
    description: 'Sparks debate and quote tweets',
    category: 'hot_take',
    template: 'Unpopular opinion: {{opinion}}\n\n{{reason}}\n\nChange my mind.',
    placeholders: [
      { key: 'opinion', label: 'Opinion', description: 'Your controversial stance', type: 'text', required: true },
      { key: 'reason', label: 'Reason', description: 'Why you hold this opinion', type: 'text', required: true },
    ],
    expectedScore: 78,
    targetEngagement: ['quotes', 'replies'],
    examples: ['Unpopular opinion: Most productivity advice is just procrastination with extra steps.'],
    tips: ['Be bold but not offensive', 'Back it up with reason'],
  },
  {
    name: 'Value Bomb',
    description: 'Provides immediate actionable value',
    category: 'value_bomb',
    template: '{{number}} {{item_type}} that will {{benefit}}:\n\n{{items}}\n\nBookmark this.',
    placeholders: [
      { key: 'number', label: 'Number', description: 'How many items', type: 'number', required: true },
      { key: 'item_type', label: 'Item Type', description: 'e.g., tools, tips, strategies', type: 'text', required: true },
      { key: 'benefit', label: 'Benefit', description: 'What the reader gains', type: 'text', required: true },
      { key: 'items', label: 'Items', description: 'The list of items (numbered)', type: 'text', required: true },
    ],
    expectedScore: 80,
    targetEngagement: ['retweets', 'likes', 'shares'],
    examples: ['5 free AI tools that will save you 10+ hours per week:'],
    tips: ['Be specific about the benefit', 'List format works well'],
  },
  {
    name: 'Story Hook',
    description: 'Personal narrative that builds connection',
    category: 'story',
    template: '{{time_reference}}, I {{situation}}.\n\n{{turning_point}}\n\n{{lesson}}',
    placeholders: [
      { key: 'time_reference', label: 'Time Reference', description: 'e.g., 2 years ago, Last week', type: 'text', required: true },
      { key: 'situation', label: 'Situation', description: 'What happened to you', type: 'text', required: true },
      { key: 'turning_point', label: 'Turning Point', description: 'What changed', type: 'text', required: true },
      { key: 'lesson', label: 'Lesson', description: 'What you learned', type: 'text', required: true },
    ],
    expectedScore: 76,
    targetEngagement: ['likes', 'shares'],
    examples: ['3 years ago, I was broke and depressed. Then I discovered one simple habit that changed everything.'],
    tips: ['Be vulnerable', 'End with universal lesson'],
  },
];

router.get('/', async (_req, res, next) => {
  try {
    const templates = await db.query.templates.findMany({
      orderBy: (records, { asc }) => [asc(records.name)],
    });

    const formatted: PostTemplate[] = templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category as TemplateCategory,
      template: t.template,
      placeholders: (t.placeholders ?? []) as TemplatePlaceholder[],
      expectedScore: 70,
      targetEngagement: ['likes'],
      examples: [],
      tips: [],
    }));

    res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/defaults', (_req, res) => {
  res.json({
    success: true,
    data: DEFAULT_TEMPLATES.map((t, i) => ({ ...t, id: `default-${i}` })),
  });
});

router.post('/', async (req, res, next) => {
  try {
    const data = createTemplateSchema.parse(req.body);
    const id = randomUUID();

    await db.insert(schema.templates).values({
      id,
      name: data.name,
      description: data.description,
      category: data.category,
      template: data.template,
      placeholders: data.placeholders,
    });

    res.status(201).json({
      success: true,
      data: { id, ...data },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id.startsWith('default-')) {
      const index = parseInt(id.replace('default-', ''), 10);
      const template = DEFAULT_TEMPLATES[index];
      if (!template) {
        throw createError('Template not found', 404, 'NOT_FOUND');
      }
      res.json({
        success: true,
        data: { ...template, id },
      });
      return;
    }

    const template = await db.query.templates.findFirst({
      where: eq(schema.templates.id, id),
    });

    if (!template) {
      throw createError('Template not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category as TemplateCategory,
        template: template.template,
        placeholders: (template.placeholders ?? []) as TemplatePlaceholder[],
        expectedScore: 70,
        targetEngagement: ['likes'],
        examples: [],
        tips: [],
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id.startsWith('default-')) {
      throw createError('Cannot delete default templates', 400, 'INVALID_OPERATION');
    }

    const existing = await db.query.templates.findFirst({
      where: eq(schema.templates.id, id),
    });

    if (!existing) {
      throw createError('Template not found', 404, 'NOT_FOUND');
    }

    await db.delete(schema.templates).where(eq(schema.templates.id, id));

    res.json({
      success: true,
      data: { deleted: id },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
