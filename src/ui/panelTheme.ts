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

export const VR_PANEL = {
  surface: "rgba(8, 16, 28, 0.96)",
  surfaceSoft: "rgba(14, 28, 44, 0.88)",
  surfaceHover: "rgba(22, 40, 62, 0.96)",
  surfacePressed: "rgba(30, 54, 80, 0.98)",
  border: "rgba(116, 211, 230, 0.52)",
  borderHover: "rgba(180, 238, 246, 0.84)",
  shadow: "rgba(0, 0, 0, 0.45)",
  text: "rgba(248, 252, 255, 1)",
  muted: "rgba(224, 237, 244, 0.94)",
  faint: "rgba(166, 210, 219, 0.92)",
  accent: "rgba(89, 194, 215, 1)",
  success: "rgba(132, 239, 188, 1)",
  fontDisplay: PANEL.fontDisplay,
  fontText: PANEL.fontText,
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

export function styleVRPanel(
  bg: Rectangle,
  radius = 18,
  shadowBlur = 18
): void {
  bg.cornerRadius = radius;
  bg.thickness = 1.5;
  bg.color = VR_PANEL.border;
  bg.background = VR_PANEL.surface;
  bg.shadowColor = VR_PANEL.shadow;
  bg.shadowBlur = shadowBlur;
  bg.shadowOffsetY = 5;
}

export function styleVRTitle(tb: TextBlock, size = 28): void {
  tb.color = VR_PANEL.text;
  tb.fontSize = size;
  tb.fontWeight = "650";
  tb.fontFamily = VR_PANEL.fontDisplay;
}

export function styleVRBody(tb: TextBlock, size = 16): void {
  tb.color = VR_PANEL.muted;
  tb.fontSize = size;
  tb.fontFamily = VR_PANEL.fontText;
}

export function styleVRFooter(tb: TextBlock, size = 14): void {
  tb.color = VR_PANEL.faint;
  tb.fontSize = size;
  tb.fontWeight = "600";
  tb.fontFamily = VR_PANEL.fontText;
}

export function styleVRButton(bg: Rectangle, active = false): void {
  bg.cornerRadius = 12;
  bg.thickness = 1.5;
  bg.color = active ? VR_PANEL.borderHover : VR_PANEL.border;
  bg.background = active ? VR_PANEL.surfaceHover : VR_PANEL.surfaceSoft;
}
