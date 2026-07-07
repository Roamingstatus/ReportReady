import { BREAKROOM_NAV_IMAGE } from "@/lib/breakroom-nav";
import { MARQUEE_BULB_POSITIONS } from "@/lib/breakroom-marquee-bulbs";
import { cn } from "@/lib/utils";

interface BreakroomNavMarqueeProps {
  className?: string;
}

export function BreakroomNavMarquee({ className }: BreakroomNavMarqueeProps) {
  return (
    <span className={cn("breakroom-marquee breakroom-nav-sign", className)}>
      <span className="breakroom-marquee__inner">
        <span className="breakroom-marquee__sign-clip">
          <img
            src={BREAKROOM_NAV_IMAGE}
            alt=""
            width={1024}
            height={456}
            decoding="async"
            draggable={false}
            className="breakroom-marquee__sign"
          />
        </span>
        <span className="breakroom-marquee__bulbs" aria-hidden="true">
          {MARQUEE_BULB_POSITIONS.map((position, index) => (
            <span
              key={index}
              className="bulb"
              style={{ top: `${position.top}%`, left: `${position.left}%` }}
            />
          ))}
        </span>
      </span>
    </span>
  );
}
