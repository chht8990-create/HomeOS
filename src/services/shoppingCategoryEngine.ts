import type {
  ShoppingItem,
  ShoppingPurchaseMode,
  ShoppingPurchaseStatus,
  ShoppingItemSource,
} from '../types/shopping'
import {
  normalizeShoppingItem,
  summarizeShoppingPurchase,
} from './shoppingPurchaseEngine'

export const SHOPPING_CATEGORIES = [
  '채소',
  '과일',
  '육류',
  '수산물',
  '유제품',
  '냉동식품',
  '가공식품',
  '음료',
  '조미료',
  '기타',
] as const

export type ShoppingCategory =
  (typeof SHOPPING_CATEGORIES)[number]

export type ShoppingCategoryGroup = {
  category: ShoppingCategory
  items: ShoppingDisplayItem[]
}

export type ShoppingDisplayQuantity = {
  quantity: number
  unit?: string
}

export type ShoppingDisplayItem = {
  key: string
  itemIds: string[]
  name: string
  completed: boolean
  quantities: ShoppingDisplayQuantity[]
  sourceTypes: ShoppingItemSource[]
  sourceIds: string[]
  sourceRecipeNames: string[]
  sourceMealDates: string[]
  batchIds: string[]
  purchaseStatus: ShoppingPurchaseStatus
  purchaseMode: ShoppingPurchaseMode
  requiredQuantity: number
  purchasedTotalQuantity: number
  remainingPurchaseQuantity: number
  surplusQuantity: number
  inventoryAppliedQuantity: number
  packageQuantity?: number
  purchasedPackageCount?: number
}

const categoryKeywords: Record<
  Exclude<ShoppingCategory, '기타'>,
  string[]
> = {
  채소: [
    '대파',
    '쪽파',
    '양파',
    '감자',
    '고구마',
    '당근',
    '애호박',
    '호박',
    '배추',
    '상추',
    '깻잎',
    '시금치',
    '오이',
    '버섯',
    '마늘',
    '생강',
    '무',
    '콩나물',
    '숙주',
    '브로콜리',
    '파프리카',
  ],
  과일: [
    '사과',
    '배',
    '바나나',
    '딸기',
    '포도',
    '귤',
    '오렌지',
    '레몬',
    '복숭아',
    '수박',
    '참외',
    '키위',
    '망고',
    '블루베리',
  ],
  육류: [
    '돼지고기',
    '소고기',
    '쇠고기',
    '닭고기',
    '오리고기',
    '삼겹살',
    '목살',
    '갈비',
    '안심',
    '등심',
    '차돌박이',
    '베이컨',
  ],
  수산물: [
    '고등어',
    '갈치',
    '연어',
    '참치',
    '오징어',
    '문어',
    '낙지',
    '새우',
    '게',
    '조개',
    '홍합',
    '멸치',
    '어묵',
    '생선',
  ],
  유제품: [
    '우유',
    '치즈',
    '요거트',
    '요구르트',
    '버터',
    '생크림',
    '연유',
  ],
  냉동식품: [
    '냉동',
    '만두',
    '아이스크림',
    '핫도그',
    '피자',
  ],
  가공식품: [
    '김치',
    '두부',
    '햄',
    '소시지',
    '라면',
    '국수',
    '파스타',
    '빵',
    '시리얼',
    '통조림',
    '즉석밥',
    '떡',
  ],
  음료: [
    '생수',
    '탄산수',
    '주스',
    '음료',
    '콜라',
    '사이다',
    '커피',
    '차',
  ],
  조미료: [
    '간장',
    '된장',
    '고추장',
    '소금',
    '설탕',
    '식초',
    '후추',
    '참기름',
    '들기름',
    '식용유',
    '올리브유',
    '카레가루',
    '고춧가루',
    '마요네즈',
    '케첩',
    '소스',
  ],
}

export function getShoppingCategory(
  itemName: string,
): ShoppingCategory {
  const normalizedName = itemName
    .trim()
    .replace(/\s+/g, '')

  const matchedCategory =
    SHOPPING_CATEGORIES.find(
      (
        category,
      ): category is Exclude<
        ShoppingCategory,
        '기타'
      > =>
        category !== '기타' &&
        categoryKeywords[category].some((keyword) =>
          normalizedName.includes(keyword),
        ),
    )

  return matchedCategory ?? '기타'
}

export function groupShoppingItemsByCategory(
  items: ShoppingItem[],
): ShoppingCategoryGroup[] {
  return SHOPPING_CATEGORIES.flatMap((category) => {
    const categoryItems = items
      .map(normalizeShoppingItem)
      .filter(
        (item) =>
          getShoppingCategory(item.name) === category,
      )
    const mergedItems = new Map<
      string,
      ShoppingDisplayItem
    >()

    categoryItems.forEach((item) => {
      const normalizedName = item.name
        .trim()
        .toLowerCase()
      const itemKey = [
        category,
        item.purchaseStatus,
        normalizedName,
        item.unit?.trim().toLowerCase() ?? '',
      ].join(':')
      const existingItem = mergedItems.get(itemKey)

      if (!existingItem) {
        mergedItems.set(itemKey, {
          key: itemKey,
          itemIds: [item.id],
          name: item.name.trim(),
          completed: item.completed,
          sourceTypes: [item.source],
          sourceIds: item.sourceId
            ? [item.sourceId]
            : [],
          sourceRecipeNames:
            item.sourceRecipeName
              ? [item.sourceRecipeName]
              : [],
          sourceMealDates: item.sourceMealDate
            ? [item.sourceMealDate]
            : [],
          batchIds: item.batchId
            ? [item.batchId]
            : [],
          purchaseStatus:
            item.purchaseStatus ?? 'planned',
          purchaseMode:
            item.purchaseMode ?? 'single',
          requiredQuantity: 0,
          purchasedTotalQuantity: 0,
          remainingPurchaseQuantity: 0,
          surplusQuantity: 0,
          inventoryAppliedQuantity: 0,
          quantities:
            item.quantity === undefined
              ? []
              : [
                  {
                    quantity: item.quantity,
                    unit: item.unit,
                  },
                ],
        })
        return
      }

      existingItem.itemIds.push(item.id)

      if (!existingItem.sourceTypes.includes(item.source)) {
        existingItem.sourceTypes.push(item.source)
      }

      if (
        item.sourceId &&
        !existingItem.sourceIds.includes(item.sourceId)
      ) {
        existingItem.sourceIds.push(item.sourceId)
      }

      if (
        item.sourceRecipeName &&
        !existingItem.sourceRecipeNames.includes(
          item.sourceRecipeName,
        )
      ) {
        existingItem.sourceRecipeNames.push(
          item.sourceRecipeName,
        )
      }

      if (
        item.sourceMealDate &&
        !existingItem.sourceMealDates.includes(
          item.sourceMealDate,
        )
      ) {
        existingItem.sourceMealDates.push(
          item.sourceMealDate,
        )
      }

      if (
        item.batchId &&
        !existingItem.batchIds.includes(item.batchId)
      ) {
        existingItem.batchIds.push(item.batchId)
      }

      if (item.quantity === undefined) {
        return
      }

      const existingQuantity =
        existingItem.quantities.find(
          (quantity) => quantity.unit === item.unit,
        )

      if (existingQuantity) {
        existingQuantity.quantity += item.quantity
        return
      }

      existingItem.quantities.push({
        quantity: item.quantity,
        unit: item.unit,
      })
    })

    const itemById = new Map(
      categoryItems.map((item) => [item.id, item]),
    )
    const displayItems = Array.from(
      mergedItems.values(),
      (item) => {
        const purchaseSummary =
          summarizeShoppingPurchase(
            item.itemIds.flatMap((itemId) => {
              const sourceItem = itemById.get(itemId)

              return sourceItem ? [sourceItem] : []
            }),
          )

        return {
          ...item,
          ...purchaseSummary,
          itemIds: [...item.itemIds],
          sourceTypes: [...item.sourceTypes],
          sourceIds: [...item.sourceIds],
          sourceRecipeNames: [
            ...item.sourceRecipeNames,
          ],
          sourceMealDates: [
            ...item.sourceMealDates,
          ],
          batchIds: [...item.batchIds],
          quantities: item.quantities.map(
            (quantity) => ({ ...quantity }),
          ),
        }
      },
    )

    return displayItems.length > 0
      ? [
          {
            category,
            items: displayItems,
          },
        ]
      : []
  })
}
