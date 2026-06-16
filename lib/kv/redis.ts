import { Redis } from "@upstash/redis";

/**
 * KV adapter (harness §15 dual env-name gotcha + §4.4 in-memory dev/test fallback).
 *
 * Reads BOTH the Upstash names (UPSTASH_REDIS_REST_*) and the host-injected names
 * (KV_REST_API_*). When neither is set we fall back to an in-memory store so the app
 * runs locally before the store is provisioned — but `isKvConfigured()` returns false,
 * and the cost guard FAILS CLOSED in production when KV is not configured (harness §6.4).
 */

export interface KvLike {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: string | number, opts?: { ex?: number }): Promise<unknown>;
  incr(key: string): Promise<number>;
  incrbyfloat(key: string, n: number): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
}

/** Minimal in-memory KV — used in dev (unconfigured) and injected in tests. */
export class MemoryKv implements KvLike {
  private store = new Map<string, { v: string | number; expiresAt?: number }>();

  private live(key: string) {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (e.expiresAt && e.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return e;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const e = this.live(key);
    return e == null ? null : (e.v as unknown as T);
  }
  async set(key: string, value: string | number, opts?: { ex?: number }) {
    this.store.set(key, {
      v: value,
      expiresAt: opts?.ex ? Date.now() + opts.ex * 1000 : undefined,
    });
    return "OK";
  }
  async incr(key: string) {
    const cur = Number((this.live(key)?.v as number) ?? 0) + 1;
    const prev = this.store.get(key);
    this.store.set(key, { v: cur, expiresAt: prev?.expiresAt });
    return cur;
  }
  async incrbyfloat(key: string, n: number) {
    const cur = Number((this.live(key)?.v as number) ?? 0) + n;
    const prev = this.store.get(key);
    this.store.set(key, { v: cur, expiresAt: prev?.expiresAt });
    return cur;
  }
  async expire(key: string, seconds: number) {
    const e = this.store.get(key);
    if (e) e.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }
}

function resolveCreds(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (url && token) return { url, token };
  return null;
}

export function isKvConfigured(): boolean {
  return resolveCreds() !== null;
}

let injected: KvLike | null = null;
let singleton: KvLike | null = null;

/** Test seam (harness §4.4): inject an in-memory KV in integration tests. */
export function __setKvForTests(impl: KvLike | null): void {
  injected = impl;
  singleton = null;
}

export function getKv(): KvLike {
  if (injected) return injected;
  if (singleton) return singleton;
  const creds = resolveCreds();
  singleton = creds ? new Redis({ url: creds.url, token: creds.token }) : new MemoryKv();
  return singleton;
}
