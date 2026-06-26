import { useContext } from 'react'
import { type HeaderObject } from 'simple-table-core'
import { Ellipsis, Trash2, SquarePen, Timer } from 'lucide-react'
import { type Id } from 'convex/_generated/dataModel'
import { ROLE_LABELS, type UserRole } from '@/constants/roles'
import { DialogContext } from '@/contexts/dialog'
import { MyPopover } from '@/components/my-popover'
import AppTable from '@/components/ui/app-table'
import UserAvatar from '@/components/UserAvatar'
import EditUserForm, { type EditUserFormType } from './forms/edit-user-form'
import SeamstressForm from './forms/seamstress-form'
import { useGetAllUsers, useUpdateUser, useDeleteUser } from './queries'

const FORM_ID = 'edit-user-form'
const SEAMSTRESS_FORM_ID = 'seamstress-form'

type DevelopingEntry = { specificationId: Id<'specifications'>; developingTime: number }

type UserRow = {
  _id: Id<'users'>
  name?: string
  lastName?: string
  email?: string
  phone?: string
  role?: string
  birthday?: string
  workHours?: number
  startDate?: string
  image?: string
  developingSpecification?: DevelopingEntry[]
}

function ActionsCell({
  row,
  onEdit,
  onSeamstress,
}: {
  row: UserRow
  onEdit: (row: UserRow) => void
  onSeamstress: (row: UserRow) => void
}) {
  const { mutate: deleteUser } = useDeleteUser()
  return (
    <div className="flex flex-col">
      <div
        onClick={() => onEdit(row)}
        className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded text-sm"
      >
        <SquarePen size={12} /> Редагувати
      </div>
      {row.role === 'seamstress' && (
        <div
          onClick={() => onSeamstress(row)}
          className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded text-sm"
        >
          <Timer size={12} /> Час виготовлення
        </div>
      )}
      <div
        onClick={() => deleteUser({ id: row._id })}
        className="flex items-center gap-2 cursor-pointer hover:bg-red-50 text-red-500 p-2 rounded text-sm"
      >
        <Trash2 size={12} /> Видалити
      </div>
    </div>
  )
}

export default function UsersTable() {
  const { data, isLoading } = useGetAllUsers()
  const { mutate: updateUser } = useUpdateUser()
  const { openDialog, closeDialog } = useContext(DialogContext)

  const handleSeamstress = (row: UserRow) => {
    openDialog({
      title: 'Час виготовлення специфікацій',
      formId: SEAMSTRESS_FORM_ID,
      withForm: true,
      content: (
        <SeamstressForm
          formId={SEAMSTRESS_FORM_ID}
          userId={row._id}
          existing={row.developingSpecification}
          onSuccess={() => closeDialog()}
        />
      ),
    })
  }

  const handleEdit = (row: UserRow) => {
    openDialog({
      title: 'Редагувати користувача',
      formId: FORM_ID,
      withForm: true,
      content: (
        <EditUserForm
          formId={FORM_ID}
          defaultValues={{
            name:      row.name      ?? '',
            lastName:  row.lastName  ?? '',
            phone:     row.phone     ?? '',
            birthday:  row.birthday  ?? '',
            workHours: row.workHours,
            startDate: row.startDate ?? '',
            role:      row.role as UserRole | undefined,
          }}
          onSubmit={(values: EditUserFormType) => {
            updateUser(
              { id: row._id, data: { ...values, role: values.role as UserRole | undefined } },
              { onSuccess: () => closeDialog() },
            )
          }}
        />
      ),
    })
  }

  const headers: HeaderObject[] = [
    {
      accessor: 'name',
      label: 'Користувач',
      width: 220,
      type: 'other',
      cellRenderer: ({ row }: any) => (
        <UserAvatar name={row.name} lastName={row.lastName} image={row.image} size="sm" showName />
      ),
    },
    {
      accessor: 'email',
      label: 'Email',
      width: 200,
      type: 'string',
    },
    {
      accessor: 'phone',
      label: 'Телефон',
      width: 130,
      type: 'string',
    },
    {
      accessor: 'role',
      label: 'Роль',
      width: 130,
      type: 'other',
      cellRenderer: ({ row }: any) => (
        <span>{row.role ? (ROLE_LABELS[row.role as UserRole] ?? row.role) : '—'}</span>
      ),
    },
    {
      accessor: 'birthday',
      label: 'День народження',
      width: 140,
      type: 'string',
    },
    {
      accessor: 'workHours',
      label: 'Робочі години',
      width: 150,
      type: 'string',
    },
    {
      accessor: 'startDate',
      label: 'Дата початку',
      width: 130,
      type: 'string',
    },
    {
      accessor: '',
      label: '',
      width: 50,
      type: 'other',
      pinned: 'right',
      cellRenderer: ({ row }: { row: any }) => (
        <MyPopover
          trigger={<Ellipsis className="cursor-pointer" size={14} />}
          content={<ActionsCell row={row} onEdit={handleEdit} onSeamstress={handleSeamstress} />}
        />
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4 p-4">
      <AppTable
        rows={data ?? []}
        isLoading={isLoading}
        defaultHeaders={headers}
        getRowId={({ row }) => row._id}
      />
    </div>
  )
}