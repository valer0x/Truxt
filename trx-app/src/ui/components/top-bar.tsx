"use client";

import { useSession } from "./session-context";
import { useRouter } from "next/navigation";

export default function TopBar() {
  const { session, clearSession } = useSession();
  const router = useRouter();

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold tracking-tight text-gray-900">
            TRX
          </span>
          <span className="text-xs text-gray-400 font-medium tracking-wide uppercase">
            Anti-Phantom Load
          </span>
        </div>

        {session && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">
                {session.company_name || session.wallet_address}
              </p>
              <p className="text-xs text-gray-400">
                {session.role} &middot;{" "}
                <span className="font-mono">{session.did.slice(0, 20)}...</span>
              </p>
            </div>
            <button
              onClick={() => {
                clearSession();
                router.push("/login");
              }}
              className="text-sm text-gray-500 hover:text-gray-800 border border-gray-300 rounded-md px-3 py-1 transition-colors cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
