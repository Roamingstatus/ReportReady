import { Link, useLocation } from "wouter";
import { BreakroomNavButton } from "@/components/navigation/BreakroomNavButton";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { name: "Builder", path: "/builder" },
  { name: "Saved", path: "/saved" },
  { name: "Coming Soon", path: "/premium" },
] as const;

interface AppHeaderProps {
  variant?: "light" | "breakroom";
}

export function AppHeader({ variant = "light" }: AppHeaderProps) {
  const [location] = useLocation();
  const isBreakroom = variant === "breakroom";

  return (
    <header
      className={cn(
        "sticky top-0 z-20 w-full border-b print-hide backdrop-blur-sm",
        isBreakroom
          ? "border-[#F2D13D]/40 bg-[#FFF8E7]/95"
          : "border-teal-100/80 bg-white/95",
      )}
    >
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-2 sm:min-h-16 sm:py-0">
        {isBreakroom ? (
          <a
            href="/"
            className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-90"
          >
            <span className="text-lg font-bold tracking-tight text-[#2B2B2B] sm:text-xl">
              Report
              <span className="text-[#8B6914]">Ready</span>
            </span>
          </a>
        ) : (
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-90"
          >
            <span className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Report
              <span className="text-teal-600">Ready</span>
            </span>
          </Link>
        )}

        <nav className="flex items-center justify-center gap-6 flex-wrap overflow-visible">
          {NAV_LINKS.map((item) => {
            const linkClass = cn(
              "text-sm font-medium transition-colors",
              location === item.path
                ? isBreakroom
                  ? "text-[#8B6914]"
                  : "text-teal-700"
                : isBreakroom
                  ? "text-[#6B6B6B] hover:text-[#8B6914]"
                  : "text-slate-600 hover:text-teal-600",
            );

            return isBreakroom ? (
              <a key={item.path} href={item.path} className={linkClass}>
                {item.name}
              </a>
            ) : (
              <Link key={item.path} href={item.path} className={linkClass}>
                {item.name}
              </Link>
            );
          })}
          <BreakroomNavButton />
        </nav>
      </div>
    </header>
  );
}
