"use client";

import {Fragment, useCallback, useEffect, useMemo, useRef, useState} from "react";
import type {RealtimeChannel} from "@supabase/supabase-js";
import {DRAFT_ROUNDS, managers, overallToRoundSlot, pickGrade} from "@/lib/draftSimulator";
import type {DraftPick, DraftPlayer} from "@/lib/draftSimulator";
import {draftPlayerKey} from "@/lib/draftRankings";
import type {LiveDraftSnapshot, LiveRoomCredentials} from "@/lib/liveDraft";
import {getSupabaseBrowserClient} from "@/lib/supabaseBrowser";
import {BoardCell} from "../mock-draft/components/BoardCell";
import {pickKey, POSITION_CLASS} from "../mock-draft/types";

type SeatPin = {franchiseId: string; manager: string; pin: string};
type JsonResult = {snapshot?: LiveDraftSnapshot; error?: string; hostToken?: string; seatToken?: string; franchiseId?: string; displayName?: string; seatPins?: SeatPin[]};

async function requestJson(url: string, options?: RequestInit): Promise<JsonResult> {
  const response = await fetch(url, {...options, headers: {"Content-Type": "application/json", ...(options?.headers || {})}});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The live draft request failed.");
  return result;
}

function credentialKey(code: string) { return `okfl:live-draft:${code}`; }

export function LiveDraftClient({initialCode}: {initialCode: string}) {
  const [snapshot, setSnapshot] = useState<LiveDraftSnapshot | null>(null);
  const [credentials, setCredentials] = useState<LiveRoomCredentials>({roomCode: initialCode});
  const [seatPins, setSeatPins] = useState<SeatPin[]>([]);
  const [onlineFranchises, setOnlineFranchises] = useState<Set<string>>(new Set());
  const [players, setPlayers] = useState<DraftPlayer[]>([]);
  const [position, setPosition] = useState("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(Boolean(initialCode));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialCode ? "Opening draft room..." : "Create a room or enter an invite code.");
  const [roomCodeInput, setRoomCodeInput] = useState(initialCode);
  const [hostName, setHostName] = useState("");
  const [roomName, setRoomName] = useState("2026 OKFL Live Draft");
  const [clockSeconds, setClockSeconds] = useState(30);
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [joinFranchise, setJoinFranchise] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinPin, setJoinPin] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const serverOffsetRef = useRef(0);
  const automatedOverallRef = useRef(0);
  const timeoutOverallRef = useRef(0);

  const loadRoom = useCallback(async (code: string, quiet = false) => {
    if (!code) return;
    if (!quiet) setLoading(true);
    try {
      const result = await requestJson(`/api/live-draft/rooms/${code}`);
      if (result.snapshot) setSnapshot(result.snapshot);
      if (!quiet) setMessage("Room synchronized.");
    } catch (error) {
      if (!quiet) { setSnapshot(null); setMessage(error instanceof Error ? error.message : "Could not open that room."); }
    } finally { if (!quiet) setLoading(false); }
  }, []);

  useEffect(() => {
    if (!initialCode) return;
    const saved = window.localStorage.getItem(credentialKey(initialCode));
    if (saved) {
      try { setCredentials(JSON.parse(saved)); } catch { /* Ignore invalid local credentials. */ }
    }
    void loadRoom(initialCode);
  }, [initialCode, loadRoom]);

  useEffect(() => {
    fetch("/api/draft/rankings").then((response) => response.json()).then((result) => setPlayers(result.players || [])).catch(() => setPlayers([]));
  }, []);

  useEffect(() => {
    const code = snapshot?.room.code;
    if (!code) return;
    const interval = window.setInterval(() => void loadRoom(code, true), 8000);
    const client = getSupabaseBrowserClient();
    if (!client) return () => window.clearInterval(interval);
    const presenceKey = `${credentials.franchiseId || "viewer"}-${crypto.randomUUID()}`;
    const channel = client.channel(`live-draft:${code}`, {config: {presence: {key: presenceKey}}})
      .on("broadcast", {event: "room_changed"}, () => void loadRoom(code, true))
      .on("presence", {event: "sync"}, () => {
        const rows = Object.values(channel.presenceState()).flat() as {franchiseId?: string}[];
        setOnlineFranchises(new Set(rows.map((row) => row.franchiseId).filter((value): value is string => Boolean(value))));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({franchiseId: credentials.franchiseId || null, displayName: credentials.displayName || "Viewer", joinedAt: new Date().toISOString()});
      });
    channelRef.current = channel;
    return () => { window.clearInterval(interval); channelRef.current = null; void client.removeChannel(channel); };
  }, [credentials.displayName, credentials.franchiseId, loadRoom, snapshot?.room.code]);

  function saveCredentials(next: LiveRoomCredentials) {
    setCredentials(next); window.localStorage.setItem(credentialKey(next.roomCode), JSON.stringify(next));
  }
  async function announceChange() { await channelRef.current?.send({type: "broadcast", event: "room_changed", payload: {at: Date.now()}}); }
  async function copyPinList() {
    if (!snapshot || !seatPins.length) return;
    const lines = [`${snapshot.room.name} — Room ${snapshot.room.code}`, `${window.location.origin}/live-draft?room=${snapshot.room.code}`, "", ...seatPins.map((seat) => `${seat.manager}: ${seat.pin}`)];
    await navigator.clipboard.writeText(lines.join("\n"));
    setMessage("Invite link and all ten team PINs copied.");
  }

  async function createRoom(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("Creating secure room...");
    try {
      const result = await requestJson("/api/live-draft/rooms", {method: "POST", body: JSON.stringify({hostName, roomName, clockSeconds})});
      if (!result.snapshot || !result.hostToken) throw new Error("The room response was incomplete.");
      const next = {roomCode: result.snapshot.room.code, hostToken: result.hostToken};
      saveCredentials(next); setSeatPins(result.seatPins || []); setSnapshot(result.snapshot); setRoomCodeInput(result.snapshot.room.code);
      window.history.replaceState(null, "", `/live-draft?room=${result.snapshot.room.code}`); setMessage("Room created. Share the invite link and each manager's team PIN.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create the room."); }
    finally { setBusy(false); }
  }

  async function openRoom(event: React.FormEvent) {
    event.preventDefault(); const code = roomCodeInput.trim().toUpperCase(); if (!code) return;
    window.history.replaceState(null, "", `/live-draft?room=${code}`); setCredentials({roomCode: code}); await loadRoom(code);
  }

  async function joinRoom(event: React.FormEvent) {
    event.preventDefault(); if (!snapshot) return; setBusy(true);
    try {
      const result = await requestJson(`/api/live-draft/rooms/${snapshot.room.code}/join`, {method: "POST", body: JSON.stringify({franchiseId: joinFranchise, displayName: joinName, pin: joinPin})});
      if (!result.seatToken || !result.franchiseId) throw new Error("The seat response was incomplete.");
      const next = {...credentials, seatToken: result.seatToken, franchiseId: result.franchiseId, displayName: result.displayName};
      saveCredentials(next); if (result.snapshot) setSnapshot(result.snapshot); setJoinPin(""); setMessage(`You now control ${managers.find((manager) => manager.franchiseId === result.franchiseId)?.manager || "this franchise"}.`); await announceChange();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not claim the franchise."); }
    finally { setBusy(false); }
  }

  async function hostAction(action: "start" | "pause" | "resume" | "undo") {
    if (!snapshot || !credentials.hostToken) return; setBusy(true);
    try {
      const result = await requestJson(`/api/live-draft/rooms/${snapshot.room.code}/action`, {method: "POST", body: JSON.stringify({action, hostToken: credentials.hostToken})});
      if (result.snapshot) setSnapshot(result.snapshot); setMessage(action === "undo" ? "Last live pick removed; room paused." : action === "start" ? "Draft started. Open franchises are now AI-controlled." : `Room ${action}d.`); await announceChange();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Host action failed."); }
    finally { setBusy(false); }
  }

  async function draftPlayer(player: DraftPlayer) {
    if (!snapshot || !credentials.seatToken) return; setBusy(true);
    try {
      const result = await requestJson(`/api/live-draft/rooms/${snapshot.room.code}/pick`, {method: "POST", body: JSON.stringify({actorToken: credentials.seatToken, player, expectedOverall: snapshot.room.currentOverall})});
      if (result.snapshot) setSnapshot(result.snapshot); setMessage(`${player.name} is officially on the board.`); await announceChange();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Pick failed."); }
    finally { setBusy(false); }
  }

  async function makeBotPick() {
    if (!snapshot || !credentials.hostToken) return; setBusy(true);
    try {
      const result = await requestJson(`/api/live-draft/rooms/${snapshot.room.code}/ai-pick`, {method: "POST", body: JSON.stringify({hostToken: credentials.hostToken})});
      if (result.snapshot) setSnapshot(result.snapshot); setMessage("Bot selection added."); await announceChange();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Bot pick failed."); }
    finally { setBusy(false); }
  }

  const draftedKeys = useMemo(() => new Set(snapshot?.picks.map((pick) => draftPlayerKey(pick.player.name)) || []), [snapshot?.picks]);
  const available = useMemo(() => players.filter((player) => !draftedKeys.has(draftPlayerKey(player.name))).filter((player) => position === "ALL" || player.position === position).filter((player) => !query || player.name.toLowerCase().includes(query.toLowerCase())), [draftedKeys, players, position, query]);
  const current = snapshot && snapshot.room.currentOverall <= 170 ? overallToRoundSlot(snapshot.room.currentOverall) : null;
  const currentSeat = current ? snapshot?.seats.find((seat) => seat.slot === current.slot) : null;
  const canPick = Boolean(snapshot?.room.status === "live" && currentSeat?.franchiseId === credentials.franchiseId && credentials.seatToken);
  const isHost = Boolean(credentials.hostToken);

  useEffect(() => {
    if (!snapshot) return;
    serverOffsetRef.current = Date.parse(snapshot.serverTime) - Date.now();
  }, [snapshot?.serverTime]);

  useEffect(() => {
    if (!snapshot?.room.pickDeadline || snapshot.room.status !== "live") {
      setSecondsRemaining(snapshot?.room.clockSeconds || clockSeconds);
      return;
    }
    const overall = snapshot.room.currentOverall;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((Date.parse(snapshot.room.pickDeadline!) - (Date.now() + serverOffsetRef.current)) / 1000));
      setSecondsRemaining(remaining);
      if (remaining > 0 || timeoutOverallRef.current === overall) return;
      timeoutOverallRef.current = overall;
      void requestJson(`/api/live-draft/rooms/${snapshot.room.code}/timeout`, {method: "POST", body: JSON.stringify({expectedOverall: overall})})
        .then(async (result) => { if (result.snapshot) setSnapshot(result.snapshot); await announceChange(); })
        .catch(() => { timeoutOverallRef.current = 0; void loadRoom(snapshot.room.code, true); });
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [clockSeconds, loadRoom, snapshot?.room.clockSeconds, snapshot?.room.code, snapshot?.room.currentOverall, snapshot?.room.pickDeadline, snapshot?.room.status]);

  useEffect(() => {
    if (!snapshot || snapshot.room.status !== "live" || !currentSeat || currentSeat.claimed || automatedOverallRef.current === snapshot.room.currentOverall) return;
    const overall = snapshot.room.currentOverall;
    automatedOverallRef.current = overall;
    const timer = window.setTimeout(() => {
      void requestJson(`/api/live-draft/rooms/${snapshot.room.code}/ai-pick`, {method: "POST", body: "{}"})
        .then(async (result) => { if (result.snapshot) setSnapshot(result.snapshot); await announceChange(); })
        .catch(() => { automatedOverallRef.current = 0; void loadRoom(snapshot.room.code, true); });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [currentSeat, loadRoom, snapshot]);

  if (!snapshot) return <section className="liveDraftLaunch">
    <div className="liveLaunchIntro"><span className="liveTag">New multiplayer mode</span><h2>One board. Ten managers. Every device in sync.</h2><p>Create the official room as commissioner or open an invite code from another manager.</p><div className="liveFeatureStrip"><span>10 live seats</span><span>Private team PINs</span><span>Custom pick clock</span><span>Automatic AI teams</span></div></div>
    <div className="liveLaunchForms">
      <form onSubmit={createRoom}><span>Commissioner</span><h3>Create a live room</h3><label>Your name<input required value={hostName} onChange={(event) => setHostName(event.target.value)} placeholder="Aaron" /></label><label>Room name<input value={roomName} onChange={(event) => setRoomName(event.target.value)} /></label><fieldset className="clockSetup"><legend>Seconds per pick</legend><div>{[10,30,60].map((value) => <button type="button" key={value} className={clockSeconds === value ? "active" : ""} onClick={() => setClockSeconds(value)}>{value === 60 ? "1 min" : `${value}s`}</button>)}<label>Custom<input aria-label="Custom seconds per pick" required type="number" min="1" max="3600" value={clockSeconds} onChange={(event) => setClockSeconds(Math.max(1, Math.min(3600, Number(event.target.value) || 1)))} /><span>sec</span></label></div></fieldset><button disabled={busy}>Create room</button></form>
      <form onSubmit={openRoom}><span>Manager</span><h3>Join an existing room</h3><label>Six-character invite code<input required maxLength={6} value={roomCodeInput} onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())} placeholder="OKFL26" /></label><button disabled={busy || loading}>Open room</button></form>
    </div><p className="liveMessage" role="status">{message}</p>
  </section>;

  const board = new Map<string, DraftPick>();
  snapshot.picks.forEach((pick) => {
    const manager = managers.find((row) => row.franchiseId === pick.franchiseId)!;
    board.set(pickKey(pick.round, pick.slot), {
      overall: pick.overall, round: pick.round, slot: pick.slot, franchiseId: pick.franchiseId, manager: manager.manager,
      player: pick.player, keeper: pick.keeper, keeperCost: pick.keeperCost || undefined,
      grade: pick.keeper ? "K" : pickGrade(pick.player, pick.overall), explanation: [],
    });
  });
  const myRoster = snapshot.picks.filter((pick) => pick.franchiseId === credentials.franchiseId);

  return <div className="draftRoomV3 liveDraftRoom">
    <section className="liveRoomTopbar"><div><span className="eyebrow">OKFL Live Draft · {snapshot.room.clockSeconds}s clock</span><h2>{snapshot.room.name}</h2><p>{message}</p></div><div className="roomCode"><span>Invite code</span><b>{snapshot.room.code}</b><button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/live-draft?room=${snapshot.room.code}`)}>Copy link</button></div><div className="livePresence"><b>{onlineFranchises.size}</b><span>managers online</span></div></section>

    <section className="liveSeatLobby"><header><div><span className="eyebrow">Draft lobby</span><h2>{snapshot.seats.filter((seat) => seat.claimed).length}/10 franchises claimed</h2></div>{isHost && <div className="liveHostControls">
      {seatPins.length > 0 && <button onClick={copyPinList} disabled={busy}>Copy team PINs</button>}
      {snapshot.room.status === "lobby" && <button onClick={() => hostAction("start")} disabled={busy}>Start draft</button>}
      {snapshot.room.status === "live" && <button onClick={() => hostAction("pause")} disabled={busy}>Pause</button>}
      {snapshot.room.status === "paused" && <button onClick={() => hostAction("resume")} disabled={busy}>Resume</button>}
      {snapshot.room.status !== "lobby" && <button onClick={() => hostAction("undo")} disabled={busy}>Undo pick</button>}
    </div>}</header><div className="liveSeatGrid">{snapshot.seats.map((seat) => {
      const pin = seatPins.find((row) => row.franchiseId === seat.franchiseId)?.pin;
      const mine = credentials.franchiseId === seat.franchiseId;
      const aiControlled = snapshot.room.status !== "lobby" && !seat.claimed;
      return <article key={seat.franchiseId} className={`${seat.claimed ? "claimed" : ""} ${mine ? "mine" : ""} ${aiControlled ? "ai" : ""}`}><i>{aiControlled ? "AI" : seat.managerName.slice(0, 1)}</i><span>Pick {seat.slot}</span><b>{seat.managerName}</b><small>{seat.claimedName || (aiControlled ? "AI manager" : "Open seat")}</small><em>{onlineFranchises.has(seat.franchiseId) ? "Online" : seat.claimed ? "Offline" : aiControlled ? "AI controlled" : pin ? `PIN ${pin}` : "Needs PIN"}</em></article>;
    })}</div>
      {!credentials.seatToken && snapshot.room.status === "lobby" && <form className="claimSeatForm" onSubmit={joinRoom}><label>Your name<input required value={joinName} onChange={(event) => setJoinName(event.target.value)} placeholder="Manager name" /></label><label>Franchise<select required value={joinFranchise} onChange={(event) => setJoinFranchise(event.target.value)}><option value="">Choose team</option>{snapshot.seats.map((seat) => <option key={seat.franchiseId} value={seat.franchiseId}>{seat.slot}. {seat.managerName}</option>)}</select></label><label>Team PIN<input required inputMode="numeric" maxLength={4} value={joinPin} onChange={(event) => setJoinPin(event.target.value.replace(/\D/g, ""))} placeholder="0000" /></label><button disabled={busy}>Claim franchise</button></form>}
    </section>

    <section className="draftV2BoardPanel liveBoard"><header><div><span className="eyebrow">Room {snapshot.room.code} · {snapshot.room.status}</span><h2>Live draft board</h2></div><div className={`clockStatus liveClock ${canPick ? "yourTurn" : ""} ${secondsRemaining <= 5 ? "urgent" : ""}`}><span>{canPick ? "Your pick" : currentSeat?.claimedName || (currentSeat ? "AI selecting" : "Draft complete")}</span><b>{snapshot.room.status === "live" ? secondsRemaining : "—"}<small>{snapshot.room.status === "live" ? " sec" : current ? `${current.round}.${current.slot}` : "Final"}</small></b></div></header>
      <div className="draftV2BoardScroller"><div className="draftV2ManagerRow"><div className="draftRoundCorner">RD</div>{managers.map((manager) => <div className={manager.franchiseId === credentials.franchiseId ? "controlled" : ""} key={manager.franchiseId}><i>{manager.manager.slice(0, 1)}</i><span>Pick {manager.slot}</span><b>{manager.manager}</b><small>{snapshot.seats.find((seat) => seat.franchiseId === manager.franchiseId)?.claimedName || "Open"}</small></div>)}</div>
      <div className="draftV2Board">{Array.from({length: DRAFT_ROUNDS}, (_, roundIndex) => { const round = roundIndex + 1; return <Fragment key={round}><div className="draftRoundLabel"><span>R</span><b>{round}</b></div>{Array.from({length: 10}, (_, slotIndex) => { const slot = slotIndex + 1; const manager = managers.find((row) => row.slot === slot)!; return <BoardCell key={`${round}-${slot}`} round={round} slot={slot} pick={board.get(pickKey(round, slot))} active={current?.round === round && current?.slot === slot} manager={manager} controlledFranchise={credentials.franchiseId || ""} />; })}</Fragment>; })}</div></div>
    </section>

    <div className="liveDraftWorkbench"><section className="livePlayerPool"><header><div><span className="eyebrow">PPR player market</span><h2>{canPick ? "You are on the clock" : "Available players"}</h2></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players" /></header><div className="positionTabs">{["ALL","QB","RB","WR","TE","K","DEF"].map((value) => <button key={value} className={position === value ? "active" : ""} onClick={() => setPosition(value)}>{value}</button>)}</div><div className="livePlayerRows">{available.slice(0, 180).map((player) => <article key={player.name}><span className={`playerPosition ${POSITION_CLASS[player.position] || ""}`}>{player.position}</span><div><b>{player.name}</b><small>{player.team} · ADP {player.marketAdp?.toFixed(1) || player.pprRank}</small></div><strong>#{player.pprRank}</strong><button disabled={!canPick || busy} onClick={() => draftPlayer(player)}>Draft</button></article>)}</div></section>
      <aside className="liveDraftSide"><section><span className="eyebrow">On the clock · {secondsRemaining}s</span><h2>{currentSeat?.claimedName || (currentSeat ? `${currentSeat.managerName} AI` : "Draft complete")}</h2><p>{snapshot.room.status === "lobby" ? "Waiting for the commissioner to start. Unclaimed teams become AI." : canPick ? "Choose a player before the clock expires." : currentSeat?.claimed ? "Waiting for this manager's selection. AI takes over at zero." : "AI is making this franchise's selection."}</p>{isHost && snapshot.room.status === "live" && !currentSeat?.claimed && <button onClick={makeBotPick} disabled={busy}>Pick now</button>}</section><section><span className="eyebrow">My roster</span><h3>{managers.find((manager) => manager.franchiseId === credentials.franchiseId)?.manager || "Spectator"}</h3><div className="liveRoster">{myRoster.map((pick) => <div key={pick.overall}><span>{pick.player.position}</span><b>{pick.player.name}</b><small>{pick.keeper ? `Keeper R${pick.keeperCost}` : `${pick.round}.${pick.slot}`}</small></div>)}{!myRoster.length && <p>Claim a franchise to build your roster.</p>}</div></section></aside>
    </div>
  </div>;
}
