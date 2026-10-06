#!/usr/bin/env python3
"""
make_stockhausen_midi.py

Create a monophonic MIDI file for Stockhausen's 25th-root-of-5 scale
(using pitch bend to apply microtonal deviations).

- Reads a CSV with at least: k,actual,distTET
  (your file also has ratio/rational/centsDiff/TenneyH; that's fine)

- For each row:
    cents_total = 1200 * log2(actual)
    semitone_offset = round(cents_total / 100)
    bend_cents = cents_total - 100*semitone_offset   (same idea as distTET)
    midi_note = root_midi + semitone_offset
    send pitchbend(bend_cents), then note on/off

Notes:
- Many synths assume pitch bend range +/-2 semitones; this script sends
  an RPN message to set bend range explicitly (default: 2 semitones).
- If your playback device ignores RPN pitch bend range, the bends may be scaled wrong.
"""

import argparse
import csv
import math
from pathlib import Path


# ---------- MIDI helpers (no third-party libs) ----------

def vlq(n: int) -> bytes:
    """Variable-length quantity encoding."""
    if n < 0:
        raise ValueError("VLQ cannot encode negative numbers")
    out = bytearray([n & 0x7F])
    n >>= 7
    while n:
        out.insert(0, 0x80 | (n & 0x7F))
        n >>= 7
    return bytes(out)

def chunk(tag: bytes, data: bytes) -> bytes:
    return tag + len(data).to_bytes(4, "big") + data

def midi_note_number(note: str) -> int:
    """
    Parse note name like A3, C#4, Bb2 (octaves per MIDI: C4=60, A3=57).
    """
    note = note.strip()
    if len(note) < 2:
        raise ValueError(f"Bad note: {note}")

    name = note[:-1]
    octave = int(note[-1])

    base = {
        "C": 0, "C#": 1, "DB": 1,
        "D": 2, "D#": 3, "EB": 3,
        "E": 4,
        "F": 5, "F#": 6, "GB": 6,
        "G": 7, "G#": 8, "AB": 8,
        "A": 9, "A#": 10, "BB": 10,
        "B": 11,
    }

    key = name.upper().replace("♭", "B").replace("♯", "#")
    if key not in base:
        raise ValueError(f"Bad note name: {note} (parsed '{key}')")

    semitone = base[key]
    return (octave + 1) * 12 + semitone

def pitchbend_value_from_cents(cents: float, bend_range_semitones: int) -> int:
    """
    Convert cents to MIDI pitch bend 14-bit value (0..16383), center=8192.
    bend_range_semitones is the +/- semitone range.

    offset_units = cents / (range*100) * 8192
    """
    if bend_range_semitones <= 0:
        raise ValueError("bend_range_semitones must be > 0")

    offset = int(round((cents / (bend_range_semitones * 100.0)) * 8192.0))
    if offset < -8192:
        offset = -8192
    if offset > 8191:
        offset = 8191
    return 8192 + offset

def midi_event(delta_ticks: int, status: int, data: bytes) -> bytes:
    return vlq(delta_ticks) + bytes([status]) + data

def meta_event(delta_ticks: int, meta_type: int, data: bytes) -> bytes:
    return vlq(delta_ticks) + bytes([0xFF, meta_type]) + vlq(len(data)) + data


# ---------- CSV reading ----------

def read_rows(csv_path: Path):
    rows = []
    with csv_path.open(newline="") as f:
        r = csv.DictReader(f)
        # Accept either distTET or distTET with different case
        for row in r:
            # coerce
            k = int(row["k"])
            actual = float(row["actual"])
            # dist column name in your file is distTET
            dist_key = "distTET" if "distTET" in row else "distTET".lower()
            if dist_key not in row:
                # fall back: try any key that starts with 'dist'
                cand = [kk for kk in row.keys() if kk.lower().startswith("dist")]
                if not cand:
                    raise ValueError("CSV missing distTET column (or any dist* column)")
                dist_key = cand[0]
            dist = float(row[dist_key])
            rows.append((k, actual, dist))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="assets/docs/stockhausen_25root5.csv",
                    help="Path to CSV containing k,actual,distTET (default: assets/docs/stockhausen_25root5.csv)")
    ap.add_argument("--out", default="assets/docs/stockhausen_25root5.mid",
                    help="Output MIDI path (default: assets/docs/stockhausen_25root5.mid)")
    ap.add_argument("--root", default="A3",
                    help="12-TET starting note name (default: A3). Examples: C4, F#3, Bb2")
    ap.add_argument("--tempo-bpm", type=float, default=90.0,
                    help="Tempo in BPM (default: 90)")
    ap.add_argument("--ticks-per-quarter", type=int, default=480,
                    help="MIDI resolution (default: 480)")
    ap.add_argument("--note-quarters", type=float, default=1.0,
                    help="Note duration in quarters (default: 1.0)")
    ap.add_argument("--gap-quarters", type=float, default=0.1,
                    help="Silence gap between notes in quarters (default: 0.1)")
    ap.add_argument("--channel", type=int, default=0,
                    help="MIDI channel 0-15 (default: 0)")
    ap.add_argument("--program", type=int, default=0,
                    help="Program change 0-127 (default: 0 = Acoustic Grand Piano)")
    ap.add_argument("--bend-range", type=int, default=2,
                    help="Pitch bend range in semitones (+/-). Default 2.")
    ap.add_argument("--include-endpoint", action="store_true",
                    help="Include the last row (k=25, factor=5/1). Default: off (25 notes only).")
    args = ap.parse_args()

    csv_path = Path(args.csv)
    out_path = Path(args.out)

    rows = read_rows(csv_path)
    # Keep k=0..24 unless endpoint requested
    if not args.include_endpoint:
        rows = [r for r in rows if r[0] < 25]

    root_midi = midi_note_number(args.root)

    tpq = args.ticks_per_quarter
    note_ticks = int(round(args.note_quarters * tpq))
    gap_ticks = int(round(args.gap_quarters * tpq))
    ch = args.channel & 0x0F

    # Header (format 0, 1 track)
    header = (0).to_bytes(2, "big") + (1).to_bytes(2, "big") + tpq.to_bytes(2, "big")
    header_chunk = chunk(b"MThd", header)

    track = bytearray()

    # Tempo meta event
    mpqn = int(round(60_000_000 / args.tempo_bpm))  # microseconds per quarter
    track += meta_event(0, 0x51, mpqn.to_bytes(3, "big"))

    # Program change
    track += midi_event(0, 0xC0 | ch, bytes([args.program & 0x7F]))

    # Set pitch bend range using RPN 0 (Pitch Bend Sensitivity)
    # CC101=0, CC100=0, CC6=semitones, CC38=cents(0), then null RPN (101/100=127)
    def cc(delta, ccnum, val):
        return midi_event(delta, 0xB0 | ch, bytes([ccnum & 0x7F, val & 0x7F]))

    track += cc(0, 101, 0)   # RPN MSB
    track += cc(0, 100, 0)   # RPN LSB
    track += cc(0, 6, args.bend_range)    # Data Entry MSB: semitones
    track += cc(0, 38, 0)    # Data Entry LSB: cents
    track += cc(0, 101, 127) # RPN null
    track += cc(0, 100, 127)

    # Play notes
    first = True
    for (k, actual, dist) in rows:
        # cents_total from actual (independent of any rounding in CSV)
        cents_total = 1200.0 * math.log(actual, 2)
        semitone_offset = int(round(cents_total / 100.0))
        bend_cents = cents_total - 100.0 * semitone_offset  # should match distTET closely

        note = root_midi + semitone_offset
        if note < 0 or note > 127:
            raise ValueError(f"Computed MIDI note out of range: {note} (k={k}, root={args.root})")

        pb = pitchbend_value_from_cents(bend_cents, args.bend_range)
        lsb = pb & 0x7F
        msb = (pb >> 7) & 0x7F

        # small gap before each note except first
        delta = 0 if first else gap_ticks
        first = False

        # Pitch bend (status 0xE0)
        track += midi_event(delta, 0xE0 | ch, bytes([lsb, msb]))

        # Note on (velocity 96)
        track += midi_event(0, 0x90 | ch, bytes([note & 0x7F, 96]))

        # Note off after duration
        track += midi_event(note_ticks, 0x80 | ch, bytes([note & 0x7F, 0]))

    # End of track
    track += meta_event(0, 0x2F, b"")

    track_chunk = chunk(b"MTrk", bytes(track))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(header_chunk + track_chunk)
    print(f"wrote {out_path} ({len(rows)} notes), root={args.root}, bend_range=+/-{args.bend_range} semitones")


if __name__ == "__main__":
    main()