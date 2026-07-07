import {
  collapseRepeatedLetters,
  compactLetters,
  normalizeForProfanity,
} from "../src/lib/moderation/normalize.ts";
import {
  containsProfanity,
  findProfanity,
  PROFANITY_REJECTION_MESSAGE,
} from "../src/lib/moderation/profanity.ts";
import {
  ContentReviewError,
  reviewBreakroomContent,
} from "../src/lib/moderation/content-review.ts";
import {
  validateCreatePostBody,
} from "../src/lib/breakroom-validation.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function run(): Promise<void> {
  assert(collapseRepeatedLetters("fuuuuck") === "fuck", "repeated letters should collapse");
  assert(collapseRepeatedLetters("shiiiiit") === "shit", "repeated letters should collapse");
  assert(collapseRepeatedLetters("book") === "book", "book should not be over-collapsed");

  assert(
    normalizeForProfanity("f.u.c.k") === "fuck",
    "dots between letters should be removed",
  );
  assert(
    normalizeForProfanity("f_u_c_k") === "fuck",
    "underscores between letters should be removed",
  );
  assert(
    normalizeForProfanity("f u c k") === "fuck",
    "spaces between letters should be removed",
  );
  assert(
    normalizeForProfanity("fu ck") === "fuck",
    "partial spacing should be removed",
  );
  assert(
    normalizeForProfanity("F*CK") === "fck",
    "asterisks should be stripped after lowercasing",
  );
  assert(containsProfanity("f*ck"), "f*ck variant should be detected via fck alias");
  assert(containsProfanity("sh1t"), "leet substitution 1->i should detect shit");
  assert(containsProfanity("FUUUUCK"), "capitalization should not bypass filter");
  assert(containsProfanity("what the f.u.c.k"), "dotted bypass should be detected");
  assert(!containsProfanity("class schedule"), "class should not false-positive on ass");

  const postReject = await reviewBreakroomContent("this is bullshit").catch((error) => error);
  assert(
    postReject instanceof ContentReviewError &&
      postReject.message === PROFANITY_REJECTION_MESSAGE,
    "post profanity rejected",
  );

  const commentReject = await reviewBreakroomContent("stfu").catch((error) => error);
  assert(
    commentReject instanceof ContentReviewError &&
      commentReject.message === PROFANITY_REJECTION_MESSAGE,
    "comment profanity rejected",
  );

  const cleanValidation = validateCreatePostBody({ body: "Rough shift tonight but we made it through." });
  assert(cleanValidation.ok, "clean nursing vent should pass validation");
  const cleanReview = await reviewBreakroomContent(cleanValidation.ok ? cleanValidation.data.body : "");
  assert(cleanReview.decision === "publish", "clean nursing vent should pass moderation");

  assert(findProfanity("piece of shit") !== null, "spaced profanity should match");

  console.log("[profanity-check] all checks passed");
}

void run();
