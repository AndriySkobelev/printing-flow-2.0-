import { Loader2, Plus } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ImagesSection } from '@/route-components/branding/components/images-section'
import { FileInput } from '@/components/file-input'
import { useUploadOrderFile } from '../actions'

type Props = {
  productionOrderId: string
  keycrmOrderId: string
  files: any[]
}

export const OrderImages = ({ productionOrderId, keycrmOrderId, files }: Props) => {
  const uploadFile = useUploadOrderFile(productionOrderId)

  const handleUpload = async (file: File) => {
    const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : ''
    await uploadFile(file, `${keycrmOrderId}${ext}`)
  }

  return (
    <div className="flex gap-2 items-center w-full rounded-md border px-3 py-3">
      <FileInput onUpload={handleUpload} multiple>
        {({ isUploading, open }) => (
          <button
            type="button"
            onClick={open}
            disabled={isUploading}
            className="flex-none size-20 rounded-lg border bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/70 transition-colors disabled:opacity-50"
          >
            {isUploading
              ? <Loader2 size={20} className="animate-spin" />
              : <Plus size={20} />
            }
          </button>
        )}
      </FileInput>
      <ScrollArea className="flex-1" aria-orientation="horizontal">
        <ImagesSection files={files} />
      </ScrollArea>
    </div>
  )
}
