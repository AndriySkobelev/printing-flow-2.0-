import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type SpecificationFormType } from '../forms/create-specification'

export type SpecificationDraft = {
  id: string,
  updatedAt: number,
  values: Partial<SpecificationFormType>,
}

const hasDraftContent = (values: Partial<SpecificationFormType>) => {
  if (values.name?.trim() || values.category?.trim() || values.skuPrefix?.trim()) return true
  return (values.materials || []).some((material) => !!material.id)
}

type SpecificationDraftsStore = {
  drafts: Record<string, SpecificationDraft>,
  saveDraft: (id: string, values: Partial<SpecificationFormType>) => void,
  removeDraft: (id: string) => void,
}

export const useSpecificationDraftsStore = create<SpecificationDraftsStore>()(
  persist(
    (set) => ({
      drafts: {},

      saveDraft: (id, values) =>
        set((s) => {
          if (!hasDraftContent(values)) {
            const { [id]: _removed, ...rest } = s.drafts
            return { drafts: rest }
          }
          return { drafts: { ...s.drafts, [id]: { id, updatedAt: Date.now(), values } } }
        }),

      removeDraft: (id) =>
        set((s) => {
          const { [id]: _removed, ...rest } = s.drafts
          return { drafts: rest }
        }),
    }),
    { name: 'specification-drafts' }
  )
)
