import curryImage from '../assets/recipes/curry.jpg'
import eggFriedRiceImage from '../assets/recipes/egg-fried-rice.jpg'
import kimchiStewImage from '../assets/recipes/kimchi-stew.jpg'
import soybeanPasteStewImage from '../assets/recipes/soybean-paste-stew.jpg'
import spicyPorkImage from '../assets/recipes/spicy-pork.jpg'

const recipeImages: Record<string, string> = {
  'kimchi-stew': kimchiStewImage,
  curry: curryImage,
  'spicy-pork': spicyPorkImage,
  'soybean-paste-stew': soybeanPasteStewImage,
  'egg-fried-rice': eggFriedRiceImage,
}

export function getRecipeImage(
  recipeId: string,
): string | undefined {
  return recipeImages[recipeId]
}
