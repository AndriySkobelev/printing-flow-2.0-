// Which payers a supplier may bill: on the single tax, or not on it.
export type PayerTax = 'singleTax' | 'other'

export type InvoiceSupplier = {
  id:   string
  forPayers: PayerTax
  name: string
  iban: string
  bank: string
  mfo:  string
  code: string
}

export const INVOICE_SUPPLIERS: InvoiceSupplier[] = [
  {
    id:   'nechaiev',
    forPayers: 'other',
    name: 'ФОП Нечаєв Вячеслав Сергійович',
    iban: 'UA503220010000026002310041291',
    bank: 'АТ «УНІВЕРСАЛ БАНК»',
    mfo:  '322001',
    code: '3583904537',
  },
  {
    id:   'shmelov',
    forPayers: 'singleTax',
    name: 'ФОП Шмельов Олег Володимирович',
    iban: 'UA433220010000026000360050320',
    bank: 'АТ «УНІВЕРСАЛ БАНК»',
    mfo:  '322001',
    code: '3326802719',
  },
  {
    id:   'nahorniak',
    forPayers: 'singleTax',
    name: 'ФОП Нагорняк Наталія Василівна',
    iban: 'UA743220010000026009360008328',
    bank: 'АТ «УНІВЕРСАЛ БАНК»',
    mfo:  '322001',
    code: '3500800760',
  },
]
