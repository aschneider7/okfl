import type {DraftManager, DraftMode, DraftPick, DraftPlayer} from "@/lib/draftSimulator";

export type {DraftManager, DraftMode, DraftPick, DraftPlayer};

export type Recommendation = {player: DraftPlayer; score: number};
export type SimulationSpeed = "normal" | "turbo";

export const POSITION_CLASS: Record<string, string> = {
  QB: "posQB", RB: "posRB", WR: "posWR", TE: "posTE", K: "posK", DEF: "posDEF",
};

export const pickKey = (round: number, slot: number) => `${round}-${slot}`;

export function gradeTone(grade?: string) {
  if (grade === "A+" || grade === "A") return "gradeExcellent";
  if (grade === "B+" || grade === "B") return "gradeGood";
  if (grade === "C+" || grade === "C") return "gradeReach";
  if (grade === "D") return "gradePoor";
  return "gradeKeeper";
}
