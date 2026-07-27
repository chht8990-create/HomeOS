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
  {
    id: 'curry',
    name: '카레',
    ingredients: [
      {
        id: 'curry-powder',
        name: '카레가루',
        quantity: 100,
        unit: 'g',
      },
      {
        id: 'curry-pork',
        name: '돼지고기',
        quantity: 300,
        unit: 'g',
      },
      {
        id: 'curry-potato',
        name: '감자',
        quantity: 2,
        unit: '개',
      },
      {
        id: 'curry-carrot',
        name: '당근',
        quantity: 1,
        unit: '개',
      },
      {
        id: 'curry-onion',
        name: '양파',
        quantity: 1,
        unit: '개',
      },
    ],
  },
  {
    id: 'spicy-pork',
    name: '제육볶음',
    ingredients: [
      {
        id: 'spicy-pork-pork',
        name: '돼지고기',
        quantity: 600,
        unit: 'g',
      },
      {
        id: 'spicy-pork-onion',
        name: '양파',
        quantity: 1,
        unit: '개',
      },
      {
        id: 'spicy-pork-green-onion',
        name: '대파',
        quantity: 1,
        unit: '대',
      },
      {
        id: 'spicy-pork-gochujang',
        name: '고추장',
        quantity: 3,
        unit: '큰술',
      },
    ],
  },
  {
    id: 'soybean-paste-stew',
    name: '된장찌개',
    ingredients: [
      {
        id: 'soybean-paste-stew-doenjang',
        name: '된장',
        quantity: 2,
        unit: '큰술',
      },
      {
        id: 'soybean-paste-stew-tofu',
        name: '두부',
        quantity: 1,
        unit: '모',
      },
      {
        id: 'soybean-paste-stew-zucchini',
        name: '애호박',
        quantity: 1,
        unit: '개',
      },
      {
        id: 'soybean-paste-stew-onion',
        name: '양파',
        quantity: 1,
        unit: '개',
      },
      {
        id: 'soybean-paste-stew-green-onion',
        name: '대파',
        quantity: 1,
        unit: '대',
      },
    ],
  },
  {
    id: 'egg-fried-rice',
    name: '계란볶음밥',
    ingredients: [
      {
        id: 'egg-fried-rice-rice',
        name: '밥',
        quantity: 2,
        unit: '공기',
      },
      {
        id: 'egg-fried-rice-egg',
        name: '계란',
        quantity: 2,
        unit: '개',
      },
      {
        id: 'egg-fried-rice-green-onion',
        name: '대파',
        quantity: 1,
        unit: '대',
      },
      {
        id: 'egg-fried-rice-soy-sauce',
        name: '간장',
        quantity: 1,
        unit: '큰술',
      },
    ],
  },
]
