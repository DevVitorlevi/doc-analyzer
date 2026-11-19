import { getErrorMessage } from "@/lib/errors";

export function createSessionExpirationHandler(
  clearCache: () => void,
  navigateToLogin: () => void,
  notify: (message: string) => void,
): () => void {
  let handlingSessionExpiration = false;

  return () => {
    if (handlingSessionExpiration) return;

    handlingSessionExpiration = true;

    clearCache();
    navigateToLogin();
    notify(getErrorMessage("UNAUTHORIZED"));
  };
}
