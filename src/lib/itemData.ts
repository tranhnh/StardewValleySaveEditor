// A small curated list of common, schema-simple objects for the "add item"
// dropdown. These are plain items with no held/preserve/colour state, so they
// are safe to inject. Anything not listed here can still be added by entering a
// numeric object id by hand.
//
// `category` / `type` / `price` / `edibility` mirror the vanilla object data so
// the injected node looks native. The game re-reads most of these on load, but
// matching them avoids odd menu behaviour in the meantime.

export interface ItemDef {
  id: number
  name: string
  category: number
  type: string
  price: number
  edibility: number
}

export const COMMON_ITEMS: ItemDef[] = [
  { id: 74, name: 'Prismatic Shard', category: -2, type: 'Minerals', price: 2000, edibility: -300 },
  { id: 72, name: 'Diamond', category: -2, type: 'Minerals', price: 750, edibility: -300 },
  { id: 60, name: 'Emerald', category: -2, type: 'Minerals', price: 250, edibility: -300 },
  { id: 62, name: 'Aquamarine', category: -2, type: 'Minerals', price: 180, edibility: -300 },
  { id: 64, name: 'Ruby', category: -2, type: 'Minerals', price: 250, edibility: -300 },
  { id: 66, name: 'Amethyst', category: -2, type: 'Minerals', price: 100, edibility: -300 },
  { id: 68, name: 'Topaz', category: -2, type: 'Minerals', price: 80, edibility: -300 },
  { id: 70, name: 'Jade', category: -2, type: 'Minerals', price: 200, edibility: -300 },
  { id: 336, name: 'Gold Bar', category: -15, type: 'Basic', price: 250, edibility: -300 },
  { id: 337, name: 'Iridium Bar', category: -15, type: 'Basic', price: 1000, edibility: -300 },
  { id: 335, name: 'Iron Bar', category: -15, type: 'Basic', price: 120, edibility: -300 },
  { id: 334, name: 'Copper Bar', category: -15, type: 'Basic', price: 60, edibility: -300 },
  { id: 338, name: 'Refined Quartz', category: -15, type: 'Basic', price: 50, edibility: -300 },
  { id: 388, name: 'Wood', category: -16, type: 'Basic', price: 2, edibility: -300 },
  { id: 390, name: 'Stone', category: -16, type: 'Basic', price: 2, edibility: -300 },
  { id: 382, name: 'Coal', category: -15, type: 'Basic', price: 15, edibility: -300 },
  { id: 709, name: 'Hardwood', category: -16, type: 'Basic', price: 15, edibility: -300 },
  { id: 771, name: 'Fiber', category: -16, type: 'Basic', price: 1, edibility: -300 },
  { id: 330, name: 'Clay', category: -16, type: 'Basic', price: 20, edibility: -300 },
  { id: 787, name: 'Battery Pack', category: -16, type: 'Crafting', price: 500, edibility: -300 },
  { id: 428, name: 'Cloth', category: -26, type: 'Basic', price: 470, edibility: -300 },
  { id: 440, name: 'Wool', category: -18, type: 'Basic', price: 340, edibility: -300 },
  { id: 184, name: 'Milk', category: -6, type: 'Basic', price: 125, edibility: 10 },
  { id: 424, name: 'Cheese', category: -26, type: 'Basic', price: 230, edibility: 50 },
  { id: 430, name: 'Truffle', category: -81, type: 'Basic', price: 625, edibility: 5 },
  { id: 432, name: 'Truffle Oil', category: -26, type: 'Basic', price: 1065, edibility: 20 },
  { id: 340, name: 'Honey', category: -27, type: 'Basic', price: 100, edibility: -300 },
  { id: 434, name: 'Stardrop', category: -7, type: 'Basic', price: 0, edibility: 750 },
  { id: 454, name: 'Ancient Fruit', category: -79, type: 'Basic', price: 550, edibility: 8 },
  { id: 829, name: 'Ginger', category: -81, type: 'Basic', price: 60, edibility: 20 },
  { id: 872, name: 'Fairy Dust', category: -28, type: 'Crafting', price: 0, edibility: -300 },
  { id: 288, name: 'Mega Bomb', category: -8, type: 'Crafting', price: 50, edibility: -300 },
  { id: 287, name: 'Bomb', category: -8, type: 'Crafting', price: 50, edibility: -300 },
  { id: 286, name: 'Cherry Bomb', category: -8, type: 'Crafting', price: 50, edibility: -300 },
  { id: 688, name: 'Warp Totem: Farm', category: -8, type: 'Crafting', price: 20, edibility: -300 },
  { id: 681, name: 'Rain Totem', category: -8, type: 'Crafting', price: 20, edibility: -300 },
  { id: 749, name: 'Omni Geode', category: -2, type: 'Basic', price: 0, edibility: -300 },
  { id: 275, name: 'Artifact Trove', category: 0, type: 'Basic', price: 0, edibility: -300 },
  { id: 897, name: 'Pierre’s Missing Stocklist', category: 0, type: 'asdf', price: 0, edibility: -300 },
]
