import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UseDrawerProps, UseDrawerResult } from "./types.js";

const useDrawer = ({
  isOpenOverride,
  onOpen,
  onClose,
  parent,
}: UseDrawerProps): UseDrawerResult => {
  const dialogueRef = useRef<HTMLDialogElement>(null);
  const isSsr = useMemo(() => typeof window === "undefined", []);
  const parentElement = useMemo(
    () => (isSsr ? undefined : parent || document.body),
    [isSsr, parent],
  );
  const [isOpenInternal, setIsOpenInternal] = useState(isOpenOverride);

  const open = useCallback(
    (event?: Event) => {
      if (!parentElement) return;
      parentElement.style.overflow = "hidden";
      setIsOpenInternal(true);
      onOpen?.(event);
    },
    [parentElement, onOpen],
  );

  const close = useCallback(
    (event?: Event) => {
      if (!parentElement) return;
      parentElement.style.overflow = "";
      setIsOpenInternal(false);
      onClose?.(event);
    },
    [parentElement, onClose],
  );

  const toggle = useCallback(
    (event?: Event) => {
      if (isOpenOverride) close(event);
      else open(event);
    },
    [isOpenOverride, close, open],
  );

  // Handle Escape key press
  useEffect(() => {
    if (isSsr) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpenOverride) {
        close(event);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Cleanup listener on component unmount or when isOpen/onClose changes
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpenOverride, close, isSsr]);

  // Sync the open/close state with the `isOpen` prop
  useEffect(() => {
    if (isSsr || !parentElement) return;
    if (isOpenOverride) open();
    else close();
    return () => {
      parentElement.style.overflow = "";
    };
  }, [isOpenOverride, open, close, parentElement, isSsr]);

  // Handle outside clicks
  useEffect(() => {
    if (isSsr || !parentElement) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpenInternal &&
        !dialogueRef?.current?.contains(event.target as Node)
      ) {
        close(event);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [parentElement, isSsr, close, isOpenInternal]);

  return useMemo(
    () => ({ isOpen: isOpenInternal, open, close, toggle, dialogueRef }),
    [open, close, toggle, isOpenInternal],
  );
};

export default useDrawer;
