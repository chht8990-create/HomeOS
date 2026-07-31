import andongJjimdakImage from '../assets/recipes/andong-jjimdak.webp'
import beefBulgogiImage from '../assets/recipes/beef-bulgogi.webp'
import beefSeaweedSoupImage from '../assets/recipes/beef-seaweed-soup.webp'
import boiledPorkImage from '../assets/recipes/boiled-pork.webp'
import braisedTofuImage from '../assets/recipes/braised-tofu.webp'
import chickenGalbiImage from '../assets/recipes/chicken-galbi.webp'
import chickenSoupImage from '../assets/recipes/chicken-soup.webp'
import curryImage from '../assets/recipes/curry.jpg'
import eggFriedRiceImage from '../assets/recipes/egg-fried-rice.jpg'
import grilledMackerelImage from '../assets/recipes/grilled-mackerel.webp'
import japchaeImage from '../assets/recipes/japchae.webp'
import kimchiStewImage from '../assets/recipes/kimchi-stew.jpg'
import potatoPancakeImage from '../assets/recipes/potato-pancake.webp'
import salmonSoyGrillImage from '../assets/recipes/salmon-soy-grill.webp'
import soybeanPasteStewImage from '../assets/recipes/soybean-paste-stew.jpg'
import spicyPorkImage from '../assets/recipes/spicy-pork.jpg'
import squidRadishSoupImage from '../assets/recipes/squid-radish-soup.webp'
import steamedEggImage from '../assets/recipes/steamed-egg.webp'
import tofuMushroomRiceImage from '../assets/recipes/tofu-mushroom-rice.webp'
import vegetableBibimbapImage from '../assets/recipes/vegetable-bibimbap.webp'
import { recipes } from './recipes'

export const recipeImages: Record<string, string> = {
  'kimchi-stew': kimchiStewImage,
  curry: curryImage,
  'spicy-pork': spicyPorkImage,
  'soybean-paste-stew': soybeanPasteStewImage,
  'egg-fried-rice': eggFriedRiceImage,
  'chicken-galbi': chickenGalbiImage,
  'beef-bulgogi': beefBulgogiImage,
  'grilled-mackerel': grilledMackerelImage,
  'braised-tofu': braisedTofuImage,
  'beef-seaweed-soup': beefSeaweedSoupImage,
  japchae: japchaeImage,
  'chicken-soup': chickenSoupImage,
  'salmon-soy-grill': salmonSoyGrillImage,
  'vegetable-bibimbap': vegetableBibimbapImage,
  'squid-radish-soup': squidRadishSoupImage,
  'steamed-egg': steamedEggImage,
  'andong-jjimdak': andongJjimdakImage,
  'potato-pancake': potatoPancakeImage,
  'tofu-mushroom-rice': tofuMushroomRiceImage,
  'boiled-pork': boiledPorkImage,
}

export function getRecipeImage(
  recipeId: string,
): string | undefined {
  return recipeImages[recipeId]
}

export type RecipeImageResolution = {
  src: string
  imageKey: string
  match: 'id' | 'name' | 'alias'
}

export function normalizeRecipeImageName(
  recipeName: string,
) {
  return recipeName
    .trim()
    .toLowerCase()
    .replace(/[\s·()[\]{}'"’_-]+/g, '')
}

const recipeIdByNormalizedName = new Map(
  recipes.map((recipe) => [
    normalizeRecipeImageName(recipe.name),
    recipe.id,
  ]),
)

const exactAliasImageRules: Array<{
  names: string[]
  imageKey: string
}> = [
  {
    names: [
      '순한 카레',
      '카레라이스',
      '치킨 카레',
      '돼지고기 카레',
      '소고기 카레',
    ],
    imageKey: 'curry',
  },
  {
    names: [
      '고추장 불고기',
      '고추장 돼지불고기',
    ],
    imageKey: 'spicy-pork',
  },
  {
    names: [
      '소고기 채소잡채',
      '채소잡채',
      '버섯잡채',
    ],
    imageKey: 'japchae',
  },
  {
    names: ['쇠고기불고기', '소불고기'],
    imageKey: 'beef-bulgogi',
  },
  {
    names: ['달걀볶음밥'],
    imageKey: 'egg-fried-rice',
  },
  {
    names: ['달걀찜'],
    imageKey: 'steamed-egg',
  },
  {
    names: ['쇠고기미역국'],
    imageKey: 'beef-seaweed-soup',
  },
]

export function resolveRecipeImage(
  recipeId: string | undefined,
  recipeName: string,
): RecipeImageResolution | null {
  if (recipeId && recipeImages[recipeId]) {
    return {
      src: recipeImages[recipeId],
      imageKey: recipeId,
      match: 'id',
    }
  }

  const normalizedName =
    normalizeRecipeImageName(recipeName)
  const matchedRecipeId =
    recipeIdByNormalizedName.get(normalizedName)

  if (
    matchedRecipeId &&
    recipeImages[matchedRecipeId]
  ) {
    return {
      src: recipeImages[matchedRecipeId],
      imageKey: matchedRecipeId,
      match: 'name',
    }
  }

  const aliasMatch = exactAliasImageRules.find(
    ({ names }) =>
      names.some(
        (name) =>
          normalizeRecipeImageName(name) ===
          normalizedName,
      ),
  )

  if (
    aliasMatch &&
    recipeImages[aliasMatch.imageKey]
  ) {
    return {
      src: recipeImages[aliasMatch.imageKey],
      imageKey: aliasMatch.imageKey,
      match: 'alias',
    }
  }

  return null
}
