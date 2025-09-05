// canvasExtensions.js
// Adds roundedRect to render prototype henge

export function installHengePrototype() {
  if (!CanvasRenderingContext2D.prototype.roundedRect) {
    CanvasRenderingContext2D.prototype.roundedRect = function (x, y, w, h, r) {
      this.save();
      this.translate(x - h / 2, y - w / 2);
      this.moveTo(h / 2, 0);
      this.arcTo(h, 0, h, w, Math.min(w / 2, r));
      this.arcTo(h, w, 0, w, Math.min(h / 2, r));
      this.arcTo(0, w, 0, 0, Math.min(w / 2, r));
      this.arcTo(0, 0, h / 2, 0, Math.min(h / 2, r));
      this.lineTo(h / 2, 0);
      this.restore();
    };
  }
}
