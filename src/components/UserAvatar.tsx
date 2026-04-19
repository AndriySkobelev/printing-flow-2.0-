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
  lastName?: string
  size?: AvatarSize
  showName?: boolean
  showRole?: boolean
  nameColor?: 'white' | 'black'
}

export default function UserAvatar({
  name,
  lastName,
  image,
  role,
  size = 'md',
  nameColor,
  showName = false,
  showRole = false,
}: UserAvatarProps) {
  const { wrap, text, ring } = sizeMap[size]
  const fullName = [name, lastName].filter(Boolean).join(' ')
  const initials = [name, lastName]
    .filter(Boolean)
    .map(w => w![0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

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
          <span className={`text-${nameColor} font-light text-base leading-tight truncate`}>
            {fullName || '—'}
          </span>
          {showRole && roleLabel && (
            <span className="text-xs text-[#e4fffa] capitalize px-1.5 py-0,75 bg-[#006b89] rounded-md w-fit">{roleLabel}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      {avatar}
      {showRole && roleLabel && (
        <span className="text-xs text-[#e4fffa] capitalize px-1.5 py-0,75 bg-[#006b89] rounded-md w-fit">
          {roleLabel}
        </span>
      )}
    </div>
  )
}
