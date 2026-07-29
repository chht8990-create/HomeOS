import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Check,
  ChevronDown,
  RotateCcw,
  ShoppingBasket,
  ShoppingCart,
} from 'lucide-react'
import type { PageName } from '../components/BottomNavigation'
import Badge from '../components/ui/Badge'
import BottomSheet from '../components/ui/BottomSheet'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Input from '../components/ui/Input'
import ScreenHeader from '../components/ui/ScreenHeader'
import Section from '../components/ui/Section'
import StyledSelect from '../components/ui/StyledSelect'
import useHistoryModal from '../hooks/useHistoryModal'
import useShoppingList from '../hooks/useShoppingList'
import {
  groupShoppingItemsByCategory,
  type ShoppingDisplayItem,
} from '../services/shoppingCategoryEngine'
import { shouldShowShoppingReminder } from '../services/shoppingPurchaseEngine'

const ITEM_TRANSITION_DELAY_MS = 600

type ShoppingPageProps = {
  onChangePage: (page: PageName) => void
}

type ShoppingItemRowProps = {
  item: ShoppingDisplayItem
  isTransitioning: boolean
  onToggle: () => void
  onDelete: () => void
  onOpenPurchase: () => void
}

function ShoppingItemRow({
  item,
  isTransitioning,
  onToggle,
  onDelete,
  onOpenPurchase,
}: ShoppingItemRowProps) {
  const isVisuallyCompleted = isTransitioning
    ? !item.completed
    : item.completed
  const isMealGenerated =
    item.sourceTypes.includes('meal')
  const isMixedSource =
    isMealGenerated &&
    item.sourceTypes.includes('manual')
  const unit = item.quantities[0]?.unit ?? '개'
  const sourceLabel = isMealGenerated
    ? isMixedSource
      ? '식사 일정·직접 추가'
      : '식사 일정'
    : '직접 추가'
  const purchaseLabel =
    item.purchaseStatus === 'partial'
      ? '부분 구매'
      : item.purchaseStatus === 'completed'
        ? '구매 완료'
        : item.purchaseStatus === 'not-purchased'
          ? '이번에 못 삼'
          : null
  const isInventoryLocked =
    item.purchaseStatus === 'completed' &&
    item.inventoryAppliedQuantity >=
      item.purchasedTotalQuantity &&
    item.purchasedTotalQuantity > 0

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
        disabled={
          isTransitioning || isInventoryLocked
        }
        onClick={onToggle}
        aria-label={
          isInventoryLocked
            ? `${item.name} 냉장고 반영 완료`
            : isVisuallyCompleted
            ? `${item.name} 구매 완료 취소`
            : `${item.name} 구매 완료`
        }
      >
        <span
          className="shopping-item__check-mark"
          aria-hidden="true"
        >
          {isVisuallyCompleted ? (
            <Check size={20} strokeWidth={2.5} />
          ) : null}
        </span>
      </button>

      <button
        type="button"
        className="shopping-item__name shopping-item__details-button"
        disabled={isTransitioning}
        onClick={onOpenPurchase}
        aria-label={`${item.name} 구매 정보 입력`}
      >
        <span className="shopping-item__title">
          <span>{item.name}</span>
          {purchaseLabel ? (
            <Badge
              tone={
                item.purchaseStatus === 'completed'
                  ? 'success'
                  : item.purchaseStatus === 'partial'
                    ? 'warning'
                    : 'danger'
              }
            >
              {purchaseLabel}
            </Badge>
          ) : null}
          {isMealGenerated ? (
            <Badge
              className="shopping-item__source"
              tone="primary"
            >
              {sourceLabel}
            </Badge>
          ) : null}
        </span>

        <small className="shopping-item__quantity">
          필요 {item.requiredQuantity} {unit}
          {' · '}
          {sourceLabel}
        </small>

        {item.purchasedTotalQuantity > 0 ? (
          <small className="shopping-item__purchase-summary">
            {item.purchaseMode === 'package' &&
            item.packageQuantity &&
            item.purchasedPackageCount !== undefined
              ? `구매 ${item.packageQuantity}${unit}입 ${item.purchasedPackageCount}봉`
              : `구매 ${item.purchasedTotalQuantity}${unit}`}
            {item.remainingPurchaseQuantity > 0
              ? ` · ${item.remainingPurchaseQuantity}${unit} 더 필요`
              : ''}
            {item.surplusQuantity > 0
              ? ` · ${item.surplusQuantity}${unit} 남을 예정`
              : ''}
          </small>
        ) : null}

        {item.inventoryAppliedQuantity > 0 ? (
          <small className="shopping-item__inventory-state">
            냉장고에 {item.inventoryAppliedQuantity}
            {unit} 반영됨
          </small>
        ) : null}
      </button>

      <button
        type="button"
        className="shopping-item__delete"
        disabled={isTransitioning}
        onClick={onDelete}
        aria-label={`${item.name}${
          isMealGenerated ? ' 식사 일정 항목' : ''
        } 목록에서 삭제`}
      >
        삭제
      </button>
    </li>
  )
}

function ShoppingPage({
  onChangePage,
}: ShoppingPageProps) {
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
  const [purchaseMode, setPurchaseMode] =
    useState<'single' | 'package'>('single')
  const [purchasedQuantity, setPurchasedQuantity] =
    useState('0')
  const [packageQuantity, setPackageQuantity] =
    useState('1')
  const [
    purchasedPackageCount,
    setPurchasedPackageCount,
  ] = useState('1')
  const [
    isReminderDismissed,
    setIsReminderDismissed,
  ] = useState(false)
  const [
    selectedInventoryItemIds,
    setSelectedInventoryItemIds,
  ] = useState<Set<string>>(() => new Set())
  const [
    isInventoryItemSelectionOpen,
    setIsInventoryItemSelectionOpen,
  ] = useState(false)
  const [
    inventoryApplyStep,
    setInventoryApplyStep,
  ] = useState<'select' | 'navigate'>('select')
  const [
    outstandingItemCountAfterApply,
    setOutstandingItemCountAfterApply,
  ] = useState(0)
  const purchaseModal =
    useHistoryModal<ShoppingDisplayItem>(
      'shopping-purchase',
    )
  const inventoryModal =
    useHistoryModal<'inventory-apply'>(
      'shopping-inventory-apply',
    )
  const transitioningItemKeysRef = useRef(
    new Set<string>(),
  )
  const isApplyingInventoryRef = useRef(false)
  const isMountedRef = useRef(true)
  const addItemInputRef =
    useRef<HTMLInputElement>(null)

  const {
    remainingItems,
    completedItems,
    reminderItems,
    addItem,
    setItemsCompleted,
    recordPurchase,
    markItemsNotPurchased,
    markItemIdsForReminder,
    restoreReminderItemIds,
    deleteItems,
    clearCompletedItems,
    applyCompletedItemsToInventory,
  } = useShoppingList()
  const remainingCategoryGroups =
    groupShoppingItemsByCategory(remainingItems)
  const completedCategoryGroups =
    groupShoppingItemsByCategory(completedItems)
  const reminderCategoryGroups =
    groupShoppingItemsByCategory(reminderItems)
  const remainingDisplayItems =
    remainingCategoryGroups.flatMap(
      (group) => group.items,
    )
  const completedDisplayItems =
    completedCategoryGroups.flatMap(
      (group) => group.items,
    )
  const reminderDisplayItems =
    reminderCategoryGroups.flatMap(
      (group) => group.items,
    )
  const isReminderVisible =
    shouldShowShoppingReminder(
      reminderDisplayItems.length,
      isReminderDismissed,
    )
  const inventoryCandidateItems = [
    ...remainingDisplayItems,
    ...completedDisplayItems,
  ].filter(
    (item) =>
      item.purchasedTotalQuantity >
      item.inventoryAppliedQuantity,
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
  const isShoppingEmpty = totalDisplayItemCount === 0
  const selectedPurchaseItem = purchaseModal.value
  const selectedPurchaseUnit =
    selectedPurchaseItem?.quantities[0]?.unit ?? '개'
  const enteredPurchasedQuantity =
    purchaseMode === 'package'
      ? Number(packageQuantity) *
        Number(purchasedPackageCount)
      : Number(purchasedQuantity)
  const effectivePurchasedQuantity =
    selectedPurchaseItem
      ? Math.max(
          Number.isFinite(enteredPurchasedQuantity)
            ? enteredPurchasedQuantity
            : 0,
          selectedPurchaseItem
            .inventoryAppliedQuantity,
        )
      : 0
  const purchaseRemainingQuantity =
    selectedPurchaseItem
      ? Math.max(
          0,
          selectedPurchaseItem.requiredQuantity -
            effectivePurchasedQuantity,
        )
      : 0
  const purchaseSurplusQuantity =
    selectedPurchaseItem
      ? Math.max(
          0,
          effectivePurchasedQuantity -
            selectedPurchaseItem.requiredQuantity,
        )
      : 0
  const isPurchaseInputValid =
    purchaseMode === 'package'
      ? Number(packageQuantity) > 0 &&
        Number(purchasedPackageCount) > 0
      : Number(purchasedQuantity) > 0 &&
        Number(purchasedQuantity) >=
          (selectedPurchaseItem
            ?.inventoryAppliedQuantity ?? 0)

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

  function handleOpenPurchase(
    item: ShoppingDisplayItem,
  ) {
    setPurchaseMode(item.purchaseMode)
    setPurchasedQuantity(
      String(item.purchasedTotalQuantity),
    )
    setPackageQuantity(
      String(item.packageQuantity ?? 1),
    )
    setPurchasedPackageCount(
      String(item.purchasedPackageCount ?? 1),
    )
    purchaseModal.openModal(item)
  }

  function handleSavePurchase() {
    if (!selectedPurchaseItem) {
      return
    }

    recordPurchase(selectedPurchaseItem.itemIds, {
      mode: purchaseMode,
      ...(purchaseMode === 'package'
        ? {
            packageQuantity:
              Number(packageQuantity),
            purchasedPackageCount: Number(
              purchasedPackageCount,
            ),
          }
        : {
            purchasedQuantity: Number(
              purchasedQuantity,
            ),
          }),
    })
    setInventoryApplyMessage(
      selectedPurchaseItem.purchaseStatus ===
        'completed'
        ? '구매 정보를 수정했어요.'
        : '구매 정보를 저장했어요.',
    )
    purchaseModal.closeModal()
  }

  function handleMarkNotPurchased() {
    if (!selectedPurchaseItem) {
      return
    }

    markItemsNotPurchased(
      selectedPurchaseItem.itemIds,
    )
    setIsReminderDismissed(false)
    purchaseModal.closeModal()
  }

  function handleOpenInventoryApply() {
    const candidateIds =
      inventoryCandidateItems.flatMap(
        (item) => item.itemIds,
      )

    setSelectedInventoryItemIds(
      new Set(candidateIds),
    )
    setInventoryApplyStep('select')
    setOutstandingItemCountAfterApply(0)
    setIsInventoryItemSelectionOpen(false)
    inventoryModal.openModal('inventory-apply')
  }

  function toggleInventoryCandidate(
    item: ShoppingDisplayItem,
  ) {
    setSelectedInventoryItemIds((current) => {
      const next = new Set(current)
      const shouldSelect = item.itemIds.some(
        (itemId) => !next.has(itemId),
      )

      item.itemIds.forEach((itemId) => {
        if (shouldSelect) {
          next.add(itemId)
        } else {
          next.delete(itemId)
        }
      })

      return next
    })
  }

  function handleApplyBasketToInventory(
    itemIds: string[],
  ) {
    if (isApplyingInventoryRef.current) {
      return
    }

    isApplyingInventoryRef.current = true
    setIsApplyingInventory(true)
    setInventoryApplyMessage('')

    try {
      const appliedItemCount =
        applyCompletedItemsToInventory(
          itemIds,
        )

      if (appliedItemCount > 0) {
        markItemIdsForReminder(
          [
            ...remainingDisplayItems,
            ...reminderDisplayItems,
          ].flatMap((item) => item.itemIds),
        )
        setInventoryApplyMessage(
          `냉장고에 ${appliedItemCount}가지 재료를 넣었어요.`,
        )
        setOutstandingItemCountAfterApply(
          remainingDisplayItems.length +
            reminderDisplayItems.length,
        )
        setInventoryApplyStep('navigate')
      }
    } finally {
      isApplyingInventoryRef.current = false
      setIsApplyingInventory(false)
    }
  }

  function handleCloseInventoryModal() {
    setInventoryApplyStep('select')
    setOutstandingItemCountAfterApply(0)
    inventoryModal.closeModal()
  }

  function handleNavigateToInventory() {
    inventoryModal.closeModalAndThen(() =>
      onChangePage('inventory'),
    )
  }

  function handleDeleteReminderItem(
    item: ShoppingDisplayItem,
  ) {
    const shouldDelete = window.confirm(
      `${item.name}을(를) 장보기 목록에서 삭제할까요?`,
    )

    if (shouldDelete) {
      deleteItems(item.itemIds)
    }
  }

  return (
    <>
      <ScreenHeader
        title="장보기 목록"
        description="필요한 품목을 확인하고 하나씩 체크해 보세요."
      />

      <main className="app-content">
        {isReminderVisible ? (
          <Section
            className="shopping-reminder-section"
            title={`지난 장보기에서 못 산 품목이 ${reminderDisplayItems.length}개 있어요.`}
            description="다음 장보기에 다시 포함하거나 목록에서 정리할 수 있어요."
          >
            <Card>
              <div className="shopping-reminder">
                <AlertCircle
                  size={22}
                  aria-hidden="true"
                />
                <ul>
                  {reminderDisplayItems.map((item) => (
                    <li key={item.key}>
                      <span>
                        <strong>{item.name}</strong>
                        <small>
                          {item.remainingPurchaseQuantity ||
                            item.requiredQuantity}
                          {item.quantities[0]?.unit ?? '개'}{' '}
                          남음
                        </small>
                      </span>
                      <div className="shopping-reminder__item-actions">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            restoreReminderItemIds(
                              item.itemIds,
                            )
                          }
                        >
                          <RotateCcw
                            size={16}
                            aria-hidden="true"
                          />
                          목록에 다시 포함
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() =>
                            handleDeleteReminderItem(item)
                          }
                        >
                          삭제
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="shopping-reminder__actions">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setIsReminderDismissed(true)
                    }
                  >
                    나중에
                  </Button>
                </div>
              </div>
            </Card>
          </Section>
        ) : null}

        {!isShoppingEmpty ? (
          <Section
            className="shopping-progress-section"
            title="장보기 진행률"
            description={`완료 ${completedDisplayItems.length} / ${totalDisplayItemCount} · ${completionPercentage}%`}
          >
            <Card>
              <div className="shopping-progress">
                <strong className="shopping-progress__count">
                  완료 {completedDisplayItems.length} /{' '}
                  {totalDisplayItemCount}
                  <span>· {completionPercentage}%</span>
                </strong>
                <progress
                  className="shopping-progress__bar"
                  value={completedDisplayItems.length}
                  max={Math.max(totalDisplayItemCount, 1)}
                  aria-label={`장보기 완료 ${completedDisplayItems.length} / ${totalDisplayItemCount} · ${completionPercentage}%`}
                />
              </div>
            </Card>
          </Section>
        ) : null}

        <Section
          title="빠르게 추가하기"
          description="필요한 품목을 목록에 추가하세요."
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
                aria-label="구매할 품목"
              />

              <Button
                onClick={handleAddItem}
                disabled={!itemName.trim()}
              >
                추가
              </Button>
            </div>

            {isShoppingEmpty ? (
              <p className="shopping-empty-hint">
                품목을 추가하면 목록과 진행률이 표시돼요.
              </p>
            ) : null}
          </Card>
        </Section>

        {!isShoppingEmpty ? (
          <>
            <Section
              title="구매할 품목"
              description={`${remainingDisplayItems.length}개 남았어요`}
            >
              <Card>
                {remainingDisplayItems.length === 0 ? (
                  <EmptyState
                    icon={<ShoppingCart />}
                    title="모든 품목을 구매했어요."
                    description="구매한 품목은 아래에서 확인할 수 있어요."
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
                          <span className="shopping-group__count">
                            {group.items.length}개
                          </span>
                          <ChevronDown
                            className="shopping-group__chevron"
                            size={20}
                            strokeWidth={2.2}
                            aria-hidden="true"
                          />
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
                              onOpenPurchase={() =>
                                handleOpenPurchase(item)
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
              title="구매 완료"
              description={`${completedDisplayItems.length}개 완료했어요`}
              action={
                <Button
                  variant="ghost"
                  disabled={
                    completedDisplayItems.length === 0
                  }
                  onClick={clearCompletedItems}
                >
                  완료 목록 비우기
                </Button>
              }
            >
              <Card className="shopping-basket-card">
                <div className="shopping-basket-actions">
                  <Button
                    fullWidth
                    disabled={
                      inventoryCandidateItems.length ===
                        0 ||
                      isApplyingInventory
                    }
                    onClick={handleOpenInventoryApply}
                  >
                    구매한 품목을 냉장고에 넣기
                  </Button>

                  {inventoryApplyMessage ? (
                    <p role="status">
                      {inventoryApplyMessage}
                    </p>
                  ) : null}
                </div>

                {completedDisplayItems.length === 0 ? (
                  <EmptyState
                    icon={<ShoppingBasket />}
                    title="아직 구매 완료한 품목이 없어요."
                    description="품목을 체크하면 이곳으로 이동해요."
                  />
                ) : (
                  <ul className="shopping-list">
                    {completedDisplayItems.map((item) => (
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
                        onOpenPurchase={() =>
                          handleOpenPurchase(item)
                        }
                      />
                    ))}
                  </ul>
                )}
              </Card>
            </Section>
          </>
        ) : null}
      </main>

      <BottomSheet
        open={purchaseModal.isOpen}
        title={
          selectedPurchaseItem
            ? `${selectedPurchaseItem.name} 구매 확인`
            : '구매 확인'
        }
        description="실제로 구매한 양을 간단히 기록하세요."
        onClose={purchaseModal.closeModal}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={purchaseModal.closeModal}
            >
              닫기
            </Button>
            <Button
              disabled={!isPurchaseInputValid}
              onClick={handleSavePurchase}
            >
              구매 정보 저장
            </Button>
          </>
        }
      >
        {selectedPurchaseItem ? (
          <div className="shopping-purchase-sheet">
            <div className="shopping-purchase-sheet__required">
              <span>필요한 수량</span>
              <strong>
                {selectedPurchaseItem.requiredQuantity}
                {selectedPurchaseUnit}
              </strong>
            </div>

            <StyledSelect
              label="구매 방식"
              value={purchaseMode}
              onChange={(event) =>
                setPurchaseMode(
                  event.target.value as
                    | 'single'
                    | 'package',
                )
              }
            >
              <option value="single">낱개</option>
              <option value="package">묶음</option>
            </StyledSelect>

            {purchaseMode === 'single' ? (
              <Input
                label={`실제 구매 수량 (${selectedPurchaseUnit})`}
                type="number"
                min={
                  selectedPurchaseItem.inventoryAppliedQuantity
                }
                step="0.1"
                value={purchasedQuantity}
                onChange={(event) =>
                  setPurchasedQuantity(
                    event.target.value,
                  )
                }
              />
            ) : (
              <div className="shopping-purchase-sheet__package">
                <Input
                  label={`묶음당 수량 (${selectedPurchaseUnit})`}
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={packageQuantity}
                  onChange={(event) =>
                    setPackageQuantity(
                      event.target.value,
                    )
                  }
                />
                <Input
                  label="구매 묶음 수 (봉·팩)"
                  type="number"
                  min="1"
                  step="1"
                  value={purchasedPackageCount}
                  onChange={(event) =>
                    setPurchasedPackageCount(
                      event.target.value,
                    )
                  }
                />
              </div>
            )}

            <div
              className="shopping-purchase-sheet__result"
              aria-live="polite"
            >
              <strong>
                총 {effectivePurchasedQuantity}
                {selectedPurchaseUnit}를 구매했어요.
              </strong>
              {purchaseRemainingQuantity > 0 ? (
                <p>
                  {purchaseRemainingQuantity}
                  {selectedPurchaseUnit} 더 필요해요.
                </p>
              ) : null}
              {purchaseSurplusQuantity > 0 ? (
                <p>
                  식단 사용 후 {purchaseSurplusQuantity}
                  {selectedPurchaseUnit}가 남을
                  예정이에요.
                </p>
              ) : null}
              {selectedPurchaseItem
                .inventoryAppliedQuantity > 0 ? (
                <p>
                  이미 냉장고에 반영한{' '}
                  {
                    selectedPurchaseItem
                      .inventoryAppliedQuantity
                  }
                  {selectedPurchaseUnit}보다 적게
                  수정할 수 없어요.
                </p>
              ) : null}
            </div>

            {selectedPurchaseItem
              .purchasedTotalQuantity === 0 &&
            effectivePurchasedQuantity === 0 ? (
                <Button
                  variant="danger"
                  fullWidth
                  onClick={handleMarkNotPurchased}
                >
                  이번에 못 삼
                </Button>
              ) : purchaseRemainingQuantity > 0 ? (
                <p className="shopping-purchase-sheet__partial-note">
                  부분 구매한 나머지 수량은 다음 장보기
                  목록에 그대로 남아요.
                </p>
              ) : null}
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={inventoryModal.isOpen}
        title={
          inventoryApplyStep === 'navigate' &&
          outstandingItemCountAfterApply > 0
            ? `아직 구매하지 못한 품목이 ${outstandingItemCountAfterApply}개 있어요.`
            : inventoryApplyStep === 'navigate'
              ? '구매한 재료를 냉장고에 넣었어요.'
              : '구매한 재료를 냉장고에 추가할까요?'
        }
        description={
          inventoryApplyStep === 'navigate' &&
          outstandingItemCountAfterApply > 0
            ? '다음 장보기에 다시 알려드릴게요.'
            : inventoryApplyStep === 'navigate'
              ? '냉장고에서 반영된 재료를 확인할 수 있어요.'
              : '실제 구매량만 반영하며 같은 품목과 단위는 합쳐져요.'
        }
        onClose={handleCloseInventoryModal}
        footer={
          inventoryApplyStep === 'navigate' ? (
            <>
              <Button
                variant="secondary"
                onClick={handleCloseInventoryModal}
              >
                장보기 계속하기
              </Button>
              <Button
                onClick={handleNavigateToInventory}
              >
                냉장고로 이동
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={handleCloseInventoryModal}
              >
                추가하지 않기
              </Button>
              <Button
                disabled={
                  (isInventoryItemSelectionOpen &&
                    selectedInventoryItemIds.size ===
                      0) ||
                  isApplyingInventory
                }
                onClick={() =>
                  handleApplyBasketToInventory(
                    isInventoryItemSelectionOpen
                      ? [
                          ...selectedInventoryItemIds,
                        ]
                      : inventoryCandidateItems.flatMap(
                          (item) => item.itemIds,
                        ),
                  )
                }
              >
                {isApplyingInventory
                  ? '냉장고에 넣는 중'
                  : isInventoryItemSelectionOpen
                    ? '선택한 품목 추가'
                    : '모두 추가'}
              </Button>
            </>
          )
        }
      >
        {inventoryApplyStep === 'navigate' ? (
          <div
            className="shopping-inventory-sheet__result"
            role="status"
          >
            <p>{inventoryApplyMessage}</p>
            {outstandingItemCountAfterApply > 0 ? (
              <p>
                구매 예정이거나 이번에 못 산 품목은
                장보기 목록에 그대로 남아 있어요.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="shopping-inventory-sheet">
            <p>
              모두 추가하거나 품목별로 확인할 수
              있어요.
            </p>
            {!isInventoryItemSelectionOpen ? (
              <Button
                variant="secondary"
                fullWidth
                onClick={() =>
                  setIsInventoryItemSelectionOpen(true)
                }
              >
                품목별 확인
              </Button>
            ) : (
              <ul>
                {inventoryCandidateItems.map((item) => {
                  const isSelected =
                    item.itemIds.some((itemId) =>
                      selectedInventoryItemIds.has(
                        itemId,
                      ),
                    )
                  const unit =
                    item.quantities[0]?.unit ?? '개'
                  const quantityToApply =
                    item.purchasedTotalQuantity -
                    item.inventoryAppliedQuantity

                  return (
                    <li key={item.key}>
                      <label>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            toggleInventoryCandidate(
                              item,
                            )
                          }
                        />
                        <span>
                          <strong>
                            {item.name}
                          </strong>
                          <small>
                            {quantityToApply}
                            {unit} 냉장고에 추가
                          </small>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </BottomSheet>

      {isQuickAddVisible ? (
        <Button
          className="shopping-quick-add"
          aria-label="품목 입력으로 이동"
          onClick={handleQuickAdd}
        >
          + 품목 추가
        </Button>
      ) : null}
    </>
  )
}

export default ShoppingPage
