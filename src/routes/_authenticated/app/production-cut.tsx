import { createFileRoute } from '@tanstack/react-router'
import { ConvexHttpClient } from "convex/browser";
import ProductionCut from '@/route-components/production-cut'
import { api } from 'convex/_generated/api';

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);

export const Route = createFileRoute('/_authenticated/app/production-cut')({
  beforeLoad: async () => {
    await convex.action(api.http_actions.orders.getOrdersKeyCrm)
  },
  component: ProductionCut,
})
