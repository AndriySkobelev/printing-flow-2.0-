import { lazy } from 'react';
import { createFormHook, createFormHookContexts } from '@tanstack/react-form';
// components
const FormTextField = lazy(() => import('./text-field'));
const FormSelect = lazy(() => import('./select/form-select'));
const FormAsyncSelect = lazy(() => import('./select/async-select'));
const FormCreatableSelect = lazy(() => import('./select/creatable-select'));
const FormButton = lazy(() => import('./from-button'));
const InputDate = lazy(() => import('./input-date'));

export const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    InputDate,
    FormSelect,
    FormTextField,
    FormAsyncSelect,
    FormCreatableSelect
  },
  formComponents: {
    FormButton
  },
})