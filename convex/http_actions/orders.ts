import { keyRequest } from "../../src/utils";
import { api } from "../_generated/api";
import { action } from "../_generated/server";

export const getOrdersKeyCrm = action({
  handler: async (ctx) => {
    const res = await keyRequest(`/order/${1198}`, 'get', {
    include: "products.offer,assigned,tags,shipping,custom_fields",
  })
    const data = await res.json();
    console.log("🚀 ~ data:", data)
    await ctx.runMutation(api.queries.orders.getCRMOrders, {
      externalData: data ?? {},
    })
    return data;
  }
})