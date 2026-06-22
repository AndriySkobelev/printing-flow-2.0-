import { useRef, useState } from 'react'
import { Loader2, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'

type RenderProps = {
  isUploading: boolean
  open: () => void
}

type Props = {
  onUpload: (file: File) => Promise<unknown>
  accept?: string
  multiple?: boolean
  label?: string
  disabled?: boolean
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  children?: (props: RenderProps) => React.ReactNode
}

export const FileInput = ({
  onUpload,
  accept,
  multiple = false,
  label = 'Прикріпити файл',
  disabled,
  variant = 'outline',
  size = 'sm',
  className,
  children,
}: Props) => {
  const ref = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const open = () => ref.current?.click()

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    setIsUploading(true)
    try {
      await Promise.all(files.map(file => onUpload(file)))
    } finally {
      setIsUploading(false)
      if (ref.current) ref.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={handleChange}
        disabled={disabled || isUploading}
      />
      {children ? children({ isUploading, open }) : (
        <Button
          type="button"
          variant={variant}
          size={size}
          disabled={disabled || isUploading}
          className={className}
          onClick={open}
        >
          {isUploading
            ? <Loader2 size={14} className="animate-spin" />
            : <Paperclip size={14} />
          }
          {size !== 'icon' && <span>{isUploading ? 'Завантаження...' : label}</span>}
        </Button>
      )}
    </>
  )
}
