import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PostAnalysis } from '@postmaker/shared';

interface UseAnalysisOptions {
  onSuccess?: (data: PostAnalysis) => void;
  onError?: (error: Error) => void;
}

export function useAnalysis(options: UseAnalysisOptions = {}) {
  const mutation = useMutation({
    mutationFn: (content: string) => api.analyze(content),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });

  return {
    analyze: mutation.mutate,
    analyzeAsync: mutation.mutateAsync,
    analysis: mutation.data,
    isAnalyzing: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
