import type Phaser from 'phaser';

/** hit = Treffer am Gegner, crit = kritischer Treffer, hurt = Schaden an der Figur, info = Hinweis. */
export type FloatKind = 'hit' | 'crit' | 'hurt' | 'info';

/** So lange ist eine Zahl zu sehen (Millisekunden) und so weit steigt sie auf (Welt-Pixel). */
const LIFETIME_MS = 900;
const RISE = 14;

interface Floater {
  element: HTMLElement;
  x: number;
  y: number;
  bornAt: number;
}

/**
 * Schadenszahlen und kurze Hinweise, die über einer Stelle der Welt aufsteigen.
 * Sie sind HTML-Elemente über dem Spielbild, damit die Schrift scharf bleibt.
 */
export class FloatingText {
  private floaters: Floater[] = [];

  constructor(private readonly root: HTMLElement) {}

  /** Lässt `text` über dem Welt-Punkt (x, y) aufsteigen. */
  spawn(x: number, y: number, text: string, kind: FloatKind): void {
    const element = document.createElement('div');
    element.className = `floater floater-${kind}`;
    element.textContent = text;
    this.root.appendChild(element);
    // Etwas Streuung, damit mehrere Zahlen nicht genau übereinander liegen.
    this.floaters.push({ element, x: x + (Math.random() - 0.5) * 8, y, bornAt: performance.now() });
  }

  /** Setzt alle Zahlen an ihre Bildschirm-Position. Einmal pro Frame nach dem Zeichnen aufrufen. */
  render(camera: Phaser.Cameras.Scene2D.Camera): void {
    if (this.floaters.length === 0) return;
    const now = performance.now();
    this.floaters = this.floaters.filter((floater) => {
      const age = (now - floater.bornAt) / LIFETIME_MS;
      if (age >= 1) {
        floater.element.remove();
        return false;
      }
      // Welt → Bildschirm: die Kamera zoomt um die Bildmitte.
      const x = (floater.x - camera.scrollX - camera.width / 2) * camera.zoom + camera.width / 2;
      const y = (floater.y - age * RISE - camera.scrollY - camera.height / 2) * camera.zoom + camera.height / 2;
      floater.element.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
      floater.element.style.opacity = `${Math.min(1, (1 - age) * 2.5)}`;
      return true;
    });
  }
}
