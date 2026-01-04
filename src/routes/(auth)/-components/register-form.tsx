// components
import { z } from 'zod';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { revalidateLogic } from '@tanstack/react-form';
import { useAppForm } from '@/components/form';
import i18n from '@/lib/i18n';

const registerFormSchema = z.object({
  email: z.email({ message: i18n.t('form.error.emailInvalid') }),
  // dateOfBirth: z.date({ message: i18n.t('form.error.dateOfBirthInvalid') }),
  name: z.string().min(1, { message: i18n.t('form.error.nameMinLength') }),
  // phone: z.string().min(1, { message: i18n.t('form.error.phoneMinLength') }),
  // lastName: z.string().min(1, { message: i18n.t('form.error.lastNameMinLength') }),
  password: z.string().min(8, { message: i18n.t('form.error.passwordMinLength') }),
});

export type FormSchemaType = z.infer<typeof registerFormSchema>;

const RegisterForm = ({ actionSubmit }: { actionSubmit: (data: FormSchemaType) => void }) => {
  const { t } = useTranslation();

  const form = useAppForm({
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: registerFormSchema,
    },
    defaultValues: {
      email: '',
      name: '',
      password: '',
    },
    onSubmit: ({ value }) => actionSubmit(value),
  });

  return ( 
    <div className="flex flex-col gap-4 justify-center items-center h-screen">
      <h1 className="text-2xl font-bold">{t('form.register.title')}</h1>
      <div className="flex flex-col gap-4 w-md">
        <form onSubmit={
          (e) => {
            e.preventDefault();
            form.handleSubmit();
          }
        } method="post">
          <div className="flex flex-col gap-4 w-full">
            <form.AppField
              name="name"
              children={(field) =>
                <field.FormTextField type="text" placeholder={t('form.register.name')} label={t('form.register.name')} />}/>
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
              <form.FormButton label={t('form.register.submit')} type="submit" />
            </div>
            <Link to="/login" className='text-sm text-gray-500 text-center'>
              <form.FormButton label={t('form.login.title')} type="button" variant='secondary' />
            </Link>
          </form.AppForm>
        </form>
      </div>
    </div>
  )
}

export default RegisterForm;