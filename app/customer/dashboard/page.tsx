
"use client"
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/dashboardnavbar';
import Footer from '@/components/Footer';
import type { ServiceCatalogApiResponse } from '@/types/service-catalog';

const MOBILE_SPANS = [
  'col-span-2',
  'col-span-2',
  'col-span-1',
  'col-span-2',
  'col-span-1',
  'col-span-1',
  'col-span-1',
  'col-span-1',
  'col-span-1',
];

const fallbackMobileCategories = [
  { name: "AC Repair", span: "col-span-2" },
  { name: "Home Cleaning", span: "col-span-2" },
  { name: "Salon", span: "col-span-1" },
  { name: "Electrician", span: "col-span-2" },
  { name: "Plumbing", span: "col-span-1" },
  { name: "Painting", span: "col-span-1" },
  { name: "Pest Control", span: "col-span-1" },
  { name: "Appliance Repair", span: "col-span-1" },
  { name: "Massage", span: "col-span-1" },
];

type Product = {
  name: string;
  currentPrice: string;
  originalPrice: string;
  image: string;
  deliveryTime: string;
};

function toProductCard(service: {
  name: string;
  price: number;
  originalPrice: number | null;
  image: string;
  deliveryTime: string | null;
}): Product {
  return {
    name: service.name,
    currentPrice: `₹${Math.round(service.price)}`,
    originalPrice: `₹${Math.round(service.originalPrice ?? service.price * 1.3)}`,
    image: service.image,
    deliveryTime: service.deliveryTime ?? "30 MINS",
  };
}

function ProductListingSection({ title, products }: { title: string; products: Product[] }) {
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[26px] font-extrabold tracking-tight text-gray-900">{title}</h3>
        <a href="#" className="text-[22px] font-bold text-[#2563eb] hover:text-[#1d4ed8] transition-colors">
          See All ›
        </a>
      </div>

      <div className="-mx-1 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-px-4">
        <div className="flex min-w-max gap-3 px-1 pb-2">
          {products.map((product, index) => (
            <article
              key={`${title}-${index}`}
              className="w-[170px] rounded-2xl bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
            >
              <div className="relative mb-3 rounded-xl bg-gray-50 p-2">
                <button
                  type="button"
                  aria-label="Add product"
                  className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-[#2563eb] bg-white text-2xl font-bold leading-none text-[#2563eb] shadow-sm"
                >
                  +
                </button>
                <div className="relative h-[120px] w-full overflow-hidden rounded-lg">
                  <Image src={product.image} alt={product.name} fill className="object-cover" />
                </div>
              </div>

              <p className="text-[12px] font-extrabold tracking-wide text-gray-500">{product.deliveryTime}</p>
              <h4 className="mt-1 text-[16px] font-semibold leading-5 text-gray-900 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                {product.name}
              </h4>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[28px] font-extrabold text-gray-900 leading-none">{product.currentPrice}</span>
                <span className="text-[22px] text-gray-400 line-through leading-none">{product.originalPrice}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [catalog, setCatalog] = useState<ServiceCatalogApiResponse | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCatalog = async () => {
      try {
        const response = await fetch('/api/services/catalog', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Catalog request failed');
        }

        const data = (await response.json()) as ServiceCatalogApiResponse;
        if (isMounted) {
          setCatalog(data);
        }
      } catch {
        if (isMounted) {
          setCatalog(null);
        }
      }
    };

    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const categoryList = catalog?.categories ?? [];
    return categoryList.slice(0, 10).map((category) => category.name.replace(/\s+/g, '\n'));
  }, [catalog]);

  const serviceImages = useMemo(() => {
    const categoryList = catalog?.categories ?? [];
    return categoryList
      .slice(0, 10)
      .map((category) => category.services[0]?.image)
      .filter((image): image is string => Boolean(image));
  }, [catalog]);

  const mobileCategories = useMemo(() => {
    const categoryList = catalog?.categories ?? [];
    if (categoryList.length === 0) {
      return fallbackMobileCategories;
    }

    return categoryList.slice(0, 9).map((category, index) => ({
      name: category.name,
      span: MOBILE_SPANS[index] ?? 'col-span-1',
    }));
  }, [catalog]);

  const allServices = useMemo(
    () => (catalog?.categories ?? []).flatMap((category) => category.services),
    [catalog]
  );

  const priceDropProducts = useMemo(
    () => allServices.slice(0, 7).map(toProductCard),
    [allServices]
  );

  const priceDropAlertProducts = useMemo(
    () => allServices.slice(7, 14).map(toProductCard),
    [allServices]
  );

  const renderServiceImages = serviceImages.length > 0
    ? serviceImages
    : ['/homepage/services/clean.jpg', '/homepage/services/electrician.jpg', '/homepage/services/makeup.jpg', '/homepage/services/massage.jpg'];

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-pt-sans-narrow)]">
      <Navbar />
      <main className="max-w-[1280px] mx-auto px-4 lg:px-12 py-4 md:py-8">
        {/* Desktop Content */}
        <div className="hidden lg:block">
          {/* Hero Banner */}
        <div className="w-full h-[260px] bg-[#227439] rounded-2xl p-10 flex items-center relative overflow-hidden mb-8">
          <div className="z-10 w-2/3">
            <h1 className="text-white text-[44px] font-extrabold leading-[1.1] mb-4 tracking-tight">
              India&#39;s #1 Home Services Platform
            </h1>
            <p className="text-white text-[22px] mb-8 font-medium">
              Your Home, Perfectly Serviced<br/>From expert repairs to luxury spa treatments —<br/>Book trusted professionals in 60 seconds.
            </p>
            <button className="bg-white text-black px-6 py-3 rounded-lg font-bold text-[16px] hover:bg-gray-100 transition-colors">
              Book Service Now
            </button>
          </div>
          {/* Image Placeholder */}
          <div className="absolute right-0 top-0 bottom-0 w-[45%] bg-[#2a8b44] rounded-l-full transform translate-x-16 flex items-center justify-center">
            {/* Decorative boxes representing the groceries */}
            <div className="w-24 h-24 bg-[#34a853] rounded-xl absolute -left-4 top-12 rotate-12"></div>
            <div className="w-32 h-32 bg-[#ea4335] rounded-full absolute left-16 bottom-8"></div>
            <div className="w-20 h-32 bg-[#fbbc04] rounded-lg absolute right-24 top-16 -rotate-12"></div>
          </div>
        </div>

        {/* Promo Banners */}
        <div className="grid grid-cols-4 gap-6 mb-10">
          {/* Promo 1 */}
          <div className="h-[210px] bg-[#00c6ba] rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="z-10">
              <h2 className="text-white text-[28px] font-extrabold leading-[1.1] mb-2 tracking-tight">Salon-Quality Beauty<br/>at Home</h2>
              
            </div>
            <button className="bg-white text-black px-5 py-2.5 rounded-lg font-bold w-max text-[14px] z-10 hover:bg-gray-100 transition-colors">Explore Services</button>
            {/* Image Placeholder */}
            <div className="absolute -right-4 -bottom-4 w-40 h-40 bg-[#00a89d] rounded-full flex items-center justify-center">
              <div className="w-16 h-24 bg-[#008f85] rounded-md rotate-12"></div>
            </div>
          </div>

          {/* Promo 2 */}
          <div className="h-[210px] bg-[#f8cb46] rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="z-10">
              <h2 className="text-gray-900 text-[28px] font-extrabold leading-[1.1] mb-2 tracking-tight">Expert Home<br/>Repairs</h2>
              <p className="text-gray-800 text-[15px] font-medium">Plumbing, electrical & cleaning services</p>
            </div>
            <button className="bg-[#333] text-white px-5 py-2.5 rounded-lg font-bold w-max text-[14px] z-10 hover:bg-black transition-colors">Explore Services</button>
            {/* Image Placeholder */}
            <div className="absolute -right-4 -bottom-4 w-40 h-40 bg-[#e5b833] rounded-full flex items-center justify-center">
               <div className="w-20 h-20 bg-[#cca329] rounded-full"></div>
            </div>
          </div>

          {/* Promo 3 */}
          <div className="h-[210px] bg-[#d5dce4] rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="z-10">
              <h2 className="text-gray-900 text-[28px] font-extrabold leading-[1.1] mb-2 tracking-tight">Spa &<br/>Wellness</h2>
              <p className="text-gray-800 text-[15px] font-medium">Massage therapy & relaxation at home</p>
            </div>
            <button className="bg-[#333] text-white px-5 py-2.5 rounded-lg font-bold w-max text-[14px] z-10 hover:bg-black transition-colors">Explore Services</button>
            {/* Image Placeholder */}
            <div className="absolute -right-4 -bottom-4 w-40 h-40 bg-[#c2c9d1] rounded-full flex items-center justify-center">
               <div className="w-24 h-16 bg-[#aeb6bf] rounded-xl -rotate-12"></div>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <h3 className="mb-4 text-[24px] font-extrabold tracking-tight text-gray-900">Services:</h3>
        <div className="grid grid-cols-10 gap-x-4 gap-y-8">
          {categories.map((cat, i) => (
            <div key={i} className="flex flex-col items-center cursor-pointer group">
              <div className="w-full aspect-square rounded-2xl bg-[#f3f6f8] mb-3 group-hover:shadow-md transition-all duration-200 overflow-hidden relative">
                <Image
                  src={renderServiceImages[i % renderServiceImages.length]}
                  alt={cat.replace('\n', ' ')}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
              <span className="text-[14px] font-semibold text-gray-800 text-center leading-[1.2] whitespace-pre-wrap">
                {cat}
              </span>
            </div>
          ))}
        </div>
        </div>

        {/* Mobile Content */}
        <div className="lg:hidden mt-2">
          <h2 className="text-[22px] font-extrabold text-gray-900 mb-4 tracking-tight">Browse by Category</h2>
          <div className="grid grid-cols-4 gap-3">
            {mobileCategories.map((cat, i) => (
              <div key={i} className={`flex flex-col items-center cursor-pointer ${cat.span}`}>
                <div className="w-full h-[100px] bg-[#eef6f4] rounded-2xl mb-2 flex items-center justify-center overflow-hidden">
                  <div className="w-1/2 h-1/2 bg-[#d8e8e4] rounded-lg"></div>
                </div>
                <span className="text-[13px] font-bold text-gray-800 text-center leading-[1.2] whitespace-pre-wrap">
                  {cat.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {priceDropProducts.length > 0 && (
          <ProductListingSection title="Most booked services" products={priceDropProducts} />
        )}
        {priceDropAlertProducts.length > 0 && (
          <ProductListingSection title="Price Drop Alert!" products={priceDropAlertProducts} />
        )}

        <section className="mt-12">
          <Image
            src="/homepage/refer.jpeg"
            alt="Refer banner"
            width={1600}
            height={700}
            className="w-full h-auto object-contain"
            priority={false}
          />
        </section>
      </main>
      <Footer />
    </div>
  );
}