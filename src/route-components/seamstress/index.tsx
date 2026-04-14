import { Suspense, useContext, useEffect, useMemo, useState } from "react";
import { combineDataToWeek } from "@/lib/utils";
import { format, isWithinInterval, startOfMonth, endOfMonth, sub } from "date-fns";
import { DotIcon, InfoIcon, StepForward } from "lucide-react";
import clsx from "clsx";
import {ShiftReportsType} from 'convex/schema'
import { UTCDate } from '@date-fns/utc'
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { pick } from "ramda";
import { Separator } from "radix-ui";
import Divider from "@/components/ui/divider";
import WorkPerformedForm from './forms/work-performed'
import { DialogContext } from "@/contexts/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth-hooks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateReport } from "./queries";
import { Spinner } from "@/components/ui/spinner";
import { DatePicker } from "@/components/ui/data-picker";
import { Id } from "convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import NewForm from "./forms/new-form";
import { ProductItem, ProductItemInfo } from "./components/products-list";

const Header = () => {
  const { user } = useAuth();
  return (
    <div className="flex items-start gap-2">
      <img src={`${user?.image}`} className="rounded-4xl" width={40} />
      <div className="flex flex-col text-sm">
        <span className="text-md">{user?.name}</span>
        <span className="text-primary/50">Admin</span>
      </div>
    </div>
  );
}

type ProductsType = Pick<ShiftReportsType, 'products'>['products'][number] & {
  name?: string,
  color?: string,
  size?: string
  style?: string
}
type ProductsNewType = { products: ProductsType[]}
type ReportNewType = Omit<ShiftReportsType, 'products'> & ProductsNewType
type ReportDetailProps = {
  data: ShiftReportsType
}

const ReportBaseInfo = ({ name = '?', color = '?', size = '?'}:{ name?: string, color?: string, size?: string}) => (
  <div>
    <span className="text-primary/80">{name}</span>
    <div className="flex text-xs items-center">
      <span>{color}</span>
      <DotIcon size={12}/>
      <span>{size}</span>
    </div>
  </div>
)

const ReportSideWorkInfo = ({ comment = ''}:{ comment?: string }) => (
  <div className="flex flex-col">
    <span className="text-primary/90">Каст</span>
    <span className="text-primary/60">{comment}</span>
  </div>
)

const ReportDetail = ({ data }: ReportDetailProps) => {
  return (
    <div className="text-primary/70">
      {data.products.map((product) => (
        <ProductItem item={product} />
      ))}
    </div>
  );
}

const findWeek = (data: Omit<ReturnType<typeof combineDataToWeek>, 'data'>, date: number) => {
  const find = data.find(el => isWithinInterval(date, { start: el.start, end: el.end }))
  return find?.weekId;
}

type ListOfWeeksPropsType = {
  isLoading: boolean,
  calendarDate?: number,
  data: ReportNewType[],
  openDialog: (data: any) => void
}

const ListOfWeeks = ({ data, openDialog, calendarDate }: ListOfWeeksPropsType) => {
  const [tab, setTab] = useState<string>('week-1');
  const combined = useMemo(() => combineDataToWeek(data, calendarDate ?? new UTCDate().valueOf()), [calendarDate, data])
  const weeksIds = combined.map(el => pick(['start', 'end', 'weekId', 'weekLabel'], el)) as Omit<ReturnType<typeof combineDataToWeek>, 'data'>

  useEffect(() => setTab(findWeek(weeksIds, calendarDate ?? Date.now()) as string), [calendarDate])

  const handleOpenReport = (report: ReportNewType) => {
    openDialog({
      title: `Звіт за ${format(report?.timeStamp, 'dd/MM/yyyy')}`,
      content: <ReportDetail data={report}/>,
      withForm: false,
      outerClose: false,
      className: 'max-w-[600px]',
    });
  }

  const handleSetTab = (value: string) => setTab(value);
  return (
    <Suspense fallback={<div><Spinner/></div>}>
      <div className="flex justify-center mt-4 min-h-[62vh] text-primary/50">
        <Tabs defaultValue='week-1' value={tab}>
          <TabsList>
            {weeksIds.map((week, i) => (
              <TabsTrigger key={i} value={week['weekId']} onClick={() => handleSetTab(week['weekId'])} >{week['weekLabel']}</TabsTrigger>
            ))}
          </TabsList>
          {combined.map((week) => (
            <TabsContent value={week.weekId} className={clsx("flex w-full", week.data.length === 0 ? 'flex justify-center items-center' : '')} >
              <div
                className={clsx("flex flex-col gap-5 w-full", data.length === 0 ? 'flex justify-center items-center' : '')}
              >
                <ScrollArea className="h-[60vh]">
                  <div className="flex flex-col gap-2 w-full" >
                    {
                      week.data.length === 0
                      ? <span className="text-center">Ви ще нічого не додали на цей тиждень.</span>
                      : week.data.map((report, i) => (
                        <div
                          key={i}
                          onClick={() => handleOpenReport(report)}
                          className="flex gap-2 justify-between items-center px-2 w-full h-10 rounded-md bg-primary/5"
                        >
                          <span>{format(report.timeStamp, 'dd/MM/yyyy')}</span>
                          <span className="text-black/70">x{report.allProductsQuantity}</span>
                          <span className="flex gap-2 items-center text-black/70">
                            {report.income}грн
                            <InfoIcon size={20}/>
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </ScrollArea>
                {
                  week.data.length === 0
                  ? null
                  : (
                    <>
                      <Divider />
                      <div className="flex self-end gap-2">
                        <span>Загальна сумма:</span>
                        <span className="text-md text-black/70">{week.data.reduce((prev, curr) => prev + curr.income, 0)} грн</span>
                      </div>
                    </>
                  )
                }
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Suspense>
  )
}

const maxIncome = 100000
const toPercent = (value: number) => (value / maxIncome) * 100

const ProgressBar = ({ prev, curr }: { prev: number | undefined, curr: number | undefined }) => {
  const conditionCurrReverse = curr ? toPercent(curr) >= 79 : false;
  const conditionPrevReverse = prev ? toPercent(prev) <= 10 : false;

  return (
    <div className="w-full h-2 bg-primary/10 rounded-full relative mb-4">
      {
        prev === 0
        ? null
        : (
          <div className="h-full bg-primary/80 rounded-full absolute top-0 z-1" style={{ width: `${prev ? toPercent(prev) : 0}%` }}>
            <div className={clsx("flex gap-1 justify-center items-center absolute -bottom-5 -right-1", conditionPrevReverse ? 'translate-x-full right-2' : 'translate-x-0 right-2')}>
              {
                conditionPrevReverse
                ? <>
                    <div className="-rotate-90 h-fit w-fit">
                      <StepForward size={12} color="#002131"/>
                    </div>
                    <span className="text-xs text-primary/80 w-max">{`${prev} грн`}</span>
                  </>
                : (
                  <>
                    <span className="text-xs text-primary/80 w-max">{`${prev ? `${prev} грн`: ''}`}</span>
                    <div className="-rotate-90 h-fit w-fit">
                      <StepForward size={12} color="#002131"/>
                    </div>
                  </>
                )
              }
            </div>
          </div>
        )
      }
      <div className="h-full bg-[#27e427] rounded-full absolute top-0 z-2 transition-all" style={{ width: `${curr ? toPercent(curr) : 0}%` }}>
        <div className={clsx("flex gap-1 justify-center absolute items-center -top-5 ", conditionCurrReverse ? 'translate-x-0 -right-1' : 'translate-x-full right-2')}>
          {
            conditionCurrReverse
            ? (
              <>
                <span className="text-xs text-[#3abf3a] w-max">{curr} грн</span>
                <div className="rotate-90 h-fit w-fit">
                  <StepForward size={12} color="#27e427"/>
                </div>
              </>
            )
            : (
              curr != 0
              ? <>
                  <div className="rotate-90 h-fit w-fit">
                    <StepForward size={12} color="#27e427"/>
                  </div>
                  <span className="text-xs text-[#3abf3a] w-max">{`${curr ? `${curr} грн`: ''}`}</span>
                </>
              : null
            )
          }
        </div>
      </div>
    </div>
  );
}

type StatisticPropsType = {
  userId: Id<'users'>,
  calendarDate: number,
  handleSetDate: (date: number) => void
}

const Statistic = ({ userId, handleSetDate, calendarDate }: StatisticPropsType) => {
  const dates = {
    prevStartMonth: sub(startOfMonth(new UTCDate(calendarDate)), { months: 1}).valueOf(),
    prevEndMonth: sub(endOfMonth(new UTCDate(calendarDate)), { months: 1}).valueOf(),
    startMonth: startOfMonth(new UTCDate(calendarDate)).valueOf(),
    endMonth: endOfMonth(new UTCDate(calendarDate)).valueOf()
  }
  const reportsIncome = useQuery({
    ...convexQuery(api.queries.shift_reports.getShiftReportsMonthIncome, userId ? { ...dates, userId: userId } : 'skip')
  })

  return (
    <div className="flex flex-col items-start justify-between w-full h-30 rounded-md bg-primary/3 p-2">
      <div className="flex items-start justify-between w-full">
        <Header/>
        <div className="flex justify-end">
          <DatePicker onChange={handleSetDate} triggerMode="iconText" position="end"/>
        </div>
      </div>
      <ProgressBar curr={reportsIncome?.data?.currIncome ?? 0} prev={reportsIncome?.data?.prevIncome ?? 0} />
    </div>
  );
}

export const Seamstress = () => {
  const [calendarDate, setCalendarDate] = useState<number>(new UTCDate().valueOf());
  const { mutate: createReport } = useCreateReport();
  const { openDialog, closeDialog } = useContext(DialogContext)
  const { user, isLoading: isUserLoading } = useAuth();
  const reports = useQuery({
    ...convexQuery(
      api.queries.shift_reports.getShiftReportsByUser,
      user?._id ? {
        userId: user?._id ?? '',
        startMonth: startOfMonth(new UTCDate(calendarDate)).valueOf(),
        endMonth: endOfMonth(new UTCDate(calendarDate)).valueOf()
      } : 'skip'
    )
  })

  const handleSubmit = (values: any) => {
    console.log("🚀 ~ handleSubmit ~ values:", values)
    createReport({ ...values, userId: user?._id })
    closeDialog();
  }

  const handleAddProducts = () => {
    openDialog({
      title: 'Додайте вироби',
      content: <NewForm
        actionSubmit={handleSubmit}
        formId="add-work-performed-form"/>,
      withForm: true,
      outerClose: false,
      className: 'max-w-[600px]',
      formId: 'add-work-performed-form',
    });
  }

  const handleSetDate = (date: number) => {
    setCalendarDate(date)
  }
  console.log('reports', reports?.data)
  return (
    <div className="py-2 px-2">
      <Statistic
        userId={user?._id ?? ''}
        calendarDate={calendarDate}
        handleSetDate={handleSetDate}/>
      <div>
        <ListOfWeeks
          data={reports?.data ?? []}
          openDialog={openDialog}
          calendarDate={calendarDate}
          isLoading={reports?.isLoading ?? true} />
      </div>
      <Button className="w-[95vw] fixed bottom-2 left-1/2 -translate-x-1/2" type="button" onClick={handleAddProducts}>
        Додати вироби
      </Button>
    </div>
  );
};

export default Seamstress;