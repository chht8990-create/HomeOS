import { PackageOpen } from 'lucide-react'
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
      title="냉장고"
      description="보관 중인 재료를 한눈에 확인하세요."
    >
      <Card>
        {items.length === 0 ? (
          <EmptyState
            icon={<PackageOpen />}
            title="아직 등록한 재료가 없어요."
            description="집에 있는 재료부터 추가해 보세요."
            action={
              <Button
                variant="secondary"
                fullWidth
                onClick={onOpenInventory}
              >
                재료 추가하기
              </Button>
            }
          />
        ) : (
          <div className="inventory-summary">
            <div className="inventory-summary__icon" aria-hidden="true">
              🥬
            </div>

            <div className="inventory-summary__content">
              <p className="inventory-summary__label">보관 중인 재료</p>
              <h3 className="inventory-summary__title">
                {items.length}개가 있어요
              </h3>
              <p className="inventory-summary__description">
                필요한 재료가 있는지 확인해 보세요.
              </p>
            </div>

            <Button fullWidth onClick={onOpenInventory}>
              냉장고 보기
            </Button>
          </div>
        )}
      </Card>
    </Section>
  )
}

export default InventorySummaryBlock
