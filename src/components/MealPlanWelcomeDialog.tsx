import {
  CalendarDays,
  Sparkles,
} from 'lucide-react'
import Button from './ui/Button'
import Dialog from './ui/Dialog'

type MealPlanWelcomeDialogProps = {
  open: boolean
  onClose: () => void
  onStartDefaultPlan: () => void
  onStartAiTrial: () => void
}

function MealPlanWelcomeDialog({
  open,
  onClose,
  onStartDefaultPlan,
  onStartAiTrial,
}: MealPlanWelcomeDialogProps) {
  return (
    <Dialog
      open={open}
      title="한 달 식단을 준비했어요"
      description="기본 식단으로 바로 시작하거나 AI로 우리 가족 맞춤 식단을 만들어보세요."
      onClose={onClose}
      footer={
        <div className="meal-plan-welcome__actions">
          <Button
            fullWidth
            onClick={onStartDefaultPlan}
          >
            <CalendarDays
              size={18}
              aria-hidden="true"
            />
            기본 식단으로 시작하기
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={onStartAiTrial}
          >
            <Sparkles
              size={18}
              aria-hidden="true"
            />
            AI 맞춤 7일 식단 무료 체험
          </Button>
        </div>
      }
    >
      <div className="meal-plan-welcome">
        <span
          className="meal-plan-welcome__icon"
          aria-hidden="true"
        >
          <CalendarDays size={32} />
        </span>
        <p>
          오늘부터 바로 시작할 수 있는 30일 기본
          식단을 준비했어요. 메뉴별 상세 레시피도
          인터넷 연결 없이 볼 수 있어요.
        </p>
        <p className="meal-plan-welcome__note">
          이미 저장한 식단은 자동으로 바꾸지 않아요.
        </p>
      </div>
    </Dialog>
  )
}

export default MealPlanWelcomeDialog
