import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UseDrawerProps, UseDrawerResult } from "./types.js";

const useDrawer = ({
  isOpenOverride,
  onOpen,
  onClose,
  parent,
  dialogueRef: dialogueRefProp,
}: UseDrawerProps): UseDrawerResult => {
  const dialogueRef = useRef<HTMLDialogElement | null>(
    dialogueRefProp ? dialogueRefProp.current : null,
  );
  const isSsr = useMemo(() => typeof window === "undefined", []);
  const parentElement = useMemo(
    () => (isSsr ? undefined : parent || document.body),
    [isSsr, parent],
  );
  const [isOpenInternal, setIsOpenInternal] = useState(isOpenOverride);

  const open = useCallback(
    (event?: Event) => {
      if (
        isSsr ||
        !parentElement ||
        !dialogueRef.current ||
        dialogueRef.current.open
      )
        return;
      parentElement.style.overflow = "hidden";
      setIsOpenInternal(true);
      dialogueRef.current.showModal();
      onOpen?.(event);
    },
    [isSsr, parentElement, onOpen],
  );

  const close = useCallback(
    (event?: Event) => {
      if (
        isSsr ||
        !parentElement ||
        !dialogueRef.current ||
        !dialogueRef.current.open
      )
        return;
      parentElement.style.overflow = "";
      setIsOpenInternal(false);
      dialogueRef.current.close();
      onClose?.(event);
    },
    [isSsr, parentElement, onClose],
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
    const dialogueNode = dialogueRef.current;
    if (isSsr || !parentElement || !dialogueNode) return;

    const handleClickOutside = (event: MouseEvent) => {
      /**
       * The dialogue is opened with `showModal()`, which creates a full-screen backdrop.
       * This causes *all* click events to be captured by the dialogue - so we can't just check if the event target is contained by the dialogue as that is always true.
       * Instead, we can check if the click is inside the dialogue box itself.
       */
      const dialogueBbox = dialogueNode.getBoundingClientRect();
      const clickIsInsideDialogueBox =
        event.clientX >= dialogueBbox.left &&
        event.clientX <= dialogueBbox.right &&
        event.clientY >= dialogueBbox.top &&
        event.clientY <= dialogueBbox.bottom;

      /**
       * The click target must be the dialogue node itself.
       * This is true when the backdrop is clicked, or when some space in the dialogue that is not covered by
       * some other element (like a button) is clicked.
       */
      const clickTargetIsDialogue = event.target === dialogueNode;

      if (
        // Ignore clicks if the dialogue is closed
        isOpenInternal &&
        // Ignore clicks if the click is inside the dialogue box
        !clickIsInsideDialogueBox &&
        // Ignore clicks if the click target is some child of the dialogue.
        // By combining the coordinates check and the target check, we can close if the outside space is clicked
        // While allowing for cases where the clicked element bleeds outside the dialogue box (such as ctx menus or tooltips)
        clickTargetIsDialogue
      ) {
        close(event);
      }
    };

    dialogueNode.addEventListener("click", handleClickOutside);

    return () => {
      dialogueNode.removeEventListener("click", handleClickOutside);
    };
  }, [parentElement, isSsr, close, isOpenInternal]);

  return useMemo(
    () => ({ isOpen: isOpenInternal, open, close, toggle, dialogueRef }),
    [open, close, toggle, isOpenInternal],
  );
};

export default useDrawer;
