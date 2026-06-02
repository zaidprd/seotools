import type { WPSite } from "./constants";

const KEY = "seotulis_wp_sites";

export function getWPSites(): WPSite[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

export function saveWPSites(sites: WPSite[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(sites));
}
