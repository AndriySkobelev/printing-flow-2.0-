import { type Id } from '../_generated/dataModel'

const fileName = (prefix: string, orderNumber: string) =>
  `${prefix}_${orderNumber.trim() || 'бн'}`.replace(/[\\/:*?"<>|\s]+/g, '-')

export const invoiceFileName = (orderNumber: string) => fileName('Рахунок', orderNumber)
export const waybillFileName = (orderNumber: string) => fileName('Видаткова', orderNumber)

// Storage URLs carry no file name, so PDFs are served through the `/pdf/` http
// route, whose last path segment becomes the name the browser saves it under.
export const pdfUrl = (storageId: Id<'_storage'>, name: string) =>
  `${process.env.CONVEX_SITE_URL}/pdf/${storageId}/${encodeURIComponent(name)}.pdf`
