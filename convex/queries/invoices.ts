import { v } from 'convex/values'
import { mutation, query, type MutationCtx, type QueryCtx } from '../_generated/server'
import { type Doc, type Id } from '../_generated/dataModel'
import { UTCDate } from '@date-fns/utc'
import { invoicesSchema } from '../schema'
import { requirePage } from './roles'

const PAGE = '/app/order-processing'

const { searchText: _searchText, createdBy: _createdBy, updatedAt: _updatedAt, invoiceFileId: _invoiceFileId, ...invoiceFields } = invoicesSchema

const buildSearchText = (data: { orderNumber: string; payer: { name: string; code: string }; recipient: { name: string; code: string }; contract: string }) =>
  [data.orderNumber, data.payer.name, data.payer.code, data.recipient.name, data.recipient.code, data.contract].join(' ')

const waybillsOf = (ctx: QueryCtx, invoiceId: Id<'invoices'>) =>
  ctx.db.query('waybills').withIndex('by_invoice_orderNumber', q => q.eq('invoiceId', invoiceId)).collect()

const withFileUrls = async (ctx: QueryCtx, invoice: Doc<'invoices'>) => ({
  ...invoice,
  invoiceUrl: invoice.invoiceFileId ? await ctx.storage.getUrl(invoice.invoiceFileId) : null,
  waybills:   await Promise.all((await waybillsOf(ctx, invoice._id)).map(async waybill => ({
    _id:         waybill._id,
    orderNumber: waybill.orderNumber,
    date:        waybill.date,
    url:         await ctx.storage.getUrl(waybill.fileId),
  }))),
})

// Invoices matching the text (order number, payer, recipient, contract).
export const searchInvoices = query({
  args: { search: v.string() },
  handler: async (ctx, { search }) => {
    await requirePage(ctx, PAGE)
    const text = search.trim()
    if (!text) return []
    const invoices = await ctx.db.query('invoices').withSearchIndex('search_text', q => q.search('searchText', text)).take(20)
    return Promise.all(invoices.map(invoice => withFileUrls(ctx, invoice)))
  },
})

// The saved invoice for an order number — opened from a KeyCRM order link.
export const getInvoiceByOrderNumber = query({
  args: { orderNumber: v.string() },
  handler: async (ctx, { orderNumber }) => {
    await requirePage(ctx, PAGE)
    const invoice = await ctx.db.query('invoices').withIndex('by_orderNumber', q => q.eq('orderNumber', orderNumber.trim())).order('desc').first()
    return invoice ? withFileUrls(ctx, invoice) : null
  },
})

export const generateInvoiceUploadUrl = mutation({
  handler: async (ctx) => {
    await requirePage(ctx, PAGE)
    return ctx.storage.generateUploadUrl()
  },
})

const replaceFile = async (ctx: MutationCtx, previous: Id<'_storage'> | undefined, next: Id<'_storage'>) => {
  if (previous && previous !== next) await ctx.storage.delete(previous)
}

// Saves the form with the invoice PDF just generated — a new invoice, or the
// one opened from the saved list (its earlier invoice file is replaced).
export const saveInvoice = mutation({
  args: {
    id:        v.optional(v.id('invoices')),
    storageId: v.id('_storage'),
    ...invoiceFields,
  },
  handler: async (ctx, { id, storageId, ...data }) => {
    const me = await requirePage(ctx, PAGE)
    const fields = { ...data, searchText: buildSearchText(data), updatedAt: new UTCDate().valueOf(), invoiceFileId: storageId }

    const existing = id ? await ctx.db.get(id) : null
    if (!existing) return ctx.db.insert('invoices', { ...fields, createdBy: me._id })

    await ctx.db.patch(existing._id, fields)
    await replaceFile(ctx, existing.invoiceFileId, storageId)
    return existing._id
  },
})

// A waybill of a saved invoice, from the form as it is now — the invoice's own
// data stays as last saved. One per order number: the same number replaces it.
export const saveWaybill = mutation({
  args: {
    invoiceId:   v.id('invoices'),
    storageId:   v.id('_storage'),
    orderNumber: v.string(),
    date:        v.number(),
    lines:       invoicesSchema.lines,
    total:       v.number(),
  },
  handler: async (ctx, { invoiceId, storageId, ...data }) => {
    const me = await requirePage(ctx, PAGE)
    if (!await ctx.db.get(invoiceId)) throw new Error('Рахунок не знайдено')
    const fields = { ...data, fileId: storageId, updatedAt: new UTCDate().valueOf() }

    const existing = await ctx.db
      .query('waybills')
      .withIndex('by_invoice_orderNumber', q => q.eq('invoiceId', invoiceId).eq('orderNumber', data.orderNumber))
      .first()
    if (!existing) return ctx.db.insert('waybills', { ...fields, invoiceId, createdBy: me._id })

    await ctx.db.patch(existing._id, fields)
    await replaceFile(ctx, existing.fileId, storageId)
    return existing._id
  },
})

// The invoice with its PDF and its waybills.
export const deleteInvoice = mutation({
  args: { id: v.id('invoices') },
  handler: async (ctx, { id }) => {
    await requirePage(ctx, PAGE)
    const invoice = await ctx.db.get(id)
    if (!invoice) return
    for (const waybill of await waybillsOf(ctx, id)) {
      await ctx.storage.delete(waybill.fileId)
      await ctx.db.delete(waybill._id)
    }
    if (invoice.invoiceFileId) await ctx.storage.delete(invoice.invoiceFileId)
    await ctx.db.delete(id)
  },
})
