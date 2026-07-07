import { OPENAI_MODERATION_MODEL } from "../breakroom-constants.js";

export interface OpenAIModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  categoryScores: Record<string, number>;
}

interface OpenAIModerationResponse {
  results?: Array<{
    flagged?: boolean;
    categories?: Record<string, boolean>;
    category_scores?: Record<string, number>;
  }>;
}

function getOpenAIApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

/**
 * Moderate text via OpenAI (server-side only). Returns null if the API is unavailable.
 */
export async function moderateTextWithOpenAI(text: string): Promise<OpenAIModerationResult | null> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    console.warn("[moderation] OPENAI_API_KEY is not set; skipping OpenAI moderation.");
    return null;
  }

  if (!text.trim()) {
    return {
      flagged: false,
      categories: {},
      categoryScores: {},
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODERATION_MODEL,
        input: text,
      }),
    });

    if (!response.ok) {
      console.error("[moderation] OpenAI moderation request failed", {
        status: response.status,
      });
      return null;
    }

    const data = (await response.json()) as OpenAIModerationResponse;
    const result = data.results?.[0];
    if (!result) {
      console.error("[moderation] OpenAI moderation returned no results.");
      return null;
    }

    return {
      flagged: Boolean(result.flagged),
      categories: result.categories ?? {},
      categoryScores: result.category_scores ?? {},
    };
  } catch (error) {
    console.error("[moderation] OpenAI moderation error", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

/**
 * Future: moderate uploaded images when Breakroom supports image posts.
 */
export async function moderateImageWithOpenAI(_imageUrl: string): Promise<OpenAIModerationResult | null> {
  console.warn("[moderation] Image moderation is not enabled yet.");
  return null;
}
