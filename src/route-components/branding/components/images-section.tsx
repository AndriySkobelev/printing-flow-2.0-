import { useState, useEffect, useRef, useCallback, memo, useMemo, useContext } from 'react'
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { DialogContext } from '@/contexts/dialog'

export type AttachedFile = { url?: string; name?: string; contentType?: string } | string

const imageRegex = /\.(png|jpe?g|gif|bmp|tiff?|ico|webp|svg|heic|heif)(\?.*)?$/i

const MIN_SCALE = 1
const MAX_SCALE = 4

export const getUrl = (file: AttachedFile): string =>
  typeof file === 'string' ? file : (file?.url ?? '')

const getContentType = (file: AttachedFile): string | undefined =>
  typeof file === 'string' ? undefined : file?.contentType

export const isImage = (file: AttachedFile) => {
  const ct = getContentType(file)
  if (ct) return ct.startsWith('image/')
  return imageRegex.test(getUrl(file))
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const LightboxContent = ({ images, startIndex }: { images: string[]; startIndex: number }) => {
  const [index, setIndex] = useState(startIndex)
  const [loaded, setLoaded] = useState(false)
  const [scale, setScale] = useState(MIN_SCALE)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 })

  const resetZoom = useCallback(() => {
    setScale(MIN_SCALE)
    setPos({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    setLoaded(false)
    resetZoom()
  }, [index, resetZoom])

  const goPrev = useCallback(() => setIndex(i => (i - 1 + images.length) % images.length), [images.length])
  const goNext = useCallback(() => setIndex(i => (i + 1) % images.length), [images.length])

  useEffect(() => {
    if (images.length <= 1) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [images.length, goPrev, goNext])

  // React makes wheel listeners passive by default, so preventDefault() inside
  // an onWheel prop silently fails (and warns) — attach natively instead.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      setScale(prev => {
        const next = clamp(prev * (1 - e.deltaY * 0.0015), MIN_SCALE, MAX_SCALE)
        if (next <= MIN_SCALE + 0.01) setPos({ x: 0, y: 0 })
        return next
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const toggleZoom = () => {
    setScale(prev => {
      if (prev > MIN_SCALE) {
        setPos({ x: 0, y: 0 })
        return MIN_SCALE
      }
      return 2.5
    })
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale <= MIN_SCALE) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y }
    setIsDragging(true)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStateRef.current.startX
    const dy = e.clientY - dragStateRef.current.startY
    setPos({
      x: dragStateRef.current.startPosX + dx / scale,
      y: dragStateRef.current.startPosY + dy / scale,
    })
  }

  const stopDragging = () => setIsDragging(false)

  const url = images[index]

  return (
    <div className="relative flex flex-col items-center gap-2">
      <div
        ref={containerRef}
        className={clsx(
          'relative flex items-center justify-center min-w-20 min-h-20 overflow-hidden select-none touch-none',
          'max-w-[88vw] max-h-[80dvh]',
        )}
        onDoubleClick={toggleZoom}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerLeave={stopDragging}
        style={{ cursor: scale > MIN_SCALE ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
      >
        {!loaded && (
          <div className="absolute size-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
        )}
        <img
          src={url}
          alt=""
          draggable={false}
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={clsx(
            'max-w-[88vw] max-h-[80dvh] rounded-lg object-contain transition-transform',
            isDragging ? 'duration-0' : 'duration-150',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
          style={{ transform: `scale(${scale}) translate(${pos.x}px, ${pos.y}px)` }}
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); goPrev() }}
              className="absolute left-1 top-1/2 -translate-y-1/2 flex items-center justify-center size-8 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); goNext() }}
              className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center size-8 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}

        <button
          type="button"
          onClick={e => { e.stopPropagation(); toggleZoom() }}
          className="absolute bottom-2 right-2 flex items-center justify-center size-8 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
        >
          {scale > MIN_SCALE ? <ZoomOut className="size-4" /> : <ZoomIn className="size-4" />}
        </button>

        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/40 text-white text-xs">
            {index + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  )
}

type Props = {
  files: AttachedFile[]
}

export const ImagesSection = memo(({ files }: Props) => {
  const { openDialog } = useContext(DialogContext)

  const images = useMemo(() => files.filter(isImage), [files])
  const imageUrls = useMemo(() => images.map(getUrl), [images])

  if (images.length === 0) return null

  const handleOpen = (index: number) => {
    openDialog({
      outerClose: true,
      className:  'max-w-none w-fit bg-transparent border-none shadow-none p-4 flex flex-col items-center gap-4',
      content:    <LightboxContent images={imageUrls} startIndex={index} />,
    })
  }

  return (
    <section className="px-3">
      <div className="flex gap-2 overflow-x-auto">
        {images.map((file, index) => {
          const url = getUrl(file)
          return (
            <button
              key={`${url}-${index}`}
              onClick={() => handleOpen(index)}
              className="
                group
                relative
                flex-none
                size-20
                overflow-hidden
                rounded-lg
                border
                bg-muted
                transform-gpu
              "
            >
              <img src={url} alt="" decoding="async" className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ZoomIn className="size-5 text-white" />
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
})
