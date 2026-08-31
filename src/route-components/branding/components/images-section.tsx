import { useState, memo, useMemo } from 'react'
import Image from 'rc-image'
import 'rc-image/assets/index.css'
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, X } from 'lucide-react'

export type AttachedFile = { url?: string; name?: string; contentType?: string } | string

const imageRegex = /\.(png|jpe?g|gif|bmp|tiff?|ico|webp|svg|heic|heif)(\?.*)?$/i

export const getUrl = (file: AttachedFile): string =>
  typeof file === 'string' ? file : (file?.url ?? '')

const getContentType = (file: AttachedFile): string | undefined =>
  typeof file === 'string' ? undefined : file?.contentType

export const isImage = (file: AttachedFile) => {
  const ct = getContentType(file)
  if (ct) return ct.startsWith('image/')
  return imageRegex.test(getUrl(file))
}

// swap in lucide icons for rc-image's built-in ones, to match the rest of the app
const previewIcons = {
  left:  <ChevronLeft className="size-5" />,
  right: <ChevronRight className="size-5" />,
  close: <X className="size-5" />,
}

// only zoom controls — no rotate/flip, per how this app's viewer is meant to behave
const renderZoomToolbar = (_: unknown, { transform, actions }: { transform: { scale: number }; actions: { onZoomIn: () => void; onZoomOut: () => void } }) => (
  <div className="flex items-center gap-1 rounded-full bg-black/40 px-1.5 py-1 text-white">
    <button
      type="button"
      disabled={transform.scale <= 1}
      onClick={actions.onZoomOut}
      className="flex items-center justify-center size-8 rounded-full hover:bg-white/20 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <ZoomOut className="size-4" />
    </button>
    <button
      type="button"
      onClick={actions.onZoomIn}
      className="flex items-center justify-center size-8 rounded-full hover:bg-white/20 transition-colors"
    >
      <ZoomIn className="size-4" />
    </button>
  </div>
)

type LightboxState = {
  current: number
  visible: boolean
  open: (index: number) => void
  onVisibleChange: (visible: boolean) => void
  onChangeCurrent: (current: number) => void
}

export const useLightbox = (): LightboxState => {
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(false)
  return {
    current,
    visible,
    open: index => { setCurrent(index); setVisible(true) },
    onVisibleChange: setVisible,
    onChangeCurrent: setCurrent,
  }
}

// shared by every "click a thumbnail to zoom" spot in the app — a full-screen,
// swipeable/zoomable image viewer (pan, wheel zoom, pinch, double-click zoom)
export const LightboxGroup = ({ images, lightbox }: { images: string[]; lightbox: LightboxState }) => (
  <Image.PreviewGroup
    items={images}
    icons={previewIcons}
    preview={{
      visible:         lightbox.visible,
      current:         lightbox.current,
      onVisibleChange: lightbox.onVisibleChange,
      onChange:        lightbox.onChangeCurrent,
      toolbarRender:   renderZoomToolbar,
      scaleStep:       0.5,
      maxScale:        4,
    }}
  >
    {null}
  </Image.PreviewGroup>
)

type Props = {
  files: AttachedFile[]
}

export const ImagesSection = memo(({ files }: Props) => {
  const lightbox = useLightbox()

  const images = useMemo(() => files.filter(isImage), [files])
  const imageUrls = useMemo(() => images.map(getUrl), [images])

  if (images.length === 0) return null

  return (
    <section className="px-3">
      <div className="flex gap-2 overflow-x-auto">
        {images.map((file, index) => {
          const url = getUrl(file)
          return (
            <button
              key={`${url}-${index}`}
              onClick={() => lightbox.open(index)}
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
      <LightboxGroup images={imageUrls} lightbox={lightbox} />
    </section>
  )
})
