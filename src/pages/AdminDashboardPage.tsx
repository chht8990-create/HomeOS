import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Bot,
  CircleDollarSign,
  Database,
  ShieldCheck,
  Users,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ScreenHeader from '../components/ui/ScreenHeader'
import Section from '../components/ui/Section'
import Spinner from '../components/ui/Spinner'
import {
  fetchAdminDashboard,
  updateAdminAiSwitch,
} from '../services/adminClient'
import type { AdminDashboardSummary } from '../types/business'

type AdminDashboardPageProps = {
  onBack: () => void
}

function formatCost(value: number) {
  return `$${value.toFixed(4)}`
}

function AdminDashboardPage({
  onBack,
}: AdminDashboardPageProps) {
  const [summary, setSummary] =
    useState<AdminDashboardSummary | null>(null)
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading')
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    let active = true

    fetchAdminDashboard()
      .then((value) => {
        if (active) {
          setSummary(value)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (active) {
          setStatus('error')
        }
      })

    return () => {
      active = false
    }
  }, [])

  async function toggleAi() {
    if (!summary || switching) {
      return
    }

    setSwitching(true)

    try {
      const result = await updateAdminAiSwitch(
        !summary.aiEnabled,
      )
      setSummary({
        ...summary,
        aiEnabled: result.aiEnabled,
      })
    } finally {
      setSwitching(false)
    }
  }

  return (
    <>
      <ScreenHeader
        title="운영 대시보드"
        description="계정, AI 비용, 시스템 상태를 확인합니다."
        action={
          <Button
            variant="ghost"
            onClick={onBack}
            aria-label="더보기로 돌아가기"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            돌아가기
          </Button>
        }
      />

      <main className="app-content admin-dashboard-page">
        {status === 'loading' ? (
          <Card className="admin-dashboard-state">
            <Spinner label="운영 정보 불러오는 중" />
            <p>운영 정보를 불러오고 있어요.</p>
          </Card>
        ) : null}

        {status === 'error' ? (
          <Card className="admin-dashboard-state">
            <ShieldCheck size={28} aria-hidden="true" />
            <h2>관리자 권한을 확인할 수 없어요.</h2>
            <p>
              로그인 상태와 ADMIN_USER_IDS 설정을 확인해
              주세요.
            </p>
          </Card>
        ) : null}

        {summary ? (
          <>
            <Section title="오늘의 운영 현황">
              <div className="admin-metric-grid">
                <Card>
                  <Users size={20} aria-hidden="true" />
                  <span>가입자</span>
                  <strong>{summary.subscribers}</strong>
                </Card>
                <Card>
                  <Bot size={20} aria-hidden="true" />
                  <span>오늘 AI 호출</span>
                  <strong>{summary.todayAiCalls}</strong>
                </Card>
                <Card>
                  <CircleDollarSign
                    size={20}
                    aria-hidden="true"
                  />
                  <span>오늘 비용</span>
                  <strong>
                    {formatCost(
                      summary.todayEstimatedCostUsd,
                    )}
                  </strong>
                </Card>
                <Card>
                  <CircleDollarSign
                    size={20}
                    aria-hidden="true"
                  />
                  <span>이번 달 비용</span>
                  <strong>
                    {formatCost(
                      summary.monthEstimatedCostUsd,
                    )}
                  </strong>
                </Card>
              </div>
            </Section>

            <Section
              title="이용 권한"
              description={`FREE ${summary.plans.FREE} · TRIAL ${summary.plans.TRIAL} · PREMIUM ${summary.plans.PREMIUM}`}
            >
              <Card className="admin-ai-switch">
                <div>
                  <strong>AI 긴급 스위치</strong>
                  <p>
                    AI만 중지되며 식단, 장보기, 냉장고는
                    계속 사용할 수 있습니다.
                  </p>
                </div>
                <Button
                  variant={
                    summary.aiEnabled
                      ? 'secondary'
                      : 'primary'
                  }
                  disabled={switching}
                  onClick={toggleAi}
                >
                  {summary.aiEnabled ? 'AI 중지' : 'AI 켜기'}
                </Button>
              </Card>
            </Section>

            <Section
              title="Google Play 구독"
              description={`취소 ${summary.billing.canceled} · 보류 ${summary.billing.onHold} · 일시정지 ${summary.billing.paused}`}
            >
              <div className="admin-metric-grid">
                <Card>
                  <CircleDollarSign
                    size={20}
                    aria-hidden="true"
                  />
                  <span>Active</span>
                  <strong>{summary.billing.active}</strong>
                </Card>
                <Card>
                  <CircleDollarSign
                    size={20}
                    aria-hidden="true"
                  />
                  <span>Expired</span>
                  <strong>{summary.billing.expired}</strong>
                </Card>
                <Card>
                  <CircleDollarSign
                    size={20}
                    aria-hidden="true"
                  />
                  <span>Pending</span>
                  <strong>{summary.billing.pending}</strong>
                </Card>
              </div>
            </Section>

            <Section title="시스템">
              <Card className="admin-system-grid">
                {Object.entries({
                  OpenAI: summary.system.openAi,
                  DB: summary.system.database,
                  OAuth: summary.system.oauth,
                  Billing: summary.system.billing,
                }).map(([label, configured]) => (
                  <div key={label}>
                    <Database size={17} aria-hidden="true" />
                    <span>{label}</span>
                    <Badge
                      tone={
                        configured ? 'success' : 'warning'
                      }
                    >
                      {configured ? '설정됨' : '확인 필요'}
                    </Badge>
                  </div>
                ))}
              </Card>
            </Section>

            <Section
              title="사용자"
              description={`오류 ${summary.todayErrors}건 · 의견 ${summary.feedbackCount}건`}
            >
              <div className="admin-user-list">
                {summary.users.map((user) => (
                  <Card key={user.userId}>
                    <div className="admin-user-list__heading">
                      <strong>{user.userId}</strong>
                      <Badge>{user.plan}</Badge>
                    </div>
                    <p>
                      기기 {user.deviceCount} · 식단{' '}
                      {user.mealPlanCount} · 레시피{' '}
                      {user.recipeCount} · 추천{' '}
                      {user.recommendationCount}
                    </p>
                    <span>
                      누적 AI 비용{' '}
                      {formatCost(user.estimatedCostUsd)}
                    </span>
                  </Card>
                ))}
              </div>
            </Section>
          </>
        ) : null}
      </main>
    </>
  )
}

export default AdminDashboardPage
