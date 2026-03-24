function compactUuidPart(size: number): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, size).toUpperCase();
}

export function createOrderId(): string {
  return `ORD-${compactUuidPart(8)}`;
}

export function createTxId(prefix: string, size = 12): string {
  return `${prefix}_${compactUuidPart(size).toLowerCase()}`;
}
