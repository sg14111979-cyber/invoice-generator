"use client";

import { useEffect } from "react";

/** Opens the print dialog once the sheet has rendered. */
export function AutoPrint() {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
