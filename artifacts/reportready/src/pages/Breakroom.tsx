import { useCallback, useEffect, useState } from "react";
import { BreakroomComposer } from "@/components/Breakroom/BreakroomComposer";
import { BreakroomPostCard } from "@/components/Breakroom/BreakroomPostCard";
import { BreakroomRules } from "@/components/Breakroom/BreakroomRules";
import { AppHeader } from "@/components/layout/AppHeader";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import type { BreakroomPost } from "@/lib/breakroom-types";
import { trackEvent, trackPageView } from "@/lib/analytics";
import {
  fetchBreakroomPosts,
  initBreakroomSession,
} from "@/services/breakroomService";

export default function Breakroom() {
  const [posts, setPosts] = useState<BreakroomPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setLoadError(null);
    try {
      await initBreakroomSession();
      const nextPosts = await fetchBreakroomPosts();
      setPosts(nextPosts);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Posts could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    trackPageView("/breakroom");
    trackEvent("breakroom_visit");
    void loadPosts();
  }, [loadPosts]);

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

            <BreakroomComposer onPosted={() => void loadPosts()} />

            <section className="space-y-4" aria-label="Main feed">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8B6914]">
                Main feed
              </h2>
              {isLoading ? (
                <p className="text-sm text-[#6B6B6B]">Loading lounge posts…</p>
              ) : loadError ? (
                <p className="text-sm text-red-600">{loadError}</p>
              ) : posts.length === 0 ? (
                <p className="text-sm text-[#6B6B6B]">No posts yet. Be the first to share.</p>
              ) : (
                posts.map((post) => (
                  <BreakroomPostCard key={post.id} post={post} onChanged={() => void loadPosts()} />
                ))
              )}
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
