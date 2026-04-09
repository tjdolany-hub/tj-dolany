"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Plus, Pencil, Trash2, Users, Target, ChevronDown, Save, X, Eye,
  BookOpen, Upload, UserPlus, RotateCcw, Square, AlertTriangle, Camera, CheckCircle, Video, Share2, Copy, ExternalLink, FilePlus2, RefreshCw,
} from "lucide-react";
import ImageUploader from "@/components/admin/ImageUploader";
import { parseMatchReport } from "@/lib/match-parser";
import { formatTimePrague, getHoursPrague, getMinutesPrague, toPragueISO } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────

interface Player {
  id: string;
  name: string;
  position: string;
  active: boolean;
}

interface ScorerEntry {
  player_id: string;
  goals: number;
  minute: number | null;
  is_penalty?: boolean;
  players?: { id: string; name: string };
}

interface LineupEntry {
  player_id: string;
  is_starter: boolean;
  is_captain?: boolean;
  number?: number | null;
  players?: { id: string; name: string };
}

interface CardEntry {
  player_id: string;
  card_type: "yellow" | "red";
  minute: number | null;
  players?: { id: string; name: string };
}

interface OpponentScorerEntry {
  name: string;
  minute: number | null;
  is_penalty: boolean;
}

interface OpponentCardEntry {
  name: string;
  card_type: "yellow" | "red";
  minute: number | null;
}

interface OpponentLineupEntry {
  name: string;
  number: number | null;
  position: string | null;
  is_starter: boolean;
  is_captain: boolean;
}

interface Match {
  id: string;
  date: string;
  opponent: string;
  score_home: number;
  score_away: number;
  is_home: boolean;
  competition: string | null;
  season: string | null;
  summary: string | null;
  summary_title: string | null;
  halftime_home: number | null;
  halftime_away: number | null;
  venue: string | null;
  video_url: string | null;
  opponent_scorers: string | null;
  opponent_cards: string | null;
  round: string | null;
  referee: string | null;
  delegate: string | null;
  spectators: number | null;
  match_number: string | null;
  match_type: "mistrovsky" | "pratelsky";
  article_id: string | null;
  match_lineups?: LineupEntry[];
  match_scorers?: ScorerEntry[];
  match_cards?: CardEntry[];
  match_images?: { url: string; alt: string | null }[];
  match_opponent_scorers?: OpponentScorerEntry[];
  match_opponent_cards?: OpponentCardEntry[];
  match_opponent_lineup?: (OpponentLineupEntry & { is_captain: boolean })[];
}

interface Draw {
  id: string;
  season: string;
  title: string;
  image: string;
  active: boolean;
}

// ─── Constants ───────────────────────────────────────────────

const SEASONS = ["2025/2026", "2024/2025", "2023/2024"];

const emptyForm = {
  date: "",
  time: "",
  home_team: "Dolany",
  away_team: "",
  score_home: 0,
  score_away: 0,
  halftime_home: "",
  halftime_away: "",
  competition: "AGRO CS 8 liga Muži",
  season: "2025/2026",
  venue: "Dolany",
  summary_title: "",
  summary: "",
  video_url: "",
  opponent_scorers: "",
  opponent_cards: "",
  round: "",
  referee: "",
  delegate: "",
  spectators: "",
  match_number: "",
  match_type: "mistrovsky" as "mistrovsky" | "pratelsky",
};

// ─── Component ───────────────────────────────────────────────

export default function AdminMatchesPage() {
  const [activeTab, setActiveTab] = useState<"matches" | "draws" | "standings">("matches");

  // ── Match state ──
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState("2025/2026");
  const [half, setHalf] = useState<"all" | "podzim" | "jaro">("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [lineup, setLineup] = useState<{ player_id: string; is_starter: boolean; is_captain: boolean; number: number | null }[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [scorers, setScorers] = useState<{ player_id: string; goals: number; minute: string; is_penalty: boolean }[]>([]);
  const [cards, setCards] = useState<{ player_id: string; card_type: "yellow" | "red"; minute: string }[]>([]);
  const [matchImages, setMatchImages] = useState<{ url: string; alt?: string }[]>([]);
  const [opponentScorers, setOpponentScorers] = useState<{ name: string; minute: string; is_penalty: boolean }[]>([]);
  const [opponentCards, setOpponentCards] = useState<{ name: string; card_type: "yellow" | "red"; minute: string }[]>([]);
  const [opponentLineup, setOpponentLineup] = useState<{ name: string; number: string; position: string; is_starter: boolean; is_captain: boolean }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [shareDialog, setShareDialog] = useState<{ slug: string; title: string } | null>(null);

  // ── Standings state ──
  type StandingsVariant = "celkem" | "doma" | "venku";
  interface Standing {
    position: number;
    team_name: string;
    matches_played: number;
    wins: number;
    draws_count: number;
    losses: number;
    goals_for: number;
    goals_against: number;
    points: number;
    is_our_team: boolean;
  }
  const [standingsData, setStandingsData] = useState<Record<StandingsVariant, Standing[]>>({ celkem: [], doma: [], venku: [] });
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [standingsSaving, setStandingsSaving] = useState(false);
  const [standingsSeason, setStandingsSeason] = useState("2025/2026");
  const [standingsPreviewVariant, setStandingsPreviewVariant] = useState<StandingsVariant>("celkem");
  const [standingsText, setStandingsText] = useState("");

  const VARIANT_LABELS: Record<StandingsVariant, string> = { celkem: "Celkem", doma: "Doma", venku: "Venku" };

  function parseStandingLines(lines: string[]): Standing[] {
    const results: Standing[] = [];
    for (const line of lines) {
      if (line.match(/^#\s/) || line.match(/^\s*Klub/i) || line.match(/^\s*#\s+Klub/)) continue;
      const parts = line.split(/\t/).map((s) => s.trim()).filter(Boolean);
      if (parts.length < 8) continue;
      const posStr = parts[0].replace(".", "");
      const pos = parseInt(posStr);
      if (isNaN(pos)) continue;
      const teamName = parts[1];
      const z = parseInt(parts[2]) || 0;
      const v = parseInt(parts[3]) || 0;
      const r = parseInt(parts[4]) || 0;
      const p = parseInt(parts[5]) || 0;
      let gf = 0, ga = 0;
      const scoreMatch = parts[6].match(/(\d+)\s*:\s*(\d+)/);
      let pointsIdx = 7;
      if (scoreMatch) { gf = parseInt(scoreMatch[1]); ga = parseInt(scoreMatch[2]); }
      else { gf = parseInt(parts[6]) || 0; ga = parseInt(parts[7]) || 0; pointsIdx = 8; }
      const b = parseInt(parts[pointsIdx]) || 0;
      const isOur = teamName.toLowerCase().includes("dolany");
      results.push({ position: pos, team_name: teamName, matches_played: z, wins: v, draws_count: r, losses: p, goals_for: gf, goals_against: ga, points: b, is_our_team: isOur });
    }
    return results;
  }

  /** Parse multi-variant text: splits by "Celkem" / "Doma" / "Venku" headers */
  function parseAllVariants(text: string): Record<StandingsVariant, Standing[]> {
    const result: Record<StandingsVariant, Standing[]> = { celkem: [], doma: [], venku: [] };
    const lines = text.split("\n");
    let currentVariant: StandingsVariant = "celkem";
    const sectionLines: Record<StandingsVariant, string[]> = { celkem: [], doma: [], venku: [] };
    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      if (trimmed === "celkem") { currentVariant = "celkem"; continue; }
      if (trimmed === "doma") { currentVariant = "doma"; continue; }
      if (trimmed === "venku") { currentVariant = "venku"; continue; }
      if (trimmed) sectionLines[currentVariant].push(line);
    }
    result.celkem = parseStandingLines(sectionLines.celkem);
    result.doma = parseStandingLines(sectionLines.doma);
    result.venku = parseStandingLines(sectionLines.venku);
    return result;
  }

  // ── Draw state ──
  const [draws, setDraws] = useState<Draw[]>([]);
  const [drawsLoading, setDrawsLoading] = useState(true);
  const [showDrawForm, setShowDrawForm] = useState(false);
  const [drawEditId, setDrawEditId] = useState<string | null>(null);
  const [drawForm, setDrawForm] = useState({ season: "2025/2026", title: "", active: true });
  const [drawImages, setDrawImages] = useState<{ url: string; alt?: string }[]>([]);
  const [drawSaving, setDrawSaving] = useState(false);
  const [drawSaved, setDrawSaved] = useState(false);

  // ── Load data ──

  const loadMatches = useCallback(() => {
    setLoading(true);
    fetch(`/api/matches?season=${encodeURIComponent(season)}`)
      .then((r) => r.json())
      .then((data) => setMatches(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [season]);

  const loadDraws = useCallback(() => {
    setDrawsLoading(true);
    fetch("/api/draws")
      .then((r) => r.json())
      .then((data) => setDraws(Array.isArray(data) ? data : []))
      .finally(() => setDrawsLoading(false));
  }, []);

  useEffect(() => {
    loadMatches();
    fetch("/api/players").then((r) => r.json()).then((d) => setPlayers(Array.isArray(d) ? d : []));
  }, [loadMatches]);

  useEffect(() => {
    loadDraws();
  }, [loadDraws]);

  const loadStandings = useCallback(() => {
    setStandingsLoading(true);
    fetch(`/api/standings?season=${encodeURIComponent(standingsSeason)}`)
      .then((r) => r.json())
      .then((data: Array<{ variant?: string; draws?: number; [key: string]: unknown }>) => {
        const grouped: Record<StandingsVariant, Standing[]> = { celkem: [], doma: [], venku: [] };
        if (Array.isArray(data)) {
          for (const d of data) {
            const v = (d.variant as StandingsVariant) || "celkem";
            if (grouped[v]) {
              grouped[v].push({ ...d, draws_count: (d.draws as number) ?? 0 } as unknown as Standing);
            }
          }
        }
        setStandingsData(grouped);
      })
      .finally(() => setStandingsLoading(false));
  }, [standingsSeason]);

  useEffect(() => {
    if (activeTab === "standings") loadStandings();
  }, [activeTab, loadStandings]);

  const parseAndPreview = () => {
    const parsed = parseAllVariants(standingsText);
    setStandingsData(parsed);
  };

  const saveStandings = async () => {
    setStandingsSaving(true);
    const variants: StandingsVariant[] = ["celkem", "doma", "venku"];
    for (const variant of variants) {
      const rows = standingsData[variant];
      await fetch("/api/standings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season: standingsSeason,
          variant,
          standings: rows.map((s, i) => ({
            season: standingsSeason,
            variant,
            position: i + 1,
            team_name: s.team_name,
            matches_played: s.matches_played,
            wins: s.wins,
            draws: s.draws_count,
            losses: s.losses,
            goals_for: s.goals_for,
            goals_against: s.goals_against,
            points: s.points,
            is_our_team: s.is_our_team,
          })),
        }),
      });
    }
    loadStandings();
    setStandingsSaving(false);
  };

  // ── Match form logic ──

  const resetForm = () => {
    setForm(emptyForm);
    setLineup([]);
    setScorers([]);
    setCards([]);
    setMatchImages([]);
    setOpponentScorers([]);
    setOpponentCards([]);
    setOpponentLineup([]);
    setEditId(null);
    setShowForm(false);
    setSaved(false);
  };

  const updateMatchForm = (patch: Partial<typeof form>) => {
    setSaved(false);
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const startEdit = (m: Match) => {
    const d = new Date(m.date);
    setForm({
      date: m.date.slice(0, 10),
      time: formatTimePrague(d),
      home_team: m.is_home ? "Dolany" : m.opponent,
      away_team: m.is_home ? m.opponent : "Dolany",
      score_home: m.score_home,
      score_away: m.score_away,
      halftime_home: m.halftime_home?.toString() ?? "",
      halftime_away: m.halftime_away?.toString() ?? "",
      competition: m.competition || "AGRO CS 8 liga Muži",
      season: m.season || "2025/2026",
      venue: m.venue || (m.is_home ? "Dolany" : m.opponent),
      summary_title: m.summary_title || "",
      summary: m.summary || "",
      video_url: m.video_url || "",
      opponent_scorers: m.opponent_scorers || "",
      opponent_cards: m.opponent_cards || "",
      round: m.round || "",
      referee: m.referee || "",
      delegate: m.delegate || "",
      spectators: m.spectators?.toString() ?? "",
      match_number: m.match_number || "",
      match_type: m.match_type || "mistrovsky",
    });
    setLineup(m.match_lineups?.map((l) => ({ player_id: l.player_id, is_starter: l.is_starter, is_captain: l.is_captain ?? false, number: l.number ?? null })) || []);
    // Expand each scorer entry into individual goal rows (1 per goal) for editing
    const expandedScorers: { player_id: string; goals: number; minute: string; is_penalty: boolean }[] = [];
    (m.match_scorers || []).forEach((s) => {
      if (s.goals > 1 && !s.minute) {
        // Legacy: single row with goals count, no minute — keep as one row
        expandedScorers.push({ player_id: s.player_id, goals: s.goals, minute: "", is_penalty: false });
      } else {
        // One row per goal
        for (let g = 0; g < s.goals; g++) {
          expandedScorers.push({ player_id: s.player_id, goals: 1, minute: g === 0 && s.minute ? s.minute.toString() : "", is_penalty: g === 0 ? (s.is_penalty ?? false) : false });
        }
      }
    });
    setScorers(expandedScorers);
    setCards(m.match_cards?.map((c) => ({ player_id: c.player_id, card_type: c.card_type, minute: c.minute?.toString() ?? "" })) || []);
    setMatchImages(m.match_images?.map((img) => ({ url: img.url, alt: img.alt ?? undefined })) || []);
    setOpponentScorers(m.match_opponent_scorers?.map((s) => ({ name: s.name, minute: s.minute?.toString() ?? "", is_penalty: s.is_penalty })) || []);
    setOpponentCards(m.match_opponent_cards?.map((c) => ({ name: c.name, card_type: c.card_type, minute: c.minute?.toString() ?? "" })) || []);
    setOpponentLineup(m.match_opponent_lineup?.map((p) => ({ name: p.name, number: p.number?.toString() ?? "", position: p.position || "", is_starter: p.is_starter, is_captain: p.is_captain ?? false })) || []);
    setEditId(m.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Build date with correct Europe/Prague offset (CET/CEST)
    const timeStr = form.time || "00:00";
    const dateTime = toPragueISO(form.date, timeStr);
    const isHome = form.home_team.toLowerCase().includes("dolany");
    const opponent = isHome ? form.away_team : form.home_team;
    const body = {
      date: dateTime,
      opponent,
      score_home: form.score_home,
      score_away: form.score_away,
      halftime_home: form.halftime_home ? parseInt(form.halftime_home) : null,
      halftime_away: form.halftime_away ? parseInt(form.halftime_away) : null,
      is_home: isHome,
      competition: form.competition,
      season: form.season,
      venue: form.venue || null,
      summary_title: form.summary_title || null,
      summary: form.summary || null,
      video_url: form.video_url || null,
      round: form.round || null,
      referee: form.referee || null,
      delegate: form.delegate || null,
      spectators: form.spectators ? parseInt(form.spectators) : null,
      match_number: form.match_number || null,
      match_type: form.match_type,
      // Auto-generate text from structured data for backward compat
      opponent_scorers: opponentScorers.length > 0
        ? opponentScorers.filter((s) => s.name).map((s) => {
            let txt = s.name;
            if (s.is_penalty) txt += " (PK)";
            if (s.minute) txt += ` (${s.minute}')`;
            return txt;
          }).join(", ")
        : (form.opponent_scorers || null),
      opponent_cards: opponentCards.length > 0
        ? opponentCards.filter((c) => c.name).map((c) => {
            let txt = c.card_type === "yellow" ? "ŽK" : "ČK";
            txt += `: ${c.name}`;
            if (c.minute) txt += ` (${c.minute}')`;
            return txt;
          }).join(", ")
        : (form.opponent_cards || null),
      lineup,
      // Each row = 1 goal; same player can appear multiple times
      scorers: scorers.filter((s) => s.player_id).map((s) => ({
        player_id: s.player_id,
        goals: 1,
        minute: s.minute ? parseInt(s.minute) : null,
        is_penalty: s.is_penalty || false,
      })),
      cards: cards.map((c) => ({
        player_id: c.player_id,
        card_type: c.card_type,
        minute: c.minute ? parseInt(c.minute) : null,
      })),
      images: matchImages.map((img) => ({ url: img.url, alt: img.alt || null })),
      opponent_scorers_data: opponentScorers.filter((s) => s.name).map((s) => ({
        name: s.name,
        minute: s.minute ? parseInt(s.minute) : null,
        is_penalty: s.is_penalty || false,
      })),
      opponent_cards_data: opponentCards.filter((c) => c.name).map((c) => ({
        name: c.name,
        card_type: c.card_type,
        minute: c.minute ? parseInt(c.minute) : null,
      })),
      opponent_lineup: opponentLineup.filter((p) => p.name).map((p) => ({
        name: p.name,
        number: p.number ? parseInt(p.number) : null,
        position: p.position || null,
        is_starter: p.is_starter,
        is_captain: p.is_captain,
      })),
    };

    const url = editId ? `/api/matches/${editId}` : "/api/matches";
    const method = editId ? "PUT" : "POST";

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      if (editId) { setSaved(true); } else { resetForm(); }
      loadMatches();
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.error || `Chyba při ukládání (${res.status})`);
    }
    setSaving(false);
  };

  const deleteMatch = async (id: string) => {
    if (!confirm("Opravdu smazat tento zápas?")) return;
    await fetch(`/api/matches/${id}`, { method: "DELETE" });
    loadMatches();
  };

  const publishMatch = async (id: string, published = true) => {
    setPublishing(id);
    const res = await fetch(`/api/matches/${id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published }),
    });
    if (res.ok) {
      const result = await res.json();
      loadMatches();
      if (published && result.slug) {
        setShareDialog({ slug: result.slug, title: result.title });
      }
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.error || `Chyba při publikování (${res.status})`);
    }
    setPublishing(null);
  };

  // Lineup helpers
  const toggleLineup = (playerId: string, starter: boolean) => {
    setLineup((prev) => {
      const existing = prev.find((l) => l.player_id === playerId);
      if (existing) {
        return prev.filter((l) => l.player_id !== playerId);
      }
      return [...prev, { player_id: playerId, is_starter: starter, is_captain: false, number: null }];
    });
  };

  const setStarterStatus = (playerId: string, isStarter: boolean) => {
    setLineup((prev) => prev.map((l) => l.player_id === playerId ? { ...l, is_starter: isStarter } : l));
  };

  const setCaptain = (playerId: string) => {
    setLineup((prev) => prev.map((l) => ({ ...l, is_captain: l.player_id === playerId })));
  };

  const setOpponentCaptain = (idx: number) => {
    setOpponentLineup((prev) => prev.map((p, i) => ({ ...p, is_captain: i === idx })));
  };

  // Players sorted by surname (last word of name) for dropdowns
  const playersSorted = [...players].sort((a, b) => {
    const surnameA = a.name.split(/\s+/).pop()?.toLowerCase() ?? "";
    const surnameB = b.name.split(/\s+/).pop()?.toLowerCase() ?? "";
    return surnameA.localeCompare(surnameB, "cs");
  });

  // Match parsed name (Surname Firstname) to DB player (Firstname Surname)
  const findPlayer = (parsedName: string): Player | undefined => {
    const nameLower = parsedName.toLowerCase();
    const nameParts = nameLower.split(/\s+/);
    // 1. Exact match
    let player = players.find((p) => p.name.toLowerCase() === nameLower);
    if (player) return player;
    // 2. Reversed name match (parsed "Sedláček Pavel" → DB "Pavel Sedláček")
    if (nameParts.length >= 2) {
      const reversed = [...nameParts].reverse().join(" ");
      player = players.find((p) => p.name.toLowerCase() === reversed);
      if (player) return player;
    }
    // 3. Surname match — only if exactly one player matches
    const surname = nameParts[0];
    const surnameMatches = players.filter((p) => {
      const pParts = p.name.toLowerCase().split(/\s+/);
      return pParts[pParts.length - 1] === surname || pParts[0] === surname;
    });
    if (surnameMatches.length === 1) return surnameMatches[0];
    // Ambiguous or no match
    return undefined;
  };

  const fillAllActive = () => {
    const activePlayers = players.filter((p) => p.active);
    setLineup(activePlayers.map((p) => ({ player_id: p.id, is_starter: true, is_captain: false, number: null })));
  };

  const fillFromPrevious = () => {
    // Find most recent match before current edit
    const sorted = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const prev = sorted.find((m) => m.id !== editId && m.match_lineups && m.match_lineups.length > 0);
    if (prev?.match_lineups) {
      setLineup(prev.match_lineups.map((l) => ({ player_id: l.player_id, is_starter: l.is_starter, is_captain: l.is_captain ?? false, number: l.number ?? null })));
    }
  };

  const handlePasteReport = () => {
    if (!pasteText.trim()) return;
    const parsed = parseMatchReport(pasteText);

    // Determine season from date
    const dateObj = parsed.date ? new Date(parsed.date) : null;
    let season = form.season;
    if (dateObj) {
      const y = dateObj.getMonth() >= 6 ? dateObj.getFullYear() : dateObj.getFullYear() - 1;
      season = `${y}/${y + 1}`;
    }

    // Determine which team is Dolany
    const homeIsDolany = parsed.home_team.toLowerCase().includes("dolany");
    const dolanyTeam = homeIsDolany ? parsed.home_team : parsed.away_team;
    const opponentTeam = homeIsDolany ? parsed.away_team : parsed.home_team;
    const dolanyLineup = homeIsDolany ? parsed.homeLineup : parsed.awayLineup;
    const opponentLineupParsed = homeIsDolany ? parsed.awayLineup : parsed.homeLineup;

    updateMatchForm({
      date: parsed.date,
      time: parsed.time,
      home_team: parsed.home_team,
      away_team: parsed.away_team,
      score_home: parsed.score_home,
      score_away: parsed.score_away,
      halftime_home: parsed.halftime_home?.toString() ?? "",
      halftime_away: parsed.halftime_away?.toString() ?? "",
      competition: parsed.competition || form.competition,
      season,
      venue: parsed.venue || (homeIsDolany ? dolanyTeam : opponentTeam),
      round: parsed.round || "",
      referee: parsed.referee || "",
      delegate: parsed.delegate || "",
      spectators: parsed.spectators?.toString() ?? "",
      match_number: parsed.match_number || "",
      match_type: "mistrovsky",
    });

    // Match Dolany lineup to players by name
    const matchedLineup: typeof lineup = [];
    for (const lp of dolanyLineup) {
      const player = findPlayer(lp.name);
      if (player) {
        matchedLineup.push({
          player_id: player.id,
          is_starter: lp.is_starter,
          is_captain: lp.is_captain,
          number: lp.number,
        });
      }
    }
    setLineup(matchedLineup);

    // Dolany goals — match to players
    const dolanyGoals = parsed.goals.filter((g) =>
      homeIsDolany ? g.side === "home" : g.side === "away"
    );
    const matchedScorers = dolanyGoals.map((g) => {
      const player = findPlayer(g.playerName);
      return {
        player_id: player?.id || "",
        goals: 1,
        minute: g.minute?.toString() ?? "",
        is_penalty: g.is_penalty,
      };
    });
    setScorers(matchedScorers);

    // Dolany cards — extract from lineup ŽK/ČK columns
    const dolanyCards: typeof cards = [];
    for (const lp of dolanyLineup) {
      const player = findPlayer(lp.name);
      if (player) {
        if (lp.yellowMinute != null) {
          dolanyCards.push({ player_id: player.id, card_type: "yellow", minute: lp.yellowMinute.toString() });
        }
        if (lp.redMinute != null) {
          dolanyCards.push({ player_id: player.id, card_type: "red", minute: lp.redMinute.toString() });
        }
      }
    }
    setCards(dolanyCards);

    // Opponent goals
    const oppGoals = parsed.goals.filter((g) =>
      homeIsDolany ? g.side === "away" : g.side === "home"
    );
    setOpponentScorers(oppGoals.map((g) => ({
      name: g.playerName,
      minute: g.minute?.toString() ?? "",
      is_penalty: g.is_penalty,
    })));

    // Opponent cards — from lineup
    const oppCards: typeof opponentCards = [];
    for (const lp of opponentLineupParsed) {
      if (lp.yellowMinute != null) {
        oppCards.push({ name: lp.name, card_type: "yellow", minute: lp.yellowMinute.toString() });
      }
      if (lp.redMinute != null) {
        oppCards.push({ name: lp.name, card_type: "red", minute: lp.redMinute.toString() });
      }
    }
    setOpponentCards(oppCards);

    // Opponent lineup
    setOpponentLineup(opponentLineupParsed.map((p) => ({
      name: p.name,
      number: p.number?.toString() ?? "",
      position: p.position || "",
      is_starter: p.is_starter,
      is_captain: p.is_captain,
    })));

    setPasteText("");
  };

  const getResult = (m: Match) => {
    if (!isMatchPlayed(m)) return { label: "?", color: "bg-gray-400" };
    const ourScore = m.is_home ? m.score_home : m.score_away;
    const theirScore = m.is_home ? m.score_away : m.score_home;
    if (ourScore > theirScore) return { label: "V", color: "bg-green-500" };
    if (ourScore < theirScore) return { label: "P", color: "bg-red-500" };
    return { label: "R", color: "bg-yellow-500" };
  };

  // Filter matches by half, sort ascending (oldest first)
  const filteredMatches = (half === "all" ? matches : matches.filter((m) => {
    const month = new Date(m.date).getMonth();
    return half === "podzim" ? month >= 7 : month < 7;
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const isMatchPlayed = (m: Match) => new Date(m.date) <= new Date();

  // ── Draw form logic ──

  const resetDrawForm = () => {
    setDrawForm({ season: "2025/2026", title: "", active: true });
    setDrawImages([]);
    setDrawEditId(null);
    setShowDrawForm(false);
    setDrawSaved(false);
  };

  const startDrawEdit = (d: Draw) => {
    setDrawForm({ season: d.season, title: d.title, active: d.active });
    setDrawImages([{ url: d.image }]);
    setDrawEditId(d.id);
    setShowDrawForm(true);
  };

  const handleDrawSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!drawImages[0]?.url) return;
    setDrawSaving(true);
    const body = { ...drawForm, image: drawImages[0].url };
    const url = drawEditId ? `/api/draws/${drawEditId}` : "/api/draws";
    const method = drawEditId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      if (drawEditId) { setDrawSaved(true); } else { resetDrawForm(); }
      loadDraws();
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.error || `Chyba při ukládání (${res.status})`);
    }
    setDrawSaving(false);
  };

  const deleteDraw = async (id: string) => {
    if (!confirm("Opravdu smazat tento los?")) return;
    await fetch(`/api/draws/${id}`, { method: "DELETE" });
    loadDraws();
  };

  // ── Stats ──
  const playerStats = new Map<string, { name: string; matches: number; goals: number }>();
  matches.forEach((m) => {
    m.match_lineups?.forEach((l) => {
      const name = l.players?.name || "?";
      const existing = playerStats.get(l.player_id) || { name, matches: 0, goals: 0 };
      existing.matches++;
      playerStats.set(l.player_id, existing);
    });
    m.match_scorers?.forEach((s) => {
      const name = s.players?.name || "?";
      const existing = playerStats.get(s.player_id) || { name, matches: 0, goals: 0 };
      existing.goals += s.goals;
      playerStats.set(s.player_id, existing);
    });
  });

  const topScorers = [...playerStats.values()].filter((s) => s.goals > 0).sort((a, b) => b.goals - a.goals).slice(0, 5);
  const topAppearances = [...playerStats.values()].filter((s) => s.matches > 0).sort((a, b) => b.matches - a.matches).slice(0, 5);

  // ── Render ──

  return (
    <div>
      <h1 className="text-3xl font-bold text-text mb-6">Zápasy</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-3">
        <button onClick={() => setActiveTab("matches")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "matches" ? "bg-brand-red text-white" : "text-text-muted hover:text-text hover:bg-surface-muted"}`}>
          Zápasy
        </button>
        <button onClick={() => setActiveTab("draws")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "draws" ? "bg-brand-red text-white" : "text-text-muted hover:text-text hover:bg-surface-muted"}`}>
          Losy soutěže
        </button>
        <button onClick={() => setActiveTab("standings")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "standings" ? "bg-brand-red text-white" : "text-text-muted hover:text-text hover:bg-surface-muted"}`}>
          Tabulka
        </button>
      </div>

      {/* ═══ MATCHES TAB ═══ */}
      {activeTab === "matches" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2 flex-wrap">
              {SEASONS.map((s) => (
                <button key={s} onClick={() => setSeason(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${season === s ? "bg-brand-red text-white" : "bg-surface border border-border text-text-muted hover:text-text"}`}>
                  {s}
                </button>
              ))}
            </div>
            <button onClick={() => { resetForm(); setShowForm(!showForm); }}
              className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors">
              <Plus size={16} /> Nový zápas
            </button>
          </div>

          {/* Half filter */}
          <div className="flex gap-2 mb-6">
            {([["all", "Vše"], ["podzim", "Podzim"], ["jaro", "Jaro"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => setHalf(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${half === val ? "bg-brand-yellow text-brand-dark" : "bg-surface border border-border text-text-muted"}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Stats */}
          {(topScorers.length > 0 || topAppearances.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {topScorers.length > 0 && (
                <div className="bg-surface rounded-xl border border-border p-4">
                  <h3 className="text-sm font-bold text-text flex items-center gap-2 mb-3"><Target size={16} className="text-brand-red" /> TOP střelci</h3>
                  {topScorers.map((s, i) => (
                    <div key={i} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                      <span className="text-sm text-text">{i + 1}. {s.name}</span>
                      <span className="text-sm font-bold text-brand-red">{s.goals} gólů</span>
                    </div>
                  ))}
                </div>
              )}
              {topAppearances.length > 0 && (
                <div className="bg-surface rounded-xl border border-border p-4">
                  <h3 className="text-sm font-bold text-text flex items-center gap-2 mb-3"><Users size={16} className="text-brand-red" /> TOP zápasy</h3>
                  {topAppearances.map((s, i) => (
                    <div key={i} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                      <span className="text-sm text-text">{i + 1}. {s.name}</span>
                      <span className="text-sm font-bold text-brand-red">{s.matches} zápasů</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Match form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-6 mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-text">{editId ? "Upravit zápas" : "Nový zápas"}</h2>
                <button type="button" onClick={resetForm} className="text-text-muted hover:text-text"><X size={20} /></button>
              </div>

              {/* Paste match report */}
              <div className="border border-dashed border-border rounded-lg p-4 bg-surface-muted/30">
                  <p className="text-sm font-bold text-text mb-2 flex items-center gap-2">
                    <BookOpen size={16} className="text-brand-red" /> Vložit zápis z webu svazu
                  </p>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Sem vlož zkopírovaný text zápisu ze stránky svazu..."
                    rows={4}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-red mb-2 resize-y"
                  />
                  <button
                    type="button"
                    onClick={handlePasteReport}
                    disabled={!pasteText.trim()}
                    className="px-4 py-2 bg-brand-red text-white rounded-lg text-sm font-medium hover:bg-brand-red-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <Upload size={14} /> Načíst data
                  </button>
                </div>

              {/* Basic fields */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Datum</label>
                  <input type="date" value={form.date} onChange={(e) => updateMatchForm({ date: e.target.value })} required
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Čas</label>
                  <input type="time" value={form.time} onChange={(e) => updateMatchForm({ time: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Domácí</label>
                  <input type="text" value={form.home_team} onChange={(e) => updateMatchForm({ home_team: e.target.value, venue: e.target.value })} required
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Hosté</label>
                  <input type="text" value={form.away_team} onChange={(e) => updateMatchForm({ away_team: e.target.value })} required
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Sezóna</label>
                  <select value={form.season} onChange={(e) => updateMatchForm({ season: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red">
                    {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Soutěž</label>
                  <input type="text" value={form.competition} onChange={(e) => updateMatchForm({ competition: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Kolo</label>
                  <input type="text" value={form.round} onChange={(e) => updateMatchForm({ round: e.target.value })}
                    placeholder="16. kolo" className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Hřiště</label>
                  <input type="text" value={form.venue} onChange={(e) => updateMatchForm({ venue: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Diváků</label>
                  <input type="number" min={0} value={form.spectators} onChange={(e) => updateMatchForm({ spectators: e.target.value })}
                    placeholder="—" className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Rozhodčí</label>
                  <input type="text" value={form.referee} onChange={(e) => updateMatchForm({ referee: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Delegát</label>
                  <input type="text" value={form.delegate} onChange={(e) => updateMatchForm({ delegate: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Číslo utkání</label>
                  <input type="text" value={form.match_number} onChange={(e) => updateMatchForm({ match_number: e.target.value })}
                    placeholder="Auto po vložení výsledku"
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                  <p className="text-[10px] text-text-muted mt-0.5">Automaticky po uložení výsledku</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Typ zápasu</label>
                  <select value={form.match_type} onChange={(e) => updateMatchForm({ match_type: e.target.value as "mistrovsky" | "pratelsky" })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red">
                    <option value="mistrovsky">Mistrovský</option>
                    <option value="pratelsky">Přátelský</option>
                  </select>
                </div>
              </div>

              {/* Score */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Skóre domácí</label>
                  <input type="number" min={0} value={form.score_home} onChange={(e) => updateMatchForm({ score_home: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Skóre hosté</label>
                  <input type="number" min={0} value={form.score_away} onChange={(e) => updateMatchForm({ score_away: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Poločas domácí</label>
                  <input type="number" min={0} value={form.halftime_home} onChange={(e) => updateMatchForm({ halftime_home: e.target.value })}
                    placeholder="—" className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Poločas hosté</label>
                  <input type="number" min={0} value={form.halftime_away} onChange={(e) => updateMatchForm({ halftime_away: e.target.value })}
                    placeholder="—" className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-brand-red" />
                </div>
              </div>

              {/* ═══ Two-column layout: Dolany | Soupeř ═══ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* ── LEFT: TJ Dolany ── */}
                <div className="space-y-4 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-text flex items-center gap-2">
                      <Users size={16} className="text-brand-red" /> TJ Dolany
                    </p>
                    <div className="flex gap-2">
                      <button type="button" onClick={fillFromPrevious} className="text-[10px] text-brand-red hover:text-brand-red-dark font-medium flex items-center gap-1">
                        <RotateCcw size={10} /> Z předchozího
                      </button>
                    </div>
                  </div>

                  {/* Dolany starters */}
                  <div>
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Základní sestava ({lineup.filter((l) => l.is_starter).length}/11)</p>
                    {lineup.filter((l) => l.is_starter).map((l) => {
                      const idx = lineup.indexOf(l);
                      const p = players.find((p) => p.id === l.player_id);
                      return (
                        <div key={idx} className="flex gap-1.5 mb-1.5 items-center">
                          <input type="number" min={1} max={99} value={l.number ?? ""} onChange={(e) => { const u = [...lineup]; u[idx] = { ...u[idx], number: e.target.value ? parseInt(e.target.value) : null }; setLineup(u); }}
                            className="w-12 px-1.5 py-1.5 bg-surface border border-border rounded-lg text-text text-sm text-center" placeholder="#" />
                          <select value={l.player_id} onChange={(e) => { const u = [...lineup]; u[idx] = { ...u[idx], player_id: e.target.value }; setLineup(u); }}
                            className="flex-1 px-2 py-1.5 bg-surface border border-border rounded-lg text-text text-sm min-w-0">
                            <option value="">Vyber hráče</option>
                            {playersSorted.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <button type="button" onClick={() => setCaptain(l.player_id)}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors shrink-0 ${
                              l.is_captain ? "bg-brand-red/30 text-brand-red" : "text-text-muted hover:text-brand-red"
                            }`}>K</button>
                          <button type="button" onClick={() => setLineup(lineup.filter((_, j) => j !== idx))} className="text-red-500 hover:text-red-700 p-0.5 shrink-0"><X size={14} /></button>
                        </div>
                      );
                    })}
                    {lineup.filter((l) => l.is_starter).length < 11 && (
                      <button type="button" onClick={() => setLineup([...lineup, { player_id: "", is_starter: true, is_captain: false, number: null }])}
                        className="text-xs text-brand-red hover:text-brand-red-dark font-medium flex items-center gap-1 mt-1">
                        <Plus size={12} /> Přidat hráče
                      </button>
                    )}
                  </div>

                  {/* Dolany subs */}
                  <div>
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Náhradníci ({lineup.filter((l) => !l.is_starter).length})</p>
                    {lineup.filter((l) => !l.is_starter).map((l) => {
                      const idx = lineup.indexOf(l);
                      return (
                        <div key={idx} className="flex gap-1.5 mb-1.5 items-center">
                          <input type="number" min={1} max={99} value={l.number ?? ""} onChange={(e) => { const u = [...lineup]; u[idx] = { ...u[idx], number: e.target.value ? parseInt(e.target.value) : null }; setLineup(u); }}
                            className="w-12 px-1.5 py-1.5 bg-surface border border-border rounded-lg text-text text-sm text-center" placeholder="#" />
                          <select value={l.player_id} onChange={(e) => { const u = [...lineup]; u[idx] = { ...u[idx], player_id: e.target.value }; setLineup(u); }}
                            className="flex-1 px-2 py-1.5 bg-surface border border-border rounded-lg text-text text-sm min-w-0">
                            <option value="">Vyber hráče</option>
                            {playersSorted.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <button type="button" onClick={() => setLineup(lineup.filter((_, j) => j !== idx))} className="text-red-500 hover:text-red-700 p-0.5 shrink-0"><X size={14} /></button>
                        </div>
                      );
                    })}
                    <button type="button" onClick={() => setLineup([...lineup, { player_id: "", is_starter: false, is_captain: false, number: null }])}
                      className="text-xs text-brand-red hover:text-brand-red-dark font-medium flex items-center gap-1 mt-1">
                      <Plus size={12} /> Přidat náhradníka
                    </button>
                  </div>

                  {/* Dolany goals */}
                  <div>
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Góly ({scorers.length})</p>
                    {scorers.map((s, i) => (
                      <div key={i} className="flex gap-1.5 mb-1.5 items-center">
                        <select value={s.player_id} onChange={(e) => { const u = [...scorers]; u[i] = { ...u[i], player_id: e.target.value }; setScorers(u); }}
                          className="flex-1 px-2 py-1.5 bg-surface border border-border rounded-lg text-text text-sm min-w-0">
                          <option value="">Hráč</option>
                          {playersSorted.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input type="number" min={1} max={120} value={s.minute} onChange={(e) => { const u = [...scorers]; u[i] = { ...u[i], minute: e.target.value }; setScorers(u); }}
                          className="w-16 px-1.5 py-1.5 bg-surface border border-border rounded-lg text-text text-sm" placeholder="Min" />
                        <label className="flex items-center gap-1 text-[10px] text-text-muted cursor-pointer shrink-0">
                          <input type="checkbox" checked={s.is_penalty || false} onChange={(e) => { const u = [...scorers]; u[i] = { ...u[i], is_penalty: e.target.checked }; setScorers(u); }}
                            className="w-3 h-3 accent-brand-red" />PK
                        </label>
                        <button type="button" onClick={() => setScorers(scorers.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 p-0.5 shrink-0"><X size={14} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setScorers([...scorers, { player_id: "", goals: 1, minute: "", is_penalty: false }])}
                      className="text-xs text-brand-red hover:text-brand-red-dark font-medium flex items-center gap-1 mt-1">
                      <Plus size={12} /> Přidat gól
                    </button>
                  </div>

                  {/* Dolany cards */}
                  <div>
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Karty ({cards.length})</p>
                    {cards.map((c, i) => (
                      <div key={i} className="flex gap-1.5 mb-1.5 items-center">
                        <select value={c.player_id} onChange={(e) => { const u = [...cards]; u[i] = { ...u[i], player_id: e.target.value }; setCards(u); }}
                          className="flex-1 px-2 py-1.5 bg-surface border border-border rounded-lg text-text text-sm min-w-0">
                          <option value="">Hráč</option>
                          {playersSorted.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <select value={c.card_type} onChange={(e) => { const u = [...cards]; u[i] = { ...u[i], card_type: e.target.value as "yellow" | "red" }; setCards(u); }}
                          className="w-16 px-1 py-1.5 bg-surface border border-border rounded-lg text-text text-sm">
                          <option value="yellow">ŽK</option>
                          <option value="red">ČK</option>
                        </select>
                        <input type="number" min={1} max={120} value={c.minute} onChange={(e) => { const u = [...cards]; u[i] = { ...u[i], minute: e.target.value }; setCards(u); }}
                          className="w-14 px-1.5 py-1.5 bg-surface border border-border rounded-lg text-text text-sm" placeholder="Min" />
                        <button type="button" onClick={() => setCards(cards.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 p-0.5 shrink-0"><X size={14} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setCards([...cards, { player_id: "", card_type: "yellow", minute: "" }])}
                      className="text-xs text-brand-red hover:text-brand-red-dark font-medium flex items-center gap-1 mt-1">
                      <Plus size={12} /> Přidat kartu
                    </button>
                  </div>
                </div>

                {/* ── RIGHT: Soupeř ── */}
                <div className="space-y-4 border border-blue-500/30 rounded-xl p-4">
                  <p className="text-sm font-bold text-text flex items-center gap-2">
                    <Users size={16} className="text-blue-500" /> {form.away_team || form.home_team || "Soupeř"}
                  </p>

                  {/* Opponent starters */}
                  <div>
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Základní sestava ({opponentLineup.filter((p) => p.is_starter).length}/11)</p>
                    {opponentLineup.filter((p) => p.is_starter).map((p, i) => {
                      const realIdx = opponentLineup.findIndex((x) => x === p);
                      return (
                        <div key={i} className="flex gap-1.5 mb-1.5 items-center">
                          <input type="number" min={1} max={99} value={p.number} onChange={(e) => { const u = [...opponentLineup]; u[realIdx] = { ...u[realIdx], number: e.target.value }; setOpponentLineup(u); }}
                            className="w-12 px-1.5 py-1.5 bg-surface border border-border rounded-lg text-text text-sm text-center" placeholder="#" />
                          <input type="text" value={p.name} onChange={(e) => { const u = [...opponentLineup]; u[realIdx] = { ...u[realIdx], name: e.target.value }; setOpponentLineup(u); }}
                            className="flex-1 px-2 py-1.5 bg-surface border border-border rounded-lg text-text text-sm" placeholder="Jméno" />
                          <button type="button" onClick={() => setOpponentCaptain(realIdx)}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors shrink-0 ${
                              p.is_captain ? "bg-blue-500/30 text-blue-400" : "text-text-muted hover:text-blue-400"
                            }`}>K</button>
                          <button type="button" onClick={() => setOpponentLineup(opponentLineup.filter((_, j) => j !== realIdx))} className="text-red-500 hover:text-red-700 p-0.5 shrink-0"><X size={14} /></button>
                        </div>
                      );
                    })}
                    {opponentLineup.filter((p) => p.is_starter).length < 11 && (
                      <button type="button" onClick={() => setOpponentLineup([...opponentLineup, { name: "", number: "", position: "", is_starter: true, is_captain: false }])}
                        className="text-xs text-blue-500 hover:text-blue-400 font-medium flex items-center gap-1 mt-1">
                        <Plus size={12} /> Přidat hráče
                      </button>
                    )}
                  </div>

                  {/* Opponent subs */}
                  <div>
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Náhradníci ({opponentLineup.filter((p) => !p.is_starter).length})</p>
                    {opponentLineup.filter((p) => !p.is_starter).map((p, i) => {
                      const realIdx = opponentLineup.findIndex((x) => x === p);
                      return (
                        <div key={i} className="flex gap-1.5 mb-1.5 items-center">
                          <input type="number" min={1} max={99} value={p.number} onChange={(e) => { const u = [...opponentLineup]; u[realIdx] = { ...u[realIdx], number: e.target.value }; setOpponentLineup(u); }}
                            className="w-12 px-1.5 py-1.5 bg-surface border border-border rounded-lg text-text text-sm text-center" placeholder="#" />
                          <input type="text" value={p.name} onChange={(e) => { const u = [...opponentLineup]; u[realIdx] = { ...u[realIdx], name: e.target.value }; setOpponentLineup(u); }}
                            className="flex-1 px-2 py-1.5 bg-surface border border-border rounded-lg text-text text-sm" placeholder="Jméno" />
                          <button type="button" onClick={() => setOpponentLineup(opponentLineup.filter((_, j) => j !== realIdx))} className="text-red-500 hover:text-red-700 p-0.5 shrink-0"><X size={14} /></button>
                        </div>
                      );
                    })}
                    <button type="button" onClick={() => setOpponentLineup([...opponentLineup, { name: "", number: "", position: "", is_starter: false, is_captain: false }])}
                      className="text-xs text-blue-500 hover:text-blue-400 font-medium flex items-center gap-1 mt-1">
                      <Plus size={12} /> Přidat náhradníka
                    </button>
                  </div>

                  {/* Opponent goals */}
                  <div>
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Góly ({opponentScorers.length})</p>
                    {opponentScorers.map((s, i) => (
                      <div key={i} className="flex gap-1.5 mb-1.5 items-center">
                        <input type="text" value={s.name} onChange={(e) => { const u = [...opponentScorers]; u[i] = { ...u[i], name: e.target.value }; setOpponentScorers(u); }}
                          className="flex-1 px-2 py-1.5 bg-surface border border-border rounded-lg text-text text-sm" placeholder="Jméno" />
                        <input type="number" min={1} max={120} value={s.minute} onChange={(e) => { const u = [...opponentScorers]; u[i] = { ...u[i], minute: e.target.value }; setOpponentScorers(u); }}
                          className="w-16 px-1.5 py-1.5 bg-surface border border-border rounded-lg text-text text-sm" placeholder="Min" />
                        <label className="flex items-center gap-1 text-[10px] text-text-muted cursor-pointer shrink-0">
                          <input type="checkbox" checked={s.is_penalty || false} onChange={(e) => { const u = [...opponentScorers]; u[i] = { ...u[i], is_penalty: e.target.checked }; setOpponentScorers(u); }}
                            className="w-3 h-3 accent-blue-500" />PK
                        </label>
                        <button type="button" onClick={() => setOpponentScorers(opponentScorers.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 p-0.5 shrink-0"><X size={14} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setOpponentScorers([...opponentScorers, { name: "", minute: "", is_penalty: false }])}
                      className="text-xs text-blue-500 hover:text-blue-400 font-medium flex items-center gap-1 mt-1">
                      <Plus size={12} /> Přidat gól
                    </button>
                  </div>

                  {/* Opponent cards */}
                  <div>
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Karty ({opponentCards.length})</p>
                    {opponentCards.map((c, i) => (
                      <div key={i} className="flex gap-1.5 mb-1.5 items-center">
                        <input type="text" value={c.name} onChange={(e) => { const u = [...opponentCards]; u[i] = { ...u[i], name: e.target.value }; setOpponentCards(u); }}
                          className="flex-1 px-2 py-1.5 bg-surface border border-border rounded-lg text-text text-sm" placeholder="Jméno" />
                        <select value={c.card_type} onChange={(e) => { const u = [...opponentCards]; u[i] = { ...u[i], card_type: e.target.value as "yellow" | "red" }; setOpponentCards(u); }}
                          className="w-16 px-1 py-1.5 bg-surface border border-border rounded-lg text-text text-sm">
                          <option value="yellow">ŽK</option>
                          <option value="red">ČK</option>
                        </select>
                        <input type="number" min={1} max={120} value={c.minute} onChange={(e) => { const u = [...opponentCards]; u[i] = { ...u[i], minute: e.target.value }; setOpponentCards(u); }}
                          className="w-14 px-1.5 py-1.5 bg-surface border border-border rounded-lg text-text text-sm" placeholder="Min" />
                        <button type="button" onClick={() => setOpponentCards(opponentCards.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 p-0.5 shrink-0"><X size={14} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setOpponentCards([...opponentCards, { name: "", card_type: "yellow", minute: "" }])}
                      className="text-xs text-blue-500 hover:text-blue-400 font-medium flex items-center gap-1 mt-1">
                      <Plus size={12} /> Přidat kartu
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="block text-sm font-semibold text-text mb-1">Nadpis referátu</label>
                <input type="text" value={form.summary_title} onChange={(e) => updateMatchForm({ summary_title: e.target.value })}
                  placeholder="např. Vydařený zápas na domácím hřišti"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-red mb-2" />
                <label className="block text-sm font-semibold text-text mb-1">Referát / komentář</label>
                <textarea value={form.summary} onChange={(e) => updateMatchForm({ summary: e.target.value })} rows={3}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-red" />
              </div>

              {/* Photos */}
              <div>
                <p className="text-sm font-bold text-text mb-2 flex items-center gap-2">
                  <Camera size={16} className="text-brand-red" /> Fotogalerie
                  <span className="text-xs font-normal text-text-muted">(automaticky převedeno na WebP)</span>
                </p>
                <ImageUploader images={matchImages} onChange={setMatchImages} folder="matches" multiple={true} />
              </div>

              {/* Video URL */}
              <div>
                <p className="text-sm font-bold text-text mb-2 flex items-center gap-2">
                  <Video size={16} className="text-brand-red" /> Video
                </p>
                <input type="url" value={form.video_url} onChange={(e) => updateMatchForm({ video_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-red" />
                <p className="text-xs text-text-muted mt-1">YouTube odkaz — zobrazí se v referátu jako vložené video</p>
              </div>

              <div className="flex items-center gap-2">
                <button type="submit" disabled={saving}
                  className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors disabled:opacity-50">
                  <Save size={16} /> {saving ? "Ukládám..." : "Uložit"}
                </button>
                <button type="button" onClick={resetForm}
                  className="bg-surface border border-border text-text-muted hover:text-text px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors">
                  <X size={16} /> Zrušit
                </button>
                {saved && (
                  <span className="flex items-center gap-1.5 text-green-500 text-sm font-semibold ml-2">
                    <CheckCircle size={16} /> Uloženo
                  </span>
                )}
              </div>
            </form>
          )}

          {/* Match list */}
          {loading ? (
            <p className="text-text-muted">Načítám...</p>
          ) : (
            <div className="space-y-2">
              {filteredMatches.map((m) => {
                const played = isMatchPlayed(m);
                const result = getResult(m);
                const d = new Date(m.date);
                const isExpanded = expandedMatch === m.id;
                return (
                  <div key={m.id} className={`bg-surface rounded-xl border overflow-hidden ${!played ? "border-border border-dashed opacity-80" : "border-border"}`}>
                    <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-surface-muted transition-colors"
                      onClick={() => setExpandedMatch(isExpanded ? null : m.id)}>
                      <span className={`${result.color} text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0`}>
                        {result.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-text text-sm">
                            {m.is_home ? `Dolany - ${m.opponent}` : `${m.opponent} - Dolany`}
                          </span>
                          {played ? (
                            <span className="font-bold text-text">
                              {m.score_home}:{m.score_away}
                              {m.halftime_home != null && m.halftime_away != null && (
                                <span className="text-text-muted font-normal text-xs ml-1">({m.halftime_home}:{m.halftime_away})</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-text-muted italic">dosud nehráno</span>
                          )}
                        </div>
                        <span className="text-xs text-text-muted">
                          {m.match_number && <span className="font-bold text-brand-yellow mr-1">#{m.match_number}</span>}
                          {d.toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" })} {getHoursPrague(d) > 0 && formatTimePrague(d)} • {m.competition} {m.venue && `• ${m.venue}`}
                          {m.match_type === "pratelsky" && <span className="ml-1 text-[10px] font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">přátelský</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {m.article_id ? (
                          <button onClick={(e) => { e.stopPropagation(); publishMatch(m.id, true); }} disabled={publishing === m.id}
                            title="Aktualizovat článek"
                            className="text-green-500 hover:text-green-700 p-1.5 disabled:opacity-50">
                            <RefreshCw size={14} className={publishing === m.id ? "animate-spin" : ""} />
                          </button>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); publishMatch(m.id, true); }} disabled={publishing === m.id}
                            title="Vytvořit článek"
                            className="text-blue-500 hover:text-blue-700 p-1.5 disabled:opacity-50">
                            <FilePlus2 size={14} />
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); startEdit(m); }} className="text-blue-600 hover:text-blue-800 p-1.5">
                          <Pencil size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteMatch(m.id); }} className="text-red-500 hover:text-red-700 p-1.5">
                          <Trash2 size={14} />
                        </button>
                        <ChevronDown size={16} className={`text-text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border p-4 bg-surface-muted space-y-3">
                        {(m.summary_title || m.summary) && (
                          <div>
                            <h4 className="text-xs font-bold text-text-muted uppercase mb-1">Referát</h4>
                            {m.summary_title && (
                              <p className="text-sm font-bold text-text mb-1">{m.summary_title}</p>
                            )}
                            {m.summary && (
                              <p className="text-sm text-text whitespace-pre-wrap">{m.summary}</p>
                            )}
                          </div>
                        )}
                        {m.match_lineups && m.match_lineups.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-text-muted uppercase mb-1">Sestava</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {m.match_lineups.filter((l) => l.is_starter).map((l) => (
                                <span key={l.player_id} className="text-xs bg-surface px-2 py-1 rounded border border-border text-text">
                                  {l.players?.name || "?"}
                                </span>
                              ))}
                            </div>
                            {m.match_lineups.filter((l) => !l.is_starter).length > 0 && (
                              <>
                                <h4 className="text-xs font-bold text-text-muted uppercase mb-1 mt-2">Náhradníci</h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {m.match_lineups.filter((l) => !l.is_starter).map((l) => (
                                    <span key={l.player_id} className="text-xs bg-orange-50 px-2 py-1 rounded border border-orange-200 text-orange-700">
                                      {l.players?.name || "?"}
                                    </span>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        {m.match_scorers && m.match_scorers.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-text-muted uppercase mb-1">Střelci</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {/* Group by player, show individual minutes */}
                              {(() => {
                                const grouped = new Map<string, { name: string; minutes: (number | null)[] }>();
                                m.match_scorers!.forEach((s) => {
                                  const key = s.player_id;
                                  const existing = grouped.get(key);
                                  if (existing) {
                                    existing.minutes.push(s.minute);
                                  } else {
                                    grouped.set(key, { name: s.players?.name || "?", minutes: [s.minute] });
                                  }
                                });
                                return [...grouped.values()].map((g, i) => {
                                  const mins = g.minutes.filter((m): m is number => m != null).sort((a, b) => a - b);
                                  return (
                                    <span key={i} className="text-xs bg-brand-red/10 text-brand-red px-2 py-1 rounded font-medium">
                                      {g.name} ({g.minutes.length}×{mins.length > 0 ? ` — ${mins.map((m) => `${m}'`).join(", ")}` : ""})
                                    </span>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}
                        {m.match_cards && m.match_cards.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-text-muted uppercase mb-1">Karty</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {m.match_cards.map((c, i) => (
                                <span key={i} className={`text-xs px-2 py-1 rounded font-medium ${c.card_type === "yellow" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                                  {c.card_type === "yellow" ? "ŽK" : "ČK"} {c.players?.name || "?"}{c.minute ? ` (${c.minute}')` : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {m.opponent_scorers && (
                          <div>
                            <h4 className="text-xs font-bold text-text-muted uppercase mb-1">Góly soupeře</h4>
                            <p className="text-sm text-text">{m.opponent_scorers}</p>
                          </div>
                        )}
                        {m.opponent_cards && (
                          <div>
                            <h4 className="text-xs font-bold text-text-muted uppercase mb-1">Karty soupeře</h4>
                            <p className="text-sm text-text">{m.opponent_cards}</p>
                          </div>
                        )}
                        {m.video_url && (
                          <div>
                            <h4 className="text-xs font-bold text-text-muted uppercase mb-1">Video</h4>
                            <a href={m.video_url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-red hover:underline">{m.video_url}</a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredMatches.length === 0 && (
                <p className="text-center text-text-muted py-8">Žádné zápasy pro sezónu {season}</p>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══ DRAWS TAB ═══ */}
      {activeTab === "draws" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-text">Losy soutěže</h2>
            <button onClick={() => { resetDrawForm(); setShowDrawForm(true); }}
              className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors">
              <Plus size={16} /> Nový los
            </button>
          </div>

          {showDrawForm && (
            <form onSubmit={handleDrawSubmit} className="bg-surface rounded-xl border border-border p-6 mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-text">{drawEditId ? "Upravit" : "Nový los"}</h2>
                <button type="button" onClick={resetDrawForm} className="text-text-muted hover:text-text"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Období</label>
                  <select value={drawForm.season} onChange={(e) => { setDrawSaved(false); setDrawForm({ ...drawForm, season: e.target.value }); }}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text">
                    {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-1">Název</label>
                  <input type="text" value={drawForm.title} onChange={(e) => { setDrawSaved(false); setDrawForm({ ...drawForm, title: e.target.value }); }} required
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={drawForm.active} onChange={(e) => { setDrawSaved(false); setDrawForm({ ...drawForm, active: e.target.checked }); }} className="w-4 h-4" />
                    <span className="text-sm text-text">Aktivní</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-1">Obrázek</label>
                <ImageUploader images={drawImages} onChange={(imgs) => { setDrawSaved(false); setDrawImages(imgs); }} folder="draws" multiple={false} />
              </div>
              <div className="flex items-center gap-2">
                <button type="submit" disabled={drawSaving}
                  className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50 transition-colors">
                  <Save size={16} /> {drawSaving ? "Ukládám..." : "Uložit"}
                </button>
                <button type="button" onClick={resetDrawForm}
                  className="bg-surface border border-border text-text-muted hover:text-text px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors">
                  <X size={16} /> Zrušit
                </button>
                {drawSaved && (
                  <span className="flex items-center gap-1.5 text-green-500 text-sm font-semibold ml-2">
                    <CheckCircle size={16} /> Uloženo
                  </span>
                )}
              </div>
            </form>
          )}

          {drawsLoading ? (
            <p className="text-text-muted">Načítám...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {draws.map((d) => (
                <div key={d.id} className="bg-surface rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-xs text-text-muted">{d.season}</span>
                      <h3 className="font-bold text-text">{d.title}</h3>
                    </div>
                    <div className="flex gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${d.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {d.active ? "Aktivní" : "Skrytý"}
                      </span>
                      <button onClick={() => startDrawEdit(d)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={14} /></button>
                      <button onClick={() => deleteDraw(d.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-surface-muted">
                    <Image src={d.image} alt={d.title} fill className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" />
                  </div>
                </div>
              ))}
              {draws.length === 0 && <p className="text-text-muted col-span-2 text-center py-8">Žádné losy</p>}
            </div>
          )}
        </>
      )}
      {/* ═══ STANDINGS TAB ═══ */}
      {activeTab === "standings" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text">Tabulka soutěže</h2>
            <div className="flex gap-2">
              {SEASONS.map((s) => (
                <button key={s} onClick={() => setStandingsSeason(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${standingsSeason === s ? "bg-brand-red text-white" : "bg-surface border border-border text-text-muted"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Textarea for pasting all 3 variants at once */}
          <div className="mb-4">
            <p className="text-xs text-text-muted mb-2">Vložte všechny 3 tabulky najednou. Začněte řádkem <strong>Celkem</strong>, pak <strong>Doma</strong>, pak <strong>Venku</strong>. Formát: # Klub Z V R P Skóre B (oddělené taby). &quot;Dolany&quot; se označí automaticky.</p>
            <textarea
              value={standingsText}
              onChange={(e) => setStandingsText(e.target.value)}
              rows={16}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text font-mono focus:outline-none focus:ring-2 focus:ring-brand-red/50"
              placeholder={"Celkem\n#\tKlub\tZ\tV\tR\tP\tSkóre\tB\n1.\tSp. Police n/M B\t14\t13\t1\t0\t48:17\t40\n...\nDoma\n#\tKlub\tZ\tV\tR\tP\tSkóre\tB\n1.\tSo. V. Jesenice\t7\t7\t0\t0\t23:4\t21\n...\nVenku\n..."}
            />
            <button type="button" onClick={parseAndPreview}
              className="mt-2 text-sm text-brand-red hover:text-brand-red-dark font-medium flex items-center gap-1">
              <Eye size={14} /> Zpracovat a zobrazit náhled
            </button>
          </div>

          {/* Preview with variant tabs */}
          {(standingsData.celkem.length > 0 || standingsData.doma.length > 0 || standingsData.venku.length > 0) && (
            <>
              <div className="flex gap-1 mb-3 bg-surface-muted rounded-lg p-1 w-fit">
                {(["celkem", "doma", "venku"] as const).map((v) => (
                  <button key={v} onClick={() => setStandingsPreviewVariant(v)}
                    className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${standingsPreviewVariant === v ? "bg-brand-red text-white" : "text-text-muted hover:text-text"}`}>
                    {VARIANT_LABELS[v]}
                    {standingsData[v].length > 0 && <span className="ml-1.5 text-xs opacity-70">({standingsData[v].length})</span>}
                  </button>
                ))}
              </div>
              <div className="bg-surface rounded-xl border border-border overflow-hidden mb-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-muted text-text-muted">
                        <th className="px-2 py-2 text-center w-10">#</th>
                        <th className="px-3 py-2 text-left">Tým</th>
                        <th className="px-2 py-2 text-center w-12">Z</th>
                        <th className="px-2 py-2 text-center w-12">V</th>
                        <th className="px-2 py-2 text-center w-12">R</th>
                        <th className="px-2 py-2 text-center w-12">P</th>
                        <th className="px-2 py-2 text-center">Skóre</th>
                        <th className="px-2 py-2 text-center w-12 font-bold">B</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standingsData[standingsPreviewVariant].length === 0 ? (
                        <tr><td colSpan={8} className="px-4 py-6 text-center text-text-muted">Žádná data pro {VARIANT_LABELS[standingsPreviewVariant]}</td></tr>
                      ) : standingsData[standingsPreviewVariant].map((s, i) => (
                        <tr key={i} className={`border-b border-border last:border-0 ${s.is_our_team ? "bg-brand-red/5" : ""}`}>
                          <td className="px-2 py-1.5 text-center font-bold text-text">{s.position}</td>
                          <td className={`px-3 py-1.5 text-sm ${s.is_our_team ? "font-bold text-brand-red" : "text-text"}`}>{s.team_name}</td>
                          <td className="px-2 py-1.5 text-center text-text-muted">{s.matches_played}</td>
                          <td className="px-2 py-1.5 text-center text-text-muted">{s.wins}</td>
                          <td className="px-2 py-1.5 text-center text-text-muted">{s.draws_count}</td>
                          <td className="px-2 py-1.5 text-center text-text-muted">{s.losses}</td>
                          <td className="px-2 py-1.5 text-center text-text-muted">{s.goals_for}:{s.goals_against}</td>
                          <td className={`px-2 py-1.5 text-center font-bold ${s.is_our_team ? "text-brand-red" : "text-text"}`}>{s.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <button onClick={saveStandings} disabled={standingsSaving}
              className="bg-brand-red hover:bg-brand-red-dark text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-50 transition-colors">
              <Save size={16} /> {standingsSaving ? "Ukládám..." : "Uložit všechny varianty"}
            </button>
          </div>
        </>
      )}

      {/* Share dialog after publish */}
      {shareDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShareDialog(null)}>
          <div className="bg-surface border border-border rounded-xl p-6 max-w-md w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <Share2 size={20} className="text-brand-red" /> Článek publikován
              </h3>
              <button onClick={() => setShareDialog(null)} className="text-text-muted hover:text-text">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-text-muted">Sdílejte článek na sociálních sítích:</p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  const url = `https://tjdolany.net/aktuality/${shareDialog.slug}`;
                  const quote = `${shareDialog.title}\n\nCelý článek na tjdolany.net`;
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(quote)}`, "_blank", "width=600,height=400");
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-[#1877F2] hover:bg-[#1565C0] text-white rounded-lg font-semibold text-sm transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Sdílet na Facebook
                <ExternalLink size={14} className="ml-auto opacity-70" />
              </button>
              <button
                onClick={async () => {
                  const url = `https://tjdolany.net/aktuality/${shareDialog.slug}`;
                  await navigator.clipboard.writeText(url);
                  const btn = document.getElementById("copy-link-btn");
                  if (btn) btn.textContent = "Zkopírováno!";
                  setTimeout(() => { if (btn) btn.textContent = "Kopírovat odkaz"; }, 2000);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-surface-muted hover:bg-border text-text rounded-lg font-semibold text-sm border border-border transition-colors"
              >
                <Copy size={18} />
                <span id="copy-link-btn">Kopírovat odkaz</span>
              </button>
            </div>
            <p className="text-xs text-text-muted">
              Facebook automaticky načte obrázek a popisek z článku (OG meta tagy).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
