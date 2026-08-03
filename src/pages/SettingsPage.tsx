import {
  useState,
  type ChangeEvent,
} from 'react'
import {
  BookOpen,
  CreditCard,
  FileText,
  LogIn,
  LogOut,
  MessageSquareText,
  PackageOpen,
  RotateCcw,
  Ruler,
  ShieldCheck,
  Upload,
  UserRound,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import ScreenHeader from '../components/ui/ScreenHeader'
import Section from '../components/ui/Section'
import useHomeOsBackup from '../hooks/useHomeOsBackup'
import useAuthSession from '../hooks/useAuthSession'
import useMealPackImport from '../hooks/useMealPackImport'
import useMeasurementPreferences from '../hooks/useMeasurementPreferences'
import { measurementToolOptions } from '../services/measurementEngine'
import type { HomeOsBackup } from '../services/homeOsBackupEngine'
import type { MealType } from '../types/meal'
import type { MealPackPreview } from '../services/mealPackEngine'
import { APP_VERSION } from '../config/app'
import {
  OFFICIAL_SUPPORT_EMAIL,
  OFFICIAL_SUPPORT_MAILTO,
} from '../config/contact'
import {
  getGooglePlayBillingErrorMessage,
  isGooglePlayBillingAvailable,
  purchasePremiumSubscription,
  refreshBillingAccount,
  restorePremiumSubscription,
} from '../services/googlePlayBillingClient'

const googlePlayPremiumProductId =
  import.meta.env.VITE_GOOGLE_PLAY_PREMIUM_PRODUCT_ID?.trim() ??
  ''

const mealTypeLabels: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
}

type SettingsPageProps = {
  onOpenGuide: () => void
  onOpenFeedback: () => void
  onOpenPrivacy: () => void
  onOpenTerms: () => void
  onReplayTutorial: () => void
}

function SettingsPage({
  onOpenGuide,
  onOpenFeedback,
  onOpenPrivacy,
  onOpenTerms,
  onReplayTutorial,
}: SettingsPageProps) {
  const { prepare, apply } = useMealPackImport()
  const {
    exportBackup,
    prepareImport: prepareBackupImport,
    applyImport: applyBackupImport,
  } = useHomeOsBackup()
  const {
    selectedTools,
    toggleTool,
  } = useMeasurementPreferences()
  const auth = useAuthSession()
  const [fileInputKey, setFileInputKey] =
    useState(0)
  const [selectedFileName, setSelectedFileName] =
    useState('')
  const [preview, setPreview] =
    useState<MealPackPreview | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [successMessage, setSuccessMessage] =
    useState('')
  const [backupFileInputKey, setBackupFileInputKey] =
    useState(0)
  const [backupFileName, setBackupFileName] =
    useState('')
  const [backupPreview, setBackupPreview] =
    useState<HomeOsBackup | null>(null)
  const [backupErrors, setBackupErrors] = useState<
    string[]
  >([])
  const [backupStatus, setBackupStatus] =
    useState('')
  const [billingStatus, setBillingStatus] = useState('')
  const [billingBusy, setBillingBusy] = useState(false)

  async function runBillingAction(
    action: () => Promise<{ granted: boolean }>,
    successMessage: string,
  ) {
    if (billingBusy) {
      return
    }

    setBillingBusy(true)
    setBillingStatus('')

    try {
      const result = await action()

      if (!result.granted) {
        setBillingStatus(
          '활성 상태인 Google Play 구독을 찾지 못했어요.',
        )
        return
      }

      auth.setSession(await refreshBillingAccount())
      setBillingStatus(successMessage)
    } catch (error) {
      setBillingStatus(
        getGooglePlayBillingErrorMessage(error),
      )
    } finally {
      setBillingBusy(false)
    }
  }

  function resetSelection() {
    setFileInputKey((currentKey) => currentKey + 1)
    setSelectedFileName('')
    setPreview(null)
    setErrors([])
    setSuccessMessage('')
  }

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]

    setPreview(null)
    setErrors([])
    setSuccessMessage('')

    if (!file) {
      setSelectedFileName('')
      return
    }

    setSelectedFileName(file.name)

    try {
      const result = prepare(await file.text())

      if (!result.success) {
        setErrors(result.errors)
        return
      }

      setPreview(result.preview)
    } catch {
      setErrors(['파일을 읽을 수 없습니다.'])
    }
  }

  function handleApply() {
    if (!preview) {
      return
    }

    const shouldApply = window.confirm(
      `${preview.mealPack.pack.name} 식사 꾸러미를 가져올까요? 겹치는 내용은 그대로 두고 새 내용만 더해요.`,
    )

    if (!shouldApply) {
      return
    }

    const recipeCount =
      preview.recipesToImport.length
    const mealPlanCount =
      preview.plannedMealsToImport.length

    apply(preview)
    setFileInputKey((currentKey) => currentKey + 1)
    setSelectedFileName('')
    setPreview(null)
    setErrors([])
    setSuccessMessage(
      `레시피 ${recipeCount}개와 식사 일정 ${mealPlanCount}개를 가져왔어요.`,
    )
  }

  const hasImportableItems = Boolean(
    preview &&
      (preview.recipesToImport.length > 0 ||
        preview.plannedMealsToImport.length > 0),
  )

  function resetBackupSelection() {
    setBackupFileInputKey(
      (currentKey) => currentKey + 1,
    )
    setBackupFileName('')
    setBackupPreview(null)
    setBackupErrors([])
  }

  function handleBackupExport() {
    const backup = exportBackup()

    setBackupStatus(
      `백업 파일을 저장했어요. (${backup.exportedAt})`,
    )
  }

  async function handleBackupFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]

    setBackupPreview(null)
    setBackupErrors([])
    setBackupStatus('')

    if (!file) {
      setBackupFileName('')
      return
    }

    setBackupFileName(file.name)

    try {
      const result = prepareBackupImport(
        await file.text(),
      )

      if (!result.success) {
        setBackupErrors(result.errors)
        return
      }

      setBackupPreview(result.backup)
    } catch {
      setBackupErrors([
        '백업 파일을 읽을 수 없습니다.',
      ])
    }
  }

  function handleBackupApply() {
    if (!backupPreview) {
      return
    }

    const shouldApply = window.confirm(
      '이 백업으로 오늘식탁 데이터를 복원할까요? 복원 전에 현재 데이터를 자동으로 백업합니다.',
    )

    if (!shouldApply) {
      return
    }

    applyBackupImport(backupPreview)
  }

  return (
    <>
      <ScreenHeader
        title="더보기"
        description="앱 정보와 데이터 관리 기능을 확인하세요."
      />

      <main className="app-content">
        <Section
          title="오늘식탁 정보"
          description="오늘식탁은 데이터를 이 기기에 저장해요."
        >
          <Card className="settings-brand-card">
            <div className="settings-brand-card__identity">
              <img
                src="/brand/today-table-icon-192.png"
                alt=""
              />
              <div>
                <strong>오늘식탁</strong>
                <span>오늘 뭐 먹지?</span>
              </div>
            </div>

            <ul className="inventory-list">
              <li className="inventory-item">
                <strong>앱 버전</strong>
                <span>{APP_VERSION}</span>
              </li>
              <li className="inventory-item">
                <strong>데이터 저장 위치</strong>
                <span>이 기기</span>
              </li>
              <li className="inventory-item">
                <strong>피드백 전송 정보</strong>
                <span>작성한 의견·기기 정보</span>
              </li>
            </ul>
          </Card>
        </Section>

        <Section
          title="약관 및 정책"
          description="오늘식탁의 데이터 처리와 이용 기준을 확인하세요."
        >
          <Card className="settings-help-card">
            <Button
              variant="secondary"
              fullWidth
              onClick={onOpenPrivacy}
            >
              <ShieldCheck size={18} aria-hidden="true" />
              개인정보처리방침
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={onOpenTerms}
            >
              <FileText size={18} aria-hidden="true" />
              이용약관
            </Button>
            <p className="settings-support-contact">
              운영 문의:{' '}
              <a href={OFFICIAL_SUPPORT_MAILTO}>
                {OFFICIAL_SUPPORT_EMAIL}
              </a>
            </p>
          </Card>
        </Section>

        {googlePlayPremiumProductId ? (
          <Section
            title="오늘식탁 Premium"
            description="Google Play 구독은 서버에서 확인된 뒤 계정에 적용됩니다."
          >
            <Card className="settings-help-card">
              <div className="settings-brand-card__identity">
                <CreditCard size={32} aria-hidden="true" />
                <div>
                  <strong>Premium 구독</strong>
                  <span>
                    구매와 복원에는 Google 로그인이 필요해요.
                  </span>
                </div>
              </div>
              {!isGooglePlayBillingAvailable() ? (
                <p className="meal-editor__help">
                  Google Play에서 설치한 앱에서 구매하거나 기존
                  구독을 복원할 수 있어요.
                </p>
              ) : null}
              <Button
                fullWidth
                disabled={
                  billingBusy ||
                  auth.session.status !== 'authenticated' ||
                  !isGooglePlayBillingAvailable()
                }
                onClick={() =>
                  void runBillingAction(
                    () =>
                      purchasePremiumSubscription(
                        googlePlayPremiumProductId,
                      ),
                    'Premium 구독을 계정에 적용했어요.',
                  )
                }
              >
                {billingBusy ? '확인 중…' : 'Premium 시작하기'}
              </Button>
              <Button
                variant="secondary"
                fullWidth
                disabled={
                  billingBusy ||
                  auth.session.status !== 'authenticated' ||
                  !isGooglePlayBillingAvailable()
                }
                onClick={() =>
                  void runBillingAction(
                    restorePremiumSubscription,
                    'Google Play 구독을 복원했어요.',
                  )
                }
              >
                구매 복원
              </Button>
              {billingStatus ? (
                <p role="status">{billingStatus}</p>
              ) : null}
            </Card>
          </Section>
        ) : null}

        <Section
          title="계정"
          description="Google 계정으로 식단과 장보기 데이터를 안전하게 동기화하세요."
        >
          <Card className="settings-help-card">
            {auth.phase === 'loading' ? (
              <p role="status">
                로그인 상태를 확인하고 있어요.
              </p>
            ) : auth.session.status ===
              'authenticated' ? (
              <>
                <div className="settings-brand-card__identity">
                  <UserRound
                    size={32}
                    aria-hidden="true"
                  />
                  <div>
                    <strong>
                      {auth.session.user.displayName}
                    </strong>
                    <span>
                      {auth.session.user.email}
                    </span>
                  </div>
                </div>
                <p className="meal-editor__help">
                  이 기기의 데이터는 로그인 후 서버와
                  동기화됩니다.
                </p>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => void auth.logout()}
                >
                  <LogOut
                    size={18}
                    aria-hidden="true"
                  />
                  로그아웃
                </Button>
              </>
            ) : (
              <>
                <p>
                  로그인하면 다른 기기에서도 같은
                  데이터를 이어서 사용할 수 있어요.
                </p>
                <Button
                  fullWidth
                  onClick={auth.login}
                >
                  <LogIn
                    size={18}
                    aria-hidden="true"
                  />
                  Google 계정으로 로그인
                </Button>
              </>
            )}
            {auth.phase === 'error' ? (
              <p role="alert">
                계정 작업을 완료하지 못했어요. 잠시 후
                다시 시도해 주세요.
              </p>
            ) : null}
          </Card>
        </Section>

        <Section
          title="집에서 사용할 수 있는 계량도구"
          description="선택한 도구에 맞춰 레시피 계량법을 보여드려요."
        >
          <Card className="settings-measurement-card">
            <div className="settings-measurement-card__heading">
              <Ruler
                size={22}
                strokeWidth={2}
                aria-hidden="true"
              />
              <p>
                사용 가능한 도구를 모두 선택해
                주세요. 변경 내용은 이 기기에 바로
                저장됩니다.
              </p>
            </div>

            <fieldset className="settings-tool-list">
              <legend className="ui-visually-hidden">
                집에서 사용할 수 있는 계량도구
              </legend>
              {measurementToolOptions.map(
                (option) => (
                  <label key={option.value}>
                    <input
                      type="checkbox"
                      checked={selectedTools.includes(
                        option.value,
                      )}
                      onChange={() =>
                        toggleTool(option.value)
                      }
                    />
                    <span>{option.label}</span>
                  </label>
                ),
              )}
            </fieldset>
          </Card>
        </Section>

        <Section
          title="도움말"
          description="사용 방법을 다시 살펴보거나 첫 안내를 재생하세요."
        >
          <Card className="settings-help-card">
            <Button
              variant="secondary"
              fullWidth
              onClick={onOpenGuide}
            >
              <BookOpen
                size={18}
                aria-hidden="true"
              />
              오늘식탁 사용 가이드
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onClick={onReplayTutorial}
            >
              <RotateCcw
                size={18}
                aria-hidden="true"
              />
              튜토리얼 다시 보기
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={onOpenFeedback}
            >
              <MessageSquareText
                size={18}
                aria-hidden="true"
              />
              <span className="settings-help-card__copy">
                <strong>의견 보내기</strong>
                <small>
                  불편한 점이나 바라는 기능을
                  알려주세요.
                </small>
              </span>
            </Button>
          </Card>
        </Section>

        <Section
          title="식사 꾸러미 가져오기"
          description="식사 꾸러미 파일을 선택해 레시피와 일정을 추가하세요."
        >
          <Card>
            <div className="inventory-form">
              <label className="settings-file-picker">
                <span className="settings-file-picker__label">
                  식사 꾸러미 파일
                </span>
                <input
                  key={fileInputKey}
                  className="settings-file-picker__native"
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  aria-label="식사 꾸러미 파일"
                  aria-describedby="meal-pack-file-status"
                />
                <span
                  className="settings-file-picker__button"
                  aria-hidden="true"
                >
                  <Upload size={18} strokeWidth={2.2} />
                  파일 선택
                </span>
                <span
                  id="meal-pack-file-status"
                  className="settings-file-picker__filename"
                  aria-live="polite"
                >
                  {selectedFileName ||
                    '선택한 파일 없음'}
                </span>
              </label>
            </div>

            {errors.length > 0 && (
              <div role="alert">
                <h3>가져올 수 없는 파일이에요.</h3>
                <ul>
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {successMessage && (
              <p role="status">{successMessage}</p>
            )}

            {!preview &&
              errors.length === 0 &&
              !successMessage && (
                <EmptyState
                  icon={<PackageOpen />}
                  title="식사 꾸러미 파일을 선택하세요."
                  description="가져오기 전에 레시피와 일정을 미리 확인할 수 있어요."
                />
              )}

            {preview && (
              <>
                <Section
                  title={preview.mealPack.pack.name}
                  description={
                    preview.mealPack.pack.description
                  }
                >
                  <ul className="inventory-list">
                    <li className="inventory-item">
                      <strong>꾸러미 이름</strong>
                      <span>
                        {preview.mealPack.pack.id}
                      </span>
                    </li>
                    <li className="inventory-item">
                      <strong>파일 형식</strong>
                      <span>
                        {
                          preview.mealPack.pack
                            .formatVersion
                        }
                      </span>
                    </li>
                    <li className="inventory-item">
                      <strong>기준 인원</strong>
                      <span>
                        {preview.mealPack.pack.servings}명
                      </span>
                    </li>
                    <li className="inventory-item">
                      <strong>기간</strong>
                      <span>
                        {preview.mealPack.pack.startDate}
                        {' · '}
                        {
                          preview.mealPack.pack
                            .durationDays
                        }
                        일
                      </span>
                    </li>
                    <li className="inventory-item">
                      <strong>알레르기</strong>
                      <span>
                        {preview.mealPack.pack.allergies
                          .join(', ') || '없음'}
                      </span>
                    </li>
                    <li className="inventory-item">
                      <strong>제외 음식</strong>
                      <span>
                        {preview.mealPack.pack.excludedFoods
                          .join(', ') || '없음'}
                      </span>
                    </li>
                  </ul>
                </Section>

                <Section
                  title={`레시피 ${preview.mealPack.recipes.length}개`}
                  description={`${preview.recipesToImport.length}개를 추가할 수 있어요.`}
                >
                  <ul className="inventory-list">
                    {preview.mealPack.recipes.map(
                      (recipe) => (
                        <li
                          key={recipe.id}
                          className="inventory-item"
                        >
                          <strong>{recipe.name}</strong>
                          <span>
                            재료{' '}
                            {recipe.ingredients.length}개
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                </Section>

                <Section
                  title={`식사 일정 ${preview.mealPack.plannedMeals.length}개`}
                  description={`${preview.plannedMealsToImport.length}개를 추가할 수 있어요.`}
                >
                  <ul className="inventory-list">
                    {preview.mealPack.plannedMeals.map(
                      (mealPlan) => (
                        <li
                          key={mealPlan.id}
                          className="inventory-item"
                        >
                          <div>
                            <strong>
                              {mealPlan.name}
                            </strong>
                            <p>
                              {mealPlan.date}
                              {' · '}
                              {
                                mealTypeLabels[
                                  mealPlan.type
                                ]
                              }
                            </p>
                          </div>
                        </li>
                      ),
                    )}
                  </ul>
                </Section>

                {preview.conflicts.length > 0 && (
                  <Section
                    title={`이미 있는 내용 ${preview.conflicts.length}개`}
                    description="기존 데이터는 유지되며 중복 항목은 추가하지 않아요."
                  >
                    <ul>
                      {preview.conflicts.map(
                        (conflict) => (
                          <li
                            key={`${conflict.type}:${conflict.incomingId}`}
                          >
                            {conflict.message}
                          </li>
                        ),
                      )}
                    </ul>
                  </Section>
                )}

                <div className="meal-editor__actions">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={resetSelection}
                  >
                    취소
                  </Button>

                  <Button
                    fullWidth
                    disabled={!hasImportableItems}
                    onClick={handleApply}
                  >
                    이 꾸러미 가져오기
                  </Button>
                </div>
              </>
            )}
          </Card>
        </Section>

        <Section
          title="전체 데이터 백업 및 복원"
          description="냉장고, 장보기 목록, 식사 일정을 파일로 저장하고 복원하세요."
        >
          <Card>
            <div className="inventory-form">
              <Button
                fullWidth
                onClick={handleBackupExport}
              >
                전체 데이터 내보내기
              </Button>

              <p className="meal-editor__help">
                복원 전 현재 데이터를 자동으로 백업해요.
              </p>

              <label className="settings-file-picker">
                <span className="settings-file-picker__label">
                  복원할 백업 파일
                </span>
                <input
                  key={backupFileInputKey}
                  className="settings-file-picker__native"
                  type="file"
                  accept=".json,application/json"
                  onChange={handleBackupFileChange}
                  aria-label="복원할 백업 파일"
                  aria-describedby="backup-file-status"
                />
                <span
                  className="settings-file-picker__button"
                  aria-hidden="true"
                >
                  <Upload size={18} strokeWidth={2.2} />
                  파일 선택
                </span>
                <span
                  id="backup-file-status"
                  className="settings-file-picker__filename"
                  aria-live="polite"
                >
                  {backupFileName ||
                    '선택한 파일 없음'}
                </span>
              </label>
            </div>

            {backupErrors.length > 0 ? (
              <div role="alert">
                <h3>복원할 수 없는 파일이에요.</h3>
                <ul>
                  {backupErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {backupStatus ? (
              <p role="status">{backupStatus}</p>
            ) : null}

            {backupPreview ? (
              <Section
                title="백업 내용 미리보기"
                description={`백업 시각: ${backupPreview.exportedAt}`}
              >
                <ul className="inventory-list">
                  <li className="inventory-item">
                    <strong>냉장고</strong>
                    <span>
                      {
                        backupPreview.data.inventory
                          .length
                      }
                      개
                    </span>
                  </li>
                  <li className="inventory-item">
                    <strong>장보기 목록</strong>
                    <span>
                      {
                        backupPreview.data.shopping
                          .length
                      }
                      개
                    </span>
                  </li>
                  <li className="inventory-item">
                    <strong>식사 일정</strong>
                    <span>
                      {
                        backupPreview.data.planner
                          .length
                      }
                      개
                    </span>
                  </li>
                  <li className="inventory-item">
                    <strong>가져온 레시피</strong>
                    <span>
                      {
                        backupPreview.data.recipes
                          .length
                      }
                      개
                    </span>
                  </li>
                </ul>

                <div className="meal-editor__actions">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={resetBackupSelection}
                  >
                    취소
                  </Button>

                  <Button
                    fullWidth
                    onClick={handleBackupApply}
                  >
                    이 백업으로 복원
                  </Button>
                </div>
              </Section>
            ) : null}
          </Card>
        </Section>
      </main>
    </>
  )
}

export default SettingsPage
