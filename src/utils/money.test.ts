import { describe, expect, it } from "vitest";
import { compactNumber, moneyCompact } from "./money";

describe("moneyCompact", () => {
  it("formats plain dollars", () => {
    expect(moneyCompact(987)).toBe("$987");
  });

  it("formats thousands with a k suffix", () => {
    expect(moneyCompact(850_400)).toBe("$850k");
  });

  it("formats millions with two decimals below 10m", () => {
    expect(moneyCompact(1_234_000)).toBe("$1.23m");
  });

  it("formats millions with no decimals from 10m up", () => {
    expect(moneyCompact(12_340_000)).toBe("$12m");
  });

  it("keeps the sign for negative values", () => {
    expect(moneyCompact(-850_400)).toBe("-$850k");
  });
});

describe("compactNumber", () => {
  it("formats plain integers without decimals", () => {
    expect(compactNumber(987.4)).toBe("987");
  });

  it("formats thousands with a k suffix", () => {
    expect(compactNumber(12_340)).toBe("12k");
  });

  it("formats millions with two decimals below 10m", () => {
    expect(compactNumber(1_234_000)).toBe("1.23m");
  });

  it("keeps the sign for negative values", () => {
    expect(compactNumber(-12_340)).toBe("-12k");
  });
});
