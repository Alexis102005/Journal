export function getIllustration() {
  const mois = new Date().getMonth() + 1 // 1-12
  const jour = new Date().getDate()

  // Approximation des temps liturgiques par date
  if (mois === 12 && jour >= 25) return '/illustrations/noel.jpg'
  if (mois === 1 && jour <= 6) return '/illustrations/noel.jpg'
  if (mois === 11 && jour >= 27 || mois === 12 && jour <= 24) return '/illustrations/avent.jpg'
  
  // Carême : environ 40 jours avant Pâques (mars-avril)
  if ((mois === 2 && jour >= 14) || mois === 3 || (mois === 4 && jour <= 10)) {
    return '/illustrations/careme.jpg'
  }
  
  // Pâques : avril-mai
  if ((mois === 4 && jour >= 10) || (mois === 5 && jour <= 20)) {
    return '/illustrations/paques.jpg'
  }

  return '/illustrations/temps-ordinaire.jpg'
}