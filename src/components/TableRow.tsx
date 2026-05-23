import type { TableBlock } from "@/lib/types";
import { ParagraphRow } from "./ParagraphRow";

export function TableRow({ table }: { table: TableBlock }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        Table · {table.rows.length} × {table.rows[0]?.length ?? 0}
      </div>
      <div className="space-y-3">
        {table.rows.map((row, ri) => (
          <div
            key={ri}
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
          >
            {row.map((cell, ci) => (
              <div key={ci} className="rounded border border-border bg-background p-2">
                {cell.paragraphs.length === 0 && (
                  <div className="text-xs italic text-muted-foreground">(empty)</div>
                )}
                {cell.paragraphs.map((p) => (
                  <ParagraphRow key={p.id} paragraph={p} compact />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
