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
