import { useRef, useState } from 'react'
import { PackageOpen } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import ScreenHeader from '../components/ui/ScreenHeader'
import Section from '../components/ui/Section'
import StyledSelect from '../components/ui/StyledSelect'
import useInventory from '../hooks/useInventory'
import { getInventoryListDisplayName } from '../services/inventoryPresentationEngine'
import {
  formatInventoryQuantity,
  parseInventoryQuantity,
} from '../services/inventoryQuantityEngine'
import type {
  InventoryItem,
  InventoryLocation,
} from '../types/inventory'

const locationLabels: Record<InventoryLocation, string> = {
  fridge: '냉장',
  freezer: '냉동',
  pantry: '실온',
}

type InventoryPageProps = {
  onOpenRecommendations: () => void
}

function InventoryPage({
  onOpenRecommendations,
}: InventoryPageProps) {
  const nameInputRef = useRef<HTMLInputElement>(null)
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
    const parsedQuantity = parseInventoryQuantity(quantity)

    if (
      !name.trim() ||
      parsedQuantity === null
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

  function focusInventoryEditor() {
    nameInputRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
    nameInputRef.current?.focus({
      preventScroll: true,
    })
  }

  return (
    <>
      <ScreenHeader
        title="냉장고"
        description="보관 중인 재료를 확인하고 관리하세요."
      />

      <main className="app-content">
        {items.length > 0 ? (
          <Section title="이 재료로 만들 메뉴 찾기">
            <Card>
              <div className="inventory-summary">
                <div className="inventory-summary__content">
                  <p className="inventory-summary__description">
                    냉장고 재료와 저장된 레시피를 비교해
                    만들기 좋은 메뉴를 찾아보세요.
                  </p>
                </div>
                <Button
                  fullWidth
                  onClick={onOpenRecommendations}
                >
                  저장된 레시피에서 찾기
                </Button>
              </div>
            </Card>
          </Section>
        ) : null}

        <Section
          title={
            editingId
              ? '재료 정보 수정'
              : '재료 추가하기'
          }
          description={
            editingId
              ? '이름, 수량, 단위, 보관 위치를 수정하세요.'
              : items.length === 0
                ? '냉장고에 재료를 등록하면 AI가 더 정확하게 추천합니다.'
                : '냉장고나 찬장에 있는 재료를 추가하세요.'
          }
        >
          <Card>
            <div className="inventory-form">
              <label className="inventory-form__field">
                <span>재료 이름</span>
                <input
                  ref={nameInputRef}
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
                    min="0"
                    step="any"
                    inputMode="decimal"
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

              <StyledSelect
                label="보관 위치"
                value={location}
                onChange={(event) =>
                  setLocation(
                    event.target
                      .value as InventoryLocation,
                  )
                }
              >
                <option value="fridge">냉장</option>
                <option value="freezer">냉동</option>
                <option value="pantry">실온</option>
              </StyledSelect>

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
                      parseInventoryQuantity(quantity) ===
                        null
                    }
                  >
                    수정 내용 저장
                  </Button>
                </div>
              ) : (
                <Button
                  fullWidth
                  onClick={handleSaveItem}
                  disabled={
                    !name.trim() ||
                    parseInventoryQuantity(quantity) === null
                  }
                >
                  재료 추가
                </Button>
              )}
            </div>
          </Card>
        </Section>

        <Section
          title="보관 중인 재료"
          description={`재료 ${items.length}개가 있어요.`}
        >
          <Card>
            {items.length === 0 ? (
              <EmptyState
                icon={<PackageOpen />}
                title="아직 등록한 재료가 없어요."
                description="집에 있는 재료부터 추가해 보세요."
                action={
                  <Button onClick={focusInventoryEditor}>
                    재료 추가하기
                  </Button>
                }
              />
            ) : (
              <ul className="inventory-list">
                {items.map((item) => (
                  <li key={item.id} className="inventory-item">
                    <div className="inventory-item__content">
                      <div className="inventory-item__top">
                        <strong>
                          {getInventoryListDisplayName(item)}
                        </strong>
                        <span className="inventory-item__location">
                          {locationLabels[item.location]}
                        </span>
                      </div>
                      <p className="inventory-item__quantity ui-number">
                        {formatInventoryQuantity(item.quantity)}
                        {item.unit.trim()}
                      </p>
                    </div>

                    <div className="inventory-item__actions">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          startEditing(item)
                        }
                        aria-label={`${item.name} 정보 수정`}
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
