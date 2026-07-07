import { useState } from "react";
import { createBreakroomPost } from "@/services/breakroomService";
import { trackEvent } from "@/lib/analytics";

interface BreakroomComposerProps {
  onPosted: () => void;
}

export function BreakroomComposer({ onPosted }: BreakroomComposerProps) {
  const [anonymous, setAnonymous] = useState(false);
  const [nickname, setNickname] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const result = await createBreakroomPost({
        title: title.trim() || undefined,
        body: body.trim(),
        nickname: nickname.trim() || undefined,
        anonymous,
        companyWebsite,
      });
      if (result.pendingReview) {
        setNotice(result.message);
        setBody("");
        setTitle("");
        if (!anonymous) setNickname("");
        return;
      }
      trackEvent("breakroom_post_created");
      setBody("");
      setTitle("");
      if (!anonymous) setNickname("");
      onPosted();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Post could not be submitted.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="breakroom-card p-4 sm:p-5" aria-label="Create a post">
      <h2 className="mb-3 text-sm font-semibold text-[#2B2B2B]">Share with the lounge</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          name="companyWebsite"
          value={companyWebsite}
          onChange={(event) => setCompanyWebsite(event.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />

        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title (optional)"
          maxLength={120}
          className="breakroom-input"
        />

        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="☕ Vent, celebrate, ask, share..."
          rows={4}
          maxLength={3000}
          required
          className="breakroom-input resize-none"
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="breakroom-nickname" className="mb-1 block text-xs text-[#6B6B6B]">
                Nickname <span className="text-[#6B6B6B]/70">(optional)</span>
              </label>
              <input
                id="breakroom-nickname"
                type="text"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                disabled={anonymous}
                maxLength={40}
                placeholder="e.g. NightOwlRN"
                className="breakroom-input disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 pb-2 text-sm text-[#6B6B6B]">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(event) => setAnonymous(event.target.checked)}
                className="rounded border-[#F2D13D]/60 text-[#8B6914] focus:ring-[#F2D13D]/40"
              />
              Post anonymously
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || body.trim().length < 2}
            className="breakroom-button w-full shrink-0 sm:w-auto disabled:opacity-60"
          >
            {isSubmitting ? "Posting…" : "Post"}
          </button>
        </div>
      </form>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="mt-3 text-sm text-[#8B6914]">{notice}</p> : null}

      <p className="mt-3 text-xs text-[#6B6B6B]">
        Please do not share patient names, MRNs, dates of birth, room numbers, or protected health
        information.
      </p>
    </section>
  );
}
