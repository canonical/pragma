import type { ReactElement, ReactNode } from "react";
import { Suspense, useSyncExternalStore } from "react";
import type { OutletProps } from "./types.js";
import useRouter from "./useRouter.js";

export default function Outlet({ fallback = null }: OutletProps): ReactElement {
  const router = useRouter();

  useSyncExternalStore(router.subscribe, router.getState, router.getState);
  const rendered = router.render() as ReactNode;

  return <Suspense fallback={fallback}>{rendered}</Suspense>;
}
