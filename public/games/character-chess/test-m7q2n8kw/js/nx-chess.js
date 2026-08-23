/** NxN chess with chess.js-like verbose moves. Used when board scale > 1. */

const FILES = "abcdefghijklmnopqrstuvwx";
const KNIGHT = [
  [1, 2],
  [2, 1],
  [-1, 2],
  [-2, 1],
  [1, -2],
  [2, -1],
  [-1, -2],
  [-2, -1],
];
const KING = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

function sq(f, r) {
  return FILES[f] + String(r + 1);
}
function parse(s) {
  if (!s) return null;
  const f = s.charCodeAt(0) - 97;
  const r = Number(s.slice(1)) - 1;
  if (!Number.isFinite(f) || !Number.isFinite(r)) return null;
  return { f, r };
}

export class NxChess {
  constructor(n = 8) {
    this.N = n;
    this._turn = "w";
    this.board = new Map();
    this._ep = null;
    this.placeStart();
  }

  placeStart() {
    this.board.clear();
    this._turn = "w";
    this._ep = null;
    const off = Math.floor((this.N - 8) / 2);
    const back = ["r", "n", "b", "q", "k", "b", "n", "r"];
    for (let i = 0; i < 8; i++) {
      const f = off + i;
      this.board.set(sq(f, 0), { type: back[i], color: "w" });
      this.board.set(sq(f, 1), { type: "p", color: "w" });
      this.board.set(sq(f, this.N - 1), { type: back[i], color: "b" });
      this.board.set(sq(f, this.N - 2), { type: "p", color: "b" });
    }
  }

  turn() {
    return this._turn;
  }

  fen() {
    return `nx${this.N} ${this._turn}`;
  }

  inCheck() {
    return this._attacked(this._kingSq(this._turn), this._turn === "w" ? "b" : "w");
  }

  _kingSq(color) {
    for (const [s, p] of this.board) if (p.type === "k" && p.color === color) return s;
    return null;
  }

  _attacked(square, by) {
    if (!square) return false;
    const moves = this._pseudo(by, true);
    return moves.some((m) => m.to === square);
  }

  _onBoard(f, r) {
    return f >= 0 && r >= 0 && f < this.N && r < this.N;
  }

  _pseudo(color, forAttack) {
    const out = [];
    for (const [from, piece] of this.board) {
      if (piece.color !== color) continue;
      const a = parse(from);
      if (!a) continue;
      if (piece.type === "n") {
        for (const [df, dr] of KNIGHT) {
          const f = a.f + df,
            r = a.r + dr;
          if (!this._onBoard(f, r)) continue;
          const to = sq(f, r);
          const hit = this.board.get(to);
          if (!hit || hit.color !== color) out.push(this._mv(piece, from, to, hit));
        }
      } else if (piece.type === "k") {
        for (const [df, dr] of KING) {
          const f = a.f + df,
            r = a.r + dr;
          if (!this._onBoard(f, r)) continue;
          const to = sq(f, r);
          const hit = this.board.get(to);
          if (!hit || hit.color !== color) out.push(this._mv(piece, from, to, hit));
        }
      } else if (piece.type === "p") {
        const dir = piece.color === "w" ? 1 : -1;
        const start = piece.color === "w" ? 1 : this.N - 2;
        const nf = a.f,
          nr = a.r + dir;
        if (this._onBoard(nf, nr) && !this.board.has(sq(nf, nr)) && !forAttack) {
          const to = sq(nf, nr);
          const promo = nr === 0 || nr === this.N - 1;
          out.push(this._mv(piece, from, to, null, promo ? "p" : ""));
          const nr2 = a.r + dir * 2;
          if (a.r === start && this._onBoard(nf, nr2) && !this.board.has(sq(nf, nr2))) {
            out.push(this._mv(piece, from, sq(nf, nr2), null, "b"));
          }
        }
        for (const df of [-1, 1]) {
          const f = a.f + df,
            r = a.r + dir;
          if (!this._onBoard(f, r)) continue;
          const to = sq(f, r);
          const hit = this.board.get(to);
          if (hit && hit.color !== color) {
            const promo = r === 0 || r === this.N - 1;
            out.push(this._mv(piece, from, to, hit, promo ? "pc" : "c"));
          } else if (forAttack) out.push(this._mv(piece, from, to, null, "c"));
        }
      } else {
        const rays =
          piece.type === "b"
            ? [
                [1, 1],
                [1, -1],
                [-1, 1],
                [-1, -1],
              ]
            : piece.type === "r"
              ? [
                  [1, 0],
                  [-1, 0],
                  [0, 1],
                  [0, -1],
                ]
              : [
                  [1, 0],
                  [-1, 0],
                  [0, 1],
                  [0, -1],
                  [1, 1],
                  [1, -1],
                  [-1, 1],
                  [-1, -1],
                ];
        for (const [df, dr] of rays) {
          let f = a.f + df,
            r = a.r + dr;
          while (this._onBoard(f, r)) {
            const to = sq(f, r);
            const hit = this.board.get(to);
            if (!hit) out.push(this._mv(piece, from, to, null));
            else {
              if (hit.color !== color) out.push(this._mv(piece, from, to, hit));
              break;
            }
            f += df;
            r += dr;
          }
        }
      }
    }
    return out;
  }

  _mv(piece, from, to, hit, extraFlags = "") {
    let flags = hit ? "c" : "n";
    if (extraFlags.includes("b")) flags += "b";
    if (extraFlags.includes("p")) flags += "p";
    if (extraFlags.includes("c") && !flags.includes("c")) flags += "c";
    return {
      color: piece.color,
      from,
      to,
      piece: piece.type,
      captured: hit ? hit.type : undefined,
      flags,
      promotion: extraFlags.includes("p") ? "q" : undefined,
    };
  }

  _legal(color) {
    const raw = this._pseudo(color, false);
    const legal = [];
    for (const m of raw) {
      const snap = this._clone();
      this._apply(m, true);
      const ok = !this._attacked(this._kingSq(color), color === "w" ? "b" : "w");
      this._restore(snap);
      if (ok) legal.push(m);
    }
    return legal;
  }

  _clone() {
    return { turn: this._turn, ep: this._ep, board: new Map(this.board) };
  }
  _restore(s) {
    this._turn = s.turn;
    this._ep = s.ep;
    this.board = s.board;
  }

  _apply(m) {
    const piece = this.board.get(m.from);
    this.board.delete(m.from);
    if (m.promotion) this.board.set(m.to, { type: m.promotion, color: piece.color });
    else this.board.set(m.to, piece);
    this._turn = piece.color === "w" ? "b" : "w";
  }

  moves({ square, verbose } = {}) {
    const list = this._legal(this._turn).filter((m) => !square || m.from === square);
    return verbose === false ? list.map((m) => m.from + m.to) : list;
  }

  move(spec) {
    const from = spec.from,
      to = spec.to;
    const promo = spec.promotion;
    const m = this._legal(this._turn).find((x) => x.from === from && x.to === to && (!x.promotion || !promo || x.promotion === promo));
    if (!m) throw new Error("illegal");
    if (promo && m.promotion) m.promotion = promo;
    this._apply(m);
    return m;
  }
}

export function makeGame(n) {
  const N = n || (typeof window !== "undefined" && window.__CC_N) || 8;
  if (N <= 8 && typeof window !== "undefined" && window.__CC_Pt) return new window.__CC_Pt();
  return new NxChess(N);
}

if (typeof window !== "undefined") {
  window.__CC_FILES = FILES;
  window.NxChess = NxChess;
  window.__ccMkH = function () {
    const n = window.__CC_N || 8;
    if (n <= 8 && window.__CC_Pt) return new window.__CC_Pt();
    return new NxChess(n);
  };
}
