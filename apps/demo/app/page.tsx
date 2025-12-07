"use client";

import dynamic from "next/dynamic";

const LiveAvatarDemo = dynamic(
  () => import("../src/components/LiveAvatarDemo").then((mod) => mod.LiveAvatarDemo),
  { ssr: false }
);

export default function Home() {
  return <LiveAvatarDemo />;
}
