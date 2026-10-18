type MovementPayload = Record<string, string | number | null>;

/** Keeps one idempotency key for an identical movement payload across retries. */
export function createMovementIdempotencyKeyCache(createKey: () => string) {
  const keysByPayload = new Map<string, string>();

  return {
    get(payload: MovementPayload) {
      const serializedPayload = JSON.stringify(payload);
      const existingKey = keysByPayload.get(serializedPayload);
      if (existingKey) return existingKey;

      const key = createKey();
      keysByPayload.set(serializedPayload, key);
      return key;
    },
    reset() {
      keysByPayload.clear();
    },
  };
}
