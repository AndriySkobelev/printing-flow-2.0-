import { v } from 'convex/values'
import { pick } from 'ramda';
import { query, mutation } from '../_generated/server'
import { keyRequest } from '../../src/utils'

export const getCRMOrders = mutation({
  args: {
    externalData: v.any()
  },
  handler: async (_ctx, args) => {
    const { externalData } = args;
    const pickData = pick([
      'id',
      'tags',
      'products',
      'shipping',
      'status_id',
      'custom_fields',
      'manager_comment'
    ], externalData);
    const products = pickData.products?.map((product: any) => pick([
      'id',
      'sku',
      'comment',
      'quantity',
      'shipment_type',
      'product_status_id',
    ], product));
    console.log("🚀 ~ getCRMOrders args:", args)
    await _ctx.db.insert('orders', {
      orderId: String(externalData?.id),
      externalData: pickData,
      products
    })
    return args.externalData;
  }
})
