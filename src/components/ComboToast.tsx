import { useEffect, useState } from "react";
import { useEditor } from "@/store/editor";
import { Flame } from "lucide-react";

/**
 * Floating combo indicator. Pops when the user chains 3+ edits within the
 * combo window and fades after a beat of inactivity.
 */
export function ComboToast() {
  const tick = useEditor((s) => s.comboTick);
  const combo = useEditor((s) => s.comboCount);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (combo < 3) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 1600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  if (!visible || combo < 3) return null;

  return (
    <div
      key={tick}
      className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-500 to-rose-500 px-4 py-1.5 text-sm font-bold text-white shadow-lg shadow-amber-500/30">
        <Flame className="h-4 w-4" />
        Combo x{combo}!
      </div>
    </div>
  );
}
