import type { PostStyle, TargetEngagement, PostConstraints } from '@postmaker/shared';

/**
 * Core X Algorithm knowledge to be included in all prompts
 */
export const X_ALGORITHM_KNOWLEDGE = `
## X ALGORITHM OPTIMIZATION KNOWLEDGE

### Engagement Signal Scoring (19 signals total)
The X "For You" feed uses a Grok-based transformer that predicts engagement probabilities.
Posts are scored using: Final Score = Sum(weight_i * P(action_i))

**HIGH-VALUE POSITIVE SIGNALS (optimize for these):**
- Replies (weight: 0.18) - Most valuable engagement
- Retweets (weight: 0.16) - High viral potential
- Quote tweets (weight: 0.14) - Shows deep engagement
- Shares (weight: 0.12) - Extends reach
- Share via DM (weight: 0.08) - Personal recommendation
- Share via copy link (weight: 0.06) - Intent to share externally

**MEDIUM-VALUE SIGNALS:**
- Likes/Favorites (weight: 0.15) - Quick positive signal
- Dwell time (weight: 0.10) - User spent time reading
- Follow author (weight: 0.10) - Converts to long-term follower
- Video quality view (weight: 0.08) - For video content
- Profile clicks (weight: 0.06) - Interest in author
- Photo expand (weight: 0.05) - Media engagement
- General clicks (weight: 0.04) - Basic interaction

**NEGATIVE SIGNALS (avoid triggering these):**
- Report (weight: -0.30) - CRITICAL: severely hurts score
- Block author (weight: -0.25) - Very damaging
- Not Interested (weight: -0.20) - Significant penalty
- Mute author (weight: -0.18) - Reduces future visibility

### Content Optimization Guidelines

**OPTIMAL LENGTH:**
- Minimum: 80 characters
- Maximum: 280 characters
- Ideal: 180 characters
- Posts in optimal range get +6% score boost

**QUESTIONS:**
- Posts ending with questions get +12% reply probability boost
- Open-ended questions perform better than yes/no questions
- Avoid rhetorical questions that don't invite response

**THREADS:**
- Thread indicator (1/n or thread emoji) increases dwell time by +10%
- Optimal thread length: 3-7 posts
- First tweet should be max 260 chars with a hook
- Include CTA in last tweet

**HASHTAGS:**
- 0-2 hashtags: Neutral to slightly positive
- 3+ hashtags: -12% score penalty (triggers spam signals)
- Use specific, relevant hashtags only

**CONTENT PATTERNS THAT BOOST SCORE:**
- "Here's what/This is how/Let me explain" - Value signal (+8%)
- "Unpopular opinion/Hot take" - Controversy signal (+10%)
- "X things/ways/tips/lessons" - Listicle signal (+7%)
- Personal stories increase dwell time

**PATTERNS TO AVOID:**
- All caps text - Penalty (-8%)
- Link-only posts - Penalty (-10%)
- "Follow for follow/F4F" - Spam penalty (-15%)
- "DM me/Link in bio" - Minor penalty (-5%)

### Author Diversity
The algorithm attenuates repeated author scores:
- Score multiplier decays with each consecutive post from same author
- Formula: multiplier(n) = (1 - 0.15) * 0.75^n + 0.15
- Fresh content from new authors gets priority

### Recency Factors
- Posts older than 7 days are filtered
- Content <4 hours old gets freshness boost
- Decay factor: 0.95 per time unit
`;

export function getPostGenerationPrompt(
  topic: string,
  style: PostStyle,
  targetEngagement: TargetEngagement,
  constraints?: PostConstraints
): string {
  const styleInstructions = getStyleInstructions(style);
  const engagementInstructions = getEngagementInstructions(targetEngagement);
  const constraintInstructions = constraints ? getConstraintInstructions(constraints) : '';

  return `${X_ALGORITHM_KNOWLEDGE}

## YOUR TASK
Generate an engaging X (Twitter) post about the following topic, optimized for the X algorithm.

**TOPIC:** ${topic}

**STYLE:** ${style}
${styleInstructions}

**TARGET ENGAGEMENT:** ${targetEngagement}
${engagementInstructions}

${constraintInstructions}

## REQUIREMENTS
1. Stay within 280 characters (or as specified)
2. Apply the algorithm optimization knowledge above
3. Avoid negative signal triggers
4. Make the post feel authentic, not AI-generated
5. Include appropriate hooks and CTAs based on target engagement

## OUTPUT FORMAT
Respond with ONLY the post text, no explanations or quotes around it.
`;
}

export function getPostOptimizationPrompt(
  content: string,
  targetEngagement: TargetEngagement
): string {
  const engagementInstructions = getEngagementInstructions(targetEngagement);

  return `${X_ALGORITHM_KNOWLEDGE}

## YOUR TASK
Optimize the following X (Twitter) post for better algorithm performance while maintaining the original message.

**ORIGINAL POST:**
${content}

**TARGET ENGAGEMENT:** ${targetEngagement}
${engagementInstructions}

## ANALYSIS REQUIRED
1. Identify any negative signal patterns in the original
2. Check if length is optimal (80-280 chars, ideal 180)
3. Evaluate engagement hooks present
4. Check hashtag count (should be 0-2)

## OPTIMIZATION GOALS
1. Maintain the core message
2. Remove negative signal triggers
3. Add engagement hooks appropriate for target
4. Optimize length if needed
5. Make it more likely to trigger positive signals

## OUTPUT FORMAT
Respond with ONLY the optimized post text, no explanations or quotes around it.
`;
}

export function getThreadCreationPrompt(
  content: string,
  maxParts: number
): string {
  return `${X_ALGORITHM_KNOWLEDGE}

## YOUR TASK
Convert the following content into an optimized X (Twitter) thread.

**CONTENT TO CONVERT:**
${content}

**MAXIMUM PARTS:** ${maxParts}

## THREAD OPTIMIZATION RULES
1. First tweet: Max 260 chars, must have a STRONG HOOK
2. Subsequent tweets: Max 280 chars each
3. Include thread indicator (1/n format or thread emoji)
4. Last tweet: Include a CTA (like, retweet, follow, reply)
5. Each tweet should be able to stand alone but flow as a story
6. Optimal thread length is 3-7 parts
7. Use numbered points or story arc structure

## HOOK PATTERNS FOR FIRST TWEET
- Start with a bold claim or insight
- Create curiosity gap
- Promise value ("Here's what I learned about X")
- Use pattern interrupt

## OUTPUT FORMAT
Return each tweet on a separate line, numbered like:
1/n: [First tweet with hook]
2/n: [Second tweet]
...
n/n: [Final tweet with CTA]
`;
}

export function getSuggestionPrompt(content: string): string {
  return `${X_ALGORITHM_KNOWLEDGE}

## YOUR TASK
Analyze the following X (Twitter) post and provide specific, actionable improvement suggestions.

**POST TO ANALYZE:**
${content}

## ANALYSIS AREAS
1. Length optimization (80-280 chars optimal, 180 ideal)
2. Question usage (boosts replies by 12%)
3. Hook effectiveness
4. CTA presence
5. Hashtag count (0-2 optimal)
6. Negative pattern detection
7. Engagement potential for each signal type

## OUTPUT FORMAT
Provide your response as a JSON object with this structure:
{
  "suggestions": [
    {
      "type": "add_question" | "add_cta" | "add_media" | "reduce_length" | "increase_length" | "add_thread" | "remove_hashtags" | "add_hook" | "improve_readability" | "add_controversy" | "add_value" | "remove_links" | "fix_formatting",
      "priority": "high" | "medium" | "low",
      "message": "Clear explanation of what to improve",
      "action": "Specific action to take",
      "potentialScoreIncrease": 0.05
    }
  ],
  "overallAssessment": "Brief summary of post strengths and weaknesses",
  "estimatedScore": 0.65
}

Respond with ONLY the JSON, no additional text.
`;
}

function getStyleInstructions(style: PostStyle): string {
  const instructions: Record<PostStyle, string> = {
    informative: `
- Lead with valuable information or data
- Use clear, concise language
- Include actionable insights
- Primary target: Retweets (people share valuable info)
- Secondary target: Likes (quick acknowledgment of value)`,

    controversial: `
- Take a strong stance on a debatable topic
- Challenge common assumptions
- Be provocative but not offensive
- Primary target: Quote tweets (people want to respond with their take)
- Secondary target: Replies (people want to argue)`,

    question: `
- End with an open-ended question
- Make it thought-provoking
- Invite personal experiences or opinions
- Primary target: Replies (+12% boost from questions)
- Secondary target: Likes`,

    thread: `
- This post should be the hook for a longer thread
- Create curiosity to read more
- Promise value in subsequent tweets
- Primary target: Dwell time (people read the whole thread)
- Secondary target: Retweets (people share educational threads)`,

    story: `
- Start with a personal narrative element
- Use conversational, authentic tone
- Include emotional hooks
- Primary target: Dwell time (people read stories)
- Secondary target: Shares (people relate and share)`,

    hook: `
- Create immediate curiosity
- Use pattern interrupts
- Promise revelation or insight
- Primary target: Clicks (people want to learn more)
- Secondary target: Replies (people engage with mystery)`,
  };

  return instructions[style];
}

function getEngagementInstructions(target: TargetEngagement): string {
  const instructions: Record<TargetEngagement, string> = {
    likes: `
Focus on creating content that's easy to appreciate:
- Quick, witty observations
- Relatable content
- Satisfying conclusions
- Clean, readable format`,

    replies: `
Focus on conversation starters:
- End with a question
- Ask for opinions or experiences
- Create gentle controversy
- Leave room for discussion`,

    retweets: `
Focus on share-worthy content:
- Valuable information others want to spread
- Impressive facts or insights
- Content that makes the sharer look good
- Universal appeal`,

    quotes: `
Focus on content people want to add to:
- Strong opinions that invite counter-arguments
- Incomplete thoughts others want to complete
- Predictions people want to challenge
- Hot takes that need context`,

    shares: `
Focus on content worth sending directly:
- Highly relevant to specific audiences
- Problem-solving content
- "This reminded me of you" type content
- Actionable advice`,

    all: `
Balance all engagement types:
- Include a question for replies
- Provide value for retweets
- Be relatable for likes
- Have a take for quotes
- Be specific enough to share directly`,
  };

  return instructions[target];
}

function getConstraintInstructions(constraints: PostConstraints): string {
  const parts: string[] = ['## ADDITIONAL CONSTRAINTS'];

  if (constraints.maxLength) {
    parts.push(`- Maximum length: ${constraints.maxLength} characters`);
  }
  if (constraints.minLength) {
    parts.push(`- Minimum length: ${constraints.minLength} characters`);
  }
  if (constraints.includeHashtags !== undefined) {
    parts.push(
      constraints.includeHashtags
        ? `- Include 1-2 relevant hashtags (max ${constraints.maxHashtags ?? 2})`
        : '- Do NOT include any hashtags'
    );
  }
  if (constraints.includeEmojis !== undefined) {
    parts.push(
      constraints.includeEmojis
        ? '- Include appropriate emojis (1-3 max)'
        : '- Do NOT include emojis'
    );
  }
  if (constraints.includeCTA) {
    parts.push('- Include a clear call-to-action');
  }
  if (constraints.tone) {
    const toneDescriptions: Record<NonNullable<PostConstraints['tone']>, string> = {
      professional: 'Professional and authoritative',
      casual: 'Casual and conversational',
      humorous: 'Witty and humorous',
      provocative: 'Bold and provocative (without being offensive)',
    };
    parts.push(`- Tone: ${toneDescriptions[constraints.tone]}`);
  }

  return parts.length > 1 ? parts.join('\n') : '';
}
