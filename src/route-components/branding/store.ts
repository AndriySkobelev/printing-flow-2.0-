import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Visual-only grouping of order items under a reference image, for the
// "advanced" order-detail view. Nothing here is persisted to the backend —
// it's a local aid for figuring out which products belong to which image
// before branding, including splitting one product's quantity across
// several images (each assignment carries its own quantity).
export type ImageGroupAssignment = {
  id: string
  productItemId: string
  quantity: number
  localCompleteQty: number
}

export type AssignmentsByImage = Record<string, ImageGroupAssignment[]>

// A product's real completedQty (from actual branding logs) is a single
// shared number — logs don't record which image a product's work belongs
// to. localComplete is a manually-set, per-product (not per-split) local
// quantity: the displayed progress is min(realCompletedQty, localCompleteQty),
// so it's capped by the truth from the db but only shown once the user has
// explicitly flagged it here (defaults to 0 — nothing shown — until set).
type BrandingGroupsState = {
  advancedByOrder: Record<string, boolean>
  assignmentsByOrder: Record<string, AssignmentsByImage>
  localCompleteByOrder: Record<string, Record<string, number>>
  setAdvanced: (orderId: string, advanced: boolean) => void
  addAssignment: (orderId: string, imageUrl: string, productItemId: string, quantity: number) => void
  removeAssignment: (orderId: string, imageUrl: string, assignmentId: string) => void
  setLocalComplete: (orderId: string, productItemId: string, localCompleteQty: number) => void
  addAssignmentLocalComplete: (orderId: string, imageUrl: string, assignmentId: string, amount: number) => void
}

export const useBrandingGroupsStore = create<BrandingGroupsState>()(
  persist(
    (set) => ({
      advancedByOrder: {},
      assignmentsByOrder: {},
      localCompleteByOrder: {},

      setAdvanced: (orderId, advanced) =>
        set((s) => ({ advancedByOrder: { ...s.advancedByOrder, [orderId]: advanced } })),

      addAssignment: (orderId, imageUrl, productItemId, quantity) =>
        set((s) => {
          const orderAssignments = s.assignmentsByOrder[orderId] ?? {}
          const list = orderAssignments[imageUrl] ?? []
          return {
            assignmentsByOrder: {
              ...s.assignmentsByOrder,
              [orderId]: {
                ...orderAssignments,
                [imageUrl]: [...list, { id: crypto.randomUUID(), productItemId, quantity, localCompleteQty: 0 }],
              },
            },
          }
        }),

      removeAssignment: (orderId, imageUrl, assignmentId) =>
        set((s) => {
          const orderAssignments = s.assignmentsByOrder[orderId] ?? {}
          const list = orderAssignments[imageUrl] ?? []
          return {
            assignmentsByOrder: {
              ...s.assignmentsByOrder,
              [orderId]: { ...orderAssignments, [imageUrl]: list.filter((a) => a.id !== assignmentId) },
            },
          }
        }),

      setLocalComplete: (orderId, productItemId, localCompleteQty) =>
        set((s) => ({
          localCompleteByOrder: {
            ...s.localCompleteByOrder,
            [orderId]: {
              ...(s.localCompleteByOrder[orderId] ?? {}),
              [productItemId]: Math.max(0, localCompleteQty),
            },
          },
        })),

      addAssignmentLocalComplete: (orderId, imageUrl, assignmentId, amount) =>
        set((s) => {
          const orderAssignments = s.assignmentsByOrder[orderId] ?? {}
          const list = orderAssignments[imageUrl] ?? []
          return {
            assignmentsByOrder: {
              ...s.assignmentsByOrder,
              [orderId]: {
                ...orderAssignments,
                [imageUrl]: list.map((a) =>
                  a.id === assignmentId
                    ? { ...a, localCompleteQty: Math.max(0, a.localCompleteQty + amount) }
                    : a
                ),
              },
            },
          }
        }),
    }),
    { name: 'branding-image-groups' }
  )
)
