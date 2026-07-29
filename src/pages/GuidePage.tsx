import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CircleHelp,
  PackageOpen,
  ShoppingCart,
  Sparkles,
  Utensils,
  type LucideIcon,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ScreenHeader from '../components/ui/ScreenHeader'
import Section from '../components/ui/Section'

type GuidePageProps = {
  onBack: () => void
}

const guideItems: Array<{
  title: string
  description: string
  Icon: LucideIcon
}> = [
  {
    title: '시작하기',
    description:
      '이번 주 식사를 먼저 정하고 필요한 재료를 장보기 목록에서 확인해 보세요.',
    Icon: Utensils,
  },
  {
    title: '식단',
    description:
      '날짜와 식사 시간을 골라 메뉴를 저장하고, 필요할 때 수정하거나 삭제할 수 있어요.',
    Icon: CalendarDays,
  },
  {
    title: '장보기',
    description:
      '구매한 품목을 체크하고 실제 구매량만 냉장고에 반영할 수 있어요.',
    Icon: ShoppingCart,
  },
  {
    title: '냉장고',
    description:
      '보유 재료의 이름과 수량, 단위를 관리하면 추천과 장보기가 더 정확해져요.',
    Icon: PackageOpen,
  },
  {
    title: '레시피',
    description:
      '재료 준비율, 계량 도우미, 조리 순서와 보관 방법을 차례로 확인하세요.',
    Icon: BookOpen,
  },
  {
    title: 'AI 기능',
    description:
      'AI 식단은 확인 후에만 저장되며, 기존 기본 식단과 냉장고 추천은 계속 사용할 수 있어요.',
    Icon: Sparkles,
  },
  {
    title: '자주 묻는 질문',
    description:
      '오늘식탁 데이터는 이 기기에 저장돼요. 더보기에서 전체 백업과 복원을 이용할 수 있습니다.',
    Icon: CircleHelp,
  },
]

function GuidePage({ onBack }: GuidePageProps) {
  return (
    <>
      <ScreenHeader
        title="오늘식탁 사용 가이드"
        description="필요한 기능을 짧게 살펴보세요."
        action={
          <Button
            variant="ghost"
            onClick={onBack}
            aria-label="더보기로 돌아가기"
          >
            <ArrowLeft
              size={18}
              aria-hidden="true"
            />
            돌아가기
          </Button>
        }
      />

      <main className="app-content guide-page">
        <Section
          title="처음부터 차근차근"
          description="오늘식탁의 주요 흐름을 화면 순서대로 정리했어요."
        >
          <div className="guide-page__grid">
            {guideItems.map(({ title, description, Icon }) => (
              <Card
                key={title}
                className="guide-page__card"
              >
                <div
                  className="guide-page__icon"
                  aria-hidden="true"
                >
                  <Icon size={22} strokeWidth={2} />
                </div>
                <div>
                  <h2>{title}</h2>
                  <p>{description}</p>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      </main>
    </>
  )
}

export default GuidePage
