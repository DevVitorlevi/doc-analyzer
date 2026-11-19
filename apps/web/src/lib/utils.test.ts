import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("combina classes", () => {
    expect(cn("flex", "items-center")).toBe("flex items-center");
  });

  it("resolve conflitos entre classes Tailwind", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("ignora valores condicionais falsos", () => {
    const isHidden = false;

    expect(cn("flex", isHidden && "hidden", undefined)).toBe("flex");
  });

  it("aceita objetos com classes condicionais", () => {
    expect(cn({ flex: true, hidden: false })).toBe("flex");
  });
});
