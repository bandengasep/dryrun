// Vanta ships no type declarations, and there is no @types package for it.
// We use exactly one effect (NET), so declare exactly that rather than
// pulling in a dependency for types we don't need.
declare module "vanta/dist/vanta.net.min" {
  import type * as THREE from "three";

  interface VantaNetOptions {
    el: HTMLElement;
    THREE: typeof THREE;
    mouseControls?: boolean;
    touchControls?: boolean;
    gyroControls?: boolean;
    minHeight?: number;
    minWidth?: number;
    scale?: number;
    scaleMobile?: number;
    showDots?: boolean;
    backgroundColor?: number;
    color?: number;
    points?: number;
    maxDistance?: number;
    spacing?: number;
  }

  interface VantaEffect {
    destroy(): void;
  }

  export default function NET(options: VantaNetOptions): VantaEffect;
}
