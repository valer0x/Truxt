"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/ui/components/session-context";
import TopBar from "@/ui/components/top-bar";
import ShipperDashboard from "@/ui/components/shipper-dashboard";
import CarrierDashboard from "@/ui/components/carrier-dashboard";

export default function DashboardPage() {
  const { session, clearSession } = useSession();
  const router = useRouter();
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    if (!session) {
      router.push("/login");
      return;
    }

    // Validate session is still known by the server
    fetch("/api/orders", { headers: { "x-actor-did": session.did } })
      .then((res) => {
        if (res.status === 401) {
          clearSession();
          router.push("/login");
        } else {
          setValidated(true);
        }
      })
      .catch(() => setValidated(true));
  }, [session, router, clearSession]);

  if (!session || !validated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {session.role === "SHIPPER" ? (
          <ShipperDashboard did={session.did} loadIdStandard={session.load_id_standard ?? null} />
        ) : (
          <CarrierDashboard did={session.did} />
        )}
      </main>
    </div>
  );
}
