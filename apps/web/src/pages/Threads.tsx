import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalContent,
  ModalFooter,
} from '@/components/ui/modal';
import { Tooltip } from '@/components/ui/tooltip';
import { useGenerate } from '@/hooks/useGenerate';
import type { PostAnalysis } from '@postmaker/shared';

interface ThreadPart {
  id: string;
  content: string;
  analysis?: PostAnalysis;
}

interface ThreadOptions {
  maxParts: number;
  addHook: boolean;
  addCTA: boolean;
}

interface ThreadAnalysis {
  totalScore: number;
  hookStrength: number;
  flowScore: number;
  ctaEffectiveness: number;
  partScores: { id: string; score: number }[];
  suggestions: string[];
}

const MAX_TWEET_LENGTH = 280;

type BadgeVariant = 'success' | 'warning' | 'danger';

function getCharCountVariant(count: number): BadgeVariant {
  if (count > MAX_TWEET_LENGTH) return 'danger';
  if (count > MAX_TWEET_LENGTH - 20) return 'warning';
  return 'success';
}

function splitContentIntoThread(
  content: string,
  maxParts: number,
  addHook: boolean,
  addCTA: boolean
): ThreadPart[] {
  const sentences = content.split(/(?<=[.!?])\s+/);
  const parts: ThreadPart[] = [];
  let currentPart = '';
  let partCount = 0;

  for (const sentence of sentences) {
    const potentialPart = currentPart
      ? `${currentPart} ${sentence}`
      : sentence;

    const numbering = `${partCount + 1}/`;
    const availableLength = MAX_TWEET_LENGTH - numbering.length - 1;

    if (potentialPart.length <= availableLength) {
      currentPart = potentialPart;
    } else {
      if (currentPart) {
        parts.push({
          id: crypto.randomUUID(),
          content: currentPart.trim(),
        });
        partCount++;
        if (partCount >= maxParts) break;
      }
      currentPart = sentence;
    }
  }

  if (currentPart && partCount < maxParts) {
    parts.push({
      id: crypto.randomUUID(),
      content: currentPart.trim(),
    });
  }

  if (parts.length > 0 && addHook) {
    const firstPart = parts[0];
    if (
      firstPart &&
      !firstPart.content.includes('?') &&
      !firstPart.content.match(/^(Here|This|I|You|Let|Want|Ready|Ever)/i)
    ) {
      parts[0] = {
        id: firstPart.id,
        content: `Thread: ${firstPart.content}`,
      };
    }
  }

  if (parts.length > 1 && addCTA) {
    const lastPart = parts[parts.length - 1];
    if (
      lastPart &&
      !lastPart.content.match(/(follow|like|retweet|share|comment|reply)/i)
    ) {
      const ctas = [
        '\n\nFollow for more.',
        '\n\nRT to share.',
        '\n\nLike if this helped.',
      ];
      const randomCTA = ctas[Math.floor(Math.random() * ctas.length)] ?? '';
      const newContent = lastPart.content + randomCTA;
      if (newContent.length <= MAX_TWEET_LENGTH - 5) {
        parts[parts.length - 1] = {
          id: lastPart.id,
          content: newContent,
        };
      }
    }
  }

  return parts.length > 0
    ? parts
    : [{ id: crypto.randomUUID(), content: '' }];
}

function analyzeThread(parts: ThreadPart[]): ThreadAnalysis {
  const partScores = parts.map((part) => {
    let score = 50;

    if (part.content.length > 50) score += 10;
    if (part.content.length > 150) score += 10;
    if (part.content.includes('?')) score += 5;
    if (part.content.match(/\d+/)) score += 5;
    if (part.content.length > MAX_TWEET_LENGTH) score -= 20;

    score = Math.min(100, Math.max(0, score));
    return { id: part.id, score };
  });

  const avgScore =
    partScores.reduce((sum, p) => sum + p.score, 0) / partScores.length;

  const firstPart = parts[0]?.content || '';
  let hookStrength = 50;
  if (firstPart.startsWith('Thread:')) hookStrength += 15;
  if (firstPart.includes('?')) hookStrength += 15;
  if (firstPart.match(/^(Here|This|I|You|Let|Want|Ready|Ever)/i))
    hookStrength += 10;
  if (firstPart.length > 100 && firstPart.length < 200) hookStrength += 10;
  hookStrength = Math.min(100, hookStrength);

  const lastPart = parts[parts.length - 1]?.content || '';
  let ctaEffectiveness = 50;
  if (lastPart.match(/(follow|like|retweet|share|comment|reply)/i))
    ctaEffectiveness += 30;
  if (lastPart.includes('?')) ctaEffectiveness += 10;
  ctaEffectiveness = Math.min(100, ctaEffectiveness);

  let flowScore = 70;
  for (let i = 1; i < parts.length; i++) {
    const prevPart = parts[i - 1];
    const currPart = parts[i];
    if (!prevPart || !currPart) continue;
    const prev = prevPart.content.toLowerCase();
    const curr = currPart.content.toLowerCase();
    const prevWords = prev.split(/\s+/).slice(-3);
    const currWords = curr.split(/\s+/).slice(0, 3);
    const hasConnection = prevWords.some(
      (w) => currWords.includes(w) && w.length > 3
    );
    if (hasConnection) flowScore += 5;
  }
  flowScore = Math.min(100, flowScore);

  const suggestions: string[] = [];
  if (hookStrength < 70) {
    suggestions.push('Add a stronger hook to your first tweet');
  }
  if (ctaEffectiveness < 70) {
    suggestions.push('Add a call-to-action to your last tweet');
  }
  if (flowScore < 75) {
    suggestions.push('Improve transitions between tweets for better flow');
  }
  if (parts.some((p) => p.content.length > MAX_TWEET_LENGTH)) {
    suggestions.push('Some tweets exceed character limit');
  }
  if (parts.length < 3) {
    suggestions.push('Threads with 3+ tweets tend to perform better');
  }

  return {
    totalScore: Math.round(avgScore * 0.4 + hookStrength * 0.3 + flowScore * 0.3),
    hookStrength,
    flowScore,
    ctaEffectiveness,
    partScores,
    suggestions,
  };
}

export function Threads(): JSX.Element {
  const [sourceContent, setSourceContent] = useState('');
  const [parts, setParts] = useState<ThreadPart[]>([
    { id: crypto.randomUUID(), content: '' },
  ]);
  const [options, setOptions] = useState<ThreadOptions>({
    maxParts: 5,
    addHook: true,
    addCTA: true,
  });
  const [editingPart, setEditingPart] = useState<ThreadPart | null>(null);
  const [editContent, setEditContent] = useState('');
  const [threadAnalysis, setThreadAnalysis] = useState<ThreadAnalysis | null>(
    null
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const { generate, isGenerating } = useGenerate({
    onSuccess: (data) => {
      if (data.threadParts && data.threadParts.length > 0) {
        const newParts = data.threadParts.map((content) => ({
          id: crypto.randomUUID(),
          content,
        }));
        setParts(newParts);
        setThreadAnalysis(analyzeThread(newParts));
      }
    },
  });

  const totalCharacters = useMemo(
    () => parts.reduce((sum, p) => sum + p.content.length, 0),
    [parts]
  );

  const handleSplitContent = useCallback(() => {
    if (!sourceContent.trim()) return;
    const newParts = splitContentIntoThread(
      sourceContent,
      options.maxParts,
      options.addHook,
      options.addCTA
    );
    setParts(newParts);
    setThreadAnalysis(analyzeThread(newParts));
  }, [sourceContent, options]);

  const handleAnalyzeThread = useCallback(() => {
    setThreadAnalysis(analyzeThread(parts));
  }, [parts]);

  const handleGenerateWithAI = useCallback(() => {
    generate({
      topic: sourceContent || 'Create an engaging thread',
      style: 'thread',
      targetEngagement: 'all',
      constraints: {
        includeCTA: options.addCTA,
      },
    });
  }, [generate, sourceContent, options.addCTA]);

  const addPart = useCallback(() => {
    setParts((prev) => [...prev, { id: crypto.randomUUID(), content: '' }]);
  }, []);

  const removePart = useCallback((id: string) => {
    setParts((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const updatePart = useCallback((id: string, content: string) => {
    setParts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, content } : p))
    );
  }, []);

  const openEditor = useCallback((part: ThreadPart) => {
    setEditingPart(part);
    setEditContent(part.content);
  }, []);

  const saveEdit = useCallback(() => {
    if (editingPart) {
      updatePart(editingPart.id, editContent);
      setEditingPart(null);
      setEditContent('');
    }
  }, [editingPart, editContent, updatePart]);

  const cancelEdit = useCallback(() => {
    setEditingPart(null);
    setEditContent('');
  }, []);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === index) return;

      setParts((prev) => {
        const newParts = [...prev];
        const draggedPart = newParts[draggedIndex];
        if (!draggedPart) return prev;
        newParts.splice(draggedIndex, 1);
        newParts.splice(index, 0, draggedPart);
        return newParts;
      });
      setDraggedIndex(index);
    },
    [draggedIndex]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const copyAllToClipboard = useCallback(async () => {
    const threadText = parts
      .map((part, index) => `${index + 1}/${parts.length}\n${part.content}`)
      .join('\n\n---\n\n');

    try {
      await navigator.clipboard.writeText(threadText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [parts]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Thread Creator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                label="Paste your content"
                placeholder="Paste your long-form content here and we'll split it into a thread..."
                value={sourceContent}
                onChange={(e) => setSourceContent(e.target.value)}
                autoResize
                className="min-h-[150px]"
              />

              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-zinc-400">Max parts:</label>
                  <input
                    type="range"
                    min={3}
                    max={10}
                    value={options.maxParts}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        maxParts: Number(e.target.value),
                      }))
                    }
                    className="h-2 w-24 cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-blue-600"
                  />
                  <span className="min-w-[2rem] text-sm font-medium text-zinc-300">
                    {options.maxParts}
                  </span>
                </div>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={options.addHook}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        addHook: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
                  />
                  <span className="text-sm text-zinc-400">Add hook</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={options.addCTA}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        addCTA: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900"
                  />
                  <span className="text-sm text-zinc-400">Add CTA</span>
                </label>

                <Button
                  variant="primary"
                  onClick={handleSplitContent}
                  disabled={!sourceContent.trim()}
                >
                  Split into Thread
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Thread Preview</CardTitle>
              <div className="text-sm text-zinc-400">
                {parts.length} tweets | {totalCharacters} total chars
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {parts.map((part, index) => (
                <div
                  key={part.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group relative rounded-lg border transition-all ${
                    draggedIndex === index
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-start gap-3 p-4">
                    <div className="flex cursor-grab flex-col items-center gap-2 active:cursor-grabbing">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                        {index + 1}
                      </div>
                      <svg
                        className="h-4 w-4 text-zinc-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8h16M4 16h16"
                        />
                      </svg>
                    </div>

                    <div className="flex-1">
                      <p className="whitespace-pre-wrap text-zinc-100">
                        {part.content || (
                          <span className="text-zinc-500">
                            Empty tweet...
                          </span>
                        )}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <Badge
                          variant={getCharCountVariant(part.content.length)}
                          size="sm"
                        >
                          {part.content.length}/{MAX_TWEET_LENGTH}
                        </Badge>
                        <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <Tooltip content="Edit tweet">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditor(part)}
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </Button>
                          </Tooltip>
                          {parts.length > 1 && (
                            <Tooltip content="Delete tweet">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removePart(part.id)}
                                className="hover:text-red-400"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </Button>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {index < parts.length - 1 && (
                    <div className="absolute -bottom-3 left-7 h-3 w-0.5 bg-zinc-700" />
                  )}
                </div>
              ))}

              <Button variant="secondary" onClick={addPart} className="w-full">
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Tweet
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={handleAnalyzeThread}
                  disabled={parts.every((p) => !p.content.trim())}
                >
                  Analyze Thread
                </Button>
                <Button
                  variant="secondary"
                  onClick={copyAllToClipboard}
                  disabled={parts.every((p) => !p.content.trim())}
                >
                  {copySuccess ? 'Copied!' : 'Copy All'}
                </Button>
              </div>
              <Button
                variant="primary"
                onClick={handleGenerateWithAI}
                disabled={isGenerating}
                loading={isGenerating}
              >
                Generate Thread with AI
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {threadAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle>Thread Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div
                    className={`inline-flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold ${
                      threadAnalysis.totalScore >= 80
                        ? 'bg-green-500/20 text-green-400'
                        : threadAnalysis.totalScore >= 60
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {threadAnalysis.totalScore}
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">Total Score</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Hook Strength</span>
                      <span className="font-medium text-zinc-300">
                        {threadAnalysis.hookStrength}%
                      </span>
                    </div>
                    <Progress value={threadAnalysis.hookStrength} size="sm" />
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Flow Score</span>
                      <span className="font-medium text-zinc-300">
                        {threadAnalysis.flowScore}%
                      </span>
                    </div>
                    <Progress value={threadAnalysis.flowScore} size="sm" />
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-zinc-400">CTA Effectiveness</span>
                      <span className="font-medium text-zinc-300">
                        {threadAnalysis.ctaEffectiveness}%
                      </span>
                    </div>
                    <Progress
                      value={threadAnalysis.ctaEffectiveness}
                      size="sm"
                    />
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-medium text-zinc-300">
                    Per-Tweet Scores
                  </h4>
                  <div className="space-y-2">
                    {threadAnalysis.partScores.map((ps, index) => (
                      <div key={ps.id} className="flex items-center gap-2">
                        <span className="w-6 text-xs text-zinc-500">
                          {index + 1}/
                        </span>
                        <Progress
                          value={ps.score}
                          size="sm"
                          className="flex-1"
                        />
                        <span className="w-8 text-right text-xs text-zinc-400">
                          {ps.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {threadAnalysis.suggestions.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-zinc-300">
                      Suggestions
                    </h4>
                    <ul className="space-y-2">
                      {threadAnalysis.suggestions.map((suggestion, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-zinc-400"
                        >
                          <svg
                            className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Thread Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="font-medium text-green-400">1.</span>
                  Start with a strong hook that makes people want to read more
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-green-400">2.</span>
                  Each tweet should stand alone but flow into the next
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-green-400">3.</span>
                  Use numbers and lists to make threads scannable
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-green-400">4.</span>
                  End with a CTA or question to drive engagement
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-medium text-green-400">5.</span>
                  Keep threads between 3-10 tweets for optimal engagement
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal open={!!editingPart} onClose={cancelEdit}>
        <ModalHeader>
          <ModalTitle>Edit Tweet</ModalTitle>
          <ModalClose onClick={cancelEdit} />
        </ModalHeader>
        <ModalContent>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            maxLength={MAX_TWEET_LENGTH}
            showCount
            autoResize
            className="min-h-[120px]"
          />
          <div className="mt-2">
            <Badge
              variant={getCharCountVariant(editContent.length)}
              size="sm"
            >
              {editContent.length}/{MAX_TWEET_LENGTH}
            </Badge>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="ghost" onClick={cancelEdit}>
            Cancel
          </Button>
          <Button variant="primary" onClick={saveEdit}>
            Save
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
