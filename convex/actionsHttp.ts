import { httpAction } from "./_generated/server";
import { keyRequest } from '../src/utils/index';
import { type StoreMovements } from "./schema";

const processingIcoming = async ({ orderId, menegerId }:{ orderId: number, menegerId?: number }) => {
  const getCrmOrder = await keyRequest(`/order/${orderId}`, 'get', {
    include: "products.offer,manager,tags,shipping,custom_fields",
  });
  const data = await getCrmOrder.json();
  const { products, manager, shipping, id } = data;

  const movements: Array<Omit<StoreMovements, '_id' | '_creationTime'>> = await Promise.all(products.map( async (product: any) => {
    const parentProduct = await keyRequest(`/product/${product.parentId}`, 'get');
    return {
      orderId: id,
      productSku: product.sku,
      productName: product.name,
      orderShippingDate: shipping.date,
      productQuantity: product.quantity,
      manager: `${manager.firstName} ${manager.lastName}`,
    }
  }))
  return data;
}

export const checkIncomnigVerify = httpAction(async (ctx, request) => {
  const body = await request.json();
  const ua = request.headers.get("user-agent");
  if (ua !== 'KeyCRM webhooks v1.0') return new Response("Unauthorized", { status: 401 });
  console.log("Webhook payload:", body);
  console.log("User-Agent:", ua);
  const startProcessing = await processingIcoming({ orderId: 1026 });
  console.log("🚀 ~ startProcessing:", startProcessing)

  return new Response("OK", { status: 200 });
});
