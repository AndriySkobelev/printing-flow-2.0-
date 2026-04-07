import { ActionCtx, httpAction } from "../_generated/server";
import { internal } from '../_generated/api'
import { path, flatten } from 'ramda';
import { keyRequest } from '../../src/utils/index';
import type { StoreMovements } from "../schema";

const makeMovemets = <T extends { fabricId: string, materialId: string, itemsQuantity: number, quantity: number, productInfo: Array<string> },> (data: Array<T>) => {
  const dataStored = new Map();
  const combineData = data.map((item: T) => {
    const id = item.fabricId || item.materialId;
    if (dataStored.has(id)) {
      const findItem = dataStored.get(id);
      const updatedItem = {
        ...item,
        quantity: findItem.quantity + item.quantity,
        productInfo: [...findItem.productInfo, ...item.productInfo],
      }
      dataStored.set(id, updatedItem);
      return updatedItem;
    }
    dataStored.set(id, item);
    return item;
  });
  const getterData = Array.from(dataStored.values());
  return getterData;
}

const processingIcoming = async ({ ctx, orderId, menegerId }:{ ctx: ActionCtx, orderId: number, menegerId?: number }) => {
  const getCrmOrder = await keyRequest(`/order/${orderId}`, 'get', {
    include: "products.offer,manager,tags,shipping,custom_fields",
  });
  
  const data = await getCrmOrder.json();
  const { products, manager, shipping, id } = data;
  const filterByShipment = products.filter((product: any) => product.shipment_type === 'manufacturing');

  const materials = await Promise.all(filterByShipment.map(async (product: any) => {
    const productSizeObj = product.properties.find((el: { name: string, value: string }) => el.name === 'розмір');
    const productSize = productSizeObj ? productSizeObj.value : 'undefined';
    const productData = await ctx.runQuery(internal.queries.products.getProductsBySku, { sku: product.sku });
    if (!productData) return null;
    const productMaterials = path(['materials'], productData);
    const parentMaterials = path(['parentData', 'materials'], productData) as Array<any>;
    
    let finalMaterilas = parentMaterials.map((material) => ({
        ...material,
        orderId: id,
        type: 'reserve',
        productQuantity: product.quantity,
        quantity: material.quantity * product.quantity,
        manager: `${manager.first_name} ${manager.last_name}`,
        orderShippingDate: shipping['shipping_date_actual'] || '',
        productInfo: [`${productSize}|${product.quantity}|${material.quantity * product.quantity}`],
    }));

    if (productMaterials && productMaterials.length > 0) {
      finalMaterilas = parentMaterials.map((parent) => {
        //шукаю перезаписуючий матеріал для батьківського матеріалу, якщо він є, якщо ні - залишаю батьківський матеріал
        const findOverwriteMaterilal = productMaterials?.find((el: any) =>
          parent.fabricId
            ? parent.fabricId === el.overwriteMaterialId
            : parent.materialId === el.overwriteMaterialId
        );
        const quantity = (findOverwriteMaterilal?.multiplier ? parent.quantity * findOverwriteMaterilal.multiplier : parent.quantity) * product.quantity;
        if (findOverwriteMaterilal) {
          return {
            ...parent,
            ...findOverwriteMaterilal,
            quantity,
            orderId: id,
            type: 'reserve',
            productQuantity: product.quantity,
            manager: `${manager.first_name} ${manager.last_name}`,
            orderShippingDate: shipping['shipping_date_actual'] || '',
            productInfo: [`${productSize}|${product.quantity}|${quantity}`],
          }
        }
        return {
          ...parent,
          quantity,
          orderId: id,
          type: 'reserve',
          productQuantity: product.quantity,
          manager: `${manager.first_name} ${manager.last_name}`,
          orderShippingDate: shipping['shipping_date_actual'] || '',
          productInfo: [`${productSize}|${product.quantity}|${quantity}`],
        };
      });
    };
    return finalMaterilas;
  }));
  
  const flattenMaterials = flatten(materials);
  const makedMovements = makeMovemets(flattenMaterials);
  for (const movement in makedMovements) {
    await ctx.runMutation(internal.queries.movements.createIncomingInternal, makedMovements[movement] as StoreMovements);
  }

  return data;
}

export const checkIncomnigVerify = httpAction(async (ctx, request) => {
  const body = await request.json();
  const ua = request.headers.get("user-agent");
  // if (ua !== 'KeyCRM webhooks v1.0') return new Response("Unauthorized", { status: 401 });
  console.log("Webhook payload:", body);
  console.log("User-Agent:", ua);
  const startProcessing = await processingIcoming({ ctx, orderId: body.context.id });
  console.log("🚀 ~ startProcessing:", startProcessing)

  return new Response("OK", { status: 200 });
});
