import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster, toast } from "sonner";

import { router } from "./router";
import { createAppQueryClient } from "./query-client";
import { createSessionExpirationHandler } from "./session-expiration";

export default function AppProviders() {
  const [queryClient] = useState(() => {
    const clientRef: {
      current: ReturnType<typeof createAppQueryClient> | null;
    } = {
      current: null,
    };

    const handleSessionExpired = createSessionExpirationHandler(
      () => {
        clientRef.current?.clear();
      },
      () => {
        void router.navigate("/login");
      },
      (message) => {
        toast.error(message);
      },
    );

    const client = createAppQueryClient(handleSessionExpired);
    clientRef.current = client;

    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster richColors />
    </QueryClientProvider>
  );
}
