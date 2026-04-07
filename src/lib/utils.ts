import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge';
import type {ClassValue} from 'clsx';
import { addDays, lastDayOfMonth, startOfMonth, isWithinInterval, addHours } from 'date-fns'
import { UTCDate } from '@date-fns/utc';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const nowTimestamp = Math.floor(Date.now() / 1000);

export const redirectTo = ({
  pathTo,
  status,
  request,
  context,
  pathname,
}:{
  request?: any,
  context?: any,
  status: number,
  pathTo: string,
  pathname?: string,
}) => {
  return {
    request,
    context,
    pathname,
    response: new Response(null, {
      status,
      headers: {
        Location: pathTo,
      },
    }),
  }
}

export function parseCookies(cookieHeader?: string) {
  console.log("🚀 ~ parseCookies ~ cookieHeader:", cookieHeader)
  if (!cookieHeader) return {}
  return Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, value] = c.trim().split('=')
      return [key, value]
    })
  )
}

export const startEndWeeksDate = (timeStamp: number) => {
  const currDate = timeStamp ?? new UTCDate();
  const startDateOfMonth = startOfMonth(currDate);
  const endDateOfMonth = lastDayOfMonth(currDate);

  const chunks = [];
  let current = startDateOfMonth;

  while (current <= endDateOfMonth) {
    const chunkEnd = addHours(addDays(current, 7), 23);
    chunks.push({
      start: current,
      end: chunkEnd > endDateOfMonth ? endDateOfMonth : chunkEnd,
    });
    current = addDays(current, 8);
  }
  
  return chunks;
};

export const combineDataToWeek = <T,> (data: Array<T & { timeStamp: number }>, calendarDate: number) => {
  const weeks = startEndWeeksDate(calendarDate);
  const combine = weeks.map((week, i) => {
    const filterDataToWeek = data.filter(el => isWithinInterval(el.timeStamp, { start: week.start, end: week.end }))
    return {
      ...week,
      weekId: `week-${i+1}`,
      weekLabel: `Тиждень ${i+1}`,
      data: filterDataToWeek
    }
  })
  console.log("🚀 ~ combineDataToWeek ~ combine:", combine)

  return combine;
}
