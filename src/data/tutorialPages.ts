import {
  BookOpen,
  CalendarDays,
  Heart,
  PackageOpen,
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
      '식단부터 장보기, 냉장고, 레시피까지 한 번에 관리하세요.',
    Icon: Heart,
  },
  {
    title: '이번 주 식사를 준비해요.',
    description:
      '기본 식단을 사용할 수도 있고 AI로 우리 가족 맞춤 식단도 만들 수 있습니다.',
    Icon: CalendarDays,
  },
  {
    title: '필요한 재료를 놓치지 않아요.',
    description:
      '식단에서 필요한 재료를 자동으로 장보기 목록으로 만듭니다. 부분 구매와 묶음 구매도 지원해요.',
    Icon: ShoppingCart,
  },
  {
    title: '구매한 재료를 냉장고에 담아요.',
    description:
      '구매한 재료를 자동으로 냉장고에 추가하고, 보유 재료를 기준으로 식사를 추천합니다.',
    Icon: PackageOpen,
  },
  {
    title: '요리를 끝까지 함께해요.',
    description:
      '상세 레시피와 계량 도우미, 조리 순서, 보관법까지 확인할 수 있습니다.',
    Icon: BookOpen,
  },
]
