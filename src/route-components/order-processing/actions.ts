import { useMutation } from '@tanstack/react-query'
import { useAction } from 'convex/react'
import { api } from 'convex/_generated/api'
import { toast } from 'sonner'

export const useLookupRegistration = () => {
  const lookup = useAction(api.http_actions.opendatabot.lookupRegistration)
  return useMutation({
    mutationFn: (code: string) => lookup({ code }),
    onError: (e: Error) => toast.error(e.message),
  })
}
