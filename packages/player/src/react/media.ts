// An `asset:` reference as something an element can show: a URL for an image, the text of a file that is inlined.
import { useEffect, useState } from "react";

import { usePlayer } from "./hooks";

/** Resolves an `asset:` reference to an object URL or a plain URL. */
export function useMediaUrl(ref: string | null): string | null {
  const core = usePlayer();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!ref) {
      setUrl(null);
      return;
    }
    const id = ref.startsWith("asset:") ? ref.slice(6) : ref;
    let revoke: string | null = null;
    let cancelled = false;
    core
      .resolveMedia(id)
      .then((handle) => {
        if (cancelled) return;
        if (handle.kind === "url") setUrl(handle.url);
        else if (handle.kind === "blob") {
          revoke = URL.createObjectURL(handle.blob);
          setUrl(revoke);
        } else setUrl(null);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [core, ref]);
  return url;
}

/** Reads an `asset:` reference as text, for markup that is inlined rather than loaded as an image. */
export function useMediaText(ref: string | null): string | null {
  const core = usePlayer();
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!ref) {
      setText(null);
      return;
    }
    const id = ref.startsWith("asset:") ? ref.slice(6) : ref;
    let cancelled = false;
    core
      .resolveMedia(id)
      .then((handle) =>
        handle.kind === "url"
          ? fetch(handle.url).then((r) => r.text())
          : handle.kind === "blob"
            ? handle.blob.text()
            : null,
      )
      .then((t) => {
        if (!cancelled) setText(t);
      })
      .catch(() => {
        if (!cancelled) setText(null);
      });
    return () => {
      cancelled = true;
    };
  }, [core, ref]);
  return text;
}
