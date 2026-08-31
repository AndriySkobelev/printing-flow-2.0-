import { useState } from 'react'
import { ChevronDown, ChevronRight, Truck, Factory } from 'lucide-react'
import { ProgressBar } from '@/components/progress-bar'
import { BRANDING_LABELS } from '@/route-components/order-details/types'
import { PackSubTaskRow } from './pack-subtask-row'
import { PackImages } from './pack-images'
import { completedByItem, defectByItem, taskTotals, formatDate, SUBCONTRACTOR_TYPE_LABELS } from '../helpers'
import { type PackagingTask } from '../types'

export const PackTaskCard = ({ task }: { task: PackagingTask }) => {
  const [expanded, setExpanded] = useState(false)

  const { totalQty, totalDone } = taskTotals(task)

  return (
    <div className="border rounded-lg px-4 py-3 flex flex-col gap-3 bg-background">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex items-start justify-between gap-2 text-left"
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-semibold truncate">#{task.keycrmOrderId}</span>
          {task.keycrmManager && (
            <span className="text-xs text-muted-foreground truncate">{task.keycrmManager}</span>
          )}
          {task.plannedShipDate && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Truck size={11} />
              <b className="text-foreground">{formatDate(task.plannedShipDate)}</b>
            </span>
          )}
        </div>
        <div className='flex items-center gap-2'>
          {task.brandingTypes.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {task.brandingTypes.map(type => (
                <span key={type} className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                  {BRANDING_LABELS[type]}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
            <span className="text-xs tabular-nums">{totalDone} / {totalQty} шт</span>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </div>
      </button>

      <ProgressBar done={totalDone} total={totalQty} size="md" />

      <PackImages images={task.attachedFiles} />

      {task.subcontractorTasks.length > 0 && (
        <div className="flex flex-col gap-1">
          {task.subcontractorTasks.map(st => (
            <div key={st._id} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Factory size={11} className="shrink-0" />
              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium shrink-0">
                {SUBCONTRACTOR_TYPE_LABELS[st.type]}
              </span>
              <span>{formatDate(st.expectedSentDate)} – {formatDate(st.expectedReturnDate)}</span>
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <div className="flex flex-col gap-2 border-t pt-2.5">
          {task.subTasks.length === 0 && (
            <p className="text-xs text-muted-foreground">Немає товарів</p>
          )}
          {task.subTasks.map(subTask => (
            <PackSubTaskRow
              key={subTask._id}
              subTask={subTask}
              packagingTaskId={task._id}
              completedQty={subTask.productionOrderItemId ? completedByItem(task, subTask.productionOrderItemId) : 0}
              defectQty={subTask.productionOrderItemId ? defectByItem(task, subTask.productionOrderItemId) : 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
