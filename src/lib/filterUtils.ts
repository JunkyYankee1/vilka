import type { CatalogFilters } from "@/components/CatalogFilters";

const DEFAULT_FILTERS: CatalogFilters = {
  minPrice: null,
  maxPrice: null,
  spicy: "any",
  vegetarian: "any",
};

export function filtersToQueryString(filters: CatalogFilters): string {
  const params = new URLSearchParams();

  if (filters.minPrice !== null) {
    params.set("minPrice", filters.minPrice.toString());
  }
  if (filters.maxPrice !== null) {
    params.set("maxPrice", filters.maxPrice.toString());
  }
  if (filters.spicy !== "any") {
    params.set("spicy", filters.spicy);
  }
  if (filters.vegetarian !== "any") {
    params.set("veg", filters.vegetarian === "vegetarian" ? "1" : "0");
  }

  return params.toString();
}

export function queryStringToFilters(searchParams: URLSearchParams): CatalogFilters {
  const filters: CatalogFilters = { ...DEFAULT_FILTERS };

  const minPrice = searchParams.get("minPrice");
  if (minPrice) {
    const num = parseFloat(minPrice);
    if (!isNaN(num) && num >= 0) {
      filters.minPrice = num;
    }
  }

  const maxPrice = searchParams.get("maxPrice");
  if (maxPrice) {
    const num = parseFloat(maxPrice);
    if (!isNaN(num) && num >= 0) {
      filters.maxPrice = num;
    }
  }

  const spicy = searchParams.get("spicy");
  if (spicy === "spicy" || spicy === "not_spicy") {
    filters.spicy = spicy;
  }

  const veg = searchParams.get("veg");
  if (veg === "1") {
    filters.vegetarian = "vegetarian";
  } else if (veg === "0") {
    filters.vegetarian = "not_vegetarian";
  }

  return filters;
}

export function updateURLFilters(filters: CatalogFilters, searchQuery?: string) {
  const params = new URLSearchParams(window.location.search);

  // Preserve search query if provided
  if (searchQuery) {
    params.set("q", searchQuery);
  } else if (params.has("q")) {
    // Keep existing search query
  }

  // Update filter params
  if (filters.minPrice !== null) {
    params.set("minPrice", filters.minPrice.toString());
  } else {
    params.delete("minPrice");
  }

  if (filters.maxPrice !== null) {
    params.set("maxPrice", filters.maxPrice.toString());
  } else {
    params.delete("maxPrice");
  }

  if (filters.spicy !== "any") {
    params.set("spicy", filters.spicy);
  } else {
    params.delete("spicy");
  }

  if (filters.vegetarian !== "any") {
    params.set("veg", filters.vegetarian === "vegetarian" ? "1" : "0");
  } else {
    params.delete("veg");
  }

  const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", newUrl);
}

