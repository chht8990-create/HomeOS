import { useState } from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import ScreenHeader from '../components/ui/ScreenHeader'
import Section from '../components/ui/Section'
import useShoppingList from '../hooks/useShoppingList'

function ShoppingPage() {
  const [itemName, setItemName] = useState('')

  const {
    items,
    completedItems,
    addItem,
    toggleItem,
    deleteItem,
    clearCompletedItems,
  } = useShoppingList()

  function handleAddItem() {
    const wasAdded = addItem(itemName)

    if (wasAdded) {
      setItemName('')
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
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
          title="항목 추가"
          description="필요한 재료를 바로 적어두세요."
        >
          <Card>
            <div className="shopping-add">
              <input
                className="shopping-add__input"
                type="text"
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
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
          description={`전체 ${items.length}개`}
          action={
            completedItems.length > 0 ? (
              <Button
                variant="ghost"
                onClick={clearCompletedItems}
              >
                완료 항목 정리
              </Button>
            ) : undefined
          }
        >
          <Card>
            {items.length === 0 ? (
              <EmptyState
                icon="🛒"
                title="장보기 목록이 비어 있어요."
                description="필요한 재료를 위에서 추가해보세요."
              />
            ) : (
              <ul className="shopping-list">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={`shopping-item ${
                      item.completed
                        ? 'shopping-item--completed'
                        : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="shopping-item__check"
                      onClick={() => toggleItem(item.id)}
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

export default ShoppingPage