import { useState, useEffect, Suspense, memo } from 'react'
import { createPortal } from 'react-dom'
import { X, ZoomIn } from 'lucide-react'
import { Button } from '@/components/ui/button'

type AttachedFile = { url?: string; name?: string } | string

const imageTypes = ['png', 'jpeg', 'jpg', 'gif', 'bmp', 'tiff', 'ico', 'webp', 'svg', 'heic', 'heif']

const getUrl = (file: AttachedFile): string =>
  typeof file === 'string' ? file : (file?.url ?? '')

const isImage = (file: AttachedFile): boolean => {
  const src = getUrl(file)
  const ext = src.split('?')[0].split('.').pop()?.toLowerCase() ?? ''
  return imageTypes.includes(ext)
}

const Lightbox = ({ url, onClose }: { url: string; onClose: () => void }) => {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/85 touch-none"
      onClick={onClose}
    >
      <Button
        size="icon"
        variant="ghost"
        onClick={onClose}
        className="absolute text-white hover:bg-white/10 size-12"
        style={{ top: 'max(1rem, env(safe-area-inset-top))', right: '1rem' }}
      >
        <X className="size-6" />
      </Button>
      <img
        src={url}
        alt=""
        className="max-w-[95vw] max-h-[85dvh] rounded-lg object-contain"
        onClick={e => e.stopPropagation()}
      />
    </div>,
    document.body
  )
}

type Props = {
  files: AttachedFile[]
}

export const ImagesSection = memo(({ files }: Props) => {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const images = files.filter(isImage)

  if (images.length === 0) return null

  return (
    <>
      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      <section className="px-3 pt-3 flex flex-col gap-2">
        {/* <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Зображення ({images.length})
        </p> */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((file) => {
            const url = getUrl(file)
            return (
              <Suspense key={url} fallback={<div className="shrink-0 size-20 rounded-lg bg-muted animate-pulse" />}>
                <button
                  key={url}
                  onClick={() => setLightboxUrl(url)}
                  className="relative shrink-0 size-20 rounded-lg overflow-hidden border bg-muted group"
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity size-5" />
                  </div>
                </button>
              </Suspense>
            )
          })}
        </div>
      </section>
    </>
  )
})
