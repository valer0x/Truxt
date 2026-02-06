"use client";

import { useState, useMemo } from "react";
import Combobox from "./combobox";
import { COUNTRIES, getCitiesForCountry } from "@/lib/country-city-data";

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
  loadIdStandard,
}: CreateLoadModalProps) {
  const [fromCountry, setFromCountry] = useState("");
  const [fromCity, setFromCity] = useState("");
  const [toCountry, setToCountry] = useState("");
  const [toCity, setToCity] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupWindow, setPickupWindow] = useState("");
  const [weight, setWeight] = useState("");
  const [reference, setReference] = useState("");
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Parse custom field names from load_id_standard
  const customFieldNames = useMemo(() => {
    if (!loadIdStandard) return [];
    try {
      const parsed = JSON.parse(loadIdStandard);
      if (parsed._type === "custom" && Array.isArray(parsed.fields)) {
        return parsed.fields as string[];
      }
    } catch {
      // not a custom standard
    }
    return [];
  }, [loadIdStandard]);

  const countryNames = useMemo(() => COUNTRIES.map((c) => c.name), []);
  const fromCityOptions = useMemo(() => getCitiesForCountry(fromCountry), [fromCountry]);
  const toCityOptions = useMemo(() => getCitiesForCountry(toCountry), [toCountry]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!fromCity || !fromCountry || !toCity || !toCountry || !pickupDate || !weight) {
      setError("Origin, Destination, Date, and Weight are required");
      return;
    }

    const from = `${fromCity}, ${fromCountry}`;
    const to = `${toCity}, ${toCountry}`;

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        from,
        to,
        pickup_date: pickupDate,
        pickup_window: pickupWindow,
        weight: Number(weight),
        reference,
      };

      // Include custom standard values if any
      if (customFieldNames.length > 0) {
        const filled: Record<string, string> = {};
        for (const name of customFieldNames) {
          if (customValues[name]?.trim()) {
            filled[name] = customValues[name].trim();
          }
        }
        if (Object.keys(filled).length > 0) {
          body.custom_standard = filled;
        }
      }

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
      setFromCountry("");
      setFromCity("");
      setToCountry("");
      setToCity("");
      setPickupDate("");
      setPickupWindow("");
      setWeight("");
      setReference("");
      setCustomValues({});
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
          {/* Origin */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Origin</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Country</label>
                <Combobox
                  value={fromCountry}
                  onChange={(val) => { setFromCountry(val); setFromCity(""); }}
                  options={countryNames}
                  placeholder="Select country..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">City</label>
                <Combobox
                  value={fromCity}
                  onChange={setFromCity}
                  options={fromCityOptions}
                  placeholder="Select city..."
                />
              </div>
            </div>
          </div>

          {/* Destination */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Destination</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Country</label>
                <Combobox
                  value={toCountry}
                  onChange={(val) => { setToCountry(val); setToCity(""); }}
                  options={countryNames}
                  placeholder="Select country..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">City</label>
                <Combobox
                  value={toCity}
                  onChange={setToCity}
                  options={toCityOptions}
                  placeholder="Select city..."
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Date
              </label>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Window
              </label>
              <input
                type="text"
                value={pickupWindow}
                onChange={(e) => setPickupWindow(e.target.value)}
                placeholder="8:00 AM - 12:00 PM"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (lbs)
              </label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="42000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="PO-12345"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Custom standard fields */}
          {customFieldNames.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Custom Standard Fields
              </p>
              <div className="space-y-3">
                {customFieldNames.map((fieldName) => (
                  <div key={fieldName}>
                    <label className="block text-sm text-gray-600 mb-1">
                      {fieldName}
                    </label>
                    <input
                      type="text"
                      value={customValues[fieldName] ?? ""}
                      onChange={(e) =>
                        setCustomValues((prev) => ({
                          ...prev,
                          [fieldName]: e.target.value,
                        }))
                      }
                      placeholder={`Enter ${fieldName}...`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

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
