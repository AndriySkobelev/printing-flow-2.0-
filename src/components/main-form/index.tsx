import { lazy } from 'react';
import { createFormHook, createFormHookContexts } from '@tanstack/react-form';
// components
const FormTextField = lazy(() => import('./text-field'));
const FormSelect = lazy(() => import('./form-select'));
const FormButton = lazy(() => import('./from-button'));

export const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    FormTextField,
    FormSelect
  },
  formComponents: {
    FormButton
  },
})