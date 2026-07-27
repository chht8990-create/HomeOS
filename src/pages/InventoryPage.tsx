import { useState } from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import ScreenHeader from '../components/ui/ScreenHeader'
import Section from '../components/ui/Section'
import useInventory from '../hooks/useInventory'
import type {
  InventoryItem,
  InventoryLocation,
} from '../types/inventory'

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
  const [editingId, setEditingId] =
    useState<string | null>(null)

  const {
    items,
    addItem,
    updateItem,
    deleteItem,
  } = useInventory()

  function resetEditor() {
    setName('')
    setQuantity('1')
    setUnit('개')
    setLocation('fridge')
    setEditingId(null)
  }

  function handleSaveItem() {
    const parsedQuantity = Number(quantity)

    if (
      !name.trim() ||
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      return
    }

    if (editingId) {
      updateItem(
        editingId,
        name,
        parsedQuantity,
        unit,
        location,
      )
    } else {
      addItem(
        name,
        parsedQuantity,
        unit,
        location,
      )
    }

    resetEditor()
  }

  function startEditing(item: InventoryItem) {
    setName(item.name)
    setQuantity(String(item.quantity))
    setUnit(item.unit)
    setLocation(item.location)
    setEditingId(item.id)
  }

  function handleDeleteItem(itemId: string) {
    deleteItem(itemId)

    if (editingId === itemId) {
      resetEditor()
    }
  }

  return (
    <>
      <ScreenHeader
        title="재고"
        description="집에 있는 재료를 간단하게 기록해요."
      />

      <main className="app-content">
        <Section
          title={
            editingId ? '재료 수정' : '재료 추가'
          }
          description={
            editingId
              ? '선택한 재료 정보를 수정해 저장하세요.'
              : '완벽하게 적지 않아도 괜찮아요.'
          }
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

              {editingId ? (
                <div className="meal-editor__actions">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={resetEditor}
                  >
                    취소
                  </Button>

                  <Button
                    fullWidth
                    onClick={handleSaveItem}
                    disabled={
                      !name.trim() ||
                      Number(quantity) <= 0
                    }
                  >
                    수정 저장
                  </Button>
                </div>
              ) : (
                <Button
                  fullWidth
                  onClick={handleSaveItem}
                  disabled={
                    !name.trim() ||
                    Number(quantity) <= 0
                  }
                >
                  재료 추가
                </Button>
              )}
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

                    <div className="inventory-item__actions">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          startEditing(item)
                        }
                        aria-label={`${item.name} 수정`}
                      >
                        수정
                      </Button>

                      <button
                        type="button"
                        className="inventory-item__delete"
                        onClick={() =>
                          handleDeleteItem(item.id)
                        }
                        aria-label={`${item.name} 삭제`}
                      >
                        삭제
                      </button>
                    </div>
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
