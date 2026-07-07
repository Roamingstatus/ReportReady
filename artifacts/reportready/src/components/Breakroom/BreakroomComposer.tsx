import { useState } from "react";

export function BreakroomComposer() {
  const [anonymous, setAnonymous] = useState(false);
  const [nickname, setNickname] = useState("");

  return (
    <section className="breakroom-card p-4 sm:p-5" aria-label="Create a post">
      <h2 className="mb-3 text-sm font-semibold text-[#2B2B2B]">Share with the lounge</h2>

      <textarea
        readOnly
        placeholder="☕ Vent, celebrate, ask, share..."
        rows={4}
        className="breakroom-input resize-none"
      />

      <div className="mt-3 flex flex-col gap-3">
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
                onChange={(e) => setNickname(e.target.value)}
                disabled={anonymous}
                placeholder="e.g. NightOwlRN"
                className="breakroom-input disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 pb-2 text-sm text-[#6B6B6B]">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="rounded border-[#F2D13D]/60 text-[#8B6914] focus:ring-[#F2D13D]/40"
              />
              Post anonymously
            </label>
          </div>

          <button type="button" className="breakroom-button w-full shrink-0 sm:w-auto">
            Post
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs text-[#6B6B6B]">
        No patient names, facility names, or identifying details.
      </p>
    </section>
  );
}
