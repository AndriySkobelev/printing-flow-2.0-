import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { useUpdateSystemSettings } from './actions'

const SettingsPage = () => {
  const { data } = useQuery(convexQuery(api.queries.settings.getSystemSettings, {}))
  const { mutate: updateSettings, isPending } = useUpdateSystemSettings()

  const allowUnconfiguredProducts = data?.allowUnconfiguredProducts ?? false

  return (
    <div className="flex flex-col gap-4 p-4 max-w-xl">
      <h1 className="text-base font-semibold">Налаштування системи</h1>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Виробництво</span>
        <div
          onClick={() => updateSettings({ allowUnconfiguredProducts: !allowUnconfiguredProducts })}
          className={`flex gap-2 items-start px-4 py-3 border cursor-pointer transition-colors ${allowUnconfiguredProducts ? 'border-primary' : 'border-primary/10'} bg-primary/5 rounded-md`}
        >
          <input
            name="allowUnconfiguredProducts"
            id="allowUnconfiguredProducts"
            checked={allowUnconfiguredProducts}
            disabled={isPending}
            readOnly
            className="accent-primary mt-0.5"
            type="checkbox"
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="allowUnconfiguredProducts" className="text-sm w-fit text-primary font-bold leading-none cursor-pointer">
              Створювати завдання для неналаштованих товарів
            </label>
            <span className="text-xs text-primary/70 cursor-default">
              Якщо ввімкнено, замовлення на виробництво можна запустити навіть якщо товар не повністю налаштований: SKU ще не додано у "Вироби", або товар є, але для нього не призначені матеріали. Такі товари підуть у завдання на виробництво, але матеріали для них не резервуватимуться, доки хтось не завершить налаштування.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
