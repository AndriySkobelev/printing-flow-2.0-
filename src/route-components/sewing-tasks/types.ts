import { type AttachedFile } from '@/route-components/branding/components/images-section'

export type SubTask = {
  _id:           string
  quantity:      number
  completedQty?: number
  size?:         string
  status:        'new' | 'in_progress' | 'done' | 'paused'
  startDate?:    number
  endDate?:      number
  keycrmOrderId: string | null
  orderIndex:    string | null
  specName:      string | null
  color:         string | null
  taskEndDate:   number | null
  images:        AttachedFile[]
  isCustomSewing?:      boolean
  customSewingComment?: string | null
}
