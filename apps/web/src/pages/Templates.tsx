import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { usePostStore } from '@/stores/post';
import type { TemplateCategory, PostTemplate, TemplatePlaceholder, TargetEngagementType } from '@postmaker/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip } from '@/components/ui/tooltip';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalContent,
  ModalFooter,
} from '@/components/ui/modal';

const CATEGORIES: { value: TemplateCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'question', label: 'Question' },
  { value: 'thread_starter', label: 'Thread Starter' },
  { value: 'hot_take', label: 'Hot Take' },
  { value: 'story', label: 'Story' },
  { value: 'value_bomb', label: 'Value Bomb' },
  { value: 'cta', label: 'CTA' },
  { value: 'engagement_hook', label: 'Engagement Hook' },
  { value: 'controversy', label: 'Controversial' },
  { value: 'educational', label: 'Educational' },
  { value: 'personal', label: 'Personal' },
];

const CATEGORY_OPTIONS = CATEGORIES.filter((c) => c.value !== 'all').map((c) => ({
  value: c.value,
  label: c.label,
}));

const ENGAGEMENT_ICONS: Record<TargetEngagementType, { icon: string; label: string }> = {
  likes: { icon: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z', label: 'Likes' },
  replies: { icon: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z', label: 'Replies' },
  retweets: { icon: 'M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3', label: 'Retweets' },
  quotes: { icon: 'M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z', label: 'Quotes' },
  shares: { icon: 'M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z', label: 'Shares' },
};

const PLACEHOLDER_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select' },
];

function getCategoryBadgeVariant(category: TemplateCategory): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  const variants: Record<TemplateCategory, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
    question: 'info',
    thread_starter: 'success',
    hot_take: 'danger',
    story: 'warning',
    value_bomb: 'success',
    cta: 'warning',
    engagement_hook: 'info',
    controversy: 'danger',
    educational: 'info',
    personal: 'neutral',
  };
  return variants[category];
}

function getScoreBadgeVariant(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'danger';
}

function highlightPlaceholders(text: string): React.ReactNode[] {
  const parts = text.split(/(\{[^}]+\})/g);
  return parts.map((part, index) => {
    if (part.match(/^\{[^}]+\}$/)) {
      return (
        <span key={index} className="bg-blue-500/30 text-blue-300 px-1 rounded font-mono">
          {part}
        </span>
      );
    }
    return part;
  });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyTemplateValues(template: string, values: Record<string, string>): string {
  let filled = template;
  for (const [key, value] of Object.entries(values)) {
    const escapedKey = escapeRegex(key);
    filled = filled.replace(new RegExp(`\\{${escapedKey}\\}`, 'g'), value || `{${key}}`);
  }
  return filled;
}

function extractPlaceholderKeys(template: string): string[] {
  const matches = template.match(/\{([^}]+)\}/g) || [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))];
}

interface TemplateCardProps {
  template: PostTemplate;
  onPreview: (template: PostTemplate) => void;
  onUse: (template: PostTemplate) => void;
  onEdit: (template: PostTemplate) => void;
  onDelete: (template: PostTemplate) => void;
}

function TemplateCard({ template, onPreview, onUse, onEdit, onDelete }: TemplateCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card
      className="relative transition-all duration-200 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-zinc-100 line-clamp-1">{template.name}</h3>
          <Badge variant={getCategoryBadgeVariant(template.category)} size="sm">
            {template.category.replace('_', ' ')}
          </Badge>
        </div>

        <p className="text-sm text-zinc-400 line-clamp-2 mb-4 min-h-[40px]">
          {template.description}
        </p>

        <div className="flex items-center gap-3 mb-4">
          <Badge variant={getScoreBadgeVariant(template.expectedScore)} size="sm">
            Score: {template.expectedScore}
          </Badge>
          <div className="flex items-center gap-1">
            {template.targetEngagement.map((engagement) => (
              <Tooltip key={engagement} content={ENGAGEMENT_ICONS[engagement].label}>
                <span className="p-1 rounded hover:bg-zinc-700/50 cursor-default">
                  <svg
                    className="w-4 h-4 text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={ENGAGEMENT_ICONS[engagement].icon} />
                  </svg>
                </span>
              </Tooltip>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" className="flex-1" onClick={() => onUse(template)}>
            Use Template
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onPreview(template)}>
            Preview
          </Button>
        </div>

        {isHovered && (
          <div className="absolute top-2 right-2 flex items-center gap-1 animate-in fade-in-0 duration-150">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onEdit(template)}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
              onClick={() => onDelete(template)}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PreviewModalProps {
  template: PostTemplate | null;
  open: boolean;
  onClose: () => void;
  onUse: (template: PostTemplate) => void;
}

function PreviewModal({ template, open, onClose, onUse }: PreviewModalProps) {
  if (!template) return null;

  return (
    <Modal open={open} onClose={onClose} className="max-w-2xl">
      <ModalHeader>
        <ModalTitle>{template.name}</ModalTitle>
        <ModalClose onClick={onClose} />
      </ModalHeader>
      <ModalContent className="max-h-[60vh] overflow-y-auto space-y-6">
        <div>
          <h4 className="text-sm font-medium text-zinc-300 mb-2">Template</h4>
          <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-4">
            <code className="text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed">
              {highlightPlaceholders(template.template)}
            </code>
          </div>
        </div>

        {template.placeholders.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-zinc-300 mb-2">Placeholders</h4>
            <div className="space-y-2">
              {template.placeholders.map((placeholder) => (
                <div
                  key={placeholder.key}
                  className="flex items-start gap-3 bg-zinc-800/50 rounded-lg p-3"
                >
                  <span className="bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded font-mono text-sm">
                    {`{${placeholder.key}}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">{placeholder.label}</p>
                    <p className="text-xs text-zinc-400">{placeholder.description}</p>
                  </div>
                  <Badge variant="neutral" size="sm">
                    {placeholder.type}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {template.examples.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-zinc-300 mb-2">Examples</h4>
            <div className="space-y-2">
              {template.examples.map((example, index) => (
                <div
                  key={index}
                  className="bg-zinc-800/50 rounded-lg p-3 text-sm text-zinc-300"
                >
                  {example}
                </div>
              ))}
            </div>
          </div>
        )}

        {template.tips.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-zinc-300 mb-2">Tips</h4>
            <ul className="space-y-1.5">
              {template.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-zinc-400">
                  <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </ModalContent>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" onClick={() => onUse(template)}>
          Use This Template
        </Button>
      </ModalFooter>
    </Modal>
  );
}

interface FillModalProps {
  template: PostTemplate | null;
  open: boolean;
  onClose: () => void;
}

function FillModal({ template, open, onClose }: FillModalProps) {
  const navigate = useNavigate();
  const setContent = usePostStore((state) => state.setContent);
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const filledContent = useMemo(() => {
    if (!template) return '';
    return applyTemplateValues(template.template, values);
  }, [template, values]);

  const handleValueChange = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(filledContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreatePost = () => {
    setContent(filledContent);
    onClose();
    navigate('/');
  };

  const handleClose = () => {
    setValues({});
    onClose();
  };

  if (!template) return null;

  const hasUnfilledPlaceholders = extractPlaceholderKeys(filledContent).length > 0;

  return (
    <Modal open={open} onClose={handleClose} className="max-w-2xl">
      <ModalHeader>
        <ModalTitle>Fill Template: {template.name}</ModalTitle>
        <ModalClose onClick={handleClose} />
      </ModalHeader>
      <ModalContent className="max-h-[60vh] overflow-y-auto space-y-6">
        <div>
          <h4 className="text-sm font-medium text-zinc-300 mb-2">Template Preview</h4>
          <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-4">
            <code className="text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed">
              {highlightPlaceholders(template.template)}
            </code>
          </div>
        </div>

        {template.placeholders.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-zinc-300 mb-3">Fill Placeholders</h4>
            <div className="space-y-4">
              {template.placeholders.map((placeholder) => (
                <div key={placeholder.key}>
                  {placeholder.type === 'select' && placeholder.options ? (
                    <Select
                      label={placeholder.label}
                      helperText={placeholder.description}
                      options={placeholder.options.map((opt) => ({ value: opt, label: opt }))}
                      value={values[placeholder.key] || ''}
                      onChange={(value) => handleValueChange(placeholder.key, value)}
                      placeholder={`Select ${placeholder.label.toLowerCase()}`}
                    />
                  ) : placeholder.type === 'number' ? (
                    <Input
                      type="number"
                      label={placeholder.label}
                      helperText={placeholder.description}
                      value={values[placeholder.key] || ''}
                      onChange={(e) => handleValueChange(placeholder.key, e.target.value)}
                      placeholder={`Enter ${placeholder.label.toLowerCase()}`}
                    />
                  ) : (
                    <Input
                      label={placeholder.label}
                      helperText={placeholder.description}
                      value={values[placeholder.key] || ''}
                      onChange={(e) => handleValueChange(placeholder.key, e.target.value)}
                      placeholder={`Enter ${placeholder.label.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium text-zinc-300 mb-2">Live Preview</h4>
          <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-4">
            <p className="text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed">
              {highlightPlaceholders(filledContent)}
            </p>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            {filledContent.length}/280 characters
          </p>
        </div>
      </ModalContent>
      <ModalFooter>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
        <Button
          variant="primary"
          onClick={handleCreatePost}
          disabled={hasUnfilledPlaceholders && template.placeholders.some((p) => p.required)}
        >
          Create Post
        </Button>
      </ModalFooter>
    </Modal>
  );
}

interface CreateEditModalProps {
  template: PostTemplate | null;
  open: boolean;
  onClose: () => void;
  onSave: (template: Omit<PostTemplate, 'id'>) => void;
}

function CreateEditModal({ template, open, onClose, onSave }: CreateEditModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('question');
  const [description, setDescription] = useState('');
  const [templateText, setTemplateText] = useState('');
  const [placeholders, setPlaceholders] = useState<TemplatePlaceholder[]>([]);
  const [tips, setTips] = useState('');
  const [examples, setExamples] = useState('');
  const [expectedScore, setExpectedScore] = useState(75);
  const [targetEngagement, setTargetEngagement] = useState<TargetEngagementType[]>(['likes']);

  const isEditing = !!template;

  const resetForm = useCallback(() => {
    if (template) {
      setName(template.name);
      setCategory(template.category);
      setDescription(template.description);
      setTemplateText(template.template);
      setPlaceholders(template.placeholders);
      setTips(template.tips.join('\n'));
      setExamples(template.examples.join('\n\n'));
      setExpectedScore(template.expectedScore);
      setTargetEngagement(template.targetEngagement);
    } else {
      setName('');
      setCategory('question');
      setDescription('');
      setTemplateText('');
      setPlaceholders([]);
      setTips('');
      setExamples('');
      setExpectedScore(75);
      setTargetEngagement(['likes']);
    }
  }, [template]);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  const detectedPlaceholders = useMemo(() => {
    return extractPlaceholderKeys(templateText);
  }, [templateText]);

  const addPlaceholder = (key: string) => {
    if (!placeholders.find((p) => p.key === key)) {
      setPlaceholders([
        ...placeholders,
        {
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
          description: '',
          type: 'text',
          required: true,
        },
      ]);
    }
  };

  const updatePlaceholder = (key: string, updates: Partial<TemplatePlaceholder>) => {
    setPlaceholders(
      placeholders.map((p) => (p.key === key ? { ...p, ...updates } : p))
    );
  };

  const removePlaceholder = (key: string) => {
    setPlaceholders(placeholders.filter((p) => p.key !== key));
  };

  const toggleEngagement = (engagement: TargetEngagementType) => {
    setTargetEngagement((prev) =>
      prev.includes(engagement)
        ? prev.filter((e) => e !== engagement)
        : [...prev, engagement]
    );
  };

  const handleSave = () => {
    onSave({
      name,
      category,
      description,
      template: templateText,
      placeholders,
      tips: tips.split('\n').filter((t) => t.trim()),
      examples: examples.split('\n\n').filter((e) => e.trim()),
      expectedScore,
      targetEngagement,
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isValid = name.trim() && templateText.trim() && description.trim();

  return (
    <Modal open={open} onClose={handleClose} className="max-w-3xl">
      <ModalHeader>
        <ModalTitle>{isEditing ? 'Edit Template' : 'Create Template'}</ModalTitle>
        <ModalClose onClick={handleClose} />
      </ModalHeader>
      <ModalContent className="max-h-[60vh] overflow-y-auto space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Template Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter template name"
          />
          <Select
            label="Category"
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={(value) => setCategory(value as TemplateCategory)}
          />
        </div>

        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what this template is for..."
          className="min-h-[60px]"
        />

        <Textarea
          label="Template Text"
          helperText="Use {placeholder} syntax for dynamic content"
          value={templateText}
          onChange={(e) => setTemplateText(e.target.value)}
          placeholder="Write your template here. Use {topic}, {number}, etc. for placeholders..."
          className="min-h-[120px] font-mono"
        />

        {detectedPlaceholders.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-zinc-300">Detected Placeholders</h4>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {detectedPlaceholders.map((key) => {
                const exists = placeholders.find((p) => p.key === key);
                return (
                  <button
                    key={key}
                    onClick={() => !exists && addPlaceholder(key)}
                    className={`px-2 py-1 rounded text-sm font-mono transition-colors ${
                      exists
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600 border border-zinc-600'
                    }`}
                    disabled={!!exists}
                  >
                    {`{${key}}`}
                    {!exists && ' +'}
                  </button>
                );
              })}
            </div>

            {placeholders.length > 0 && (
              <div className="space-y-3">
                {placeholders.map((placeholder) => (
                  <div
                    key={placeholder.key}
                    className="bg-zinc-800/50 rounded-lg p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded font-mono text-sm">
                        {`{${placeholder.key}}`}
                      </span>
                      <button
                        onClick={() => removePlaceholder(placeholder.key)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        label="Label"
                        value={placeholder.label}
                        onChange={(e) => updatePlaceholder(placeholder.key, { label: e.target.value })}
                        placeholder="Display label"
                      />
                      <Select
                        label="Type"
                        options={PLACEHOLDER_TYPES}
                        value={placeholder.type}
                        onChange={(value) => updatePlaceholder(placeholder.key, { type: value as 'text' | 'number' | 'select' })}
                      />
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={placeholder.required}
                            onChange={(e) => updatePlaceholder(placeholder.key, { required: e.target.checked })}
                            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-900"
                          />
                          <span className="text-sm text-zinc-300">Required</span>
                        </label>
                      </div>
                    </div>
                    <Input
                      label="Description"
                      value={placeholder.description}
                      onChange={(e) => updatePlaceholder(placeholder.key, { description: e.target.value })}
                      placeholder="Help text for this placeholder"
                    />
                    {placeholder.type === 'select' && (
                      <Input
                        label="Options (comma separated)"
                        value={placeholder.options?.join(', ') || ''}
                        onChange={(e) => updatePlaceholder(placeholder.key, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })}
                        placeholder="Option 1, Option 2, Option 3"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Expected Score</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={expectedScore}
                onChange={(e) => setExpectedScore(Number(e.target.value))}
                className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-sm text-zinc-300 w-8">{expectedScore}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Target Engagement</label>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(ENGAGEMENT_ICONS) as TargetEngagementType[]).map((engagement) => (
                <button
                  key={engagement}
                  onClick={() => toggleEngagement(engagement)}
                  className={`p-2 rounded transition-colors ${
                    targetEngagement.includes(engagement)
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600 border border-zinc-600'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={ENGAGEMENT_ICONS[engagement].icon} />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>

        <Textarea
          label="Tips (one per line)"
          value={tips}
          onChange={(e) => setTips(e.target.value)}
          placeholder="Add tips for using this template..."
          className="min-h-[80px]"
        />

        <Textarea
          label="Examples (separate with blank line)"
          value={examples}
          onChange={(e) => setExamples(e.target.value)}
          placeholder="Add example filled versions..."
          className="min-h-[80px]"
        />
      </ModalContent>
      <ModalFooter>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!isValid}>
          {isEditing ? 'Save Changes' : 'Create Template'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function EmptyState({ category }: { category: TemplateCategory | 'all' }) {
  return (
    <Card>
      <CardContent className="py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-zinc-100 mb-2">No Templates Found</h3>
          <p className="text-sm text-zinc-400 max-w-sm">
            {category === 'all'
              ? 'No templates available yet. Create your first template to get started.'
              : `No templates in the "${category.replace('_', ' ')}" category. Try a different category or create a new template.`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function Templates() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<PostTemplate | null>(null);
  const [templateToFill, setTemplateToFill] = useState<PostTemplate | null>(null);
  const [editTemplate, setEditTemplate] = useState<PostTemplate | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<PostTemplate | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates', selectedCategory === 'all' ? undefined : selectedCategory],
    queryFn: () => api.getTemplates(selectedCategory === 'all' ? undefined : selectedCategory),
  });

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!searchQuery.trim()) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.template.toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  const categoryCounts = useMemo(() => {
    const cached = queryClient.getQueryData<PostTemplate[]>(['templates', undefined]);
    const allTemplates = Array.isArray(cached) ? cached : Array.isArray(templates) ? templates : [];
    const counts: Record<string, number> = { all: allTemplates.length };
    for (const template of allTemplates) {
      counts[template.category] = (counts[template.category] || 0) + 1;
    }
    return counts;
  }, [templates, queryClient]);

  const handleSaveTemplate = (templateData: Omit<PostTemplate, 'id'>) => {
    // TODO: Implement API call to save template
    console.log('Saving template:', templateData);
    setIsCreateOpen(false);
    setEditTemplate(null);
    // For now, just invalidate the query to refetch
    queryClient.invalidateQueries({ queryKey: ['templates'] });
  };

  const handleDeleteTemplate = (template: PostTemplate) => {
    // TODO: Implement API call to delete template
    console.log('Deleting template:', template.id);
    setDeleteConfirmTemplate(null);
    queryClient.invalidateQueries({ queryKey: ['templates'] });
  };

  const handleUseTemplate = (template: PostTemplate) => {
    setPreviewTemplate(null);
    setTemplateToFill(template);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle as="h1">Template Library</CardTitle>
          <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Template
          </Button>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {/* Category Tabs */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => {
              const count = categoryCounts[category.value] || 0;
              const isActive = selectedCategory === category.value;
              return (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
                  }`}
                >
                  {category.label}
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-xs ${
                      isActive ? 'bg-blue-500 text-white' : 'bg-zinc-600 text-zinc-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Template Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : filteredTemplates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPreview={setPreviewTemplate}
              onUse={handleUseTemplate}
              onEdit={setEditTemplate}
              onDelete={setDeleteConfirmTemplate}
            />
          ))}
        </div>
      ) : (
        <EmptyState category={selectedCategory} />
      )}

      {/* Modals */}
      <PreviewModal
        template={previewTemplate}
        open={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onUse={handleUseTemplate}
      />

      <FillModal
        template={templateToFill}
        open={!!templateToFill}
        onClose={() => setTemplateToFill(null)}
      />

      <CreateEditModal
        template={editTemplate}
        open={isCreateOpen || !!editTemplate}
        onClose={() => {
          setIsCreateOpen(false);
          setEditTemplate(null);
        }}
        onSave={handleSaveTemplate}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteConfirmTemplate}
        onClose={() => setDeleteConfirmTemplate(null)}
        className="max-w-md"
      >
        <ModalHeader>
          <ModalTitle>Delete Template</ModalTitle>
          <ModalClose onClick={() => setDeleteConfirmTemplate(null)} />
        </ModalHeader>
        <ModalContent>
          <p className="text-zinc-300">
            Are you sure you want to delete <strong>{deleteConfirmTemplate?.name}</strong>? This action cannot be undone.
          </p>
        </ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setDeleteConfirmTemplate(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => deleteConfirmTemplate && handleDeleteTemplate(deleteConfirmTemplate)}
          >
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
