"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Clock } from "lucide-react";
import Navbar from "@/components/dashboardnavbar";
import type { CatalogService, ServiceCatalogApiResponse } from "@/types/service-catalog";

const CATALOG_CACHE_KEY = "sevam_catalog_cache_v1";
const CART_STORAGE_KEY = "sevam_service_cart";

type SearchService = {
  id: string;
  name: string;
  category: string;
  image: string;
  price: number;
  currentPrice: string;
  deliveryTime: string;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export default function CustomerSearchPage() {
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get("q") ?? "";
  const query = rawQuery.trim().toLowerCase();

  const [services, setServices] = useState<SearchService[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as CartItem[];
      if (!Array.isArray(parsed)) return;

      const safeCart = parsed.filter((item) =>
        Boolean(item?.id) &&
        Boolean(item?.name) &&
        Number.isFinite(item?.price) &&
        Number.isFinite(item?.quantity)
      );
      setCart(safeCart);
    } catch {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event("sevam-cart-updated"));
  }, [cart]);

  useEffect(() => {
    let isMounted = true;

    try {
      const raw = localStorage.getItem(CATALOG_CACHE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as ServiceCatalogApiResponse;
        const cachedServices: SearchService[] = (data.categories ?? []).flatMap((category) =>
          category.services.map((service: CatalogService) => ({
            id: service.id,
            name: service.name,
            category: category.name,
            image: service.image,
            price: Math.round(service.price),
            currentPrice: `₹${Math.round(service.price)}`,
            deliveryTime: service.deliveryTime ?? "30 MINS",
          }))
        );

        if (cachedServices.length > 0) {
          setServices(cachedServices);
          setLoading(false);
        }
      }
    } catch {
      localStorage.removeItem(CATALOG_CACHE_KEY);
    }

    const loadCatalog = async () => {
      try {
        const response = await fetch("/api/services/catalog", { cache: "force-cache" });
        if (!response.ok) {
          throw new Error("Catalog request failed");
        }

        const data = (await response.json()) as ServiceCatalogApiResponse;
        if (!isMounted) return;
        localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(data));

        const allServices: SearchService[] = (data.categories ?? []).flatMap((category) =>
          category.services.map((service: CatalogService) => ({
            id: service.id,
            name: service.name,
            category: category.name,
            image: service.image,
            price: Math.round(service.price),
            currentPrice: `₹${Math.round(service.price)}`,
            deliveryTime: service.deliveryTime ?? "30 MINS",
          }))
        );

        setServices(allServices);
      } catch {
        if (!isMounted) return;
        setServices([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  const matchedServices = useMemo(() => {
    if (!query) {
      return services;
    }

    return services.filter(
      (service) =>
        service.name.toLowerCase().includes(query) ||
        service.category.toLowerCase().includes(query)
    );
  }, [query, services]);

  const topSuggestions = useMemo(() => {
    if (!query) {
      return services.slice(0, 6);
    }

    return matchedServices.slice(0, 6);
  }, [query, matchedServices, services]);

  const isInCart = (id: string) => cart.some((item) => item.id === id);

  const cartQty = (id: string) => cart.find((item) => item.id === id)?.quantity ?? 0;

  const addToCart = (service: SearchService) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === service.id);
      if (existing) {
        return prev.map((item) =>
          item.id === service.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...prev,
        {
          id: service.id,
          name: service.name,
          price: service.price,
          quantity: 1,
        },
      ];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />

      <main className="max-w-[1180px] mx-auto px-4 py-5">
        <div className="space-y-1">
          {loading ? (
            <div className="text-sm text-gray-600 px-1 py-2">Loading services...</div>
          ) : topSuggestions.length > 0 ? (
            topSuggestions.map((service) => (
              <div key={service.id} className="flex items-center gap-3 py-2.5 px-1">
                <div className="relative w-8 h-8 rounded-md overflow-hidden border border-gray-200 bg-gray-100">
                  <Image src={service.image} alt={service.name} fill className="object-cover" sizes="32px" />
                </div>
                <span className="text-[17px] text-[#1f1f1f] font-medium">{service.name}</span>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-600 px-1 py-2">No services found</div>
          )}
        </div>

        <h2 className="mt-2 text-[30px] font-bold text-[#1f1f1f]">
          Showing results for "{rawQuery || "all"}"
        </h2>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[22px]">
          {matchedServices.map((service) => (
            <article
              key={service.id}
              className="w-full flex flex-col cursor-pointer transition-transform duration-200 hover:-translate-y-[2px]"
            >
              <div className="relative aspect-[4/3] overflow-visible">
                <div className="absolute inset-0 rounded-[18px] overflow-hidden bg-[#F1F5F9]">
                  <Image
                    src={service.image}
                    alt={service.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  <span className="absolute left-[10px] bottom-2 inline-flex items-center gap-[3px] bg-black/55 text-white text-[10px] px-[8px] py-[3px] rounded-[6px]">
                    <Clock className="w-[10px] h-[10px]" />
                    {service.deliveryTime.toLowerCase()}
                  </span>
                </div>

                {isInCart(service.id) ? (
                  <div className="absolute left-1/2 -bottom-[18px] -translate-x-1/2 h-[36px] min-w-[100px] px-[14px] rounded-[10px] border-2 border-[#93C5FD] bg-white text-[#2563EB] text-[14px] font-bold shadow-[0_2px_10px_rgba(0,0,0,0.08)] z-[2] inline-flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => updateQty(service.id, -1)}
                      className="border-none bg-transparent text-[#2563EB] cursor-pointer text-[22px] leading-none p-0"
                    >
                      −
                    </button>
                    <span className="min-w-[12px] text-center">{cartQty(service.id)}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(service.id, 1)}
                      className="border-none bg-transparent text-[#2563EB] cursor-pointer text-[22px] leading-none p-0"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => addToCart(service)}
                    className="absolute left-1/2 -bottom-[18px] -translate-x-1/2 h-[36px] min-w-[100px] px-4 rounded-[10px] border-2 border-[#93C5FD] bg-white text-[#2563EB] text-[14px] font-bold shadow-[0_2px_10px_rgba(0,0,0,0.08)] z-[2]"
                  >
                    Add
                  </button>
                )}
              </div>

              <div className="pt-[30px] px-[6px] flex flex-col">
                <h3 className="text-[14px] leading-[1.3] font-bold text-[#1A3C6E] min-h-[36px] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden mb-[3px]">
                  {service.name}
                </h3>
                <div className="mt-[6px] text-[17px] font-extrabold text-[#F97316] leading-none">{service.currentPrice}</div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
