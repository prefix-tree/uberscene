import { Focus } from "lucide-react";

import { useSelection } from "@uberscene/editor";

import { iconOf } from "./elements";
import { useRows } from "./use-rows";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/** Every element, grouped by track. A click selects it; the selection is the one the timeline and inspector share. */
export function Layers({ className }: { className?: string }) {
  const { byTrack, camera } = useRows();
  const [selected, select] = useSelection();
  return (
    <ScrollArea className={cn("h-full", className)} data-editor-layers="">
      <div className="flex flex-col gap-4 p-3">
        {camera && (
          <section className="flex flex-col gap-0.5">
            <h3 className="px-2 pb-1 text-xs font-medium text-muted-foreground">Camera</h3>
            <Button
              data-editor-layer={camera.id}
              variant={camera.id === selected ? "secondary" : "ghost"}
              size="sm"
              className="justify-start"
              aria-pressed={camera.id === selected}
              onClick={() => select(camera.id)}
            >
              <Focus className="text-muted-foreground" />
              <span className="truncate">{camera.id}</span>
            </Button>
          </section>
        )}
        {byTrack.map(({ track, rows }) => (
          <section key={track.id} className="flex flex-col gap-0.5">
            <h3 className="flex items-center gap-1.5 px-2 pb-1 text-xs font-medium text-muted-foreground">
              {track.id}
              {track.camera !== undefined && <Focus className="size-3" aria-label="Moved by the camera" />}
            </h3>
            {rows.map((row) => {
              const Icon = iconOf(row.kind);
              return (
                <Button
                  key={row.id}
                  data-editor-layer={row.id}
                  variant={row.id === selected ? "secondary" : "ghost"}
                  size="sm"
                  className="justify-start"
                  aria-pressed={row.id === selected}
                  onClick={() => select(row.id)}
                >
                  <Icon className="text-muted-foreground" />
                  <span className="truncate">{row.text ?? row.label ?? row.id}</span>
                </Button>
              );
            })}
          </section>
        ))}
      </div>
    </ScrollArea>
  );
}
