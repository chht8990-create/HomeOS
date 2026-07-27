import type { Recipe } from '../types/recipe'

export const recipes: Recipe[] = [
  {
    id: 'kimchi-stew',
    name: '김치찌개',
    ingredients: [
      {
        id: 'kimchi',
        name: '김치',
        quantity: 1,
        unit: '포기',
      },
      {
        id: 'pork',
        name: '돼지고기',
        quantity: 500,
        unit: 'g',
      },
      {
        id: 'tofu',
        name: '두부',
        quantity: 1,
        unit: '모',
      },
      {
        id: 'green-onion',
        name: '대파',
        quantity: 1,
        unit: '대',
      },
    ],
  },
]