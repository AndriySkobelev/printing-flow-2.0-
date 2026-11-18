import { v } from 'convex/values'
import { action } from '../_generated/server'
import { internal } from '../_generated/api'

const API_URL = 'https://opendatabot.com/api/v4'

type Usr       = {
  fullName?: string
  shortName?: string
  ceoName?: string
  location?: string
  primaryActivity?: string
  status?: string
  registrationDate?: string
}
type OdbResponse = {
  code?: string
  fullName?: string
  companyName?: string
  USR?: Usr
  taxes?: Record<string, unknown>
  singleTax?: Record<string, unknown>
  vat?: Record<string, unknown>
  whiteList?: Record<string, unknown>
}

type Fetched = { status: 'found'; data: OdbResponse } | { status: 'not_found' } | { status: 'error'; message: string }

const ERRORS: Record<number, string> = {
  402: 'Opendatabot: підписка закінчилась або вичерпано ліміт запитів',
  403: 'Opendatabot: ключ API недійсний або не дає доступу',
}

const fetchRegistry = async (kind: 'company' | 'fop', code: string, apiKey: string): Promise<Fetched> => {
  const res = await fetch(`${API_URL}/${kind}/${code}?apiKey=${encodeURIComponent(apiKey)}`)
  if (res.ok) return { status: 'found', data: await res.json() }
  // 400 — the code isn't one of this kind (e.g. a 10-digit ІПН asked as company).
  if (res.status === 404 || res.status === 400) return { status: 'not_found' }
  return { status: 'error', message: ERRORS[res.status] ?? `Opendatabot: помилка ${res.status}` }
}

// Registration of an ЄДРПОУ / ІПН: looked up as a company first, as a ФОП
// only when no company has the code.
export const lookupRegistration = action({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    await ctx.runQuery(internal.queries.roles.checkPage, { page: '/app/order-processing' })
    const apiKey = process.env.OPEN_BOT_API_KEY
    if (!apiKey) return { status: 'error' as const, message: 'Не задано ключ Opendatabot' }

    const clean = code.replace(/\s/g, '')
    if (!/^\d{8,10}$/.test(clean)) return { status: 'error' as const, message: 'Код має містити 8–10 цифр' }

    let kind: 'company' | 'fop' = 'company'
    let result = await fetchRegistry('company', clean, apiKey)
    if (result.status === 'not_found') {
      kind   = 'fop'
      result = await fetchRegistry('fop', clean, apiKey)
    }
    if (result.status !== 'found') return result

    const { data } = result
    return {
      status:           'found' as const,
      kind,
      code:             data.code ?? clean,
      name:             (kind === 'company' ? data.USR?.shortName ?? data.companyName ?? data.USR?.fullName : data.fullName ?? data.USR?.fullName) ?? '—',
      fullName:         data.USR?.fullName ?? null,
      registryStatus:   data.USR?.status ?? null,
      registrationDate: data.USR?.registrationDate ?? null,
      address:          data.USR?.location ?? null,
      primaryActivity:  data.USR?.primaryActivity ?? null,
      ceoName:          data.USR?.ceoName ?? null,
      // Tax blocks exactly as the API returns them — whichever are present.
      taxes: Object.fromEntries(
        (['taxes', 'singleTax', 'vat', 'whiteList'] as const)
          .filter(key => data[key] != null)
          .map(key => [key, data[key] as Record<string, unknown>]),
      ),
    }
  },
})
