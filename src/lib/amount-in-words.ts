// Ukrainian amount in words for invoices: 16127.3 → "Шістнадцять тисяч сто
// двадцять сім гривень 30 копійок".

const ONES_M = ['', 'один', 'два', 'три', 'чотири', 'пʼять', 'шість', 'сім', 'вісім', 'девʼять']
const ONES_F = ['', 'одна', 'дві', 'три', 'чотири', 'пʼять', 'шість', 'сім', 'вісім', 'девʼять']
const TEENS  = ['десять', 'одинадцять', 'дванадцять', 'тринадцять', 'чотирнадцять', 'пʼятнадцять', 'шістнадцять', 'сімнадцять', 'вісімнадцять', 'девʼятнадцять']
const TENS   = ['', '', 'двадцять', 'тридцять', 'сорок', 'пʼятдесят', 'шістдесят', 'сімдесят', 'вісімдесят', 'девʼяносто']
const HUNDREDS = ['', 'сто', 'двісті', 'триста', 'чотириста', 'пʼятсот', 'шістсот', 'сімсот', 'вісімсот', 'девʼятсот']

type Forms = [one: string, few: string, many: string]

const plural = (n: number, [one, few, many]: Forms) => {
  const lastTwo = n % 100
  const last    = n % 10
  if (lastTwo >= 11 && lastTwo <= 14) return many
  if (last === 1) return one
  if (last >= 2 && last <= 4) return few
  return many
}

const triadWords = (n: number, feminine: boolean) => {
  const ones = feminine ? ONES_F : ONES_M
  const h = Math.floor(n / 100)
  const t = Math.floor((n % 100) / 10)
  const o = n % 10
  return [HUNDREDS[h], t === 1 ? TEENS[o] : TENS[t], t === 1 ? '' : ones[o]].filter(Boolean)
}

const SCALES: { forms: Forms; feminine: boolean }[] = [
  { forms: ['', '', ''],                        feminine: true },
  { forms: ['тисяча', 'тисячі', 'тисяч'],       feminine: true },
  { forms: ['мільйон', 'мільйони', 'мільйонів'], feminine: false },
  { forms: ['мільярд', 'мільярди', 'мільярдів'], feminine: false },
]

const integerWords = (n: number) => {
  if (n === 0) return ['нуль']
  const words: string[] = []
  for (let i = SCALES.length - 1; i >= 0; i--) {
    const triad = Math.floor(n / 1000 ** i) % 1000
    if (!triad) continue
    words.push(...triadWords(triad, SCALES[i].feminine))
    if (i > 0) words.push(plural(triad, SCALES[i].forms))
  }
  return words
}

export const amountInWords = (amount: number) => {
  const totalKop = Math.round(Math.abs(amount) * 100)
  const uah = Math.floor(totalKop / 100)
  const kop = totalKop % 100
  const text = [
    ...integerWords(uah),
    plural(uah, ['гривня', 'гривні', 'гривень']),
    String(kop).padStart(2, '0'),
    plural(kop, ['копійка', 'копійки', 'копійок']),
  ].join(' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}
