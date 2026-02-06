"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/ui/components/session-context";

export default function OnboardingPage() {
  const [wallet, setWallet] = useState("");
  const [role, setRole] = useState<"SHIPPER" | "CARRIER">("SHIPPER");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");
  const [legalId, setLegalId] = useState("");
  const [loadIdStandard, setLoadIdStandard] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { setSession } = useSession();

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

    if (!companyName || !country || !legalId) {
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
          legal_id: legalId,
          load_id_standard: role === "SHIPPER" ? loadIdStandard || null : null,
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
            TRX
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

            {/* Country */}
            <div>
              <label
                htmlFor="country"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Country
              </label>
              <input
                id="country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="US"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
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
                <input
                  id="loadIdStandard"
                  type="text"
                  value={loadIdStandard}
                  onChange={(e) => setLoadIdStandard(e.target.value)}
                  placeholder="e.g. ISO 17712"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
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
