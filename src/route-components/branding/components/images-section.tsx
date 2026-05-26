import { useState, memo } from 'react'
import { ZoomIn } from 'lucide-react'
import MyDialog from '@/components/myDialog'

type AttachedFile = { url?: string; name?: string } | string

const imageTypes = ['png', 'jpeg', 'jpg', 'gif', 'bmp', 'tiff', 'ico', 'webp', 'svg', 'heic', 'heif']

const getUrl = (file: AttachedFile): string =>
  typeof file === 'string' ? file : (file?.url ?? '')

const isImage = (file: AttachedFile): boolean => {
  const src = getUrl(file)
  const ext = src.split('?')[0].split('.').pop()?.toLowerCase() ?? ''
  return imageTypes.includes(ext)
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
      <MyDialog
        open={!!lightboxUrl}
        setOpen={open => { if (!open) setLightboxUrl(null) }}
        isLoading={false}
        outerClose={true}
        className="max-w-none w-fit bg-transparent border-none shadow-none p-4 flex flex-col items-center gap-4"
        content={
          lightboxUrl
            ? <img src={lightboxUrl} alt="" className="max-w-[88vw] max-h-[80dvh] rounded-lg object-contain" />
            : null
        }
      />

      <section className="px-3 pt-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map(file => {
            const url = getUrl(file)
            return (
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
            )
          })}
        </div>
      </section>
    </>
  )
})
