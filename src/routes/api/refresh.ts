import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/refresh')({
  server: {
    handlers: {
      POST: async () => {
        return new Response(null, {})
      }
    }
  }
})
