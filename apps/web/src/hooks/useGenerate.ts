import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PostGenerationRequest, GeneratedPost } from '@postmaker/shared';

interface UseGenerateOptions {
  onSuccess?: (data: GeneratedPost) => void;
  onError?: (error: Error) => void;
}

export function useGenerate(options: UseGenerateOptions = {}) {
  const mutation = useMutation({
    mutationFn: (params: PostGenerationRequest) => api.generate(params),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });

  return {
    generate: mutation.mutate,
    generateAsync: mutation.mutateAsync,
    generatedPost: mutation.data,
    isGenerating: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
