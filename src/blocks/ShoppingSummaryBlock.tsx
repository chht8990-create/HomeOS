import { ShoppingCart } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Section from '../components/ui/Section'
import useShoppingList from '../hooks/useShoppingList'

type ShoppingSummaryBlockProps = {
  onOpenShopping: () => void
}

function ShoppingSummaryBlock({
  onOpenShopping,
}: ShoppingSummaryBlockProps) {
  const { remainingItems } = useShoppingList()
  const itemCount = remainingItems.length

  return (
    <Section
      title="장보기 목록"
      description="필요한 재료를 확인하세요."
    >
      <Card>
        {itemCount === 0 ? (
          <EmptyState
            icon={<ShoppingCart />}
            title="장보기 목록이 비어 있어요."
            description="필요한 재료를 추가해 보세요."
            action={
              <Button
                variant="secondary"
                fullWidth
                onClick={onOpenShopping}
              >
                장보기 목록 보기
              </Button>
            }
          />
        ) : (
          <div className="shopping-summary">
            <div className="shopping-summary__icon" aria-hidden="true">
              🛒
            </div>

            <div className="shopping-summary__content">
              <p className="shopping-summary__label">
                구매할 재료
              </p>

              <h3 className="shopping-summary__title">
                {itemCount}개 남았어요
              </h3>

              <p className="shopping-summary__description">
                장볼 때 하나씩 체크해 보세요.
              </p>
            </div>

            <Button fullWidth onClick={onOpenShopping}>
              장보기 목록 보기
            </Button>
          </div>
        )}
      </Card>
    </Section>
  )
}

export default ShoppingSummaryBlock
