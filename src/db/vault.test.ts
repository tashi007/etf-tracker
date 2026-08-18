import { describe, it, expect } from "vitest";
import { getVaultBytes, setVaultBytes } from "./vault";

describe("sqlite blob vault", () => {
  it("returns null when empty", async () => {
    expect(await getVaultBytes()).toBeNull();
  });

  it("round-trips bytes", async () => {
    const bytes = new Uint8Array([10, 20, 30]);
    await setVaultBytes(bytes);
    const loaded = await getVaultBytes();
    expect(loaded).not.toBeNull();
    expect(Array.from(loaded!)).toEqual([10, 20, 30]);
    await setVaultBytes(new Uint8Array([1]));
    expect(Array.from((await getVaultBytes())!)).toEqual([1]);
  });
});
