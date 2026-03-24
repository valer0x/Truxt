import { describe, it, expect } from "vitest";
import { createOrderId, createTxId } from "@/lib/id";

describe("createOrderId", () => {
  it("matches pattern /^ORD-[A-F0-9]{8}$/", () => {
    const id = createOrderId();
    expect(id).toMatch(/^ORD-[A-F0-9]{8}$/);
  });

  it("generates different IDs on successive calls", () => {
    const id1 = createOrderId();
    const id2 = createOrderId();
    expect(id1).not.toBe(id2);
  });
});

describe("createTxId", () => {
  it('createTxId("load") matches pattern /^load_[a-f0-9]{12}$/', () => {
    const id = createTxId("load");
    expect(id).toMatch(/^load_[a-f0-9]{12}$/);
  });

  it('createTxId("mock_tx", 8) matches pattern /^mock_tx_[a-f0-9]{8}$/', () => {
    const id = createTxId("mock_tx", 8);
    expect(id).toMatch(/^mock_tx_[a-f0-9]{8}$/);
  });
});
