import { type AttachedFile } from '@/route-components/branding/components/images-section'
import { type BrandingTypeValue } from '@/route-components/order-details/types'

export type PackagingAssignee = {
  name?:     string | null
  lastName?: string | null
  image?:    string | null
}

export type PackagingSubTask = {
  _id:                    string
  productionOrderItemId:  string | null
  itemName:               string | null
  color:                  string | null
  size:                   string | null
  quantity:               number
  status:                 'new' | 'in_progress' | 'done' | 'paused'
  endDate:                number | null
  isCustomCut:            boolean
  isCustomSewing:         boolean
  customCutComment?:      string
  customSewingComment?:   string
  assignedTo:             PackagingAssignee | null
}

export type PackagingSubcontractorTask = {
  _id:                 string
  name:                string
  type:                'sublimation' | 'embroidery' | 'silkscreen' | 'dtg' | 'dtf' | 'other'
  status:              'sent' | 'in_progress' | 'returned' | 'delayed' | 'waiting_to_sent'
  expectedSentDate:    number
  expectedReturnDate:  number
  actualSentDate:      number | null
  actualReturnDate:    number | null
}

export type PackagingLog = {
  _id:                     string
  packagingTaskId:         string
  productionOrderItemId:   string
  type:                    'completed' | 'defect_fabric' | 'defect_print' | 'defect_sewing'
  quantity:                number
  timestamp:               number
  comment?:                string
}

export type PackagingTask = {
  _id:              string
  productionOrderId: string
  keycrmOrderId:    string
  keycrmManager:    string | null
  plannedShipDate:  number | null
  startDate:        number
  endDate:          number
  status:           'new' | 'in_progress' | 'done' | 'paused' | 'waiting'
  note?:            string
  attachedFiles:    AttachedFile[]
  brandingTypes:    BrandingTypeValue[]
  subcontractorTasks: PackagingSubcontractorTask[]
  subTasks:         PackagingSubTask[]
  logs:             PackagingLog[]
}
