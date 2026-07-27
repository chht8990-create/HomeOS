import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Section from '../components/ui/Section'
import useInventory from '../hooks/useInventory'

type InventorySummaryBlockProps = {
  onOpenInventory: () => void
}

function InventorySummaryBlock({
  onOpenInventory,
}: InventorySummaryBlockProps) {
  const { items } = useInventory()

  return (
    <Section
      title="집에 있는 재료"
      description="현재 보유 중인 재료를 확인해요."
    >
      <Card>
        {items.length === 0 ? (
          <EmptyState
            icon="🥬"
            title="아직 등록된 재료가 없어요."
            description="냉장고나 찬장의 재료를 가볍게 기록해보세요."
            action={
              <Button
                variant="secondary"
                fullWidth
                onClick={onOpenInventory}
              >
                재고 열기
              </Button>
            }
          />
        ) : (
          <div className="inventory-summary">
            <div className="inventory-summary__icon" aria-hidden="true">
              🥬
            </div>

            <div className="inventory-summary__content">
              <p className="inventory-summary__label">보유 재료</p>
              <h3 className="inventory-summary__title">
                {items.length}개가 있어요
              </h3>
              <p className="inventory-summary__description">
                필요한 재료가 있는지 확인해보세요.
              </p>
            </div>

            <Button fullWidth onClick={onOpenInventory}>
              재고 열기
            </Button>
          </div>
        )}
      </Card>
    </Section>
  )
}

export default InventorySummaryBlock