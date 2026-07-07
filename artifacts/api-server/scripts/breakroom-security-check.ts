import {
  containsMongoOperators,
  validateCreateCommentBody,
  validateCreatePostBody,
  validateReactionBody,
} from "../src/lib/breakroom-validation.ts";
import { sanitizeText } from "../src/lib/sanitize.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function run(): void {
  const xss = '<script>alert(1)</script>Hello';
  const sanitized = sanitizeText(xss, 100);
  assert(!sanitized.includes("<script>"), "script tags should be stripped");
  assert(sanitized.includes("Hello"), "plain text should remain");

  const oversized = validateCreatePostBody({ body: "x".repeat(3001) });
  assert(!oversized.ok, "oversized post should be rejected");

  const empty = validateCreatePostBody({ body: " " });
  assert(!empty.ok, "empty post should be rejected");

  const mongo = validateCreatePostBody({ body: "hello", $gt: "x" } as Record<string, unknown>);
  assert(!mongo.ok, "mongo operators in body should be rejected");

  assert(containsMongoOperators({ $where: "1" }), "mongo operator detection should work");

  const invalidReaction = validateReactionBody({ type: "hundred" });
  assert(!invalidReaction.ok, "invalid reaction should be rejected");

  const validReaction = validateReactionBody({ type: "coffee" });
  assert(validReaction.ok, "valid reaction should pass");

  const honeypot = validateCreatePostBody({
    body: "valid post",
    companyWebsite: "spam",
  });
  assert(honeypot.ok && honeypot.isHoneypotTriggered, "honeypot should trigger");

  const comment = validateCreateCommentBody({ body: "nice" });
  assert(comment.ok, "valid comment should pass");

  console.log("[breakroom-security-check] all checks passed");
}

run();
