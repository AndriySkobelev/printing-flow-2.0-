import { useConvexMutation } from "@convex-dev/react-query"
import { useMutation } from "@tanstack/react-query"
import { api } from "convex/_generated/api"
import { toast } from "sonner"

export function useCreateReport() {
  const mutationFn = useConvexMutation(
    api.queries.shift_reports.createShiftReport,
  )

  return useMutation({
    mutationFn,
    onSuccess: () => {
      toast.success('Звіт успішно створено', {
        duration: 3000,
        position: 'top-center',
      },)
    },
    onError: (error) => {
      toast.error(`Помилка при створенні звіту: ${error.message}`, {
        duration: 3000,
        position: 'top-center',
      },)
    },
  })
}


