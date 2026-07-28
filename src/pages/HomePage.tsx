import {
  useRef,
  useState,
  type KeyboardEvent,
  type UIEvent,
} from 'react'
import type { PageName } from '../components/BottomNavigation'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { getRecipeImage } from '../data/recipeImages'
import useInventory from '../hooks/useInventory'
import useMealPlan from '../hooks/useMealPlan'
import useRecipes from '../hooks/useRecipes'
import {
  calculateRecipeReadinessPercent,
  recommendRecipes,
} from '../services/recommendationEngine'
import './HomePage.css'

type HomePageProps = {
  onChangePage: (
    page: PageName | 'recipes',
  ) => void
  onOpenRecipeDetail: (recipeId: string) => void
  onPlanRecipe: (recipeName: string) => void
}

const dateFormatter = new Intl.DateTimeFormat(
  'ko-KR',
  {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  },
)

const weekdayMessages = [
  '느긋한 일요일, 천천히 한 끼를 골라봐요.',
  '새로운 한 주, 오늘 먹을 메뉴부터 가볍게 정해봐요.',
  '따뜻한 한 끼로 화요일을 채워봐요.',
  '한 주의 가운데, 먹고 싶은 메뉴를 골라봐요.',
  '목요일 저녁은 조금 더 여유롭게 준비해 봐요.',
  '기분 좋은 금요일, 오늘 먹고 싶은 메뉴가 있나요?',
  '토요일에는 좋아하는 한 끼를 여유롭게 즐겨봐요.',
]

function getTimeGreeting(date: Date) {
  const hour = date.getHours()

  if (hour < 5) {
    return {
      eyebrow: 'Quiet Night',
      title: '포근한 밤이에요',
    }
  }

  if (hour < 11) {
    return {
      eyebrow: 'Good Morning',
      title: '좋은 아침이에요',
    }
  }

  if (hour < 14) {
    return {
      eyebrow: 'Lunch Time',
      title: '맛있는 점심시간이에요',
    }
  }

  if (hour < 18) {
    return {
      eyebrow: 'Good Afternoon',
      title: '편안한 오후예요',
    }
  }

  if (hour < 22) {
    return {
      eyebrow: 'Good Evening',
      title: '좋은 저녁이에요',
    }
  }

  return {
    eyebrow: 'Good Night',
    title: '오늘 하루도 수고했어요',
  }
}

function getTodayDateKey() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(
    2,
    '0',
  )
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function HomePage({
  onChangePage,
  onOpenRecipeDetail,
  onPlanRecipe,
}: HomePageProps) {
  const recommendationScrollerRef =
    useRef<HTMLDivElement>(null)
  const [
    currentRecommendationIndex,
    setCurrentRecommendationIndex,
  ] = useState(0)
  const now = new Date()
  const timeGreeting = getTimeGreeting(now)
  const { mealPlans } = useMealPlan()
  const { items: inventoryItems } = useInventory()
  const { recipes } = useRecipes()
  const todayDate = getTodayDateKey()
  const todayDinner = mealPlans.find(
    (mealPlan) =>
      mealPlan.date === todayDate &&
      mealPlan.type === 'dinner',
  )
  const recommendations = recommendRecipes(
    recipes,
    inventoryItems,
  )
  const visibleRecommendations =
    recommendations.slice(0, 5)
  const suggestedRecipe =
    recommendations.find(
      (recommendation) =>
        recommendation.recipe.name ===
        todayDinner?.name,
    ) ?? recommendations[0]
  const heroMealName =
    todayDinner?.name ??
    suggestedRecipe?.recipe.name ??
    '오늘 저녁 메뉴를 정해 볼까요?'
  const heroImage = suggestedRecipe
    ? getRecipeImage(suggestedRecipe.recipe.id)
    : undefined
  const missingIngredientItems =
    suggestedRecipe?.missingIngredients ?? []
  const requiredIngredientCount =
    suggestedRecipe?.recipe.ingredients.length ?? 0
  const ingredientReadiness =
    calculateRecipeReadinessPercent(
      requiredIngredientCount,
      missingIngredientItems.length,
    )
  const firstMissingIngredient =
    missingIngredientItems[0]
  const readinessMessage = !suggestedRecipe
    ? '식사 일정에서 오늘 저녁 메뉴를 먼저 정해 보세요.'
    : missingIngredientItems.length === 0
      ? '지금 있는 재료로 바로 만들 수 있어요.'
      : missingIngredientItems.length === 1
        ? `${firstMissingIngredient.name} 하나만 준비하면 만들 수 있어요.`
        : `${firstMissingIngredient.name} 외 ${missingIngredientItems.length - 1}가지만 준비하면 만들 수 있어요.`

  function updateRecommendationPosition(
    scroller: HTMLDivElement,
  ) {
    const cards = Array.from(
      scroller.querySelectorAll<HTMLElement>(
        '.home-recommendation-card',
      ),
    )

    if (cards.length === 0) {
      return
    }

    const nextIndex = cards.reduce(
      (closestIndex, card, index) =>
        Math.abs(card.offsetLeft - scroller.scrollLeft) <
        Math.abs(
          cards[closestIndex].offsetLeft -
            scroller.scrollLeft,
        )
          ? index
          : closestIndex,
      0,
    )

    setCurrentRecommendationIndex(nextIndex)
  }

  function handleRecommendationScroll(
    event: UIEvent<HTMLDivElement>,
  ) {
    updateRecommendationPosition(event.currentTarget)
  }

  function handleRecommendationKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
  ) {
    if (
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight'
    ) {
      return
    }

    const scroller = recommendationScrollerRef.current

    if (!scroller) {
      return
    }

    const cards = Array.from(
      scroller.querySelectorAll<HTMLElement>(
        '.home-recommendation-card',
      ),
    )
    const direction =
      event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = Math.min(
      Math.max(
        currentRecommendationIndex + direction,
        0,
      ),
      cards.length - 1,
    )
    const nextCard = cards[nextIndex]

    if (!nextCard) {
      return
    }

    event.preventDefault()
    scroller.scrollTo({
      left: nextCard.offsetLeft,
      behavior: 'smooth',
    })
    setCurrentRecommendationIndex(nextIndex)
  }

  return (
    <div className="home-page">
      <header className="home-greeting home-fade">
        <div className="home-greeting__topline">
          <span className="home-greeting__brand">
            <img
              src="/brand/today-table-icon-192.png"
              alt=""
            />
            오늘식탁
          </span>
          <time
            className="home-greeting__date"
            dateTime={todayDate}
          >
            {dateFormatter.format(now)}
          </time>
        </div>

        <h1>{timeGreeting.title}</h1>
        <p>{weekdayMessages[now.getDay()]}</p>
      </header>

      <main className="home-main">
        <Card className="home-hero home-fade">
          <div
            className={`home-hero__visual ${
              heroImage
                ? 'home-hero__visual--photo'
                : ''
            }`}
          >
            {heroImage ? (
              <img
                className="home-hero__image"
                src={heroImage}
                alt={`${heroMealName} 음식 사진`}
              />
            ) : null}

            <Badge
              className="home-hero__badge"
              tone="primary"
            >
              오늘 저녁
            </Badge>

            {!heroImage ? (
              <>
                <div
                  className="home-hero__plate"
                  aria-hidden="true"
                />
                <span className="home-hero__photo-label">
                  오늘의 따뜻한 한 접시
                </span>
              </>
            ) : null}
          </div>

          <div className="home-hero__content">
            <p className="home-kicker">
              {todayDinner
                ? '오늘 저녁'
                : '오늘 저녁 추천'}
            </p>
            <h2>{heroMealName}</h2>

            <div className="home-hero__facts">
              <span>약 30분</span>
              <span>2인분</span>
              <span>
                재료 {requiredIngredientCount}개
              </span>
            </div>

            <div className="home-hero__readiness">
              <div>
                <span>재료 준비율</span>
                <strong className="ui-number">
                  {ingredientReadiness}%
                </strong>
              </div>
              <progress
                value={ingredientReadiness}
                max={100}
                aria-label={`재료 준비율 ${ingredientReadiness}%`}
              />
              <p>{readinessMessage}</p>
            </div>

            <div className="home-hero__actions">
              <Button
                fullWidth
                aria-label={
                  suggestedRecipe
                    ? `${suggestedRecipe.recipe.name} 이번 주 식사에 담기`
                    : '이번 주 식사 열기'
                }
                onClick={() => {
                  if (suggestedRecipe) {
                    onPlanRecipe(
                      suggestedRecipe.recipe.name,
                    )
                    return
                  }

                  onChangePage('mealPlan')
                }}
              >
                이번 주 식사에 담기
              </Button>
              <Button
                variant="secondary"
                fullWidth
                aria-label={
                  suggestedRecipe
                    ? `${suggestedRecipe.recipe.name} 레시피 보기`
                    : '레시피 목록 보기'
                }
                onClick={() => {
                  if (suggestedRecipe) {
                    onOpenRecipeDetail(
                      suggestedRecipe.recipe.id,
                    )
                    return
                  }

                  onChangePage('recipes')
                }}
              >
                레시피 보기
              </Button>
            </div>
          </div>
        </Card>

        <div className="home-support-grid">
          <section
            className="home-section home-card-fade"
            aria-labelledby="home-missing-title"
          >
            <div className="home-section__heading">
              <div>
                <p className="home-kicker">
                  준비할 재료
                </p>
                <h2 id="home-missing-title">
                  부족한 재료
                </h2>
              </div>
              <Badge
                tone={
                  missingIngredientItems.length > 0
                    ? 'warning'
                    : 'success'
                }
              >
                {missingIngredientItems.length}개
              </Badge>
            </div>

            <Card className="home-compact-card">
              {missingIngredientItems.length === 0 ? (
                <div className="home-positive-state">
                  <strong>
                    {suggestedRecipe
                      ? '필요한 재료가 모두 준비됐어요.'
                      : '오늘 저녁 메뉴를 먼저 골라보세요.'}
                  </strong>
                  <p>
                    {suggestedRecipe
                      ? '편안하게 요리를 시작해 보세요.'
                      : '먹고 싶은 메뉴부터 정해 보세요.'}
                  </p>
                </div>
              ) : (
                <ul className="home-ingredient-list">
                  {missingIngredientItems
                    .slice(0, 5)
                    .map((item) => (
                      <li key={item.id}>
                        <span>{item.name}</span>
                        <strong className="ui-number">
                          {item.quantity}
                          {item.unit}
                        </strong>
                      </li>
                    ))}
                </ul>
              )}

              <Button
                variant="secondary"
                fullWidth
                onClick={() =>
                  onChangePage('shopping')
                }
              >
                장보기 목록 보기
              </Button>
            </Card>
          </section>

          <section
            className="home-section home-card-fade home-recommendations"
            aria-labelledby="home-recommendations-title"
          >
            <div className="home-section__heading">
              <div>
                <p className="home-kicker">
                  오늘 뭐 먹지?
                </p>
                <h2 id="home-recommendations-title">
                  오늘 추천
                </h2>
              </div>
              <span
                className="home-recommendation-position ui-number"
                aria-live="polite"
              >
                {visibleRecommendations.length > 0
                  ? `${currentRecommendationIndex + 1} / ${visibleRecommendations.length}`
                  : '0 / 0'}
              </span>
            </div>

            <div
              ref={recommendationScrollerRef}
              className="home-recommendation-scroller"
              aria-label="추천 메뉴"
              aria-describedby="home-recommendation-help"
              tabIndex={0}
              onScroll={handleRecommendationScroll}
              onKeyDown={handleRecommendationKeyDown}
            >
              <span
                id="home-recommendation-help"
                className="ui-visually-hidden"
              >
                좌우 화살표 키나 가로 스크롤로 추천 메뉴를
                이동할 수 있어요.
              </span>
              {recommendations.length > 0 ? (
                visibleRecommendations
                  .map((recommendation, index) => {
                    const recommendationImage =
                      getRecipeImage(
                        recommendation.recipe.id,
                      )

                    return (
                  <Card
                    key={recommendation.recipe.id}
                    className="home-recommendation-card"
                  >
                    <div
                      className={`home-recommendation-card__visual ${
                        recommendationImage
                          ? 'home-recommendation-card__visual--photo'
                          : ''
                      }`}
                    >
                      {recommendationImage ? (
                        <img
                          src={recommendationImage}
                          alt={`${recommendation.recipe.name} 음식 사진`}
                        />
                      ) : null}
                      <span aria-hidden="true">
                        {String(index + 1).padStart(
                          2,
                          '0',
                        )}
                      </span>
                    </div>
                    <div className="home-recommendation-card__body">
                      <Badge
                        tone={
                          recommendation.isInventorySufficient
                            ? 'success'
                            : 'warning'
                        }
                      >
                        {recommendation.isInventorySufficient
                          ? '바로 만들 수 있어요'
                          : `부족 ${recommendation.missingIngredientCount}개`}
                      </Badge>
                      <h3>
                        {recommendation.recipe.name}
                      </h3>
                      <p>
                        {recommendation.isInventorySufficient
                          ? '집에 있는 재료로 편하게 준비해요.'
                          : '부족한 재료는 장보기에서 확인해요.'}
                      </p>
                      <div className="home-recommendation-card__actions">
                        <Button
                          variant="secondary"
                          fullWidth
                          aria-label={`${recommendation.recipe.name} 레시피 보기`}
                          onClick={() =>
                            onOpenRecipeDetail(
                              recommendation.recipe.id,
                            )
                          }
                        >
                          레시피 보기
                        </Button>
                        <Button
                          fullWidth
                          aria-label={`${recommendation.recipe.name} 이번 주 식사에 담기`}
                          onClick={() =>
                            onPlanRecipe(
                              recommendation.recipe.name,
                            )
                          }
                        >
                          이번 주 식사에 담기
                        </Button>
                      </div>
                    </div>
                  </Card>
                    )
                  })
              ) : (
                <Card className="home-recommendation-empty">
                  <strong>
                    추천 메뉴를 준비하고 있어요.
                  </strong>
                  <p>
                    식사 꾸러미를 가져오면 추천 메뉴가
                    더 다양해져요.
                  </p>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() =>
                      onChangePage('settings')
                    }
                  >
                    식사 꾸러미 가져오기
                  </Button>
                </Card>
              )}
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}

export default HomePage
