import { pgTable, text, real, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  threadParts: jsonb('thread_parts').$type<string[]>(),
  score: real('score').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const analysisHistory = pgTable('analysis_history', {
  id: text('id').primaryKey(),
  postContent: text('post_content').notNull(),
  analysis: jsonb('analysis').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const templates = pgTable('templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  template: text('template').notNull(),
  placeholders: jsonb('placeholders').$type<
    Array<{
      key: string;
      label: string;
      description: string;
      type: 'text' | 'number' | 'select';
      options?: string[];
      required: boolean;
    }>
  >(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type AnalysisHistoryRecord = typeof analysisHistory.$inferSelect;
export type NewAnalysisHistory = typeof analysisHistory.$inferInsert;
export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;
