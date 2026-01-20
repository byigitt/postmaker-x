import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DayOfWeek, TimingAnalysis, TimingRecommendation } from '@postmaker/shared';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip } from '@/components/ui/tooltip';
import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';

const DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'UTC', label: 'UTC' },
];

function getHeatmapColor(score: number): string {
  if (score >= 85) return 'bg-blue-500';
  if (score >= 70) return 'bg-blue-500/80';
  if (score >= 55) return 'bg-blue-500/60';
  if (score >= 40) return 'bg-blue-500/40';
  if (score >= 25) return 'bg-blue-500/20';
  return 'bg-zinc-900';
}

function getOptimalBadgeVariant(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 70) return 'success';
  if (score >= 40) return 'warning';
  return 'danger';
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

interface HeatmapCellProps {
  day: DayOfWeek;
  hour: number;
  score: number;
  isSelected: boolean;
  onClick: () => void;
}

function HeatmapCell({ day, hour, score, isSelected, onClick }: HeatmapCellProps) {
  return (
    <Tooltip
      content={
        <div className="text-center">
          <div className="font-medium capitalize">{day}</div>
          <div className="text-zinc-300">{formatHour(hour)}</div>
          <div className="text-blue-400 font-bold">Score: {Math.round(score)}</div>
        </div>
      }
      side="top"
    >
      <button
        type="button"
        onClick={onClick}
        className={`h-7 w-full rounded-sm transition-all ${getHeatmapColor(score)} ${
          isSelected
            ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-zinc-900'
            : 'hover:ring-1 hover:ring-zinc-500'
        }`}
        aria-label={`${day} ${formatHour(hour)}: score ${Math.round(score)}`}
      />
    </Tooltip>
  );
}

interface BestTimeEntry {
  day: DayOfWeek;
  hour: number;
  score: number;
  reasoning: string;
}

function CurrentTimeCard({
  currentTiming,
  timezone,
}: {
  currentTiming: TimingAnalysis;
  timezone: string;
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: timezone,
  });

  const badgeVariant = getOptimalBadgeVariant(currentTiming.currentScore);
  const isOptimal = currentTiming.isOptimalTime;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Time Analysis</CardTitle>
        <CardDescription>Real-time posting optimization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-5xl font-bold text-zinc-100 font-mono tracking-wider">
            {formattedTime}
          </div>
          <div className="mt-2 text-sm text-zinc-500">{timezone}</div>
        </div>

        <div className="flex justify-center">
          <Badge variant={badgeVariant} size="md" className="text-base px-4 py-1.5">
            {isOptimal ? 'Optimal Time to Post' : 'Suboptimal Timing'}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-zinc-800/50">
            <div className="text-sm text-zinc-400 mb-1">Current Score</div>
            <div
              className={`text-3xl font-bold ${
                currentTiming.currentScore >= 70
                  ? 'text-green-400'
                  : currentTiming.currentScore >= 40
                    ? 'text-yellow-400'
                    : 'text-red-400'
              }`}
            >
              {Math.round(currentTiming.currentScore)}
            </div>
          </div>
          <div className="text-center p-4 rounded-lg bg-zinc-800/50">
            <div className="text-sm text-zinc-400 mb-1">Wait Time</div>
            <div className="text-3xl font-bold text-zinc-100">
              {currentTiming.waitTimeMinutes}
              <span className="text-lg text-zinc-400">m</span>
            </div>
          </div>
          <div className="text-center p-4 rounded-lg bg-zinc-800/50">
            <div className="text-sm text-zinc-400 mb-1">Next Optimal</div>
            <div className="text-3xl font-bold text-green-400">
              {Math.round(currentTiming.nextOptimalScore)}
            </div>
          </div>
        </div>

        {!isOptimal && currentTiming.waitTimeMinutes > 0 && (
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 text-yellow-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium">
                Wait {currentTiming.waitTimeMinutes} minutes for better timing
              </span>
            </div>
            <div className="mt-2 text-sm text-zinc-300">
              Next optimal time: {formatTime(currentTiming.nextOptimalTime)}
            </div>
          </div>
        )}

        <div className="text-sm text-zinc-400 text-center italic">
          {currentTiming.recommendation}
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyHeatmap({
  recommendation,
  selectedSlot,
  onSelectSlot,
}: {
  recommendation: TimingRecommendation;
  selectedSlot: { day: DayOfWeek; hour: number } | null;
  onSelectSlot: (day: DayOfWeek, hour: number) => void;
}) {
  const getScoreForSlot = (day: DayOfWeek, hour: number): number => {
    const hourData = recommendation.optimalHours.find((h) => h.hour === hour);
    const dayData = recommendation.dayOfWeek.find((d) => d.day === day);
    const baseScore = hourData?.score ?? 30;
    const dayBonus = dayData?.bestHours.includes(hour) ? 15 : 0;
    const dayMultiplier = dayData ? dayData.overallScore / 70 : 1;
    return Math.min(100, (baseScore + dayBonus) * dayMultiplier);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Heatmap</CardTitle>
        <CardDescription>Click any slot to highlight. Darker blue = better engagement.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="flex mb-2">
              <div className="w-16 shrink-0" />
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="flex-1 text-center text-xs text-zinc-500"
                  style={{ minWidth: '24px' }}
                >
                  {hour % 3 === 0 ? hour.toString().padStart(2, '0') : ''}
                </div>
              ))}
            </div>
            {DAYS.map((day) => (
              <div key={day} className="flex items-center mb-1">
                <div className="w-16 shrink-0 text-sm text-zinc-400 capitalize">
                  {DAY_LABELS[day]}
                </div>
                <div className="flex flex-1 gap-px">
                  {HOURS.map((hour) => {
                    const score = getScoreForSlot(day, hour);
                    const isSelected =
                      selectedSlot?.day === day && selectedSlot?.hour === hour;
                    return (
                      <div key={hour} className="flex-1" style={{ minWidth: '24px' }}>
                        <HeatmapCell
                          day={day}
                          hour={hour}
                          score={score}
                          isSelected={isSelected}
                          onClick={() => onSelectSlot(day, hour)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-6 rounded-sm bg-zinc-900" />
              <span className="text-zinc-500">Low</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-6 rounded-sm bg-blue-500/20" />
              <span className="text-zinc-500">Fair</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-6 rounded-sm bg-blue-500/40" />
              <span className="text-zinc-500">Good</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-6 rounded-sm bg-blue-500/60" />
              <span className="text-zinc-500">Great</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-6 rounded-sm bg-blue-500/80" />
              <span className="text-zinc-500">Excellent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-6 rounded-sm bg-blue-500" />
              <span className="text-zinc-500">Optimal</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BestTimesCard({ bestTimes }: { bestTimes: BestTimeEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 Posting Times</CardTitle>
        <CardDescription>Highest engagement windows based on your audience</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {bestTimes.slice(0, 5).map((entry, index) => (
            <div
              key={`${entry.day}-${entry.hour}`}
              className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-zinc-100 capitalize">
                    {entry.day} at {formatHour(entry.hour)}
                  </div>
                  <div className="text-xs text-zinc-500">{entry.reasoning}</div>
                </div>
              </div>
              <Badge variant={getOptimalBadgeVariant(entry.score)} size="sm">
                {Math.round(entry.score)}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TimezoneSettings({
  timezone,
  onTimezoneChange,
}: {
  timezone: string;
  onTimezoneChange: (tz: string) => void;
}) {
  const handleAutoDetect = () => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    onTimezoneChange(detected);
  };

  const timezoneOptions = useMemo(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const hasDetected = COMMON_TIMEZONES.some((tz) => tz.value === detected);
    const options = hasDetected
      ? COMMON_TIMEZONES
      : [{ value: detected, label: `${detected} (Detected)` }, ...COMMON_TIMEZONES];
    return options;
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timezone Settings</CardTitle>
        <CardDescription>Set your posting timezone for accurate recommendations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select
          label="Timezone"
          options={timezoneOptions}
          value={timezone}
          onChange={onTimezoneChange}
          placeholder="Select timezone"
        />
        <Button variant="ghost" size="sm" onClick={handleAutoDetect} className="w-full">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Auto-detect Timezone
        </Button>
      </CardContent>
    </Card>
  );
}

function DayBreakdownTabs({ recommendation }: { recommendation: TimingRecommendation }) {
  const getEngagementMultiplier = (score: number): string => {
    if (score >= 85) return '2.0x';
    if (score >= 70) return '1.5x';
    if (score >= 55) return '1.2x';
    if (score >= 40) return '1.0x';
    return '0.8x';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Breakdown</CardTitle>
        <CardDescription>Hourly engagement patterns for each day</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="monday">
          <TabsList className="flex-wrap">
            {DAYS.map((day) => (
              <TabsTrigger key={day} value={day} className="capitalize">
                {DAY_LABELS[day]}
              </TabsTrigger>
            ))}
          </TabsList>

          {DAYS.map((day) => {
            const dayData = recommendation.dayOfWeek.find((d) => d.day === day);
            const peakHours = dayData?.bestHours.slice(0, 3) ?? [];

            return (
              <TabsContent key={day} value={day}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                    <div>
                      <div className="text-sm text-zinc-400">Daily Score</div>
                      <div className="text-2xl font-bold text-zinc-100">
                        {Math.round(dayData?.overallScore ?? 50)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-zinc-400">Peak Hours</div>
                      <div className="text-lg font-medium text-blue-400">
                        {peakHours.map((h) => formatHour(h)).join(', ')}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-zinc-400 italic">{dayData?.reasoning}</div>

                  <div className="space-y-2">
                    {HOURS.map((hour) => {
                      const hourData = recommendation.optimalHours.find((h) => h.hour === hour);
                      const baseScore = hourData?.score ?? 30;
                      const isPeak = peakHours.includes(hour);
                      const score = isPeak ? Math.min(100, baseScore + 15) : baseScore;

                      return (
                        <div key={hour} className="flex items-center gap-3">
                          <div className="w-16 text-sm text-zinc-500 text-right">
                            {formatHour(hour)}
                          </div>
                          <div className="flex-1">
                            <Progress value={score} size="sm" />
                          </div>
                          <div className="w-12 text-right">
                            {isPeak && (
                              <Badge variant="success" size="sm">
                                {getEngagementMultiplier(score)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function QuickActions({
  isOptimalTime,
  currentScore,
  nextOptimalTime,
}: {
  isOptimalTime: boolean;
  currentScore: number;
  nextOptimalTime: Date;
}) {
  const handlePostNow = () => {
    console.log('Posting now...');
  };

  const handleSchedule = () => {
    console.log('Scheduling for:', nextOptimalTime);
  };

  const handleSetReminder = () => {
    console.log('Setting reminder for:', nextOptimalTime);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Take action based on current timing analysis</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isOptimalTime ? (
          <Button variant="primary" className="w-full" onClick={handlePostNow}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Post Now - Optimal Time
          </Button>
        ) : (
          <Tooltip content={`Current score: ${Math.round(currentScore)}. Wait for better timing.`}>
            <Button variant="secondary" className="w-full opacity-70" disabled>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Waiting for Optimal Time...
            </Button>
          </Tooltip>
        )}

        <Button variant="secondary" className="w-full" onClick={handleSchedule}>
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Schedule for Best Time
        </Button>

        <Button variant="ghost" className="w-full" onClick={handleSetReminder}>
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          Set Reminder
        </Button>
      </CardContent>
      <CardFooter className="text-xs text-zinc-500">
        {isOptimalTime
          ? 'Current timing is optimal for maximum engagement'
          : `Next optimal time: ${formatTime(nextOptimalTime)}`}
      </CardFooter>
    </Card>
  );
}

export function Timing() {
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [selectedSlot, setSelectedSlot] = useState<{
    day: DayOfWeek;
    hour: number;
  } | null>(null);

  const {
    data: recommendation,
    isLoading: isLoadingRec,
    error: recError,
  } = useQuery({
    queryKey: ['timing-recommendation', timezone],
    queryFn: () => api.getTimingRecommendation(timezone),
  });

  const {
    data: currentTiming,
    isLoading: isLoadingCurrent,
    error: currentError,
  } = useQuery({
    queryKey: ['timing-current', timezone],
    queryFn: () => api.analyzeCurrentTiming(timezone),
    refetchInterval: 60000,
  });

  const bestTimes: BestTimeEntry[] = useMemo(() => {
    if (!recommendation) return [];

    const entries: BestTimeEntry[] = [];

    for (const day of DAYS) {
      const dayData = recommendation.dayOfWeek.find((d) => d.day === day);
      if (!dayData) continue;

      for (const hour of dayData.bestHours) {
        const hourData = recommendation.optimalHours.find((h) => h.hour === hour);
        const baseScore = hourData?.score ?? 50;
        const dayMultiplier = dayData.overallScore / 70;
        const score = Math.min(100, (baseScore + 15) * dayMultiplier);

        entries.push({
          day,
          hour,
          score,
          reasoning: 'Matches your audience activity pattern',
        });
      }
    }

    return entries.sort((a, b) => b.score - a.score).slice(0, 5);
  }, [recommendation]);

  const handleSelectSlot = (day: DayOfWeek, hour: number) => {
    if (selectedSlot?.day === day && selectedSlot?.hour === hour) {
      setSelectedSlot(null);
    } else {
      setSelectedSlot({ day, hour });
    }
  };

  if (isLoadingRec || isLoadingCurrent) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Spinner size="lg" />
        <p className="mt-4 text-zinc-400">Loading timing optimization data...</p>
      </div>
    );
  }

  if (recError || currentError) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-100 mb-2">
              Unable to Load Timing Data
            </h3>
            <p className="text-sm text-zinc-400 max-w-md">
              There was an error loading the timing optimization data. Please try again later.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {currentTiming && (
            <CurrentTimeCard currentTiming={currentTiming} timezone={timezone} />
          )}
        </div>
        <div className="space-y-6">
          {currentTiming && (
            <QuickActions
              isOptimalTime={currentTiming.isOptimalTime}
              currentScore={currentTiming.currentScore}
              nextOptimalTime={new Date(currentTiming.nextOptimalTime)}
            />
          )}
          <TimezoneSettings timezone={timezone} onTimezoneChange={setTimezone} />
        </div>
      </div>

      {recommendation && (
        <>
          <WeeklyHeatmap
            recommendation={recommendation}
            selectedSlot={selectedSlot}
            onSelectSlot={handleSelectSlot}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <BestTimesCard bestTimes={bestTimes} />
            <DayBreakdownTabs recommendation={recommendation} />
          </div>
        </>
      )}
    </div>
  );
}
