import catalog from "@/lib/generated/scrapeCatalog.json";
import { ScrapeCatalogEntry } from "@/lib/scrapeMonitoringTypes";

export const scrapeCatalog = catalog as ScrapeCatalogEntry[];

export function getCatalogBySources(sources: string[]): ScrapeCatalogEntry[] {
  const sourceSet = new Set(sources.map((s) => s.trim()).filter(Boolean));
  if (sourceSet.size === 0) return scrapeCatalog;
  return scrapeCatalog.filter((entry) => sourceSet.has(entry.source));
}
