import { Suspense, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { combineDataToWeek } from "@/lib/utils";
import { format, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { DotIcon, InfoIcon } from "lucide-react";
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


const Header = () => {
  const { user } = useAuth();
  console.log('user.image', user?.image)
  return (
    <div className="flex items-center gap-2 py-4">
      <img src={`${user?.image}`} className="rounded-4xl" width={40} />
      <span>{user?.name}</span>
    </div>
  );
}



type ProductsType = Pick<ShiftReportsType, 'products'>['products'][number] & {
  name: string,
  color: string,
  size: string
  style?: string
}
type ProductsNewType = { products: ProductsType[]}
type ReportNewType = Omit<ShiftReportsType, 'products'> & ProductsNewType
type ReportDetailProps = {
  data:ReportNewType
}

const ReportDetail = ({ data }: ReportDetailProps) => {
  return (
    <div className="text-primary/70">
      {data.products.map((product) => (
        <>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-primary/80">{product?.name}</span>
              <div className="flex text-xs items-center">
                <span>{product?.color}</span>
                <DotIcon size={12}/>
                <span>{product?.size}</span>
              </div>
            </div>
            <div className='flex gap-1 items-center text-primary/60'>
              <span >{`x${product.quantity}`}</span>
              <span>{`/`}</span>
              <span className='text-sm'>{`${product?.price} грн`}</span>
              <span>{` = `}</span>
              <span className='text-sm'>{product?.price * product.quantity}{` грн`}</span>
            </div>
          </div>
          <Separator.Root className='w-full h-px bg-primary/10 my-4' />
        </>
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

const ListOfWeeks = ({ data, isLoading, openDialog, calendarDate }: ListOfWeeksPropsType) => {
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
                      <span>x{report.allProductsQuantity}</span>
                      <span className="flex gap-2 items-center">
                        {report.income}грн
                        <InfoIcon size={20}/>
                      </span>
                    </div>
                  ))
                }
                {
                  week.data.length === 0
                  ? null
                  : (
                    <>
                      <Divider />
                      <div className="flex self-end gap-2">
                        <span>Загальна сумма:</span>
                        <span className="text-md">{week.data.reduce((prev, curr) => prev + curr.income, 0)} грн</span>
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

const Statistic = () => {
  return (
    <div className="w-full h-30 rounded-md bg-primary/20">

    </div>
  );
}

export const Seamstress = () => {
  const [calendarDate, setCalendarDate] = useState<number>(new Date().valueOf());
  const { user, isLoading: isUserLoading } = useAuth();
  const { data, isLoading } = useQuery({
    ...convexQuery(
      api.queries.shift_reports.getShiftReportsByUser,
      {
        userId: user?._id ?? '',
        startMonth: startOfMonth(new UTCDate(calendarDate)).valueOf(),
        endMonth: endOfMonth(new UTCDate(calendarDate)).valueOf()
      }
    ),
    enabled: !!user?._id
  })
  const { mutate: createReport } = useCreateReport();
  const { openDialog, closeDialog } = useContext(DialogContext)

  const handleSubmit = (values: any) => {
    createReport({ ...values, userId: user._id })
    closeDialog();
  }

  const handleAddProducts = () => {
    openDialog({
      title: 'Додайте вироби',
      content: <WorkPerformedForm
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

  return (
    <div className="py-2 px-2">
      <Header/>
      <Statistic/>
      <div className="flex justify-end mt-4">
        <DatePicker onChange={handleSetDate} triggerMode="iconText"/>
      </div>
      <div>
        <ListOfWeeks
          data={data ?? []}
          isLoading={isLoading}
          openDialog={openDialog}
          calendarDate={calendarDate}/>
      </div>
      <Button className="w-full" type="button" onClick={handleAddProducts}>Додати вироби</Button>
    </div>
  );
};

export default Seamstress;