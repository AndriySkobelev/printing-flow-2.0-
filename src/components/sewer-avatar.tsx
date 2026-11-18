import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { SEWER_COLORS } from '@/route-components/planer/constants'

export const SewerAvatar = ({ sewerId, name }: { sewerId?: string | null; name: string }) => {
  const { data: sewers = [] } = useQuery(convexQuery(api.queries.sewing.getSewerUsers, {}))
  const index = Math.max(0, sewers.findIndex(sewer => sewer._id === sewerId))

  return (
    <span
      title={name}
      className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ background: SEWER_COLORS[index % SEWER_COLORS.length] }}
    >
      {name[0]}
    </span>
  )
}
