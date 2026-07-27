import { useState } from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import ScreenHeader from '../components/ui/ScreenHeader'
import Section from '../components/ui/Section'
import useShoppingList from '../hooks/useShoppingList'
import { groupShoppingItemsByCategory } from '../services/shoppingCategoryEngine'
import type { ShoppingItem } from '../types/shopping'

type ShoppingItemRowProps = {
  item: ShoppingItem
  onToggle: (itemId: string) => void
  onDelete: (itemId: string) => void
}

function ShoppingItemRow({
  item,
  onToggle,
  onDelete,
}: ShoppingItemRowProps) {
  return (
    <li
      className={`shopping-item ${
        item.completed
          ? 'shopping-item--completed'
          : ''
      }`}
    >
      <button
        type="button"
        className="shopping-item__check"
        onClick={() => onToggle(item.id)}
        aria-label={
          item.completed
            ? `${item.name} 구매 취소`
            : `${item.name} 구매 완료`
        }
      >
        {item.completed ? '✓' : ''}
      </button>

      <span className="shopping-item__name">
        <span>{item.name}</span>

        {item.quantity !== undefined && item.unit ? (
          <small className="shopping-item__quantity">
            {item.quantity} {item.unit}
          </small>
        ) : null}
      </span>

      <button
        type="button"
        className="shopping-item__delete"
        onClick={() => onDelete(item.id)}
        aria-label={`${item.name} 삭제`}
      >
        삭제
      </button>
    </li>
  )
}

function ShoppingPage() {
  const [itemName, setItemName] = useState('')

  const {
    items,
    remainingItems,
    completedItems,
    addItem,
    toggleItem,
    deleteItem,
    clearCompletedItems,
  } = useShoppingList()
  const categoryGroups =
    groupShoppingItemsByCategory(remainingItems)

  function handleAddItem() {
    const wasAdded = addItem(itemName)

    if (wasAdded) {
      setItemName('')
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === 'Enter') {
      handleAddItem()
    }
  }

  return (
    <>
      <ScreenHeader
        title="장보기"
        description="필요한 재료를 한곳에 모아 편하게 확인해요."
      />

      <main className="app-content">
        <Section
          className="shopping-progress-section"
          title="구매 진행률"
          description={`${completedItems.length} / ${items.length} 구매 완료`}
        >
          <Card>
            <div className="shopping-progress">
              <strong className="shopping-progress__count">
                {completedItems.length} / {items.length}
                <span>구매 완료</span>
              </strong>
              <progress
                className="shopping-progress__bar"
                value={completedItems.length}
                max={Math.max(items.length, 1)}
                aria-label={`${completedItems.length} / ${items.length} 구매 완료`}
              />
            </div>
          </Card>
        </Section>

        <Section
          title="항목 추가"
          description="필요한 재료를 바로 적어두세요."
        >
          <Card>
            <div className="shopping-add">
              <input
                className="shopping-add__input"
                type="text"
                value={itemName}
                onChange={(event) =>
                  setItemName(event.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder="예: 우유"
                aria-label="장보기 항목"
              />

              <Button
                onClick={handleAddItem}
                disabled={!itemName.trim()}
              >
                추가
              </Button>
            </div>
          </Card>
        </Section>

        <Section
          title="장보기 목록"
          description={`${remainingItems.length}개 남았어요`}
        >
          <Card>
            {remainingItems.length === 0 ? (
              <EmptyState
                icon="🛒"
                title={
                  items.length === 0
                    ? '장보기 목록이 비어 있어요.'
                    : '살 물건을 모두 담았어요.'
                }
                description={
                  items.length === 0
                    ? '필요한 재료를 위에서 추가해보세요.'
                    : '담은 물건은 아래 장바구니에서 확인할 수 있어요.'
                }
              />
            ) : (
              <div className="shopping-groups">
                {categoryGroups.map((group) => (
                  <details
                    key={group.category}
                    className="shopping-group"
                    open
                  >
                    <summary>
                      <span>{group.category}</span>
                      <span>
                        {group.items.length}개
                      </span>
                    </summary>

                    <ul className="shopping-list">
                      {group.items.map((item) => (
                        <ShoppingItemRow
                          key={item.id}
                          item={item}
                          onToggle={toggleItem}
                          onDelete={deleteItem}
                        />
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            )}
          </Card>
        </Section>

        <Section
          className="shopping-basket-section"
          title="장바구니"
          description={`${completedItems.length}개 담았어요`}
          action={
            <Button
              variant="ghost"
              disabled={completedItems.length === 0}
              onClick={clearCompletedItems}
            >
              장바구니 비우기
            </Button>
          }
        >
          <Card className="shopping-basket-card">
            {completedItems.length === 0 ? (
              <EmptyState
                icon="🧺"
                title="장바구니가 비어 있어요."
                description="구매한 항목을 체크하면 이곳으로 이동해요."
              />
            ) : (
              <ul className="shopping-list">
                {completedItems.map((item) => (
                  <ShoppingItemRow
                    key={item.id}
                    item={item}
                    onToggle={toggleItem}
                    onDelete={deleteItem}
                  />
                ))}
              </ul>
            )}
          </Card>
        </Section>
      </main>
    </>
  )
}

export default ShoppingPage
