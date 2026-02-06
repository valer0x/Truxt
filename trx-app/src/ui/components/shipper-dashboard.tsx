"use client";

import { useState, useEffect, useCallback } from "react";
import { StatusBadge, VerifiedBadge } from "./status-badge";
import ProofModal from "./proof-modal";
import CreateLoadModal from "./create-load-modal";

interface OrderRow {
  order_id: string;
  issuer_did: string;
  carrier_did: string | null;
  state: string;
  payload_offledger: {
    from: string;
    to: string;
    pickup_date: string;
    pickup_window: string;
    weight: number;
    reference: string;
  };
  verified_state: string;
  verified: boolean;
  verified_proof: {
    tx_id: string;
    block_id: string;
    timestamp: string;
    state: string;
    issuer_did: string;
    carrier_did: string | null;
    verified: boolean;
  };
}

export default function ShipperDashboard({ did }: { did: string }) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders", {
        headers: { "x-actor-did": did },
      });
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [did]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">My Loads</h2>
          <p className="text-sm text-gray-500 mt-1">
            All loads you have published, verified against the network.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Load
        </button>
      </div>

      <CreateLoadModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchOrders}
        actorDid={did}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No loads published yet. Click &quot;Create Load&quot; to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Load ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Lane</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Weight</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Verified</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Carrier</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.order_id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-800">
                      {order.order_id}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {order.payload_offledger.from} → {order.payload_offledger.to}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {order.payload_offledger.pickup_date}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {order.payload_offledger.weight.toLocaleString()} lbs
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                      {order.payload_offledger.reference || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge state={order.verified_state} />
                    </td>
                    <td className="px-4 py-3">
                      <VerifiedBadge verified={order.verified} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                      {order.carrier_did
                        ? order.carrier_did.slice(0, 20) + "..."
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <ProofModal proof={order.verified_proof} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
