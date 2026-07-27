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
      title="오늘 필요한 장보기"
      description="아직 사지 않은 재료를 확인해요."
    >
      <Card>
        {itemCount === 0 ? (
          <EmptyState
            icon="🛒"
            title="필요한 장보기가 없어요."
            description="재료가 필요하면 장보기 목록에 추가해보세요."
            action={
              <Button
                variant="secondary"
                fullWidth
                onClick={onOpenShopping}
              >
                장보기 열기
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
                아직 사지 않은 재료
              </p>

              <h3 className="shopping-summary__title">
                {itemCount}개 남았어요
              </h3>

              <p className="shopping-summary__description">
                장을 볼 때 목록을 하나씩 확인해보세요.
              </p>
            </div>

            <Button fullWidth onClick={onOpenShopping}>
              장보기 열기
            </Button>
          </div>
        )}
      </Card>
    </Section>
  )
}

export default ShoppingSummaryBlock