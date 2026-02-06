"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/ui/components/session-context";

export default function LoginPage() {
  const [wallet, setWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { setSession } = useSession();

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!wallet.trim()) {
      setError("Enter a wallet address");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: wallet.trim() }),
      });
      const data = await res.json();

      if (data.registered) {
        setSession({
          wallet_address: wallet.trim(),
          did: data.did,
          role: data.role,
        });
        router.push(data.redirect);
      } else {
        // Store wallet temporarily for onboarding
        sessionStorage.setItem("trx_onboard_wallet", wallet.trim());
        router.push(data.redirect);
      }
    } catch {
      setError("Connection failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            TRX
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Anti-Phantom Load System on IOTA
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Connect Wallet
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter your wallet address to sign in or register.
          </p>

          <form onSubmit={handleConnect}>
            <div className="mb-4">
              <label
                htmlFor="wallet"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Wallet Address
              </label>
              <input
                id="wallet"
                type="text"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "Connecting..." : "Connect"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Verified on IOTA Tangle &middot; Tamper-proof load tokens
        </p>
      </div>
    </div>
  );
}
