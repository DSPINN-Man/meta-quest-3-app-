import { Rectangle, TextBlock } from "@babylonjs/gui";

export const PANEL = {
  surface: "rgba(246, 244, 238, 0.96)",
  surfaceSoft: "rgba(255, 255, 255, 0.56)",
  surfaceHover: "rgba(255, 255, 255, 0.78)",
  surfacePressed: "rgba(235, 230, 218, 0.96)",
  border: "rgba(32, 36, 40, 0.22)",
  borderHover: "rgba(94, 86, 68, 0.45)",
  shadow: "rgba(0, 0, 0, 0.22)",
  text: "rgba(26, 28, 30, 1)",
  muted: "rgba(66, 68, 70, 0.78)",
  faint: "rgba(94, 86, 68, 0.62)",
  accent: "rgba(94, 86, 68, 1)",
  success: "rgba(48, 118, 88, 1)",
  fontDisplay: "system-ui, -apple-system, 'SF Pro Display', sans-serif",
  fontText: "system-ui, -apple-system, 'SF Pro Text', sans-serif",
};

export function stylePanel(bg: Rectangle, radius = 15, shadowBlur = 14): void {
  bg.cornerRadius = radius;
  bg.thickness = 1;
  bg.color = PANEL.border;
  bg.background = PANEL.surface;
  bg.shadowColor = PANEL.shadow;
  bg.shadowBlur = shadowBlur;
  bg.shadowOffsetY = 4;
}

export function styleTitle(tb: TextBlock, size = 28): void {
  tb.color = PANEL.text;
  tb.fontSize = size;
  tb.fontWeight = "650";
  tb.fontFamily = PANEL.fontDisplay;
}

export function styleBody(tb: TextBlock, size = 16): void {
  tb.color = PANEL.muted;
  tb.fontSize = size;
  tb.fontFamily = PANEL.fontText;
}

export function styleFooter(tb: TextBlock, size = 14): void {
  tb.color = PANEL.faint;
  tb.fontSize = size;
  tb.fontWeight = "600";
  tb.fontFamily = PANEL.fontText;
}

export function styleButton(bg: Rectangle, active = false): void {
  bg.cornerRadius = 12;
  bg.thickness = 1;
  bg.color = active ? PANEL.borderHover : PANEL.border;
  bg.background = active ? PANEL.surfaceHover : PANEL.surfaceSoft;
}
