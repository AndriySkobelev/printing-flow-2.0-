import { keyRequest, getAttaches } from "../../src/utils";
import { api } from "../_generated/api";
import { action, httpAction } from "../_generated/server";

export const getOrdersKeyCrm = action({
  handler: async (ctx) => {
    const res = await keyRequest(`/order/${1216}`, 'get', {
    include: "products.offer,assigned,tags,shipping,custom_fields,manager",
  })
    const data = await res.json();
    await ctx.runMutation(api.queries.orders.creatreProductionOrder, {
      externalData: data ?? {},
    })
    return data;
  }
})

export const getKeyCrmOrders = action(async (ctx) => {
  const res = await keyRequest(`/order`, 'get', {
    limit: 150,
    page: 1,
    include: "products.offer,assigned,tags,shipping,custom_fields,manager",
    sort: 'id',
    "filter[status_id]": 5,
    })
    const orders = await res.json();
    console.log('orders', orders)
  let linksUpdated = 0
  let linksFailed  = 0
  for (const order of orders?.data || []) {
    const attachedFiles = await getAttaches(order.id)
    await ctx.runMutation(api.queries.orders.creatreProductionOrder, {
      externalData: order ?? {},
      attachedFiles: attachedFiles ?? [],
    })
    const result = await syncOrderProcessingLink(order)
    if (result === 'updated') linksUpdated++
    if (result === 'failed') linksFailed++
  }

  return { linksUpdated, linksFailed };
});

// KeyCRM custom field that links an order to its page here.
const ORDER_LINK_FIELD = 'OR_1020'

const orderProcessingLink = (orderId: number) =>
  `${process.env.APP_URL ?? 'https://dev--liubegolube-production.netlify.app'}/app/order-processing/${orderId}`

// Writes the link into the order's custom field — only when it isn't there yet.
const syncOrderProcessingLink = async (order: { id: number; custom_fields?: Array<{ uuid: string; value: unknown }> }) => {
  const link = orderProcessingLink(order.id)
  if (order.custom_fields?.find(f => f.uuid === ORDER_LINK_FIELD)?.value === link) return 'unchanged'
  const res = await keyRequest(`/order/${order.id}`, 'put', undefined, {
    custom_fields: [{ uuid: ORDER_LINK_FIELD, value: link }],
  })
  if (res.ok) return 'updated'
  console.log('KeyCRM order link update failed', order.id, res.status, await res.text())
  return 'failed'
}