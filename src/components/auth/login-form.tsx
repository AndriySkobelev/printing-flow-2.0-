import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { revalidateLogic } from '@tanstack/react-form';
// hooks
// components
import { useAppForm } from '@/components/main-form';
// lib
import i18n from '@/lib/i18n';

const loginFormSchema = z.object({
  email: z.email({ message: i18n.t('form.error.emailInvalid') }),
  password: z.string().min(8, { message: i18n.t('form.error.passwordMinLength') }),
});

const LogInForm = ({ actionSubmit }: { actionSubmit: (data: FormData) => void }) => {
  const { t } = useTranslation();
  

  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: loginFormSchema,
    },
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: ({ value }: any) => actionSubmit(value),
  });

  return (
    <div className="flex flex-col gap-4 justify-center items-center h-screen">
      <h1 className="text-2xl font-bold">{t('form.login.title')}</h1>
      <div className="flex flex-col gap-4 w-md">
        <form onSubmit={
          (e) => {
            e.preventDefault();
            form.handleSubmit();
          }
        } method="post">
          <div className="flex flex-col gap-4 w-full">
            <form.AppField
              name="email"
              children={(field) =>
                <field.FormTextField type="email" placeholder={t('form.login.email')} label={t('form.login.email')} />}/>
            <form.AppField
              name="password"
              children={(field) =>
                <field.FormTextField
                type="password"
                label={t('form.login.password')}
                placeholder={t('form.login.password')} />
              }
            />
          </div>
            <form.AppForm>
              <div className="flex justify-end w-full my-4">
                <form.FormButton type="submit" label={t('form.login.submit')} />
              </div>
              <Link to="/register" className='text-sm text-gray-500 text-center'>
                <form.FormButton label={t('form.register.title')} type="button" variant='secondary' />
              </Link>
          </form.AppForm>
        </form>
      </div>
    </div>
  )
}

export default LogInForm;