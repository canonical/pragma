const mergeRefs =
  <T>(...refs: (React.Ref<T> | undefined)[]) =>
  (instance: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(instance);
      } else if (ref) {
        (ref as React.RefObject<T | null>).current = instance;
      }
    }
  };

export default mergeRefs;
