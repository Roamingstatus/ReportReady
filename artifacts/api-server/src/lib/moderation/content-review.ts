import type { BreakroomContentStatus } from "../breakroom-constants.js";
import { moderateTextWithOpenAI } from "./openai-moderation.js";
import { rejectIfPhi } from "./phi-keywords.js";
import { rejectIfProfane } from "./profanity.js";

export interface BreakroomModerationFields {
  status: BreakroomContentStatus;
  moderationFlagged: boolean;
  moderationCategories: Record<string, boolean>;
  moderationScores: Record<string, number>;
  reviewedByAdmin: boolean;
  reviewedAt?: string;
}

export type ContentReviewResult =
  | { decision: "publish"; moderation: BreakroomModerationFields }
  | { decision: "pending_review"; moderation: BreakroomModerationFields };

export function createDefaultModeration(status: BreakroomContentStatus = "published"): BreakroomModerationFields {
  return {
    status,
    moderationFlagged: false,
    moderationCategories: {},
    moderationScores: {},
    reviewedByAdmin: false,
  };
}

function buildModerationFields(
  status: BreakroomContentStatus,
  flagged: boolean,
  categories: Record<string, boolean>,
  scores: Record<string, number>,
): BreakroomModerationFields {
  return {
    status,
    moderationFlagged: flagged,
    moderationCategories: categories,
    moderationScores: scores,
    reviewedByAdmin: false,
  };
}

/**
 * Run local PHI + profanity checks, then OpenAI moderation.
 * Length validation must run before this (via Zod in breakroom-validation).
 */
export async function reviewBreakroomContent(
  ...textFields: Array<string | undefined | null>
): Promise<ContentReviewResult> {
  const phi = rejectIfPhi(...textFields);
  if (!phi.ok) {
    throw new ContentReviewError(phi.error, 400);
  }

  const profanity = rejectIfProfane(...textFields);
  if (!profanity.ok) {
    throw new ContentReviewError(profanity.error, 400);
  }

  const combined = textFields.filter((field) => field && field.trim()).join("\n");
  const openAi = await moderateTextWithOpenAI(combined);

  if (!openAi) {
    // API unavailable — local checks passed; publish without remote scores.
    return {
      decision: "publish",
      moderation: createDefaultModeration("published"),
    };
  }

  if (openAi.flagged) {
    return {
      decision: "pending_review",
      moderation: buildModerationFields(
        "pending_review",
        true,
        openAi.categories,
        openAi.categoryScores,
      ),
    };
  }

  return {
    decision: "publish",
    moderation: buildModerationFields("published", false, openAi.categories, openAi.categoryScores),
  };
}

export class ContentReviewError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ContentReviewError";
    this.status = status;
  }
}
