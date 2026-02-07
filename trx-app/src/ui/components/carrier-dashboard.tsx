"use client";

import { useState, useEffect, useCallback } from "react";
import { StatusBadge, VerifiedBadge } from "./status-badge";
import ProofModal from "./proof-modal";

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

export default function CarrierDashboard({ did }: { did: string }) {
  const [pending, setPending] = useState<OrderRow[]>([]);
  const [myBooked, setMyBooked] = useState<OrderRow[]>([]);
  const [myDone, setMyDone] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders", {
        headers: { "x-actor-did": did },
      });
      const data = await res.json();
      setPending(data.pending || []);
      setMyBooked(data.my_booked || []);
      setMyDone(data.my_done || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [did]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function handleBook(orderId: string) {
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-actor-did": did,
        },
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to book load");
        return;
      }
      await fetchOrders();
    } catch {
      alert("Failed to book load");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDone(orderId: string) {
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/done`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-actor-did": did,
        },
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to mark as done");
        return;
      }
      await fetchOrders();
    } catch {
      alert("Failed to mark as done");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Available Loads */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Available Loads
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Pending loads available for booking. Only verified loads can be booked.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {pending.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No pending loads available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Load ID</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Shipper</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Lane</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Weight</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Verified</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pending.map((order) => {
                    const isLocked =
                      order.carrier_did !== null && order.carrier_did !== did;
                    const canBook = order.verified && !isLocked;

                    return (
                      <tr
                        key={order.order_id}
                        className={`hover:bg-gray-50/50 ${isLocked ? "opacity-50" : ""}`}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-gray-800">
                          {order.order_id}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                          {order.issuer_did.slice(0, 20)}...
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {order.payload_offledger.from} →{" "}
                          {order.payload_offledger.to}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {order.payload_offledger.pickup_date}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {order.payload_offledger.weight.toLocaleString()} lbs
                        </td>
                        <td className="px-4 py-3">
                          <VerifiedBadge verified={order.verified} />
                        </td>
                        <td className="px-4 py-3">
                          {isLocked ? (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Locked
                            </span>
                          ) : (
                            <div className="relative group">
                              <button
                                onClick={() => handleBook(order.order_id)}
                                disabled={!canBook || actionLoading === order.order_id}
                                className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              >
                                {actionLoading === order.order_id
                                  ? "Booking..."
                                  : "Book"}
                              </button>
                              {!order.verified && (
                                <div className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                  Not verified on network
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* My Booked Loads */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            My Booked Loads
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Loads you have booked. Mark as done when delivery is complete.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {myBooked.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              You haven&apos;t booked any loads yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Load ID</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Shipper</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Lane</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Verified</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Proof</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {myBooked.map((order) => {
                    const canDone =
                      order.verified &&
                      order.carrier_did === did &&
                      order.verified_state === "BOOKED";

                    return (
                      <tr key={order.order_id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-800">
                          {order.order_id}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                          {order.issuer_did.slice(0, 20)}...
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {order.payload_offledger.from} →{" "}
                          {order.payload_offledger.to}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {order.payload_offledger.pickup_date}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge state={order.verified_state} />
                        </td>
                        <td className="px-4 py-3">
                          <VerifiedBadge verified={order.verified} />
                        </td>
                        <td className="px-4 py-3">
                          <ProofModal proof={order.verified_proof} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative group">
                            <button
                              onClick={() => handleDone(order.order_id)}
                              disabled={!canDone || actionLoading === order.order_id}
                              className="bg-emerald-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {actionLoading === order.order_id
                                ? "Updating..."
                                : "Mark as Done"}
                            </button>
                            {!order.verified && (
                              <div className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Not verified on network
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {/* Completed Loads */}
      {myDone.length > 0 && (
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Completed Loads
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Loads you have delivered successfully.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Load ID</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Shipper</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Lane</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Verified</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {myDone.map((order) => (
                    <tr key={order.order_id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-800">
                        {order.order_id}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                        {order.issuer_did.slice(0, 20)}...
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {order.payload_offledger.from} →{" "}
                        {order.payload_offledger.to}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {order.payload_offledger.pickup_date}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge state={order.verified_state} />
                      </td>
                      <td className="px-4 py-3">
                        <VerifiedBadge verified={order.verified} />
                      </td>
                      <td className="px-4 py-3">
                        <ProofModal proof={order.verified_proof} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
