import { Loader2, Plus } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ImagesSection } from '@/route-components/branding/components/images-section'
import { FileInput } from '@/components/file-input'
import { Button } from '@/components/ui/button'
import { useUploadSpecFile } from '../actions'

type Props = {
  specificationId: string
  files: any[]
}

export const SpecImages = ({ specificationId, files }: Props) => {
  const uploadFile = useUploadSpecFile(specificationId)

  const handleUpload = async (file: File) => {
    const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : ''
    await uploadFile(file, `${specificationId}${ext}`)
  }

  return (
    <div className="flex gap-2 items-center w-full px-3 py-3">
      <FileInput onUpload={handleUpload} multiple>
        {({ isUploading, open }) => (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={open}
            disabled={isUploading}
            className="flex-none size-20 rounded-lg"
          >
            {isUploading
              ? <Loader2 size={20} className="animate-spin" />
              : <Plus size={20} />
            }
          </Button>
        )}
      </FileInput>
      <ScrollArea className="flex-1" aria-orientation="horizontal">
        <ImagesSection files={files} />
      </ScrollArea>
    </div>
  )
}
