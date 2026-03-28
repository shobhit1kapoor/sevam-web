"use client";

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, ShoppingCart, ChevronDown, X } from 'lucide-react';
import { supabase } from '@/lib/db/supabase';

type LocationResult = {
  name: string;
  lat: number;
  lng: number;
};

const LOCATION_STORAGE_KEY = "sevam_selected_location";
const PROFILE_STORAGE_KEY = "sevam_profile";
const CART_STORAGE_KEY = 'sevam_service_cart';

type CartStorageItem = {
  price: number;
  quantity: number;
};

type NavbarUser = {
  name: string;
  email: string;
  phone: string;
};

function cleanPhone(phone?: string) {
  const value = (phone ?? "").trim();
  return value.startsWith("oauth_") ? "" : value;
}

async function syncProfileToBackend(profile: NavbarUser, accessToken?: string) {
  if (!accessToken) return profile;

  try {
    const response = await fetch("/api/auth/sync-profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(profile),
    });

    if (!response.ok) return profile;
    const data = (await response.json()) as { profile?: NavbarUser };
    return data.profile ?? profile;
  } catch {
    return profile;
  }
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authUser, setAuthUser] = useState<NavbarUser | null>(null);
  const [navSearch, setNavSearch] = useState('');
  const [cartSummary, setCartSummary] = useState({ itemCount: 0, total: 0 });
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const refreshCartSummary = () => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) {
        setCartSummary({ itemCount: 0, total: 0 });
        return;
      }

      const parsed = JSON.parse(raw) as CartStorageItem[];
      if (!Array.isArray(parsed)) {
        setCartSummary({ itemCount: 0, total: 0 });
        return;
      }

      const itemCount = parsed.reduce((sum, item) => sum + (Number.isFinite(item?.quantity) ? item.quantity : 0), 0);
      const subtotal = parsed.reduce(
        (sum, item) => sum + ((Number.isFinite(item?.price) ? item.price : 0) * (Number.isFinite(item?.quantity) ? item.quantity : 0)),
        0
      );
      const total = subtotal + (itemCount > 0 ? 50 : 0);
      setCartSummary({ itemCount, total });
    } catch {
      setCartSummary({ itemCount: 0, total: 0 });
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as LocationResult;
      if (parsed?.name && Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) {
        setSelectedLocation(parsed);
      }
    } catch {
      localStorage.removeItem(LOCATION_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!accountMenuRef.current) return;
      if (!accountMenuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    refreshCartSummary();

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== CART_STORAGE_KEY) return;
      refreshCartSummary();
    };

    const handleCartUpdated = () => {
      refreshCartSummary();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('sevam-cart-updated', handleCartUpdated);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sevam-cart-updated', handleCartUpdated);
    };
  }, []);

  useEffect(() => {
    if (pathname !== '/customer/search') {
      setNavSearch('');
      return;
    }

    const query = searchParams.get('q') ?? '';
    setNavSearch(query);
  }, [pathname, searchParams]);

  useEffect(() => {
    let mounted = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!mounted) return;

      if (!user) {
        setAuthUser(null);
        return;
      }

      const fallbackProfile: NavbarUser = {
        name: (user.user_metadata?.full_name as string | undefined) ?? "Customer",
        email: user.email ?? "",
        phone: cleanPhone(user.phone ?? ""),
      };
      const syncedProfile = await syncProfileToBackend(fallbackProfile, data.session?.access_token);
      setAuthUser(syncedProfile);
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(syncedProfile));
    };

    syncSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (!user) {
        setAuthUser(null);
        return;
      }

      const fallbackProfile: NavbarUser = {
        name: (user.user_metadata?.full_name as string | undefined) ?? "Customer",
        email: user.email ?? "",
        phone: cleanPhone(user.phone ?? ""),
      };
      void (async () => {
        const syncedProfile = await syncProfileToBackend(fallbackProfile, session?.access_token);
        setAuthUser(syncedProfile);
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(syncedProfile));
      })();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isLocationModalOpen) return;

    const query = searchQuery.trim();
    if (query.length < 3) {
      setSearchResults([]);
      setLocationError(null);
      return;
    }

    let isCancelled = false;
    const timeout = setTimeout(async () => {
      try {
        setIsSearching(true);
        setLocationError(null);

        const response = await fetch(`/api/location/search?q=${encodeURIComponent(query)}`);
        const data = (await response.json()) as LocationResult[] | { error?: string };

        if (isCancelled) return;

        if (!response.ok || !Array.isArray(data)) {
          setSearchResults([]);
          setLocationError("Could not fetch locations. Please try again.");
          return;
        }

        setSearchResults(data);
      } catch {
        if (!isCancelled) {
          setSearchResults([]);
          setLocationError("Could not fetch locations. Please try again.");
        }
      } finally {
        if (!isCancelled) setIsSearching(false);
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [isLocationModalOpen, searchQuery]);

  const persistSelectedLocation = (place: LocationResult) => {
    setSelectedLocation(place);
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(place));
  };

  const handleSelectLocation = (place: LocationResult) => {
    persistSelectedLocation(place);
    setSearchQuery("");
    setSearchResults([]);
    setLocationError(null);
    setIsLocationModalOpen(false);
  };

  const handleDetectLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported on this device.");
      return;
    }

    setIsDetecting(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          const response = await fetch(`/api/location/reverse?lat=${lat}&lng=${lng}`);
          const data = (await response.json()) as LocationResult | { error?: string };

          if (!response.ok || !("name" in data)) {
            setLocationError("Could not detect location. Please try search.");
            return;
          }

          persistSelectedLocation(data as LocationResult);
          setSearchQuery("");
          setSearchResults([]);
          setIsLocationModalOpen(false);
        } catch {
          setLocationError("Could not detect location. Please try search.");
        } finally {
          setIsDetecting(false);
        }
      },
      () => {
        setIsDetecting(false);
        setLocationError("Location permission denied. Please search manually.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const locationLine = selectedLocation?.name ?? "Shivam Market, 2nd Floor, 1 Ner...";

  const handleNavbarSearchChange = (value: string) => {
    setNavSearch(value);
    const query = value.trim();

    if (!query) {
      if (pathname === '/customer/search') {
        router.replace('/customer/search');
      }
      return;
    }

    const target = `/customer/search?q=${encodeURIComponent(query)}`;
    if (pathname === '/customer/search') {
      router.replace(target);
    } else {
      router.push(target);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    setAuthUser(null);
    setMenuOpen(false);
    router.push('/customer/login');
  };

  return (
    <>
      <nav
        className="sticky top-0 flex flex-wrap lg:flex-nowrap items-center gap-3 lg:gap-0 h-auto lg:h-[86px] px-3 py-3 lg:py-0 lg:px-12 bg-white border-b border-[#e5e7eb] w-full shadow-none z-40"
        style={{ borderBottomColor: '#e5e7eb' }}
      >
        {/* Left Section */}
        <div className="flex items-center h-full min-w-0 w-full lg:w-auto lg:flex-none">
          {/* Logo */}
          <div
            className="pr-3 lg:pr-8 border-r border-[#e5e7eb] h-full flex items-center shrink-0"
            style={{ borderRightColor: '#e5e7eb' }}
          >
            <div className="text-[26px] lg:text-[36px] font-black tracking-tighter" style={{ fontFamily: 'Arial, sans-serif' }}>
              <span className="text-[#E65100]">Se</span>
              <span className="text-[#007FFF]">VAM</span>
            </div>
          </div>
          
          {/* Location */}
          <div 
            className="pl-3 lg:pl-8 flex flex-col cursor-pointer group min-w-0"
            onClick={() => setIsLocationModalOpen(true)}
          >
            <div className="text-[15px] lg:text-[18px] font-extrabold text-black leading-tight group-hover:text-gray-700 transition-colors">
              Delivery in 24 minutes
            </div>
            <div className="flex items-center text-[12px] lg:text-[13px] text-gray-600 mt-0.5 group-hover:text-gray-500 transition-colors min-w-0">
              <span className="truncate max-w-[170px] sm:max-w-[220px]">{locationLine}</span>
              <ChevronDown className="w-4 h-4 ml-1 text-black group-hover:text-gray-700" />
            </div>
          </div>
        </div>

        {/* Middle Section - Search */}
        <div className="w-full lg:w-auto lg:flex-grow lg:max-w-[760px] lg:ml-12 lg:mr-8 min-w-0 order-3 lg:order-none">
          <div
            className="flex items-center bg-[#f8f8f8] rounded-xl px-4 py-3.5 border border-[#e5e7eb]"
            style={{ borderColor: '#e5e7eb' }}
          >
            <Search className="w-5 h-5 text-gray-500 mr-3" />
            <input 
              type="text" 
              placeholder='Search "paneer"' 
              value={navSearch}
              onChange={(e) => handleNavbarSearchChange(e.target.value)}
              className="bg-transparent outline-none w-full text-[14px] text-gray-800 placeholder-gray-500"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="hidden sm:flex items-center ml-auto space-x-4 lg:space-x-8 shrink-0 relative">
          {authUser ? (
            <div className="relative" ref={accountMenuRef}>
              <button
                onClick={() => setMenuOpen((current) => !current)}
                className="flex items-center gap-1 text-[16px] lg:text-[18px] text-gray-800 hover:text-gray-600 font-medium"
                aria-label="Open user menu"
              >
                Account
                <ChevronDown className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-[42px] w-[290px] bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                    <p className="text-[30px] leading-none mb-1">👋</p>
                    <p className="text-[28px] leading-none mb-1">Hi</p>
                    <p className="text-[26px] leading-none font-semibold text-gray-900">{authUser.name || 'Account'}</p>
                    <p className="text-[12px] text-gray-500 mt-2 truncate">{cleanPhone(authUser.phone) || authUser.email || 'No contact added'}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/customer/profile"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2.5 text-[15px] text-gray-700 hover:bg-gray-50"
                    >
                      My Profile
                    </Link>
                    <Link
                      href="/customer/bookings"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2.5 text-[15px] text-gray-700 hover:bg-gray-50"
                    >
                      My Orders
                    </Link>
                    <Link
                      href="/customer/profile"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2.5 text-[15px] text-gray-700 hover:bg-gray-50"
                    >
                      Saved Addresses
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-[15px] text-red-600 hover:bg-red-50"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/customer/login" className="text-[16px] lg:text-[18px] text-gray-800 hover:text-gray-600 font-normal">
              Login
            </Link>
          )}
          <button
            onClick={() => router.push('/customer/services')}
            className="flex items-center h-[56px] min-w-[122px] bg-[#007FFF] hover:bg-[#0066CC] transition-colors text-white pl-3 pr-2 rounded-lg font-bold"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            {cartSummary.itemCount > 0 ? (
              <div className="leading-none text-left">
                <p className="text-[13px] font-bold">{cartSummary.itemCount} items</p>
                <p className="text-[18px] font-extrabold tracking-tight">₹{Math.round(cartSummary.total)}</p>
              </div>
            ) : (
              <span className="text-[14px] font-bold">My Cart</span>
            )}
          </button>
        </div>
      </nav>

      {/* Location Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setIsLocationModalOpen(false)}>
          <div 
            className="absolute top-[86px] left-[5%] lg:left-[210px] bg-white rounded-xl w-[90%] max-w-[700px] p-4 lg:p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[20px] font-medium text-gray-800">Change Location</h2>
              <button 
                onClick={() => setIsLocationModalOpen(false)} 
                className="text-gray-500 hover:text-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-2">
              <button
                onClick={handleDetectLocation}
                disabled={isDetecting}
                className="bg-[#007FFF] hover:bg-[#0066CC] disabled:bg-[#93C5FD] transition-colors text-white px-5 py-3.5 rounded-lg font-medium text-[14px] whitespace-nowrap"
              >
                {isDetecting ? "Detecting..." : "Detect my location"}
              </button>
              
              <div className="hidden lg:flex items-center px-3">
                <div className="h-[1px] w-5 bg-gray-300"></div>
                <span className="text-[12px] text-gray-400 border border-gray-300 rounded-full w-9 h-9 flex items-center justify-center bg-white">OR</span>
                <div className="h-[1px] w-5 bg-gray-300"></div>
              </div>
              
              <div className="flex-grow">
                <input 
                  type="text" 
                  placeholder="search delivery location" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3.5 text-[14px] outline-none focus:border-gray-400 text-gray-700"
                />
              </div>
            </div>

            {locationError && (
              <p className="text-[13px] text-red-500 mt-3">{locationError}</p>
            )}

            {isSearching && (
              <p className="text-[13px] text-gray-500 mt-3">Searching locations...</p>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden max-h-[240px] overflow-y-auto">
                {searchResults.map((place, index) => (
                  <button
                    key={`${place.name}-${place.lat}-${place.lng}`}
                    onClick={() => handleSelectLocation(place)}
                    className={`w-full text-left px-4 py-3 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors ${index !== searchResults.length - 1 ? "border-b border-gray-100" : ""}`}
                  >
                    {place.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}