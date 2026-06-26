"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const done = localStorage.getItem("onboardingComplete");
    if (done === "true") {
      router.replace("/home");
    } else {
      router.replace("/onboarding");
    }
  }, [router]);

  return null;
}
