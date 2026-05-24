import { useEffect, useState } from "react";
import {
  ACHIEVEMENTS,
  TONE_CLASSES,
  loadEarnedAchievements,
} from "@/lib/achievements";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trophy } from "lucide-react";

/** Compact row of earned achievement badges; locked ones show muted. */
export function AchievementsRow() {
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setEarned(loadEarnedAchievements());
  }, [tick]);

  useEffect(() => {
    const onUpdate = () => setTick((t) => t + 1);
    window.addEventListener("achievements:update", onUpdate);
    return () => window.removeEventListener("achievements:update", onUpdate);
  }, []);

  const earnedCount = earned.size;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <Trophy className="h-3 w-3" />
          Badges
          <span className="tabular-nums opacity-70">
            {earnedCount}/{ACHIEVEMENTS.length}
          </span>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {ACHIEVEMENTS.map((a) => {
          const got = earned.has(a.id);
          return (
            <Tooltip key={a.id}>
              <TooltipTrigger asChild>
                <span
                  className={[
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] ring-1 transition",
                    got
                      ? TONE_CLASSES[a.tone]
                      : "bg-muted/40 text-muted-foreground/40 ring-border grayscale",
                  ].join(" ")}
                  aria-label={a.title}
                >
                  {a.icon}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[180px] text-xs">
                <div className="font-semibold">
                  {a.title} {!got && <span className="opacity-60">· locked</span>}
                </div>
                <div className="text-[11px] opacity-80">{a.desc}</div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
