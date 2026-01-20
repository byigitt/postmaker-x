import { useState } from 'react';
import { usePostStore } from '@/stores/post';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useGenerate } from '@/hooks/useGenerate';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select } from '@/components/ui/select';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalContent,
  ModalFooter,
} from '@/components/ui/modal';
import type {
  PostStyle,
  TargetEngagement,
  PostGenerationRequest,
  PostConstraints,
} from '@postmaker/shared';

const MAX_CHARACTERS = 280;

const STYLE_OPTIONS = [
  { value: 'informative', label: 'Informative' },
  { value: 'controversial', label: 'Controversial' },
  { value: 'question', label: 'Question' },
  { value: 'thread', label: 'Thread' },
  { value: 'story', label: 'Story' },
  { value: 'hook', label: 'Hook' },
];

const ENGAGEMENT_OPTIONS = [
  { value: 'all', label: 'All Engagement' },
  { value: 'likes', label: 'Likes' },
  { value: 'replies', label: 'Replies' },
  { value: 'retweets', label: 'Retweets' },
  { value: 'quotes', label: 'Quotes' },
  { value: 'shares', label: 'Shares' },
];

function getScoreColorClass(score: number): string {
  if (score >= 80) return 'green-500';
  if (score >= 60) return 'yellow-500';
  if (score >= 40) return 'orange-500';
  return 'red-500';
}

function getPriorityVariant(priority: string): 'danger' | 'warning' | 'neutral' {
  switch (priority) {
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    default:
      return 'neutral';
  }
}

function getSeverityVariant(severity: string): 'danger' | 'warning' | 'info' {
  switch (severity) {
    case 'critical':
      return 'danger';
    case 'warning':
      return 'warning';
    default:
      return 'info';
  }
}

function CircularProgress({ value, size = 120 }: { value: number; size?: number }): JSX.Element {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, value));
  const offset = circumference - (progress / 100) * circumference;
  const colorClass = getScoreColorClass(value);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-zinc-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`transition-all duration-500 stroke-${colorClass}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold text-${colorClass}`}>
          {Math.round(value)}
        </span>
        <span className="text-xs text-zinc-400">/ 100</span>
      </div>
    </div>
  );
}

interface EngagementBarProps {
  label: string;
  value: number;
}

function EngagementBar({ label, value }: EngagementBarProps): JSX.Element {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="text-zinc-400">{Math.round(value)}</span>
      </div>
      <Progress value={value} size="sm" />
    </div>
  );
}

export function Home(): JSX.Element {
  const {
    draft,
    setContent,
    setMediaUrls,
    analysis,
    setAnalysis,
    addToHistory,
    clearDraft,
    style,
    setStyle,
    targetEngagement,
    setTargetEngagement,
  } = usePostStore();

  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaUrlError, setMediaUrlError] = useState<string | undefined>(undefined);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateTopic, setGenerateTopic] = useState('');
  const [generateConstraints, setGenerateConstraints] = useState<PostConstraints>({
    includeHashtags: false,
    includeEmojis: false,
    includeCTA: false,
  });

  const { analyze, isAnalyzing } = useAnalysis({
    onSuccess: (data) => {
      setAnalysis(data);
      if (draft.content.trim()) {
        addToHistory(draft.content, data);
      }
    },
  });

  const { generate, isGenerating } = useGenerate({
    onSuccess: (data) => {
      setContent(data.content);
      setIsGenerateModalOpen(false);
      setGenerateTopic('');
      if (data.content.trim()) {
        analyze(data.content);
      }
    },
  });

  const handleAnalyze = () => {
    if (draft.content.trim()) {
      analyze(draft.content);
    }
  };

  const handleClear = () => {
    clearDraft();
    setMediaUrl('');
  };

  const handleGenerate = () => {
    if (!generateTopic.trim()) return;

    const request: PostGenerationRequest = {
      topic: generateTopic,
      style,
      targetEngagement,
      constraints: generateConstraints,
    };

    generate(request);
  };

  const validateMediaUrl = (url: string): string | undefined => {
    if (!url.trim()) {
      return undefined;
    }

    // Check for valid URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return 'Invalid URL format';
    }

    // Require HTTPS (allow HTTP only for localhost in development)
    const isLocalhost = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
    const isSecure = parsedUrl.protocol === 'https:';
    const isDevHttp = parsedUrl.protocol === 'http:' && isLocalhost;

    if (!isSecure && !isDevHttp) {
      return 'URL must use HTTPS';
    }

    // Optional: Check for common media extensions
    const mediaExtensions = /\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|mov|avi)$/i;
    const hasMediaExtension = mediaExtensions.test(parsedUrl.pathname);
    const isKnownMediaHost = /\.(cloudinary|imgur|giphy|twimg|pbs\.twimg)\./i.test(parsedUrl.hostname);

    if (!hasMediaExtension && !isKnownMediaHost) {
      return 'URL should point to an image or video file';
    }

    return undefined;
  };

  const handleMediaUrlChange = (url: string) => {
    setMediaUrl(url);
    const error = validateMediaUrl(url);
    setMediaUrlError(error);

    if (url.trim() && !error) {
      setMediaUrls([url]);
    } else {
      setMediaUrls([]);
    }
  };

  const characterCount = draft.content.length;
  const isOverLimit = characterCount > MAX_CHARACTERS;

  return (
    <div className="flex gap-6 h-full">
      {/* Left Panel - Post Editor (60%) */}
      <div className="w-[60%] space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Post Editor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="What's happening? Write your post here..."
              value={draft.content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={MAX_CHARACTERS}
              showCount
              autoResize
              className="min-h-[180px]"
              error={isOverLimit ? 'Post exceeds character limit' : undefined}
            />

            <Input
              label="Media URL (optional)"
              placeholder="https://example.com/image.jpg"
              value={mediaUrl}
              onChange={(e) => handleMediaUrlChange(e.target.value)}
              error={mediaUrlError}
              helperText={mediaUrlError ? undefined : "Add an image or video URL to boost engagement"}
            />

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="primary"
                onClick={handleAnalyze}
                disabled={!draft.content.trim() || isAnalyzing || isOverLimit}
                loading={isAnalyzing}
              >
                Analyze
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsGenerateModalOpen(true)}
              >
                Generate with AI
              </Button>
              <Button variant="ghost" onClick={handleClear}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Suggestions Card - Moved to left panel */}
        {analysis && analysis.suggestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Suggestions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/50"
                >
                  <Badge variant={getPriorityVariant(suggestion.priority)} size="sm">
                    {suggestion.priority}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200">{suggestion.message}</p>
                    {suggestion.action && (
                      <p className="mt-1 text-xs text-zinc-500">{suggestion.action}</p>
                    )}
                  </div>
                  <span className="text-xs text-green-400 whitespace-nowrap">
                    +{suggestion.potentialScoreIncrease}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Panel - Analysis Results (40%) */}
      <div className="w-[40%] space-y-4 overflow-y-auto">
        {analysis ? (
          <>
            {/* Overall Score Card */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Score</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center py-4">
                <CircularProgress value={analysis.overallScore} size={140} />
              </CardContent>
            </Card>

            {/* Engagement Scores Card */}
            <Card>
              <CardHeader>
                <CardTitle>Engagement Scores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <EngagementBar
                  label="Likeability"
                  value={analysis.engagementScores.likeability}
                />
                <EngagementBar
                  label="Replyability"
                  value={analysis.engagementScores.replyability}
                />
                <EngagementBar
                  label="Retweetability"
                  value={analysis.engagementScores.retweetability}
                />
                <EngagementBar
                  label="Quoteability"
                  value={analysis.engagementScores.quoteability}
                />
                <EngagementBar
                  label="Shareability"
                  value={analysis.engagementScores.shareability}
                />
                <EngagementBar
                  label="Dwell Potential"
                  value={analysis.engagementScores.dwellPotential}
                />
              </CardContent>
            </Card>

            {/* Content Metrics Card */}
            <Card>
              <CardHeader>
                <CardTitle>Content Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Characters</span>
                    <span className="text-zinc-200">
                      {analysis.contentMetrics.characterCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Words</span>
                    <span className="text-zinc-200">
                      {analysis.contentMetrics.wordCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Reading Time</span>
                    <span className="text-zinc-200">
                      {analysis.contentMetrics.readingTimeSeconds}s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Sentences</span>
                    <span className="text-zinc-200">
                      {analysis.contentMetrics.sentenceCount}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-zinc-700/50">
                  {analysis.contentMetrics.hasMedia && (
                    <Badge variant="info" size="sm">Has Media</Badge>
                  )}
                  {analysis.contentMetrics.hasQuestion && (
                    <Badge variant="info" size="sm">Has Question</Badge>
                  )}
                  {analysis.contentMetrics.hasHashtags && (
                    <Badge variant="info" size="sm">
                      {analysis.contentMetrics.hashtagCount} Hashtags
                    </Badge>
                  )}
                  {analysis.contentMetrics.hasEmojis && (
                    <Badge variant="info" size="sm">
                      {analysis.contentMetrics.emojiCount} Emojis
                    </Badge>
                  )}
                  {analysis.contentMetrics.hasCTA && (
                    <Badge variant="success" size="sm">Has CTA</Badge>
                  )}
                  {analysis.contentMetrics.hasMentions && (
                    <Badge variant="info" size="sm">
                      {analysis.contentMetrics.mentionCount} Mentions
                    </Badge>
                  )}
                  {analysis.contentMetrics.hasLinks && (
                    <Badge variant="warning" size="sm">
                      {analysis.contentMetrics.linkCount} Links
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Algorithm Signals Card */}
            <Card>
              <CardHeader>
                <CardTitle>Algorithm Signals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis.algorithmSignals.positiveSignals.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-green-400 mb-2">
                      Positive Signals
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.algorithmSignals.positiveSignals.map((signal, idx) => (
                        <Badge key={idx} variant="success" size="sm">
                          {signal.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.algorithmSignals.negativeSignals.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-400 mb-2">
                      Negative Signals
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.algorithmSignals.negativeSignals.map((signal, idx) => (
                        <Badge key={idx} variant="danger" size="sm">
                          {signal.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.algorithmSignals.neutralSignals.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-zinc-400 mb-2">
                      Neutral Signals
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.algorithmSignals.neutralSignals.map((signal, idx) => (
                        <Badge key={idx} variant="neutral" size="sm">
                          {signal.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.algorithmSignals.positiveSignals.length === 0 &&
                  analysis.algorithmSignals.negativeSignals.length === 0 &&
                  analysis.algorithmSignals.neutralSignals.length === 0 && (
                    <p className="text-sm text-zinc-500">No signals detected</p>
                  )}
              </CardContent>
            </Card>

            {/* Warnings Card */}
            {analysis.warnings.length > 0 && (
              <Card className="border-red-500/30">
                <CardHeader>
                  <CardTitle className="text-red-400">Warnings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {analysis.warnings.map((warning, index) => (
                    <div key={index} className="flex items-start gap-3 text-sm">
                      <Badge variant={getSeverityVariant(warning.severity)} size="sm">
                        {warning.severity}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-zinc-200">{warning.message}</p>
                        <p className="text-xs text-red-400/70 mt-0.5">
                          Score impact: {warning.scoreImpact}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-700/50 flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-zinc-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                  Ready to Analyze
                </h3>
                <p className="text-sm text-zinc-400 max-w-xs">
                  Write your post and click Analyze to see how it scores against the X
                  algorithm.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Generation Modal */}
      <Modal open={isGenerateModalOpen} onClose={() => setIsGenerateModalOpen(false)}>
        <ModalHeader>
          <ModalTitle>Generate Post with AI</ModalTitle>
          <ModalClose onClick={() => setIsGenerateModalOpen(false)} />
        </ModalHeader>
        <ModalContent className="space-y-4">
          <Input
            label="Topic"
            placeholder="Enter the topic you want to post about..."
            value={generateTopic}
            onChange={(e) => setGenerateTopic(e.target.value)}
          />

          <Select
            label="Style"
            options={STYLE_OPTIONS}
            value={style}
            onChange={(value) => setStyle(value as PostStyle)}
          />

          <Select
            label="Target Engagement"
            options={ENGAGEMENT_OPTIONS}
            value={targetEngagement}
            onChange={(value) => setTargetEngagement(value as TargetEngagement)}
          />

          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-300">
              Constraints
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateConstraints.includeHashtags}
                  onChange={(e) =>
                    setGenerateConstraints((prev) => ({
                      ...prev,
                      includeHashtags: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500/50"
                />
                <span className="text-sm text-zinc-300">Include Hashtags</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateConstraints.includeEmojis}
                  onChange={(e) =>
                    setGenerateConstraints((prev) => ({
                      ...prev,
                      includeEmojis: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500/50"
                />
                <span className="text-sm text-zinc-300">Include Emojis</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateConstraints.includeCTA}
                  onChange={(e) =>
                    setGenerateConstraints((prev) => ({
                      ...prev,
                      includeCTA: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500/50"
                />
                <span className="text-sm text-zinc-300">Include Call-to-Action</span>
              </label>
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setIsGenerateModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={!generateTopic.trim() || isGenerating}
            loading={isGenerating}
          >
            Generate
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
