"use client";

import { useState } from "react";

interface ProofModalProps {
  proof: {
    tx_id: string;
    block_id: string;
    timestamp: string;
    state: string;
    issuer_did: string;
    carrier_did: string | null;
    verified: boolean;
  };
}

export default function ProofModal({ proof }: ProofModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
      >
        View Proof
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Network Proof
              </h3>
              <button
                onClick={() => setOpen(false)}
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
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500">TX ID:</span>
                <p className="font-mono text-gray-800 break-all">{proof.tx_id}</p>
              </div>
              <div>
                <span className="text-gray-500">Block ID:</span>
                <p className="font-mono text-gray-800 break-all">{proof.block_id}</p>
              </div>
              <div>
                <span className="text-gray-500">Timestamp:</span>
                <p className="text-gray-800">{proof.timestamp}</p>
              </div>
              <div>
                <span className="text-gray-500">State:</span>
                <p className="text-gray-800 font-semibold">{proof.state}</p>
              </div>
              <div>
                <span className="text-gray-500">Issuer DID:</span>
                <p className="font-mono text-gray-800 text-xs break-all">
                  {proof.issuer_did}
                </p>
              </div>
              {proof.carrier_did && (
                <div>
                  <span className="text-gray-500">Carrier DID:</span>
                  <p className="font-mono text-gray-800 text-xs break-all">
                    {proof.carrier_did}
                  </p>
                </div>
              )}
              <div>
                <span className="text-gray-500">Verified:</span>
                <p className={proof.verified ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                  {proof.verified ? "Yes" : "No"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
