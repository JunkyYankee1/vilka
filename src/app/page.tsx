import CatalogPageClient from "./_components/CatalogPageClient";
import { getCatalogData } from "@/modules/catalog/getCatalogData";

export const revalidate = 60;

export default async function HomePage() {
  const catalog = await getCatalogData();
  return <CatalogPageClient catalog={catalog} />;
}

