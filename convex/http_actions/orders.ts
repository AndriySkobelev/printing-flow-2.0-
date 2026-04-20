import { keyRequest } from "../../src/utils";
import { api } from "../_generated/api";
import { action } from "../_generated/server";

export const getOrdersKeyCrm = action({
  handler: async (ctx) => {
    const res = await keyRequest('/orders', 'get')
    const data = await res.json();
    // await ctx.runMutation(api, {})
    return data;
  }
})