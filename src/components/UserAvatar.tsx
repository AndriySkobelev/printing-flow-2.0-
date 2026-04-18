import { ROLE_LABELS, type UserRole } from '@/constants/roles'

type AvatarSize = 'sm' | 'md' | 'lg'

const sizeMap: Record<AvatarSize, { wrap: string; text: string; ring: string }> = {
  sm: { wrap: 'size-8',  text: 'text-xs',  ring: 'ring-2' },
  md: { wrap: 'size-10', text: 'text-sm',  ring: 'ring-2' },
  lg: { wrap: 'size-16', text: 'text-xl',  ring: 'ring-2' },
}

type UserAvatarProps = {
  name?: string
  image?: string
  role?: string
  size?: AvatarSize
  showName?: boolean
  showRole?: boolean
}

export default function UserAvatar({
  name,
  image,
  role,
  size = 'md',
  showName = false,
  showRole = false,
}: UserAvatarProps) {
  const { wrap, text, ring } = sizeMap[size]

  const initials = name
    ?.split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?'

  const roleLabel = role ? (ROLE_LABELS[role as UserRole] ?? role) : null

  const avatar = image ? (
    <img
      src={image}
      alt={name}
      className={`${wrap} ${ring} rounded-full object-cover ring-white/20 shrink-0`}
    />
  ) : (
    <span
      className={`${wrap} ${ring} ${text} rounded-full bg-white/20 ring-white/10 flex items-center justify-center font-semibold text-white select-none shrink-0`}
    >
      {initials}
    </span>
  )

  if (showName) {
    return (
      <div className="flex items-center gap-3 min-w-0">
        {avatar}
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-white font-semibold text-base leading-tight truncate">
            {name ?? '—'}
          </span>
          {showRole && roleLabel && (
            <span className="text-xs text-white/60">{roleLabel}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      {avatar}
      {showRole && roleLabel && (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/70 capitalize leading-none">
          {roleLabel}
        </span>
      )}
    </div>
  )
}
