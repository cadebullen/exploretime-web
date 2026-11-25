"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getActiveTrip, dayPath } from "@/lib/storage";

// Old day links (/home/day/2) go to the trip's own address (/trips/tokyo/day/2).
export default function OldDayRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const trip = getActiveTrip();
    router.replace(trip ? dayPath(trip, params.day) : "/onboarding");
  }, [params.day, router]);

  return null;
}
