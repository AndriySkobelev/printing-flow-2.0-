import { WorkloadCalendar, type WorkloadDay } from '@/components/workload-calendar'

function makeDate(offsetDays: number) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

const DEMO_DATA: WorkloadDay[] = [
  { date: makeDate(-6), load: { cutting: 80, sewing: 60, branding: 40, packaging: 20, subcontractor: 0  } },
  { date: makeDate(-5), load: { cutting: 90, sewing: 75, branding: 55, packaging: 30, subcontractor: 50 } },
  { date: makeDate(-4), load: { cutting: 70, sewing: 80, branding: 95, packaging: 45, subcontractor: 60 } },
  { date: makeDate(-3), load: { cutting: 50, sewing: 65, branding: 70, packaging: 85, subcontractor: 40 } },
  { date: makeDate(-2), load: { cutting: 30, sewing: 50, branding: 60, packaging: 90, subcontractor: 30 } },
  { date: makeDate(-1), load: { cutting: 20, sewing: 40, branding: 35, packaging: 75, subcontractor: 20 } },
  { date: makeDate(0),  load: { cutting: 65, sewing: 55, branding: 80, packaging: 60, subcontractor: 70 } },
  { date: makeDate(1),  load: { cutting: 85, sewing: 70, branding: 45, packaging: 40, subcontractor: 55 } },
  { date: makeDate(2),  load: { cutting: 95, sewing: 85, branding: 30, packaging: 25, subcontractor: 80 } },
  { date: makeDate(3),  load: { cutting: 60, sewing: 90, branding: 20, packaging: 15, subcontractor: 35 } },
  { date: makeDate(4),  load: { cutting: 40, sewing: 75, branding: 65, packaging: 50, subcontractor: 25 } },
  { date: makeDate(5),  load: { cutting: 25, sewing: 55, branding: 75, packaging: 70, subcontractor: 45 } },
  { date: makeDate(6),  load: { cutting: 15, sewing: 35, branding: 85, packaging: 80, subcontractor: 60 } },
]

export default function Workload() {
  return (
    <div className="flex flex-col p-4 gap-4">
      <div>
        <h1 className="text-xl font-semibold">Завантаженість виробництва</h1>
        <p className="text-sm text-muted-foreground">Завантаженість відділів по днях</p>
      </div>

      <WorkloadCalendar data={DEMO_DATA} />
    </div>
  )
}