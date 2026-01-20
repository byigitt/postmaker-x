import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PostDraft, PostAnalysis, PostStyle, TargetEngagement } from '@postmaker/shared';

interface PostState {
  draft: PostDraft;
  analysis: PostAnalysis | null;
  style: PostStyle;
  targetEngagement: TargetEngagement;
  history: Array<{
    content: string;
    analysis: PostAnalysis;
    timestamp: number;
  }>;
}

interface PostActions {
  setContent: (content: string) => void;
  setMediaUrls: (urls: string[]) => void;
  setIsThread: (isThread: boolean) => void;
  setThreadParts: (parts: string[]) => void;
  setAnalysis: (analysis: PostAnalysis | null) => void;
  setStyle: (style: PostStyle) => void;
  setTargetEngagement: (target: TargetEngagement) => void;
  addToHistory: (content: string, analysis: PostAnalysis) => void;
  clearDraft: () => void;
  clearHistory: () => void;
}

const initialDraft: PostDraft = {
  content: '',
  mediaUrls: [],
  isThread: false,
  threadParts: [],
};

export const usePostStore = create<PostState & PostActions>()(
  persist(
    (set) => ({
      draft: initialDraft,
      analysis: null,
      style: 'informative',
      targetEngagement: 'all',
      history: [],

      setContent: (content) =>
        set((state) => ({
          draft: { ...state.draft, content },
        })),

      setMediaUrls: (mediaUrls) =>
        set((state) => ({
          draft: { ...state.draft, mediaUrls },
        })),

      setIsThread: (isThread) =>
        set((state) => ({
          draft: { ...state.draft, isThread },
        })),

      setThreadParts: (threadParts) =>
        set((state) => ({
          draft: { ...state.draft, threadParts },
        })),

      setAnalysis: (analysis) => set({ analysis }),

      setStyle: (style) => set({ style }),

      setTargetEngagement: (targetEngagement) => set({ targetEngagement }),

      addToHistory: (content, analysis) =>
        set((state) => ({
          history: [
            { content, analysis, timestamp: Date.now() },
            ...state.history.slice(0, 49),
          ],
        })),

      clearDraft: () =>
        set({
          draft: initialDraft,
          analysis: null,
        }),

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'postmaker-draft',
      partialize: (state) => ({
        draft: state.draft,
        style: state.style,
        targetEngagement: state.targetEngagement,
        history: state.history,
      }),
    }
  )
);
