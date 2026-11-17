import { describe, expect, it } from "vitest";
import { formatoPara } from "./dispositivo";

describe("formatoPara", () => {
  it.each([
    [390, 844, "celular"], // iPhone / Android vertical
    [412, 915, "celular"], // Pixel
    [844, 390, "celular"], // celular en horizontal
    [820, 1180, "tablet"], // iPad vertical
    [1180, 820, "pc"], // iPad horizontal
    [800, 1280, "tablet"], // tablet Android
    [1440, 900, "pc"],
    [1920, 1080, "pc"],
  ])("%sx%s → %s", (w, h, f) => expect(formatoPara(w, h)).toBe(f));
});
