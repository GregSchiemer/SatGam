#!/usr/bin/env python3
"""
make_booklet_v12_pymupdf.py — A4→A5 booklet imposition using PyMuPDF (vector-safe, no clipping).

Why this version?
- Uses PyMuPDF's page.show_pdf_page() to place source pages as Form XObjects,
  which avoids merge-time clipping issues seen with PyPDF2/pypdf on some PDFs.
- Produces A4-landscape sheets with two A5 pages (flush to fold), booklet order.
- Supports gutter (fold clearance) and optional outside margin.
- Optional --debug draws thin guide rectangles.

Install:
  python3 -m pip install --upgrade pymupdf

Usage:
  python3 make_workshop_booklet.py INPUT.pdf --out OUTPUT.pdf [--gutter 6] [--outer 0] [--debug]

Notes:
- Assumes input pages are A4 portrait-ish (size is read from the PDF).
- Print with A4 paper, Landscape, Two-Sided (duplex), Short-Edge binding.
"""
import argparse
import sys
from pathlib import Path
import fitz  # PyMuPDF

def booklet_pairs(n_pages: int):
    pairs = []
    left = 1
    right = n_pages
    while left < right:
        pairs.append((right, left))  # front
        left += 1
        right -= 1
        pairs.append((left, right))  # back
        left += 1
        right -= 1
    return pairs

def main():
    ap = argparse.ArgumentParser(description="Impose A4 PDF into A5 booklet (PyMuPDF-based).")
    ap.add_argument("input", help="Input PDF (A4 portrait recommended)")
    ap.add_argument("--out", "-o", help="Output PDF (default: *_booklet.pdf)")
    ap.add_argument("--gutter", type=float, default=0.0, help="Total inner gutter at fold (points)")
    ap.add_argument("--outer", type=float, default=0.0, help="Outside fore-edge margin (points)")
    ap.add_argument("--debug", action="store_true", help="Draw guide frames")
    args = ap.parse_args()

    in_path = Path(args.input)
    if not in_path.exists():
        print(f"Input not found: {in_path}", file=sys.stderr)
        sys.exit(2)
    out_path = Path(args.out) if args.out else in_path.with_name(in_path.stem + "_booklet.pdf")

    src = fitz.open(str(in_path))

    # Base size from first page (points). Expect ~595x842 for A4 portrait.
    first = src[0]
    base_w, base_h = first.rect.width, first.rect.height

    # Output: A4 landscape
    out_w, out_h = base_h, base_w
    pane_w, pane_h = out_w / 2.0, out_h

    n = len(src)
    pad = (4 - (n % 4)) % 4
    total = n + pad

    pairs = booklet_pairs(total)

    seam_clear = args.gutter / 2.0
    outer_margin = args.outer

    # Prepare output doc
    out = fitz.open()

    # Colors for debug
    C_SHEET = (0, 0, 1)     # blue
    C_PANE  = (0, 0.6, 0)   # green
    C_FOLD  = (0, 0, 0)     # black
    C_BOX   = (1, 0, 0)     # red

    for (left_num, right_num) in pairs:
        # Add a new A4-landscape page
        page = out.new_page(width=out_w, height=out_h)

        # Debug overlays: sheet border, fold, panes
        if args.debug:
            page.draw_rect(fitz.Rect(0, 0, out_w, out_h), color=C_SHEET, width=0.7)
            page.draw_rect(fitz.Rect(pane_w-0.25, 0, pane_w+0.25, pane_h), color=C_FOLD, width=0.5, dashes=[2,2])
            page.draw_rect(fitz.Rect(0, 0, pane_w, pane_h), color=C_PANE, width=0.6, dashes=[3,3])
            page.draw_rect(fitz.Rect(pane_w, 0, out_w, pane_h), color=C_PANE, width=0.6, dashes=[3,3])

        for side, num in (("left", left_num), ("right", right_num)):
            # Source page (1-based). If beyond n, use a blank page rect for scaling
            if 1 <= num <= n:
                sp = src[num-1]
                src_doc = src
                src_pno = num-1
                sw, sh = sp.rect.width, sp.rect.height
            else:
                # synthetic blank: just use base size
                src_doc = src
                src_pno = 0  # won't be used when we set clip to empty
                sw, sh = base_w, base_h
                sp = None

            # Allowed width in the pane (flush to fold + outside margin at fore-edge)
            allow_w = pane_w - seam_clear - outer_margin
            if allow_w <= 0:
                allow_w = pane_w * 0.95  # last-resort

            # Compute scale to fit by height and allowed width
            scale = min(pane_h / sh, allow_w / sw)
            scaled_w = sw * scale
            scaled_h = sh * scale

            if side == "left":
                # Right edge sits at fold - seam_clear
                x1 = pane_w - seam_clear
                x0 = x1 - scaled_w
            else:
                # Left edge sits at fold + seam_clear
                x0 = pane_w + seam_clear
                x1 = x0 + scaled_w
            y0, y1 = 0, scaled_h

            dest = fitz.Rect(x0, y0, x1, y1)

            if sp is not None:
                # Place source page as Form XObject
                page.show_pdf_page(dest, src_doc, src_pno, clip=None, rotate=0)
            # Debug box of placed A5
            if args.debug:
                page.draw_rect(dest, color=C_BOX, width=0.8)

    # Save
    out.save(str(out_path), deflate=True, garbage=3)
    out.close()
    src.close()

    print(f"✅ Booklet created: {out_path}")
    print("Print: A4, Landscape, Two-Sided, Binding Short Edge.")
    if args.debug:
        print("Debug overlays: blue sheet, green panes, black fold, red placed A5.")


if __name__ == "__main__":
    main()
