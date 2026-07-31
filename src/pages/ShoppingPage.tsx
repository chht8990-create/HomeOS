import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Check,
  ChevronDown,
  Info,
  MoreHorizontal,
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
import {
  createShoppingReminderPreview,
  shouldShowShoppingReminder,
} from '../services/shoppingPurchaseEngine'
import { createIngredientUnitPresentation } from '../services/ingredientUnitEngine'

const ITEM_TRANSITION_DELAY_MS = 600
const SHOPPING_PURCHASE_HELP_KEY =
  'today-table.shopping.purchase-help.v1'

function formatShoppingQuantity(
  name: string,
  quantity: number,
  unit: string,
) {
  return createIngredientUnitPresentation({
    name,
    quantity,
    unit,
  }).displayText
}

type ShoppingPageProps = {
  onChangePage: (page: PageName) => void
}

type ShoppingItemRowProps = {
  item: ShoppingDisplayItem
  isTransitioning: boolean
  onToggle: () => void
  onOpenPurchase: () => void
}

function ShoppingItemRow({
  item,
  isTransitioning,
  onToggle,
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
  const sourceDetail =
    item.sourceRecipeNames.length > 0
      ? `${item.sourceRecipeNames.join(', ')}${
          item.sourceMealDates[0]
            ? ` · ${item.sourceMealDates[0]}`
            : ''
        }`
      : sourceLabel
  const purchaseLabel =
    item.purchaseStatus === 'partial'
      ? '부분 구매'
      : item.purchaseStatus === 'completed'
        ? '구매 완료'
        : item.purchaseStatus === 'not-purchased'
          ? '다시 살 재료'
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
          필요{' '}
          {formatShoppingQuantity(
            item.name,
            item.requiredQuantity,
            unit,
          )}
          {' · '}
          {sourceDetail}
        </small>

        {item.purchasedTotalQuantity > 0 ? (
          <small className="shopping-item__purchase-summary">
            {item.purchaseMode === 'package' &&
            item.packageQuantity &&
            item.purchasedPackageCount !== undefined
              ? `구매 ${item.packageQuantity}${unit}입 ${item.purchasedPackageCount}봉`
              : `구매 ${item.purchasedTotalQuantity}${unit}`}
            {item.remainingPurchaseQuantity > 0
              ? ` · ${formatShoppingQuantity(
                  item.name,
                  item.remainingPurchaseQuantity,
                  unit,
                )} 더 필요`
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
        className="shopping-item__more"
        disabled={isTransitioning}
        onClick={onOpenPurchase}
        aria-label={`${item.name} 구매 기록과 추가 동작 열기`}
      >
        <MoreHorizontal
          size={22}
          aria-hidden="true"
        />
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
    isReminderExpanded,
    setIsReminderExpanded,
  ] = useState(false)
  const [
    hiddenReminderItemKeys,
    setHiddenReminderItemKeys,
  ] = useState<Set<string>>(() => new Set())
  const [
    isPurchaseHelpVisible,
    setIsPurchaseHelpVisible,
  ] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return (
      window.localStorage.getItem(
        SHOPPING_PURCHASE_HELP_KEY,
      ) !== 'dismissed'
    )
  })
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
  const [inventoryApplySummary, setInventoryApplySummary] =
    useState({
      appliedItemCount: 0,
      reminderItemCount: 0,
      plannedItemCount: 0,
    })
  const purchaseModal =
    useHistoryModal<ShoppingDisplayItem>(
      'shopping-purchase',
    )
  const inventoryModal =
    useHistoryModal<'inventory-apply'>(
      'shopping-inventory-apply',
    )
  const reminderActionsModal =
    useHistoryModal<ShoppingDisplayItem>(
      'shopping-reminder-actions',
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
  const visibleReminderDisplayItems =
    reminderDisplayItems.filter(
      (item) =>
        !hiddenReminderItemKeys.has(item.key),
    )
  const latestMealBatchId = [...remainingItems]
    .filter(
      (item) =>
        item.source === 'meal' && item.batchId,
    )
    .sort((first, second) =>
      second.createdAt.localeCompare(
        first.createdAt,
      ),
    )[0]?.batchId
  const remainingSourceGroups = [
    {
      key: 'new',
      title: '이번 장보기',
      matches: (item: ShoppingDisplayItem) =>
        Boolean(
          latestMealBatchId &&
            item.batchIds.includes(
              latestMealBatchId,
            ),
        ),
    },
    {
      key: 'existing',
      title: '기존 구매 예정',
      matches: (item: ShoppingDisplayItem) =>
        item.sourceTypes.includes('meal') &&
        !(
          latestMealBatchId &&
          item.batchIds.includes(
            latestMealBatchId,
          )
        ),
    },
    {
      key: 'manual',
      title: '직접 추가한 재료',
      matches: (item: ShoppingDisplayItem) =>
        !item.sourceTypes.includes('meal'),
    },
  ].flatMap((sourceGroup) => {
    const categoryGroups =
      remainingCategoryGroups.flatMap(
        (categoryGroup) => {
          const items = categoryGroup.items.filter(
            sourceGroup.matches,
          )

          return items.length > 0
            ? [
                {
                  ...categoryGroup,
                  items,
                },
              ]
            : []
        },
      )

    return categoryGroups.length > 0
      ? [
          {
            key: sourceGroup.key,
            title: sourceGroup.title,
            categoryGroups,
          },
        ]
      : []
  })
  const reminderPreview =
    createShoppingReminderPreview(
      visibleReminderDisplayItems,
      isReminderExpanded,
    )
  const isReminderVisible =
    shouldShowShoppingReminder(
      visibleReminderDisplayItems.length,
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
    setInventoryApplySummary({
      appliedItemCount: 0,
      reminderItemCount: 0,
      plannedItemCount: 0,
    })
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
      const result =
        applyCompletedItemsToInventory(
          itemIds,
        )

      if (result.appliedItemCount > 0) {
        setInventoryApplyMessage(
          `냉장고에 ${result.appliedItemCount}가지 재료를 넣었어요.`,
        )
        setInventoryApplySummary(result)
        setInventoryApplyStep('navigate')
      }
    } finally {
      isApplyingInventoryRef.current = false
      setIsApplyingInventory(false)
    }
  }

  function handleCloseInventoryModal() {
    setInventoryApplyStep('select')
    setInventoryApplySummary({
      appliedItemCount: 0,
      reminderItemCount: 0,
      plannedItemCount: 0,
    })
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

  function handleExcludeReminderItem(
    item: ShoppingDisplayItem,
  ) {
    setHiddenReminderItemKeys((current) => {
      const next = new Set(current)

      next.add(item.key)
      return next
    })
  }

  function dismissPurchaseHelp() {
    window.localStorage.setItem(
      SHOPPING_PURCHASE_HELP_KEY,
      'dismissed',
    )
    setIsPurchaseHelpVisible(false)
  }

  return (
    <>
      <ScreenHeader
        title="장보기 목록"
        description="필요한 재료를 확인하고 하나씩 체크해 보세요."
      />

      <main className="app-content">
        {isReminderVisible ? (
          <Section
            className="shopping-reminder-section"
            title="다시 살 재료"
            description={`지난 장보기에서 구하지 못한 재료 ${visibleReminderDisplayItems.length}개예요.`}
          >
            <Card>
              <div className="shopping-reminder">
                <AlertCircle
                  size={22}
                  aria-hidden="true"
                />
                <ul>
                  {reminderPreview.visibleItems.map((item) => (
                    <li key={item.key}>
                      <span>
                        <strong>{item.name}</strong>
                        <small>
                          {formatShoppingQuantity(
                            item.name,
                            item.remainingPurchaseQuantity ||
                              item.requiredQuantity,
                            item.quantities[0]?.unit ??
                              '개',
                          )}{' '}
                          남음
                          {item.sourceRecipeNames.length >
                          0
                            ? ` · ${item.sourceRecipeNames.join(
                                ', ',
                              )}`
                            : ''}
                        </small>
                      </span>
                      <div className="shopping-reminder__item-actions">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            handleOpenPurchase(item)
                          }
                        >
                          구매 완료
                        </Button>
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
                          이번 장보기에 포함
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() =>
                            handleExcludeReminderItem(
                              item,
                            )
                          }
                        >
                          이번 목록에서 제외
                        </Button>
                        <button
                          type="button"
                          className="shopping-reminder__more-actions"
                          aria-label={`${item.name} 다시 살 재료 추가 동작 열기`}
                          onClick={() =>
                            reminderActionsModal.openModal(
                              item,
                            )
                          }
                        >
                          <MoreHorizontal
                            size={20}
                            aria-hidden="true"
                          />
                        </button>
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
                {reminderPreview.hiddenCount > 0 ? (
                  <p className="shopping-reminder__more">
                    외 {reminderPreview.hiddenCount}개
                  </p>
                ) : null}
                <div className="shopping-reminder__actions">
                  {reminderPreview.canToggle ? (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setIsReminderExpanded(
                          (current) => !current,
                        )
                      }
                    >
                      {reminderPreview.isExpanded
                        ? '접기'
                        : '모두 보기'}
                    </Button>
                  ) : null}
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsReminderExpanded(false)
                      setIsReminderDismissed(true)
                    }}
                  >
                    나중에
                  </Button>
                </div>
              </div>
            </Card>
          </Section>
        ) : null}

        {!isShoppingEmpty &&
        isPurchaseHelpVisible ? (
          <Card
            className="shopping-action-help"
          >
            <Info size={20} aria-hidden="true" />
            <p>
              재료나 오른쪽 더보기 버튼을 눌러 실제
              구매량을 기록하거나, 이번에 못 산 재료로
              남길 수 있어요.
            </p>
            <Button
              variant="ghost"
              onClick={dismissPurchaseHelp}
            >
              확인했어요
            </Button>
          </Card>
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
          description="필요한 재료를 목록에 추가하세요."
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
                aria-label="구매할 재료"
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
                재료를 추가하면 목록과 진행률이 표시돼요.
              </p>
            ) : null}
          </Card>
        </Section>

        {!isShoppingEmpty ? (
          <>
            <Section
              title="구매할 재료"
              description={`${remainingDisplayItems.length}개 남았어요`}
            >
              <Card>
                {remainingDisplayItems.length === 0 ? (
                  <EmptyState
                    icon={<ShoppingCart />}
                    title="모든 재료를 구매했어요."
                    description="구매한 재료는 장바구니에 담겨 있어요."
                  />
                ) : (
                  <div className="shopping-source-groups">
                    {remainingSourceGroups.map(
                      (sourceGroup) => (
                        <section
                          key={sourceGroup.key}
                          className="shopping-source-group"
                        >
                          <h3>{sourceGroup.title}</h3>
                          <div className="shopping-groups">
                            {sourceGroup.categoryGroups.map(
                              (group) => (
                                <details
                                  key={`${sourceGroup.key}-${group.category}`}
                                  className="shopping-group"
                                  open
                                >
                                  <summary>
                                    <span>
                                      {group.category}
                                    </span>
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
                                    {group.items.map(
                                      (item) => (
                                        <ShoppingItemRow
                                          key={item.key}
                                          item={item}
                                          isTransitioning={transitioningItemKeys.has(
                                            item.key,
                                          )}
                                          onToggle={() =>
                                            handleToggleItem(
                                              item,
                                            )
                                          }
                                          onOpenPurchase={() =>
                                            handleOpenPurchase(
                                              item,
                                            )
                                          }
                                        />
                                      ),
                                    )}
                                  </ul>
                                </details>
                              ),
                            )}
                          </div>
                        </section>
                      ),
                    )}
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
                    구매한 재료를 냉장고에 넣기
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
                    title="아직 구매한 재료가 없어요."
                    description="재료를 체크하면 이곳으로 이동해요."
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
        open={reminderActionsModal.isOpen}
        title={
          reminderActionsModal.value
            ? `${reminderActionsModal.value.name} 추가 동작`
            : '다시 살 재료 추가 동작'
        }
        description="구매 상태를 기록하거나 이번 목록에서 정리할 수 있어요."
        onClose={reminderActionsModal.closeModal}
      >
        {reminderActionsModal.value ? (
          <div className="shopping-reminder-actions-sheet">
            <Button
              fullWidth
              onClick={() =>
                reminderActionsModal.closeModalAndThen(
                  () =>
                    handleOpenPurchase(
                      reminderActionsModal.value!,
                    ),
                )
              }
            >
              구매 완료
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                handleExcludeReminderItem(
                  reminderActionsModal.value!,
                )
                reminderActionsModal.closeModal()
              }}
            >
              이번 목록에서 제외
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={() => {
                handleDeleteReminderItem(
                  reminderActionsModal.value!,
                )
                reminderActionsModal.closeModal()
              }}
            >
              삭제
            </Button>
          </div>
        ) : null}
      </BottomSheet>

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
                {formatShoppingQuantity(
                  selectedPurchaseItem.name,
                  selectedPurchaseItem.requiredQuantity,
                  selectedPurchaseUnit,
                )}
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
                총{' '}
                {formatShoppingQuantity(
                  selectedPurchaseItem.name,
                  effectivePurchasedQuantity,
                  selectedPurchaseUnit,
                )}
                를 구매했어요.
              </strong>
              {purchaseRemainingQuantity > 0 ? (
                <p>
                  {formatShoppingQuantity(
                    selectedPurchaseItem.name,
                    purchaseRemainingQuantity,
                    selectedPurchaseUnit,
                  )}{' '}
                  더 필요해요.
                </p>
              ) : null}
              {purchaseSurplusQuantity > 0 ? (
                <p>
                  식단 사용 후{' '}
                  {formatShoppingQuantity(
                    selectedPurchaseItem.name,
                    purchaseSurplusQuantity,
                    selectedPurchaseUnit,
                  )}
                  가 남을 예정이에요.
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
              <>
                <Button
                  variant="danger"
                  fullWidth
                  onClick={handleMarkNotPurchased}
                >
                  이번에는 못 샀어요
                </Button>
                <p className="shopping-purchase-sheet__not-purchased-note">
                  다음 장보기에 다시 알려드려요.
                </p>
              </>
              ) : purchaseRemainingQuantity > 0 ? (
                <p className="shopping-purchase-sheet__partial-note">
                  부분 구매한 나머지 수량은 다음 장보기
                  목록에 그대로 남아요.
                </p>
              ) : null}
            <Button
              variant="ghost"
              fullWidth
              onClick={() => {
                handleDeleteItem(
                  selectedPurchaseItem,
                )
                purchaseModal.closeModal()
              }}
            >
              이 재료 삭제
            </Button>
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={inventoryModal.isOpen}
        title={
          inventoryApplyStep === 'navigate' &&
          inventoryApplySummary.reminderItemCount +
            inventoryApplySummary.plannedItemCount >
            0
            ? '냉장고 반영 결과를 확인해 주세요.'
            : inventoryApplyStep === 'navigate'
              ? '구매한 재료를 냉장고에 넣었어요.'
              : '구매한 재료를 냉장고에 추가할까요?'
        }
        description={
          inventoryApplyStep === 'navigate' &&
          inventoryApplySummary.reminderItemCount +
            inventoryApplySummary.plannedItemCount >
            0
            ? '이번에 못 산 재료만 다음 장보기에 다시 알려드릴게요.'
            : inventoryApplyStep === 'navigate'
              ? '냉장고에서 반영된 재료를 확인할 수 있어요.'
              : '실제 구매량만 반영하며 같은 재료와 단위는 합쳐져요.'
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
                    ? '선택한 재료 추가'
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
            <ul>
              <li>
                냉장고에 넣은 재료:{' '}
                {inventoryApplySummary.appliedItemCount}개
              </li>
              <li>
                이번에 못 산 재료:{' '}
                {inventoryApplySummary.reminderItemCount}개
              </li>
              <li>
                아직 구매 예정인 재료:{' '}
                {inventoryApplySummary.plannedItemCount}개
              </li>
            </ul>
          </div>
        ) : (
          <div className="shopping-inventory-sheet">
            <p>
              모두 추가하거나 재료별로 확인할 수
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
                재료별 확인
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
          aria-label="재료 입력으로 이동"
          onClick={handleQuickAdd}
        >
          + 재료 추가
        </Button>
      ) : null}
    </>
  )
}

export default ShoppingPage
