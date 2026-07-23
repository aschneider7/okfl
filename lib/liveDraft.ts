import type {DraftPlayer} from "./draftSimulator";

export type LiveDraftStatus = "lobby" | "live" | "paused" | "complete";

export type LiveDraftRoom = {
  id: string;
  code: string;
  name: string;
  status: LiveDraftStatus;
  currentOverall: number;
  clockSeconds: number;
  keeperSource: "official" | "projected";
  pickDeadline: string | null;
  hostName: string;
  createdAt: string;
};

export type LiveDraftSeat = {
  franchiseId: string;
  slot: number;
  managerName: string;
  claimedName: string | null;
  claimed: boolean;
};

export type LiveDraftPick = {
  overall: number;
  round: number;
  slot: number;
  franchiseId: string;
  player: DraftPlayer;
  keeper: boolean;
  keeperCost: number | null;
  selectedBy: string | null;
  createdAt: string;
};

export type LiveDraftSnapshot = {
  serverTime: string;
  room: LiveDraftRoom;
  seats: LiveDraftSeat[];
  picks: LiveDraftPick[];
};

export type LiveRoomCredentials = {
  roomCode: string;
  hostToken?: string;
  seatToken?: string;
  franchiseId?: string;
  displayName?: string;
};
