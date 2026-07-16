import { useState } from 'react'
import { ChevronDown, ChevronRight, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImagesSection, type AttachedFile } from '@/route-components/branding/components/images-section'

export const TaskImages = ({ images }: { images: AttachedFile[] }) => {
  const [isOpen, setIsOpen] = useState(false)

  if (images.length === 0) return null

  return (
    <div className="flex flex-col gap-2 -mx-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 text-[11px] px-3 mx-3 justify-start text-muted-foreground"
        onClick={() => setIsOpen(v => !v)}
      >
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <ImageIcon size={12} />
        Зображення ({images.length})
      </Button>
      {isOpen && <ImagesSection files={images} />}
    </div>
  )
}
