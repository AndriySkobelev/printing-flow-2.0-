import { v } from 'convex/values'
import { query, mutation } from '../_generated/server'
import { keyRequest } from '../../src/utils'

export const getCRMOrders = query({
  handler: async (ctx) => {
    const res = await keyRequest('/orders', 'get', {})
    console.log("🚀 ~ res:", res)
    const data = await res.json()
    return data
  }
})