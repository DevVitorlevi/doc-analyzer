import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/http";

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function createAppQueryClient(
  onSessionExpired: () => void,
): QueryClient {
  const handleUnauthorized = (error: unknown) => {
    if (isUnauthorized(error)) {
      onSessionExpired();
    }
  };

  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        const isInitialSessionRequest =
          query.queryKey[0] === "me" && query.state.data === undefined;

        if (!isInitialSessionRequest) {
          handleUnauthorized(error);
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        handleUnauthorized(error);
      },
    }),
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
