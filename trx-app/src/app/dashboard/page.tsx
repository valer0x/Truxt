"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/ui/components/session-context";
import TopBar from "@/ui/components/top-bar";
import ShipperDashboard from "@/ui/components/shipper-dashboard";
import CarrierDashboard from "@/ui/components/carrier-dashboard";

export default function DashboardPage() {
  const { session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      router.push("/login");
    }
  }, [session, router]);

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {session.role === "SHIPPER" ? (
          <ShipperDashboard did={session.did} />
        ) : (
          <CarrierDashboard did={session.did} />
        )}
      </main>
    </div>
  );
}
