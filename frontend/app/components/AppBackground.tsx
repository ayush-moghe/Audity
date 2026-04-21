"use client";

import { usePathname } from "next/navigation";
import GlobalSynthwaveBackground from "./GlobalSynthwaveBackground";

export default function AppBackground() {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return <GlobalSynthwaveBackground />;
}
