import { describe, it, expect } from "vitest";
import { PREFECTURES } from "./constants";

describe("PREFECTURES", () => {
  it("47都道府県を含む", () => {
    expect(PREFECTURES).toHaveLength(47);
    expect(PREFECTURES[0]).toBe("北海道");
    expect(PREFECTURES[46]).toBe("沖縄県");
  });
});
