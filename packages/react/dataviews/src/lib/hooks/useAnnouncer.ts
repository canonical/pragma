import { type ReactNode, useCallback, useRef } from "react";
import type { AnnouncerHandle, AnnouncerTopic } from "../common/index.js";
import type { UseAnnouncerResult } from "./types.js";

/**
 * One root's announcer: the ref its region is rendered with, and the way to
 * say something through it, held at one identity for as long as the root is
 * mounted. Something said before the region has mounted, or after it has
 * gone, is not said.
 */
export default function useAnnouncer(): UseAnnouncerResult {
  const ref = useRef<AnnouncerHandle>(null);
  const announce = useCallback(
    (message: ReactNode, topic?: AnnouncerTopic): void => {
      ref.current?.announce(message, topic);
    },
    [],
  );
  return { ref, announce };
}
