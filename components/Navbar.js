"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearTrips, isLoggedIn } from "@/lib/storage";

export default function Navbar() {
  const router = useRouter();
  const loggedIn = isLoggedIn();

  const handleNewTrip = () => {
    router.push("/onboarding");
  };

  const handleLoginClick = () => {
    router.push("/login");
  };

  const handleLogoutClick = () => {
    clearTrips();
    router.push("/");
  };

  const handleProfileClick = () => {
    router.push("/profile");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link href="/home" className="flex items-center gap-2.5">
            <span className="text-xl">🌍</span>
            <span className="text-base font-bold tracking-tight text-white">
              ExploreTime
            </span>
          </Link>
          <Link
            href="/home"
            className="text-sm font-medium text-white/80 hover:text-white transition-colors"
          >
            Home
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleNewTrip}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:text-white hover:bg-white/10 transition-all"
          >
            <span className="text-base leading-none">+</span>
            New Trip
          </button>

          {!loggedIn && (
            <button
              onClick={handleLoginClick}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:text-white hover:bg-white/10 transition-all"
            >
              Login
            </button>
          )}

          {loggedIn && (
            <>
              <button
                onClick={handleProfileClick}
                className="text-sm font-medium text-white/80 hover:text-white transition-colors px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10"
              >
                Profile
              </button>
              <button
                onClick={handleLogoutClick}
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:text-white hover:bg-white/10 transition-all"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
