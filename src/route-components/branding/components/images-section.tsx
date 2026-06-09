import { useState, memo, useMemo, useContext } from 'react'
import { ZoomIn } from 'lucide-react'
import { DialogContext } from '@/contexts/dialog'

type AttachedFile = { url?: string; name?: string } | string

const imageRegex = /\.(png|jpe?g|gif|bmp|tiff?|ico|webp|svg|heic|heif)(\?.*)?$/i

const getUrl = (file: AttachedFile): string =>
  typeof file === 'string' ? file : (file?.url ?? '')

// const isImage = (file: AttachedFile): boolean => {
//   const src = getUrl(file)
//   const ext = src.split('?')[0].split('.').pop()?.toLowerCase() ?? ''
//   return imageTypes.includes(ext)
// }
const isImage = (file: AttachedFile) => imageRegex.test(getUrl(file))

const LightboxContent = ({ url }: { url: string }) => {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className="relative flex items-center justify-center min-w-20 min-h-20">
      {!loaded && (
        <div className="size-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
      )}
      <img
        src={url}
        alt=""
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={loaded ? 'max-w-[88vw] max-h-[80dvh] rounded-lg object-contain' : 'sr-only'}
      />
    </div>
  )
}

type Props = {
  files: AttachedFile[]
}

export const ImagesSection = memo(({ files }: Props) => {
  const { openDialog } = useContext(DialogContext)

  const images = useMemo(() => files.filter(isImage), [files])

  if (images.length === 0) return null

  const handleOpen = (url: string) => {
    openDialog({
      outerClose: true,
      className:  'max-w-none w-fit bg-transparent border-none shadow-none p-4 flex flex-col items-center gap-4',
      content:    <LightboxContent url={url} />,
    })
  }

  return (
    <section className="px-3 pt-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((file, index) => {
          const url = getUrl(file)
          return (
            <button
              key={`${url}-${index}`}
              onClick={() => handleOpen(url)}
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
