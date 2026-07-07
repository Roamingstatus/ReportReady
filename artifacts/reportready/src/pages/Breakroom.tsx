import { useEffect, useMemo } from "react";
import {
  BREAKROOM_MOCK_POSTS,
  getBreakroomFeedPosts,
} from "@/data/breakroom-mock-posts";
import { BreakroomComposer } from "@/components/Breakroom/BreakroomComposer";
import { BreakroomPostCard } from "@/components/Breakroom/BreakroomPostCard";
import { BreakroomRules } from "@/components/Breakroom/BreakroomRules";
import { AppHeader } from "@/components/layout/AppHeader";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { trackEvent, trackPageView } from "@/lib/analytics";

export default function Breakroom() {
  const feedPosts = useMemo(
    () => getBreakroomFeedPosts(BREAKROOM_MOCK_POSTS),
    [],
  );

  useEffect(() => {
    trackPageView("/breakroom");
    trackEvent("breakroom_visit");
  }, []);

  return (
    <div className="breakroom-lounge-bg min-h-screen">
      <AppHeader variant="breakroom" />

      <div className="container mx-auto px-4 py-6 sm:py-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px] lg:gap-8">
          <div className="min-w-0 space-y-6">
            <section className="breakroom-card px-6 py-5 sm:px-8 sm:py-6">
              <h1 className="breakroom-lounge-title">
                <span className="breakroom-lounge-title__emoji" aria-hidden="true">
                  ☕
                </span>{" "}
                <span className="breakroom-lounge-title__tiny">Tiny</span>{" "}
                <span className="breakroom-lounge-title__nurse">Nurse</span>{" "}
                <span className="breakroom-lounge-title__lounge">lounge</span>{" "}
                <span className="breakroom-lounge-title__dots" aria-hidden="true">
                  …
                </span>{" "}
                <span className="breakroom-lounge-title__emoji" aria-hidden="true">
                  🥐
                </span>
              </h1>
            </section>

            <BreakroomComposer />

            <section className="space-y-4" aria-label="Main feed">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8B6914]">
                Main feed
              </h2>
              {feedPosts.map((post) => (
                <BreakroomPostCard key={post.id} post={post} />
              ))}
            </section>
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <BreakroomRules />
          </aside>
        </div>
      </div>

      <FeedbackButton />
    </div>
  );
}
