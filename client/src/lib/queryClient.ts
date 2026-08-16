import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,          // 60s — avoid re-fetching on every navigation
      gcTime: 5 * 60_000,         // 5min — keep unused data in cache longer
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
  },
})
