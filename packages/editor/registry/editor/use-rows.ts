import { useMemo } from "react";

import { useEditor } from "@uberscene/editor";
import { timelineRows } from "@uberscene/sdk";

/** The timeline as rows, grouped by track. Every block below reads the editor through this and the editor's hooks. */
export function useRows() {
  const { state } = useEditor();
  return useMemo(() => {
    const rows = timelineRows(state);
    return {
      ...rows,
      byTrack: rows.tracks.map((t) => ({ track: t, rows: rows.elements.filter((e) => e.track === t.id) })),
      /** The camera, when the file has one: it moves every track that names it. */
      camera: rows.elements.find((e) => e.kind === "camera"),
    };
  }, [state]);
}
