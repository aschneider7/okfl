import type {OKFLData} from "./types";

let pending: Promise<OKFLData> | null = null;

export function getData(): Promise<OKFLData> {
  if (pending) return pending;
  pending = fetch("/data/okfl.json")
    .then((response) => {
      if (!response.ok) throw new Error(`Unable to load OKFL data (${response.status})`);
      return response.json() as Promise<OKFLData>;
    })
    .catch((error) => {
      pending = null;
      throw error;
    });
  return pending;
}

export function sortBySeason<T extends {season?: number; week?: number}>(rows: T[], desc = false) {
  return [...rows].sort((a, b) => {
    const difference = (a.season ?? 0) - (b.season ?? 0) || (a.week ?? 0) - (b.week ?? 0);
    return desc ? -difference : difference;
  });
}

export const fmt = (value: number | undefined, digits = 1) => Number(value ?? 0).toFixed(digits);
