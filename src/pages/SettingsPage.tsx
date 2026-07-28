import {
  useState,
  type ChangeEvent,
} from 'react'
import {
  PackageOpen,
  Upload,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import ScreenHeader from '../components/ui/ScreenHeader'
import Section from '../components/ui/Section'
import useHomeOsBackup from '../hooks/useHomeOsBackup'
import useMealPackImport from '../hooks/useMealPackImport'
import type { HomeOsBackup } from '../services/homeOsBackupEngine'
import type { MealType } from '../types/meal'
import type { MealPackPreview } from '../services/mealPackEngine'

const mealTypeLabels: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
}

function SettingsPage() {
  const { prepare, apply } = useMealPackImport()
  const {
    exportBackup,
    prepareImport: prepareBackupImport,
    applyImport: applyBackupImport,
  } = useHomeOsBackup()
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
                <span>1.0.0</span>
              </li>
              <li className="inventory-item">
                <strong>데이터 저장 위치</strong>
                <span>이 기기</span>
              </li>
              <li className="inventory-item">
                <strong>개인정보 전송</strong>
                <span>하지 않음</span>
              </li>
            </ul>
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
