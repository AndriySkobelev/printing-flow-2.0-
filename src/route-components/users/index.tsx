import { useContext } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { type CellClickProps, type HeaderObject } from 'simple-table-core'
import { Trash2, SquarePen, ChevronDown } from 'lucide-react'
import { type Id } from 'convex/_generated/dataModel'
import { SUPER_ADMIN, type UserRole } from '@/constants/roles'
import { getRoleLabel } from '@/constants/page-roles'
import { AuthContext } from '@/contexts/auth'
import { Button } from '@/components/ui/button'
import { MyPopover } from '@/components/my-popover'
import { ActionsMenu } from '@/components/actions-menu'
import AppTable from '@/components/ui/app-table'
import UserAvatar from '@/components/UserAvatar'
import { useGetAllUsers } from './queries'
import { useConfirmDeleteUser } from './actions'
import { ApprovalBadge } from './components/approval-badge'
import { PageAccessEditor, PageAccessSummary } from './components/page-access-editor'

type UserRow = {
  _id: Id<'users'>
  name?: string
  lastName?: string
  email?: string
  phone?: string
  role?: UserRole
  image?: string
  isApproved?: boolean
  allowedPages?: string[]
  rolePages?: string[]
  roleName?: string
}

// Clicking these columns opens the user page; the others hold their own controls.
const NAVIGATE_ACCESSORS = ['name', 'email', 'phone', 'role']

const ActionsCell = ({ row, onOpen }: { row: UserRow; onOpen: (row: UserRow) => void }) => {
  const confirmDelete = useConfirmDeleteUser()
  return (
    <ActionsMenu
      items={[
        { label: 'Відкрити', icon: <SquarePen className="size-3" />, onClick: () => onOpen(row) },
        { label: 'Видалити', icon: <Trash2    className="size-3" />, onClick: () => confirmDelete(row), destructive: true },
      ]}
    />
  )
}

const UsersTable = () => {
  const { data, isLoading } = useGetAllUsers()
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()
  const isSuperAdmin = user?.role === SUPER_ADMIN

  const openUser = (row: UserRow) =>
    navigate({ to: '/app/users/$userId', params: { userId: row._id } })

  const handleCellClick = ({ row, accessor }: CellClickProps) => {
    if (NAVIGATE_ACCESSORS.includes(String(accessor))) openUser(row as unknown as UserRow)
  }

  const headers: HeaderObject[] = [
    {
      accessor: 'name',
      label: 'Користувач',
      width: 240,
      type: 'other',
      cellRenderer: ({ row }: any) => (
        <UserAvatar name={row.name} lastName={row.lastName} image={row.image} size="sm" showName />
      ),
    },
    { accessor: 'email', label: 'Email', width: 220, type: 'string' },
    { accessor: 'phone', label: 'Телефон', width: 140, type: 'string' },
    {
      accessor: 'role',
      label: 'Роль',
      width: 130,
      type: 'other',
      cellRenderer: ({ row }: any) => (
        <span>{getRoleLabel(row) ?? '—'}</span>
      ),
    },
    {
      accessor: 'isApproved',
      label: 'Доступ',
      width: 170,
      type: 'other',
      cellRenderer: ({ row }: any) => <ApprovalBadge user={row} canApprove={isSuperAdmin} />,
    },
    {
      accessor: 'allowedPages',
      label: 'Сторінки',
      width: 220,
      type: 'other',
      cellRenderer: ({ row }: any) => (
        <MyPopover
          align="start"
          trigger={
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-1.5">
              <PageAccessSummary user={row} />
              <ChevronDown size={12} className="text-muted-foreground" />
            </Button>
          }
          content={<PageAccessEditor user={row} className="w-72" listClassName="max-h-64 overflow-y-auto pr-1" />}
        />
      ),
    },
    {
      accessor: '',
      label: '',
      width: 50,
      type: 'other',
      pinned: 'right',
      cellRenderer: ({ row }: { row: any }) => (
        <ActionsCell row={row} onOpen={openUser} />
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      <AppTable
        rows={data ?? []}
        isLoading={isLoading}
        defaultHeaders={headers}
        getRowId={({ row }) => row._id}
        onCellClick={handleCellClick}
      />
    </div>
  )
}

export default UsersTable
