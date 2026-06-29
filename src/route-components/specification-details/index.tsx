import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { type Id } from 'convex/_generated/dataModel'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { SpecImages } from './components/spec-images'
import { SpecInfo } from './components/spec-info'
import { SpecVariantsTable } from './components/spec-variants-table'
import { Route as specificationsRoute } from '@/routes/_authenticated/app/specifications'

type Props = {
  specificationId: string | null
}

const SpecDetailsContent = ({ specificationId }: { specificationId: string }) => {
  const navigate = useNavigate()
  const { data: spec } = useQuery(
    convexQuery(api.queries.specifications.getSpecificationById, {
      id: specificationId as Id<'specifications'>,
    })
  )

  if (!spec) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left: spec info ───────────────────────────────────────────── */}
      <div className="w-80 shrink-0 border-r flex flex-col overflow-hidden">

        <div className="px-3 py-2 border-b shrink-0 flex items-center gap-2">
          <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => navigate({ to: specificationsRoute.to })}>
            <ArrowLeft className="size-4" />
          </Button>
          <p className="text-sm font-semibold truncate">{spec.name}</p>
        </div>

        <SpecImages
          specificationId={specificationId}
          files={(spec.attachedFiles ?? []) as any[]}
        />

        <div className="border-t flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <SpecInfo spec={spec} />
          </ScrollArea>
        </div>

      </div>

      {/* ── Right: variants table ─────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <SpecVariantsTable specificationId={specificationId} />
      </div>

    </div>
  )
}

export const SpecDetails = ({ specificationId }: Props) => {
  if (!specificationId) {
    return (
      <div className="flex h-full shadow-[0px_0px_3px_#021b333d] rounded-lg bg-background items-center justify-center">
        <p className="text-sm text-muted-foreground">Оберіть специфікацію</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full shadow-[0px_0px_3px_#021b333d] rounded-lg bg-background overflow-hidden">
      <SpecDetailsContent specificationId={specificationId} />
    </div>
  )
}
