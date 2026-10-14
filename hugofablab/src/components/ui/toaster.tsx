"use client";

import { useTheme } from "next-themes";
import { Toaster } from "sonner";

export function AppToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      expand
      duration={6000}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      toastOptions={{ classNames: { toast: "rounded-2xl shadow-lg" } }}
    />
  );
}
