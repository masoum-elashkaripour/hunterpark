"use client";

import dynamic from "next/dynamic";
import type { Work } from "@/lib/works";

/* `ssr: false` is only legal inside a Client Component, so the dynamic import
   lives here rather than in the page — which also keeps three.js out of the
   initial bundle. */
const Stage3D = dynamic(() => import("@/components/stage-3d"), {
  ssr: false,
  loading: () => null,
});

export function LazyStage3D(props: {
  works: Work[];
  onActive: (index: number) => void;
  onOpen?: (index: number) => void;
  initialIndex?: number;
  receding?: boolean;
  onReceded?: () => void;
}) {
  return <Stage3D {...props} />;
}
