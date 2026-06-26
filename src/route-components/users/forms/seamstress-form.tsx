import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { type Doc } from 'convex/_generated/dataModel'
import { useAppForm } from '@/components/main-form'
import { Clock } from 'lucide-react'
import { useUpdateSeamstressData } from '../queries'

type DevelopingEntry = {
  specificationId: Id<'specifications'>
  developingTime: number
}

type Props = {
  formId: string
  userId: Id<'users'>
  existing?: DevelopingEntry[]
  onSuccess: () => void
}

type InnerProps = Props & { specs: Doc<'specifications'>[] }

function SeamstressFormInner({ formId, userId, existing = [], specs, onSuccess }: InnerProps) {
  const { mutate: save } = useUpdateSeamstressData()

  const defaultValues = Object.fromEntries(
    specs.map(spec => [
      spec._id,
      existing.find(e => e.specificationId === spec._id)?.developingTime ?? 0,
    ])
  )

  const form = useAppForm({
    defaultValues: { times: defaultValues } as { times: Record<string, number> },
    onSubmit: ({ value }) => {
      const developingSpecification: DevelopingEntry[] = specs
        .filter(spec => (value.times[spec._id] ?? 0) > 0)
        .map(spec => ({
          specificationId: spec._id,
          developingTime: Number(value.times[spec._id]),
        }))
      save({ id: userId, developingSpecification }, { onSuccess })
    },
  })

  return (
    <form
      id={formId}
      onSubmit={(e: React.SyntheticEvent) => { e.preventDefault(); form.handleSubmit() }}
      className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1"
    >
      {specs.map(spec => (
        <div key={spec._id} className="flex items-center gap-3">
          <span className="flex-1 text-sm truncate text-foreground">{spec.name}</span>
          <div className="flex flex-1 items-center gap-1.5 shrink-0">
            <Clock className="size-3.5 text-muted-foreground" />
            <form.AppField
              name={`times.${spec._id}` as any}
              children={(f) => (
                <f.FormTextField
                  type="number"
                  placeholder="0"
                  className="w-24"
                />
              )}
            />
            <span className="text-xs text-muted-foreground">хв</span>
          </div>
        </div>
      ))}
    </form>
  )
}

export default function SeamstressForm(props: Props) {
  const { data: specs, isLoading } = useQuery(
    convexQuery(api.queries.specifications.getSpecifications, {})
  )

  if (isLoading || !specs) {
    return <div className="py-6 text-sm text-center text-muted-foreground">Завантаження...</div>
  }

  return <SeamstressFormInner {...props} specs={specs} />
}