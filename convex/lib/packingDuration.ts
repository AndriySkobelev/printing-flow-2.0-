// Workday of one packer, in minutes.
export const PACKER_DAY_MINUTES = 9 * 60

// People packing together don't split the work evenly: what takes one packer
// 60 min takes two about 42 (60 / √2), three about 35 — so a team's day
// grows with the square root of its size.
export const packingDayCapacity = (packers: number) =>
  packers > 0 ? Math.round(PACKER_DAY_MINUTES * Math.sqrt(packers)) : 0
