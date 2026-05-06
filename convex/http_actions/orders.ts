import { keyRequest, getAttaches } from "../../src/utils";
import { api } from "../_generated/api";
import { action, httpAction } from "../_generated/server";

export const getOrdersKeyCrm = action({
  handler: async (ctx) => {
    const res = await keyRequest(`/order/${1216}`, 'get', {
    include: "products.offer,assigned,tags,shipping,custom_fields,manager",
  })
    const data = await res.json();
    console.log("🚀 ~ data:", data?.custom_fields)
    await ctx.runMutation(api.queries.orders.creatreProductionTask, {
      externalData: data ?? {},
    })
    return data;
  }
})

export const brandingOrder = action(async (ctx) => {
  const res = await keyRequest(`/order`, 'get', {
    limit: 150,
    page: 1,
    include: "products.offer,assigned,tags,shipping,custom_fields,manager",
    sort: 'id',
    "filter[status_id]": 24,
    })
  const orders = await res.json();
  for (const order of orders?.data || []) {
    const attachedFiles = await getAttaches(order.id)
    await ctx.runMutation(api.queries.orders.creatreProductionTask, {
      externalData: order ?? {},
      attachedFiles: attachedFiles ?? [],
    })
  }

  return null;
});