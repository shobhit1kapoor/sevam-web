'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  HardHat, Wrench, Sparkles, Settings, Zap, ChefHat,
  Scissors,
  X, Star, Clock, LayoutGrid,
} from 'lucide-react';
import Navbar from '@/components/dashboardnavbar';
import type { ServiceCatalogApiResponse } from '@/types/service-catalog';

const CART_STORAGE_KEY = 'sevam_service_cart';
const CATALOG_CACHE_KEY = 'sevam_catalog_cache_v1';

interface SubService {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  rating: number;
  reviews: number;
  image: string;
  process?: string[];
  categoryName: string;
}

interface Category {
  id: string;
  slug: string;
  name: string;
  iconKey: string;
  color: string;
  bg: string;
  subcategories: SubService[];
}

interface CartItem extends SubService {
  quantity: number;
}

const ICON_MAP: Record<string, React.ElementType> = {
  HardHat,
  Wrench,
  Sparkles,
  Settings,
  Zap,
  ChefHat,
  Scissors,
};

const mapCatalogToCategories = (data: ServiceCatalogApiResponse): Category[] =>
  (data.categories ?? []).map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    iconKey: category.iconKey,
    color: category.color,
    bg: category.bg,
    subcategories: category.services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price,
      duration: service.duration,
      rating: service.rating,
      reviews: service.reviews,
      image: service.image,
      process: service.process,
      categoryName: category.name,
    })),
  }));

export default function ServicesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [popup, setPopup] = useState<{ service: SubService; categoryName: string } | null>(null);

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
    window.dispatchEvent(new Event('sevam-cart-updated'));
  }, [cart]);

  useEffect(() => {
    let isMounted = true;

    try {
      const raw = localStorage.getItem(CATALOG_CACHE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as ServiceCatalogApiResponse;
        const cachedCategories = mapCatalogToCategories(data);
        if (cachedCategories.length > 0) {
          setCategories(cachedCategories);
          setCatalogLoading(false);
        }
      }
    } catch {
      localStorage.removeItem(CATALOG_CACHE_KEY);
    }

    const loadCatalog = async () => {
      try {
        const response = await fetch('/api/services/catalog', { cache: 'force-cache' });
        if (!response.ok) {
          throw new Error('Catalog request failed');
        }

        const data = (await response.json()) as ServiceCatalogApiResponse;
        if (!isMounted) return;
        localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(data));

        const mappedCategories = mapCatalogToCategories(data);

        setCategories(mappedCategories);
        setCatalogError(null);
      } catch {
        if (!isMounted) return;
        setCategories([]);
        setCatalogError('Unable to load services right now');
      } finally {
        if (isMounted) {
          setCatalogLoading(false);
        }
      }
    };

    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  const sidebarItems = useMemo(
    () => [
      { id: 'all', name: 'All', iconKey: 'LayoutGrid', color: '#64748B', bg: '#F8FAFC' },
      ...categories.map((category) => ({
        id: category.slug,
        name: category.name,
        iconKey: category.iconKey,
        color: category.color,
        bg: category.bg,
      })),
    ],
    [categories]
  );

  const allServices = useMemo(
    () => categories.flatMap((category) => category.subcategories),
    [categories]
  );

  const currentCategory = useMemo(
    () => categories.find((category) => category.slug === selectedCategory),
    [categories, selectedCategory]
  );

  const currentServices = selectedCategory === 'all'
    ? allServices
    : (currentCategory?.subcategories ?? []);

  const addToCart = (service: SubService) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === service.id);
      if (existing) {
        return prev.map((item) =>
          item.id === service.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...service, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const isInCart = (id: string) =>
    cart.some((item) => item.id === id);

  const cartQty = (id: string) =>
    cart.find((item) => item.id === id)?.quantity ?? 0;

  const openServicePopup = (service: SubService) => {
    setPopup({ service, categoryName: service.categoryName });
  };

  const handlePopupAdd = (service: SubService) => {
    addToCart(service);
    setPopup(null);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', position: 'relative' }}>
      <Navbar />
      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '0 32px', display: 'flex' }}>
        {popup && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={() => setPopup(null)}
          >
            <div
              style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 530, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.28)', position: 'relative' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPopup(null)}
                style={{ position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: '50%', background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
              >
                <X style={{ width: 18, height: 18, color: '#111827' }} />
              </button>

              <div style={{ position: 'relative', height: 260, overflow: 'hidden', borderRadius: '16px 16px 0 0' }}>
                <img src={popup.service.image} alt={popup.service.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.2) 0%, transparent 50%)' }} />
                <span style={{ position: 'absolute', bottom: 12, left: 14, background: 'rgba(0,0,0,0.58)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 8 }}>
                  {popup.categoryName}
                </span>
                <div style={{ position: 'absolute', bottom: 20, left: 16, right: 16, height: 4, background: 'rgba(255,255,255,0.95)', borderRadius: 999 }} />
              </div>

              <div style={{ padding: '16px 14px 14px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', lineHeight: 1.2, marginBottom: 6 }}>{popup.service.name}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Star style={{ width: 13, height: 13, color: '#4B5563', fill: '#4B5563' }} />
                      <span style={{ fontSize: 14, color: '#374151', fontWeight: 600 }}>{popup.service.rating.toFixed(2)}</span>
                      <span style={{ fontSize: 14, color: '#9CA3AF' }}>({popup.service.reviews} reviews)</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 32, fontWeight: 800, color: '#111827' }}>₹{popup.service.price}</span>
                      <span style={{ fontSize: 18, color: '#9CA3AF', textDecoration: 'line-through' }}>₹{Math.round(popup.service.price * 1.3)}</span>
                      <span style={{ fontSize: 18, color: '#6B7280' }}>•</span>
                      <span style={{ fontSize: 18, color: '#6B7280' }}>{popup.service.duration}</span>
                    </div>

                    <div style={{ fontSize: 16, color: '#0E8A4B', fontWeight: 600 }}>🏷 ₹{Math.round(popup.service.price / 2)} per bathroom</div>
                  </div>

                  <button
                    onClick={() => handlePopupAdd(popup.service)}
                    style={{ minWidth: 82, height: 34, padding: '0 18px', borderRadius: 10, border: '1px solid #D1D5DB', background: '#fff', color: '#6D5EFC', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Add
                  </button>
                </div>
              </div>

              <div style={{ background: '#F3F4F6', padding: '16px 16px 18px 16px', borderTop: '1px solid #E5E7EB' }}>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 12 }}>See the difference yourself</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[0, 1].map((index) => (
                    <div key={index} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                      <div style={{ position: 'relative', height: 120 }}>
                        <img src={popup.service.image} alt={`${popup.service.name} before after`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 8, overflow: 'hidden', backdropFilter: 'blur(2px)' }}>
                          <span style={{ padding: '4px 10px', fontSize: 12, color: '#fff', background: 'rgba(0,0,0,0.3)' }}>Before</span>
                          <span style={{ padding: '4px 10px', fontSize: 12, color: '#fff', background: 'rgba(255,255,255,0.2)' }}>After</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {popup.service.process && popup.service.process.length > 0 && (
                  <ul style={{ marginTop: 14, paddingLeft: 18, color: '#4B5563', fontSize: 13, lineHeight: 1.6 }}>
                    {popup.service.process.slice(0, 3).map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <aside style={{ width: 196, background: '#ffffff', border: '1px solid #D1D5DB', borderRadius: 24, position: 'sticky', top: 102, maxHeight: 'calc(100vh - 118px)', overflow: 'auto', flexShrink: 0, alignSelf: 'flex-start' }}>
          <div style={{ padding: '16px 10px', overflow: 'hidden' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 10, paddingLeft: 8 }}>
              Categories
            </p>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {sidebarItems.map((item) => {
                const Icon = item.iconKey === 'LayoutGrid' ? LayoutGrid : (ICON_MAP[item.iconKey] ?? LayoutGrid);
                const active = selectedCategory === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedCategory(item.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', background: active ? '#FFF7ED' : 'transparent', transition: 'all 0.15s', width: '100%', textAlign: 'left' as const }}
                    onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
                    onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: active ? item.color : '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon style={{ width: 14, height: 14, color: active ? '#fff' : '#1A3C6E' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: active ? 700 : 400, color: active ? '#F97316' : '#475569' }}>
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <main style={{ flex: 1, overflow: 'auto', padding: '28px 32px', background: '#ffffff', borderRadius: 32, minHeight: '78vh' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1A3C6E', marginBottom: 3 }}>
              {selectedCategory === 'all' ? 'All Services' : `${currentCategory?.name ?? 'All'} Services`}
            </h1>
            <p style={{ fontSize: 13, color: '#94A3B8' }}>{currentServices.length} services available</p>
          </div>

          {catalogLoading ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748B', fontSize: 14 }}>Loading services...</div>
          ) : catalogError ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1A3C6E', marginBottom: 4 }}>{catalogError}</p>
              <p style={{ fontSize: 13, color: '#94A3B8' }}>Please refresh and try again</p>
            </div>
          ) : currentServices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1A3C6E', marginBottom: 4 }}>No services found</p>
              <p style={{ fontSize: 13, color: '#94A3B8' }}>Try a different search or category</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 22 }}>
              {currentServices.map((service) => (
                <div
                  key={service.id}
                  style={{ cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', width: '100%' }}
                  onClick={() => openServicePopup(service)}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                >
                  <div style={{ position: 'relative', aspectRatio: '4 / 3', overflow: 'visible' }}>
                    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#F1F5F9', borderRadius: 18 }}>
                      <img src={service.image} alt={service.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.2) 0%, transparent 55%)' }} />
                      {service.duration && (
                        <span style={{ position: 'absolute', bottom: 8, left: 10, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10, padding: '3px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock style={{ width: 10, height: 10 }} />{service.duration}
                        </span>
                      )}
                    </div>

                    {isInCart(service.id) ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          left: '50%',
                          bottom: -18,
                          transform: 'translateX(-50%)',
                          minWidth: 100,
                          height: 36,
                          padding: '0 14px',
                          borderRadius: 10,
                          border: '2px solid #93C5FD',
                          background: '#fff',
                          color: '#2563EB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          zIndex: 2,
                          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                          fontSize: 14,
                          fontWeight: 700,
                          gap: 12,
                        }}
                      >
                        <button
                          onClick={() => updateQty(service.id, -1)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#2563EB',
                            cursor: 'pointer',
                            fontSize: 22,
                            lineHeight: 1,
                            padding: 0,
                          }}
                        >
                          −
                        </button>
                        <span style={{ minWidth: 12, textAlign: 'center' as const }}>{cartQty(service.id)}</span>
                        <button
                          onClick={() => updateQty(service.id, 1)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#2563EB',
                            cursor: 'pointer',
                            fontSize: 22,
                            lineHeight: 1,
                            padding: 0,
                          }}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); openServicePopup(service); }}
                        style={{
                          position: 'absolute',
                          left: '50%',
                          bottom: -18,
                          transform: 'translateX(-50%)',
                          minWidth: 100,
                          height: 36,
                          padding: '0 16px',
                          borderRadius: 10,
                          border: '2px solid #93C5FD',
                          background: '#fff',
                          color: '#2563EB',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 2,
                          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        Add
                      </button>
                    )}
                  </div>

                  <div style={{ padding: '30px 6px 0 6px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1A3C6E', marginBottom: 3, lineHeight: 1.3 }}>{service.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                      <span style={{ fontSize: 17, fontWeight: 800, color: '#F97316' }}>₹{service.price}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
