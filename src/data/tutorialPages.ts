import {
  BookOpen,
  CalendarDays,
  Heart,
  Refrigerator,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react'

export type TutorialPage = {
  title: string
  description: string
  Icon: LucideIcon
}

export const tutorialPages: TutorialPage[] = [
  {
    title: '오늘식탁에 오신 것을 환영합니다.',
    description:
      '식단을 정하고 필요한 재료까지 한 번에 관리해요.',
    Icon: Heart,
  },
  {
    title: '이번 주 식사를 준비해요.',
    description:
      '기본 식단으로 시작하거나 우리 가족 맞춤 식단을 만들어요.',
    Icon: CalendarDays,
  },
  {
    title: '필요한 재료를 놓치지 않아요.',
    description:
      '필요한 재료를 장보기 목록으로 모아드려요.',
    Icon: ShoppingCart,
  },
  {
    title: '구매한 재료를 냉장고에 담아요.',
    description:
      '구매한 재료를 냉장고에 담아 다음 식사에 활용해요.',
    Icon: Refrigerator,
  },
  {
    title: '요리를 끝까지 함께해요.',
    description:
      '계량법과 조리 순서를 보며 쉽게 요리해요.',
    Icon: BookOpen,
  },
]
