"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/ui/components/session-context";
import Combobox from "@/ui/components/combobox";
import { COUNTRIES, getCitiesForCountry } from "@/lib/country-city-data";

export default function OnboardingPage() {
  const [wallet, setWallet] = useState("");
  const [role, setRole] = useState<"SHIPPER" | "CARRIER">("SHIPPER");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [legalId, setLegalId] = useState("");
  const [loadIdStandard, setLoadIdStandard] = useState("");
  const [customFieldNames, setCustomFieldNames] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { setSession } = useSession();

  const countryNames = useMemo(() => COUNTRIES.map((c) => c.name), []);
  const cityOptions = useMemo(() => getCitiesForCountry(country), [country]);

  useEffect(() => {
    const stored = sessionStorage.getItem("trx_onboard_wallet");
    if (stored) {
      setWallet(stored);
    } else {
      router.push("/login");
    }
  }, [router]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!companyName || !country || !city || !legalId) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: wallet,
          role,
          company_name: companyName,
          country,
          city,
          legal_id: legalId,
          load_id_standard:
            role === "SHIPPER"
              ? loadIdStandard === "Custom"
                ? JSON.stringify({
                    _type: "custom",
                    fields: customFieldNames.filter((n) => n.trim()),
                  }) || null
                : loadIdStandard || null
              : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      sessionStorage.removeItem("trx_onboard_wallet");
      setSession({
        wallet_address: data.wallet_address,
        did: data.did,
        role: data.role,
        company_name: data.company_name,
        city: data.city,
        country: data.country,
        load_id_standard: data.load_id_standard,
      });
      router.push("/dashboard");
    } catch {
      setError("Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Truxt
          </h1>
          <p className="mt-2 text-sm text-gray-500">Complete your registration</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Onboarding
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Wallet:{" "}
            <span className="font-mono text-gray-700">{wallet}</span>
          </p>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="SHIPPER"
                    checked={role === "SHIPPER"}
                    onChange={() => setRole("SHIPPER")}
                    className="text-indigo-600"
                  />
                  <span className="text-sm">Shipper / Broker</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="CARRIER"
                    checked={role === "CARRIER"}
                    onChange={() => setRole("CARRIER")}
                    className="text-indigo-600"
                  />
                  <span className="text-sm">Carrier</span>
                </label>
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label
                htmlFor="company"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Company Name
              </label>
              <input
                id="company"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Logistics LLC"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Country & City */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="country"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Country
                </label>
                <Combobox
                  id="country"
                  value={country}
                  onChange={(val) => {
                    setCountry(val);
                    setCity("");
                  }}
                  options={countryNames}
                  placeholder="Select or type country..."
                />
              </div>
              <div>
                <label
                  htmlFor="city"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  City
                </label>
                <Combobox
                  id="city"
                  value={city}
                  onChange={setCity}
                  options={cityOptions}
                  placeholder="Select or type city..."
                />
              </div>
            </div>

            {/* Legal ID */}
            <div>
              <label
                htmlFor="legalId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Legal ID (MC#, DOT#, or Tax ID)
              </label>
              <input
                id="legalId"
                type="text"
                value={legalId}
                onChange={(e) => setLegalId(e.target.value)}
                placeholder="MC-123456"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Load ID Standard (Shipper only) */}
            {role === "SHIPPER" && (
              <div>
                <label
                  htmlFor="loadIdStandard"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Load ID Standard{" "}
                  <span className="text-gray-400">(optional)</span>
                </label>
                <select
                  id="loadIdStandard"
                  value={loadIdStandard}
                  onChange={(e) => {
                    setLoadIdStandard(e.target.value);
                    if (e.target.value !== "Custom")
                      setCustomFieldNames([""]);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="">Select a standard...</option>
                  <option value="ISO 17712">ISO 17712 — Mechanical seals for freight containers</option>
                  <option value="ISO 6346">ISO 6346 — Container identification system</option>
                  <option value="NMFC">NMFC — National Motor Freight Classification</option>
                  <option value="Custom">Custom</option>
                </select>

                {loadIdStandard === "Custom" && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-gray-500">
                      Define the field names for your standard. Values will be filled when creating a load.
                    </p>
                    {customFieldNames.map((name, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => {
                            const updated = [...customFieldNames];
                            updated[idx] = e.target.value;
                            setCustomFieldNames(updated);
                          }}
                          placeholder={`Field ${idx + 1} name`}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        {customFieldNames.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setCustomFieldNames(customFieldNames.filter((_, i) => i !== idx))
                            }
                            className="px-2 py-2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Remove field"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setCustomFieldNames([...customFieldNames, ""])
                      }
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add field
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "Registering..." : "Register & Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
