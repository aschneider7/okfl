import type {DraftManager, DraftPick, DraftPlayer} from "@/lib/draftSimulator";

export type {DraftManager, DraftPick, DraftPlayer};

export type ActivePanel = "players" | "roster" | "intel";
export type Recommendation = {player: DraftPlayer; score: number};

export const POSITION_CLASS: Record<string, string> = {
  QB: "posQB", RB: "posRB", WR: "posWR", TE: "posTE", K: "posK", DEF: "posDEF",
};

export const pickKey = (round: number, slot: number) => `${round}-${slot}`;
