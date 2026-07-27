import { useState } from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import ScreenHeader from '../components/ui/ScreenHeader'
import Section from '../components/ui/Section'
import useInventory from '../hooks/useInventory'
import type { InventoryLocation } from '../types/inventory'

const locationLabels: Record<InventoryLocation, string> = {
  fridge: '냉장',
  freezer: '냉동',
  pantry: '실온',
}

function InventoryPage() {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('개')
  const [location, setLocation] =
    useState<InventoryLocation>('fridge')

  const { items, addItem, deleteItem } = useInventory()

  function handleAddItem() {
    const parsedQuantity = Number(quantity)

    if (!name.trim() || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return
    }

    addItem(name, parsedQuantity, unit.trim() || '개', location)

    setName('')
    setQuantity('1')
    setUnit('개')
    setLocation('fridge')
  }

  return (
    <>
      <ScreenHeader
        title="재고"
        description="집에 있는 재료를 간단하게 기록해요."
      />

      <main className="app-content">
        <Section
          title="재료 추가"
          description="완벽하게 적지 않아도 괜찮아요."
        >
          <Card>
            <div className="inventory-form">
              <label className="inventory-form__field">
                <span>재료명</span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="예: 계란"
                />
              </label>

              <div className="inventory-form__row">
                <label className="inventory-form__field">
                  <span>수량</span>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </label>

                <label className="inventory-form__field">
                  <span>단위</span>
                  <input
                    type="text"
                    value={unit}
                    onChange={(event) => setUnit(event.target.value)}
                    placeholder="개"
                  />
                </label>
              </div>

              <label className="inventory-form__field">
                <span>보관 위치</span>
                <select
                  value={location}
                  onChange={(event) =>
                    setLocation(event.target.value as InventoryLocation)
                  }
                >
                  <option value="fridge">냉장</option>
                  <option value="freezer">냉동</option>
                  <option value="pantry">실온</option>
                </select>
              </label>

              <Button
                fullWidth
                onClick={handleAddItem}
                disabled={!name.trim() || Number(quantity) <= 0}
              >
                재료 추가
              </Button>
            </div>
          </Card>
        </Section>

        <Section
          title="보유 재료"
          description={`현재 ${items.length}개를 기록하고 있어요.`}
        >
          <Card>
            {items.length === 0 ? (
              <EmptyState
                icon="🥬"
                title="등록된 재료가 없어요."
                description="냉장고나 찬장에 있는 재료부터 하나씩 추가해보세요."
              />
            ) : (
              <ul className="inventory-list">
                {items.map((item) => (
                  <li key={item.id} className="inventory-item">
                    <div className="inventory-item__content">
                      <div className="inventory-item__top">
                        <strong>{item.name}</strong>
                        <span className="inventory-item__location">
                          {locationLabels[item.location]}
                        </span>
                      </div>

                      <p>
                        {item.quantity} {item.unit}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="inventory-item__delete"
                      onClick={() => deleteItem(item.id)}
                      aria-label={`${item.name} 삭제`}
                    >
                      삭제
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Section>
      </main>
    </>
  )
}

export default InventoryPage