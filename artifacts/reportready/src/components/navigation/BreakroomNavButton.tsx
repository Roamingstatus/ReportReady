import { useLocation } from "wouter";
import { BreakroomNavMarquee } from "@/components/navigation/BreakroomNavMarquee";
import { BREAKROOM_NAV_LABEL } from "@/lib/breakroom-nav";
import { cn } from "@/lib/utils";

interface BreakroomNavButtonProps {
  className?: string;
}

export function BreakroomNavButton({ className }: BreakroomNavButtonProps) {
  const [location] = useLocation();
  const isActive = location === "/breakroom" || location.startsWith("/breakroom/");

  if (isActive) {
    return (
      <span
        className={cn("breakroom-nav-link breakroom-nav-link--active", className)}
        aria-label={BREAKROOM_NAV_LABEL}
        aria-current="page"
        data-testid="nav-breakroom"
      >
        <BreakroomNavMarquee />
      </span>
    );
  }

  return (
    <a
      href="/breakroom"
      className={cn("breakroom-nav-link", className)}
      aria-label={BREAKROOM_NAV_LABEL}
      data-testid="nav-breakroom"
    >
      <BreakroomNavMarquee />
    </a>
  );
}
