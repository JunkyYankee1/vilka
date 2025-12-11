import type {
  BaseItem,
  BaseItemId,
  CatalogData,
  CategoryId,
  Offer,
  OfferId,
  Subcategory,
  SubcategoryId,
} from "./types";

export type CatalogIndexes = {
  subcategoriesByCategory: Map<CategoryId, Subcategory[]>;
  itemsBySubcategory: Map<SubcategoryId, BaseItem[]>;
  offersByBaseItem: Map<BaseItemId, Offer[]>;
  offerById: Map<OfferId, Offer>;
};

export function buildCatalogIndexes(data: CatalogData | null): CatalogIndexes {
  const subcategoriesByCategory = new Map<CategoryId, Subcategory[]>();
  const itemsBySubcategory = new Map<SubcategoryId, BaseItem[]>();
  const offersByBaseItem = new Map<BaseItemId, Offer[]>();
  const offerById = new Map<OfferId, Offer>();

  if (!data) {
    return { subcategoriesByCategory, itemsBySubcategory, offersByBaseItem, offerById };
  }

  for (const sub of data.subcategories) {
    const list = subcategoriesByCategory.get(sub.categoryId) ?? [];
    subcategoriesByCategory.set(sub.categoryId, [...list, sub]);
  }

  for (const item of data.baseItems) {
    const list = itemsBySubcategory.get(item.subcategoryId) ?? [];
    itemsBySubcategory.set(item.subcategoryId, [...list, item]);
  }

  for (const offer of data.offers) {
    const list = offersByBaseItem.get(offer.baseItemId) ?? [];
    offersByBaseItem.set(offer.baseItemId, [...list, offer]);
    offerById.set(offer.id, offer);
  }

  return { subcategoriesByCategory, itemsBySubcategory, offersByBaseItem, offerById };
}

