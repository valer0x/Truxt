"use client";

import { useState } from "react";

interface CreateLoadModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  actorDid: string;
  loadIdStandard: string | null;
}

export default function CreateLoadModal({
  open,
  onClose,
  onCreated,
  actorDid,
}: CreateLoadModalProps) {
  const [processType, setProcessType] = useState<string>("Tendering");
  const [shipmentId, setShipmentId] = useState("");
  const [serviceClass, setServiceClass] = useState<string>("FTL");
  const [cmrReference, setCmrReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        from: "-",
        to: "-",
        pickup_date: new Date().toISOString().slice(0, 10),
        pickup_window: "",
        weight: 0,
        reference: "",
        process_type: processType,
        load_type: serviceClass,
        shipment_id: shipmentId,
        service_class: serviceClass,
        cmr_reference: cmrReference,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-actor-did": actorDid,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create load");
        return;
      }

      // Reset form
      setProcessType("Tendering");
      setShipmentId("");
      setServiceClass("FTL");
      setCmrReference("");
      onCreated();
      onClose();
    } catch {
      setError("Failed to create load. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Publish New Load
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Process Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Process Type
            </label>
            <select
              value={processType}
              onChange={(e) => setProcessType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="Tendering">Tendering</option>
              <option value="Auction">Auction</option>
              <option value="Direct Book">Direct Book</option>
            </select>
          </div>

          {/* Road Freight Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shipment / Consignment ID
            </label>
            <input
              type="text"
              value={shipmentId}
              onChange={(e) => setShipmentId(e.target.value)}
              placeholder="e.g. SHP-2026-00123"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Service Class */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Class
            </label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="serviceClass"
                  value="FTL"
                  checked={serviceClass === "FTL"}
                  onChange={() => setServiceClass("FTL")}
                  className="text-indigo-600"
                />
                <span className="text-sm">FTL</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="serviceClass"
                  value="LTL"
                  checked={serviceClass === "LTL"}
                  onChange={() => setServiceClass("LTL")}
                  className="text-indigo-600"
                />
                <span className="text-sm">LTL</span>
              </label>
            </div>
          </div>

          {/* CMR Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CMR Reference <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={cmrReference}
              onChange={(e) => setCmrReference(e.target.value)}
              placeholder="e.g. CMR-IT-2026-001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "Publishing..." : "Publish Load"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
