import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Props {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({ title, count, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="px-3 pt-3 pb-1">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded px-1.5 py-1 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition hover:bg-accent/40 hover:text-foreground [&[data-state=open]>svg]:rotate-180">
          <span className="flex items-center gap-1.5">
            <span>{title}</span>
            {count !== undefined && (
              <span className="font-medium normal-case tracking-normal text-muted-foreground/60">
                ({count})
              </span>
            )}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 transition-transform duration-200" />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
