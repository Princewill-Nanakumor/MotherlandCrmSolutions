/**
 * @deprecated Per-lead Ably connections removed. All realtime uses
 * {@link getAblyRealtimeClient} on `crm:tenant:{adminId}`.
 * These stubs keep sign-out / teardown call sites compiling.
 */

/** @deprecated No-op — use getAblyRealtimeClient instead. */
export function getAblyLeadRealtimeClient(
  _userId: string,
  _leadId: string,
): never {
  throw new Error(
    "getAblyLeadRealtimeClient was removed — subscribe on the tenant channel via getAblyRealtimeClient",
  );
}

/** @deprecated No-op */
export function releaseAblyLeadRealtimeClient(_leadId: string): void {}

/** @deprecated No-op */
export function disconnectAblyLeadRealtimeClient(): void {}
