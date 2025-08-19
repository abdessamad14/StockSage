import { QueryClient } from "@tanstack/react-query";

// Offline query client that doesn't make network requests
export const offlineQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: () => {
        // Return empty data for offline mode
        return Promise.resolve(null);
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity, // Never refetch in offline mode
      retry: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: false,
      networkMode: 'offlineFirst',
    },
  },
});
