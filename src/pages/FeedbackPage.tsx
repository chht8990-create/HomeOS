import {
  useRef,
  useState,
  type FormEvent,
} from 'react'
import {
  ArrowLeft,
  MessageSquareText,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import ScreenHeader from '../components/ui/ScreenHeader'
import Section from '../components/ui/Section'
import StyledSelect from '../components/ui/StyledSelect'
import Textarea from '../components/ui/Textarea'
import {
  createFeedbackPayload,
  submitFeedback,
} from '../services/feedbackClient'
import {
  FEEDBACK_MESSAGE_MAX_LENGTH,
  FEEDBACK_MESSAGE_MIN_LENGTH,
  feedbackCategoryLabels,
} from '../services/feedbackEngine'
import type { FeedbackCategory } from '../types/feedback'
import {
  OFFICIAL_SUPPORT_EMAIL,
  OFFICIAL_SUPPORT_MAILTO,
} from '../config/contact'

type FeedbackPageProps = {
  onBack: () => void
}

type FeedbackFieldErrors = {
  category?: string
  message?: string
}

function FeedbackPage({
  onBack,
}: FeedbackPageProps) {
  const [category, setCategory] = useState<
    FeedbackCategory | ''
  >('')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [errors, setErrors] =
    useState<FeedbackFieldErrors>({})
  const [submissionState, setSubmissionState] =
    useState<
      'idle' | 'submitting' | 'success' | 'error'
    >('idle')
  const isSubmittingRef = useRef(false)

  function validateFields() {
    const nextErrors: FeedbackFieldErrors = {}
    const trimmedMessage = message.trim()

    if (!category) {
      nextErrors.category =
        '의견 유형을 선택해 주세요.'
    }

    if (
      trimmedMessage.length <
      FEEDBACK_MESSAGE_MIN_LENGTH
    ) {
      nextErrors.message = `의견을 ${FEEDBACK_MESSAGE_MIN_LENGTH}자 이상 입력해 주세요.`
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (
      isSubmittingRef.current ||
      !validateFields() ||
      !category
    ) {
      return
    }

    isSubmittingRef.current = true
    setSubmissionState('submitting')

    try {
      await submitFeedback(
        createFeedbackPayload(
          category,
          message,
          contact,
          'feedback',
        ),
      )
      setCategory('')
      setMessage('')
      setContact('')
      setErrors({})
      setSubmissionState('success')
    } catch {
      setSubmissionState('error')
    } finally {
      isSubmittingRef.current = false
    }
  }

  if (submissionState === 'success') {
    return (
      <>
        <ScreenHeader
          title="의견 보내기"
          description="오늘식탁을 함께 더 편하게 만들어 주세요."
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

        <main className="app-content feedback-page">
          <Card className="feedback-success">
            <MessageSquareText
              size={30}
              aria-hidden="true"
            />
            <h2>의견을 보내주셔서 감사합니다.</h2>
            <p>
              남겨주신 의견을 오늘식탁을 더 편하게
              만드는 데 참고할게요.
            </p>
            <Button fullWidth onClick={onBack}>
              더보기로 돌아가기
            </Button>
          </Card>
        </main>
      </>
    )
  }

  return (
    <>
      <ScreenHeader
        title="의견 보내기"
        description="남겨주신 의견은 오늘식탁을 더 편하게 만드는 데 사용됩니다."
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

      <main className="app-content feedback-page">
        <Section
          title="의견을 들려주세요"
          description="연락처를 남기지 않아도 보낼 수 있어요."
        >
          <Card>
            <form
              className="feedback-form"
              onSubmit={handleSubmit}
              noValidate
            >
              <StyledSelect
                label="의견 유형"
                value={category}
                error={errors.category}
                onChange={(event) => {
                  setCategory(
                    event.target
                      .value as FeedbackCategory,
                  )
                  setErrors((current) => ({
                    ...current,
                    category: undefined,
                  }))
                  setSubmissionState('idle')
                }}
                required
              >
                <option value="" disabled>
                  의견 유형을 선택하세요
                </option>
                {Object.entries(
                  feedbackCategoryLabels,
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </StyledSelect>

              <div className="feedback-form__message">
                <Textarea
                  label="내용"
                  value={message}
                  error={errors.message}
                  placeholder="어떤 상황에서 무엇이 불편했는지 알려주세요."
                  rows={7}
                  minLength={
                    FEEDBACK_MESSAGE_MIN_LENGTH
                  }
                  maxLength={
                    FEEDBACK_MESSAGE_MAX_LENGTH
                  }
                  onChange={(event) => {
                    setMessage(event.target.value)
                    setErrors((current) => ({
                      ...current,
                      message: undefined,
                    }))
                    setSubmissionState('idle')
                  }}
                  required
                />
                <span
                  className="feedback-form__counter"
                  aria-live="polite"
                >
                  {message.length.toLocaleString(
                    'ko-KR',
                  )}{' '}
                  /{' '}
                  {FEEDBACK_MESSAGE_MAX_LENGTH.toLocaleString(
                    'ko-KR',
                  )}
                </span>
              </div>

              <Input
                label="연락처 (선택)"
                type="text"
                value={contact}
                maxLength={200}
                placeholder="답변이 필요하면 이메일을 남겨주세요."
                description="연락처는 답변이 필요한 경우에만 사용합니다."
                onChange={(event) => {
                  setContact(event.target.value)
                  setSubmissionState('idle')
                }}
              />

              <p className="feedback-form__diagnostics">
                앱 버전과 기기 정보가 오류 확인을 위해
                함께 전송됩니다. 식단·냉장고·장보기
                내용은 전송하지 않아요.
              </p>

              <p className="feedback-form__support">
                계정·개인정보 문의는{' '}
                <a href={OFFICIAL_SUPPORT_MAILTO}>
                  {OFFICIAL_SUPPORT_EMAIL}
                </a>
                로 보내주세요.
              </p>

              {submissionState === 'error' ? (
                <div
                  className="feedback-form__error"
                  role="alert"
                >
                  <strong>
                    의견을 보내지 못했어요.
                  </strong>
                  <p>
                    인터넷 연결을 확인하고 다시 시도해
                    주세요.
                  </p>
                </div>
              ) : null}

              <Button
                className="feedback-form__submit"
                type="submit"
                fullWidth
                disabled={
                  submissionState === 'submitting'
                }
              >
                {submissionState === 'submitting'
                  ? '보내는 중…'
                  : submissionState === 'error'
                    ? '다시 시도'
                    : '의견 보내기'}
              </Button>
            </form>
          </Card>
        </Section>
      </main>
    </>
  )
}

export default FeedbackPage
