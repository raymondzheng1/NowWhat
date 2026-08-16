import { describe, it, expect } from "vitest";
import { detectIos, installMode, pathAllowsInstallCard } from "@/lib/pwa/install";

const base = {
  hasDeferredPrompt: false,
  isStandalone: false,
  isIos: false,
  dismissed: false,
  suppressed: false,
};

describe("install prompt: when we may ask", () => {
  it("offers the native prompt only when the browser gave us one", () => {
    expect(installMode({ ...base, hasDeferredPrompt: true })).toBe("prompt");
    expect(installMode(base)).toBe("none");
  });

  it("falls back to instructions on iOS, which never fires the event", () => {
    expect(installMode({ ...base, isIos: true })).toBe("ios-instructions");
  });

  it("never asks again once dismissed — there is deliberately no re-prompt window", () => {
    expect(installMode({ ...base, hasDeferredPrompt: true, dismissed: true })).toBe("none");
  });

  it("never asks inside an installed copy, or when the test harness suppresses it", () => {
    expect(installMode({ ...base, hasDeferredPrompt: true, isStandalone: true })).toBe("none");
    expect(installMode({ ...base, isIos: true, suppressed: true })).toBe("none");
  });
});

describe("install prompt: where we may ask", () => {
  it("never interrupts a focused tool, or someone trying to reach a human", () => {
    for (const p of ["/start", "/start/x", "/ask", "/decode", "/chat", "/help"]) {
      expect(pathAllowsInstallCard(p), p).toBe(false);
    }
  });

  it("is allowed on the reading surfaces", () => {
    for (const p of ["/", "/learn", "/faq/x", "/about"]) {
      expect(pathAllowsInstallCard(p), p).toBe(true);
    }
  });
});

describe("iOS detection", () => {
  it("catches iPhone and iPadOS, which reports itself as a Mac", () => {
    expect(detectIos("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", 5, true)).toBe(true);
    expect(detectIos("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5, true)).toBe(true);
  });

  it("does not mistake a desktop Mac for an iPad", () => {
    expect(detectIos("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0, false)).toBe(false);
  });
});
