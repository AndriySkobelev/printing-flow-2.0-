import { useContext } from 'react'
import { Button } from '@/components/ui/button'
import { DialogContext } from '@/contexts/dialog'
import { OrderDetails } from '@/route-components/order-details'

type Props = {
  productionOrderId: string
  orderIndex:         string | number | null | undefined
}

export const OrderNumberLink = ({ productionOrderId, orderIndex }: Props) => {
  const { openDialog } = useContext(DialogContext)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    openDialog({
      title:      `Замовлення #${orderIndex}`,
      outerClose: true,
      className:  'sm:w-300 sm:max-w-300',
      content: (
        <div style={{ height: '80vh' }}>
          <OrderDetails productionOrderId={productionOrderId} readOnly />
        </div>
      ),
    })
  }

  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      className="h-auto p-0 text-[10px] font-bold shrink-0"
      onClick={handleClick}
    >
      #{orderIndex}
    </Button>
  )
}
