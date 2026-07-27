import { useEffect, useRef, useState } from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import ScreenHeader from '../components/ui/ScreenHeader'
import Section from '../components/ui/Section'
import useShoppingList from '../hooks/useShoppingList'
import {
  groupShoppingItemsByCategory,
  type ShoppingDisplayItem,
} from '../services/shoppingCategoryEngine'

const ITEM_TRANSITION_DELAY_MS = 600

type ShoppingItemRowProps = {
  item: ShoppingDisplayItem
  isTransitioning: boolean
  onToggle: () => void
  onDelete: () => void
}

function ShoppingItemRow({
  item,
  isTransitioning,
  onToggle,
  onDelete,
}: ShoppingItemRowProps) {
  const isVisuallyCompleted = isTransitioning
    ? !item.completed
    : item.completed

  return (
    <li
      className={`shopping-item ${
        isVisuallyCompleted
          ? 'shopping-item--completed'
          : ''
      } ${
        isTransitioning
          ? 'shopping-item--transitioning'
          : ''
      }`}
    >
      <button
        type="button"
        className="shopping-item__check"
        disabled={isTransitioning}
        onClick={onToggle}
        aria-label={
          isVisuallyCompleted
            ? `${item.name} 구매 취소`
            : `${item.name} 구매 완료`
        }
      >
        <span
          className="shopping-item__check-mark"
          aria-hidden="true"
        >
          {isVisuallyCompleted ? '✓' : ''}
        </span>
      </button>

      <span className="shopping-item__name">
        <span>{item.name}</span>

        {item.quantities.length > 0 ? (
          <small className="shopping-item__quantity">
            {item.quantities
              .map(({ quantity, unit }) =>
                unit
                  ? `${quantity} ${unit}`
                  : String(quantity),
              )
              .join(' · ')}
          </small>
        ) : null}
      </span>

      <button
        type="button"
        className="shopping-item__delete"
        disabled={isTransitioning}
        onClick={onDelete}
        aria-label={`${item.name} 삭제`}
      >
        삭제
      </button>
    </li>
  )
}

function ShoppingPage() {
  const [itemName, setItemName] = useState('')
  const [
    transitioningItemKeys,
    setTransitioningItemKeys,
  ] = useState<Set<string>>(() => new Set())
  const [
    isQuickAddVisible,
    setIsQuickAddVisible,
  ] = useState(false)
  const [
    isApplyingInventory,
    setIsApplyingInventory,
  ] = useState(false)
  const [
    inventoryApplyMessage,
    setInventoryApplyMessage,
  ] = useState('')
  const transitioningItemKeysRef = useRef(
    new Set<string>(),
  )
  const isApplyingInventoryRef = useRef(false)
  const isMountedRef = useRef(true)
  const addItemInputRef =
    useRef<HTMLInputElement>(null)

  const {
    items,
    remainingItems,
    completedItems,
    addItem,
    setItemsCompleted,
    deleteItems,
    clearCompletedItems,
    applyCompletedItemsToInventory,
  } = useShoppingList()
  const remainingCategoryGroups =
    groupShoppingItemsByCategory(remainingItems)
  const completedCategoryGroups =
    groupShoppingItemsByCategory(completedItems)
  const remainingDisplayItems =
    remainingCategoryGroups.flatMap(
      (group) => group.items,
    )
  const completedDisplayItems =
    completedCategoryGroups.flatMap(
      (group) => group.items,
    )
  const totalDisplayItemCount =
    remainingDisplayItems.length +
    completedDisplayItems.length
  const completionPercentage =
    totalDisplayItemCount === 0
      ? 0
      : Math.round(
          (completedDisplayItems.length /
            totalDisplayItemCount) *
            100,
        )

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const input = addItemInputRef.current
    const basket = document.querySelector<HTMLElement>(
      '.shopping-basket-section',
    )

    if (!input || !basket) {
      return
    }

    if (!('IntersectionObserver' in window)) {
      return
    }

    let isInputVisible = true
    let isBasketVisible = false

    const updateQuickAddVisibility = () => {
      setIsQuickAddVisible(
        !isInputVisible && !isBasketVisible,
      )
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === input) {
            isInputVisible = entry.isIntersecting
          }

          if (entry.target === basket) {
            isBasketVisible = entry.isIntersecting
          }
        })

        updateQuickAddVisibility()
      },
      {
        rootMargin: '0px 0px -88px 0px',
        threshold: 0.1,
      },
    )

    observer.observe(input)
    observer.observe(basket)

    return () => {
      observer.disconnect()
    }
  }, [])

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

  function handleToggleItem(
    item: ShoppingDisplayItem,
  ) {
    if (transitioningItemKeysRef.current.has(item.key)) {
      return
    }

    transitioningItemKeysRef.current.add(item.key)
    setTransitioningItemKeys(
      new Set(transitioningItemKeysRef.current),
    )

    window.setTimeout(() => {
      setItemsCompleted(
        item.itemIds,
        !item.completed,
      )
      transitioningItemKeysRef.current.delete(item.key)

      if (isMountedRef.current) {
        setTransitioningItemKeys(
          new Set(transitioningItemKeysRef.current),
        )
      }
    }, ITEM_TRANSITION_DELAY_MS)
  }

  function handleDeleteItem(
    item: ShoppingDisplayItem,
  ) {
    if (transitioningItemKeysRef.current.has(item.key)) {
      return
    }

    deleteItems(item.itemIds)
  }

  function handleQuickAdd() {
    const input = addItemInputRef.current

    if (!input) {
      return
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    input.scrollIntoView({
      behavior: prefersReducedMotion
        ? 'auto'
        : 'smooth',
      block: 'center',
    })
    input.focus({ preventScroll: true })
  }

  function handleApplyBasketToInventory() {
    if (isApplyingInventoryRef.current) {
      return
    }

    isApplyingInventoryRef.current = true
    setIsApplyingInventory(true)
    setInventoryApplyMessage('')

    try {
      const appliedItemCount =
        applyCompletedItemsToInventory()

      if (appliedItemCount > 0) {
        setInventoryApplyMessage(
          `재고 ${appliedItemCount}개 품목 반영 완료`,
        )
      }
    } finally {
      isApplyingInventoryRef.current = false
      setIsApplyingInventory(false)
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
          description={`구매 ${completedDisplayItems.length} / ${totalDisplayItemCount} · ${completionPercentage}%`}
        >
          <Card>
            <div className="shopping-progress">
              <strong className="shopping-progress__count">
                구매 {completedDisplayItems.length} /{' '}
                {totalDisplayItemCount}
                <span>· {completionPercentage}%</span>
              </strong>
              <progress
                className="shopping-progress__bar"
                value={completedDisplayItems.length}
                max={Math.max(totalDisplayItemCount, 1)}
                aria-label={`구매 ${completedDisplayItems.length} / ${totalDisplayItemCount} · ${completionPercentage}%`}
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
                ref={addItemInputRef}
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
          description={`${remainingDisplayItems.length}개 남았어요`}
        >
          <Card>
            {remainingDisplayItems.length === 0 ? (
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
                {remainingCategoryGroups.map((group) => (
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
                          key={item.key}
                          item={item}
                          isTransitioning={
                            transitioningItemKeys.has(
                              item.key,
                            )
                          }
                          onToggle={() =>
                            handleToggleItem(item)
                          }
                          onDelete={() =>
                            handleDeleteItem(item)
                          }
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
          description={`${completedDisplayItems.length}개 담았어요`}
          action={
            <Button
              variant="ghost"
              disabled={
                completedDisplayItems.length === 0
              }
              onClick={clearCompletedItems}
            >
              장바구니 비우기
            </Button>
          }
        >
          <Card className="shopping-basket-card">
            <div className="shopping-basket-actions">
              <Button
                fullWidth
                disabled={
                  completedItems.length === 0 ||
                  isApplyingInventory
                }
                onClick={handleApplyBasketToInventory}
              >
                장바구니를 재고에 반영
              </Button>

              {inventoryApplyMessage ? (
                <p role="status">
                  {inventoryApplyMessage}
                </p>
              ) : null}
            </div>

            {completedDisplayItems.length === 0 ? (
              <EmptyState
                icon="🧺"
                title="장바구니가 비어 있어요."
                description="구매한 항목을 체크하면 이곳으로 이동해요."
              />
            ) : (
              <ul className="shopping-list">
                {completedDisplayItems.map((item) => (
                  <ShoppingItemRow
                    key={item.key}
                    item={item}
                    isTransitioning={
                      transitioningItemKeys.has(item.key)
                    }
                    onToggle={() =>
                      handleToggleItem(item)
                    }
                    onDelete={() =>
                      handleDeleteItem(item)
                    }
                  />
                ))}
              </ul>
            )}
          </Card>
        </Section>
      </main>

      {isQuickAddVisible ? (
        <Button
          className="shopping-quick-add"
          aria-label="항목 추가 입력창으로 이동"
          onClick={handleQuickAdd}
        >
          + 항목 추가
        </Button>
      ) : null}
    </>
  )
}

export default ShoppingPage
