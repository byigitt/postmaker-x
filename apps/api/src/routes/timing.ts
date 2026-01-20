import { Router } from 'express';
import { z } from 'zod';
import {
  OPTIMAL_HOURS,
  DAY_MULTIPLIERS,
  type TimingRecommendation,
  type TimingAnalysis,
  type OptimalHour,
  type DayRecommendation,
  type DayOfWeek,
} from '@postmaker/shared';

const router = Router();

const timingQuerySchema = z.object({
  timezone: z.string().optional().default('UTC'),
});

const DAYS: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

function isWeekday(dayIndex: number): boolean {
  return dayIndex >= 1 && dayIndex <= 5;
}

function getOptimalHoursForDay(dayIndex: number): number[] {
  if (isWeekday(dayIndex)) {
    const hours = OPTIMAL_HOURS.weekday;
    return [...hours.morning, ...hours.lunch, ...hours.evening].sort((a, b) => a - b);
  }
  const hours = OPTIMAL_HOURS.weekend;
  return [...hours.morning, ...hours.afternoon, ...hours.evening].sort((a, b) => a - b);
}

function calculateHourScore(hour: number, dayIndex: number): number {
  const optimalHours = getOptimalHoursForDay(dayIndex);
  const day = DAYS[dayIndex] as DayOfWeek;
  const dayMultiplier = DAY_MULTIPLIERS[day];

  if (optimalHours.includes(hour)) {
    return 0.9 * dayMultiplier;
  }

  const closestOptimal = optimalHours.reduce((prev, curr) =>
    Math.abs(curr - hour) < Math.abs(prev - hour) ? curr : prev
  );
  const distance = Math.abs(hour - closestOptimal);
  const baseScore = Math.max(0.3, 0.9 - distance * 0.1);

  return baseScore * dayMultiplier;
}

function getAudienceActivity(hour: number, dayIndex: number): 'low' | 'medium' | 'high' | 'peak' {
  const optimalHours = getOptimalHoursForDay(dayIndex);

  if (optimalHours.includes(hour)) {
    const peakHours: readonly number[] = isWeekday(dayIndex)
      ? OPTIMAL_HOURS.weekday.evening
      : OPTIMAL_HOURS.weekend.afternoon;
    return peakHours.includes(hour) ? 'peak' : 'high';
  }

  const nightHours = [0, 1, 2, 3, 4, 5, 23];
  if (nightHours.includes(hour)) {
    return 'low';
  }

  return 'medium';
}

router.get('/', (req, res, next) => {
  try {
    const { timezone } = timingQuerySchema.parse(req.query);

    const optimalHours: OptimalHour[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const avgScore =
        DAYS.reduce((sum, _, dayIndex) => sum + calculateHourScore(hour, dayIndex), 0) / 7;
      const avgActivity = getAudienceActivity(hour, new Date().getDay());

      optimalHours.push({
        hour,
        score: Math.round(avgScore * 100),
        engagementMultiplier: parseFloat(avgScore.toFixed(2)),
        audienceActivity: avgActivity,
      });
    }

    const dayOfWeek: DayRecommendation[] = DAYS.map((day, index) => {
      const bestHours = getOptimalHoursForDay(index);
      const overallScore = DAY_MULTIPLIERS[day] * 100;

      return {
        day,
        bestHours,
        overallScore: Math.round(overallScore),
        reasoning: getReasoningForDay(day, index),
      };
    });

    const recommendation: TimingRecommendation = {
      optimalHours: optimalHours.filter(h => h.audienceActivity === 'peak' || h.audienceActivity === 'high'),
      timezone,
      dayOfWeek,
      reasoning: [
        'Weekday evenings (5-8 PM) typically see highest engagement',
        'Tuesday-Thursday are generally the best days for posting',
        'Weekend mornings and afternoons can work well for casual content',
        'Avoid posting between midnight and 6 AM in your target audience timezone',
      ],
    };

    res.json({
      success: true,
      data: recommendation,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/now', (req, res, next) => {
  try {
    const { timezone } = timingQuerySchema.parse(req.query);

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    const currentScore = calculateHourScore(currentHour, currentDay);
    const currentActivity = getAudienceActivity(currentHour, currentDay);
    const isOptimalTime = currentActivity === 'peak' || currentActivity === 'high';

    const optimalHours = getOptimalHoursForDay(currentDay);
    let nextOptimalHour = optimalHours.find(h => h > currentHour);
    let nextOptimalDay = currentDay;

    if (nextOptimalHour === undefined) {
      nextOptimalDay = (currentDay + 1) % 7;
      const nextDayHours = getOptimalHoursForDay(nextOptimalDay);
      nextOptimalHour = nextDayHours[0] ?? 9;
    }

    const nextOptimalTime = new Date(now);
    if (nextOptimalDay !== currentDay) {
      nextOptimalTime.setDate(nextOptimalTime.getDate() + 1);
    }
    nextOptimalTime.setHours(nextOptimalHour, 0, 0, 0);

    const waitTimeMinutes = Math.round(
      (nextOptimalTime.getTime() - now.getTime()) / (1000 * 60)
    );

    const analysis: TimingAnalysis = {
      currentTime: now,
      timezone,
      isOptimalTime,
      currentScore: Math.round(currentScore * 100),
      nextOptimalTime,
      nextOptimalScore: Math.round(calculateHourScore(nextOptimalHour, nextOptimalDay) * 100),
      waitTimeMinutes: isOptimalTime ? 0 : waitTimeMinutes,
      recommendation: isOptimalTime
        ? 'Now is a great time to post!'
        : `Consider waiting ${waitTimeMinutes} minutes for better engagement`,
    };

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
});

function getReasoningForDay(day: DayOfWeek, dayIndex: number): string {
  const multiplier = DAY_MULTIPLIERS[day];
  const isWeekend = dayIndex === 0 || dayIndex === 6;

  if (multiplier >= 1.05) {
    return 'Peak engagement day - professionals are active and engaged';
  }
  if (multiplier >= 1.0) {
    return 'Good engagement day with steady audience activity';
  }
  if (isWeekend) {
    return 'Lower business engagement but good for casual content';
  }
  return 'Moderate engagement - consider timing your posts carefully';
}

export default router;
