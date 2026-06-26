import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { cn } from '@/lib/utils'

export const InlineEdit = memo(({ value, onSave, placeholder = '…' }: {
  value: string
  onSave: (val: string) => void
  placeholder?: string
}) => {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const save   = useCallback(() => { onSave(draft.trim()); setEditing(false) }, [draft, onSave])
  const cancel = useCallback(() => { setDraft(value); setEditing(false) }, [value])

  return (
    <span className="flex-1 min-w-0 cursor-text" onClick={() => { if (!editing) setEditing(true) }}>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={e => {
            if (e.key === 'Enter')  { e.preventDefault(); save() }
            if (e.key === 'Escape') cancel()
          }}
          className="w-full bg-transparent outline-none border-b border-border text-xs text-foreground"
          placeholder={placeholder}
        />
      ) : (
        <span className={cn(
          'block truncate text-xs',
          draft ? 'text-foreground' : 'text-muted-foreground/40 italic'
        )}>
          {draft || placeholder}
        </span>
      )}
    </span>
  )
})
