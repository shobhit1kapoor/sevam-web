'use client'

import { useState, useMemo } from "react"
import {
  Search, ShoppingCart, Zap, Droplets, Sparkles, ChefHat,
  Hammer, Bug, UtensilsCrossed, Paintbrush, HardHat, Wrench,
  LayoutGrid, Clock, Star, Plus, Check, Trash2, Minus, X,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = { id: string; label: string; icon: string }

type Service = {
  id: string
  name: string
  description: string
  category: string
  image: string
  duration: string
  durationUnit: string
  rating: number
  reviewCount: number
  price: number
  originalPrice?: number
  discount?: number
}

type CartItem = { id: string; name: string; price: number; qty: number }

// ─── Data ─────────────────────────────────────────────────────────────────────

const categories: Category[] = [
  { id: "all",          label: "All",             icon: "grid"      },
  { id: "electrical",   label: "Electrical",      icon: "zap"       },
  { id: "plumbing",     label: "Plumbing",        icon: "droplets"  },
  { id: "cleaning",     label: "Cleaning",        icon: "sparkles"  },
  { id: "cooking",      label: "Cooking",         icon: "chef-hat"  },
  { id: "carpentry",    label: "Carpentry",       icon: "hammer"    },
  { id: "pest-control", label: "Pest Control",    icon: "bug"       },
  { id: "dish-washing", label: "Dish Washing",    icon: "utensils"  },
  { id: "painting",     label: "Painting",        icon: "paintbrush"},
  { id: "labour",       label: "Labour",          icon: "hard-hat"  },
  { id: "appliance",    label: "Appliance Repair",icon: "wrench"    },
]

const services: Service[] = [
  { id: "s1",  name: "Wiring & Switchboard",    description: "Complete electrical wiring installation",  category: "electrical",   image: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&h=240&fit=crop", duration: "2",   durationUnit: "hrs",       rating: 4.8, reviewCount: 320, price: 299 },
  { id: "s2",  name: "Fan Installation",         description: "Ceiling fan installation & repair",        category: "electrical",   image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=240&fit=crop", duration: "1",   durationUnit: "hr",        rating: 4.7, reviewCount: 210, price: 199,  originalPrice: 399,  discount: 50 },
  { id: "s3",  name: "AC Installation & Repair", description: "Complete AC servicing",                    category: "electrical",   image: "https://images.unsplash.com/photo-1631744007979-3aa9e7b48c81?w=400&h=240&fit=crop", duration: "1.5", durationUnit: "hrs",       rating: 4.9, reviewCount: 540, price: 449,  originalPrice: 899,  discount: 50 },
  { id: "s4",  name: "Light Fitting",            description: "LED and tube light installation",           category: "electrical",   image: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=400&h=240&fit=crop", duration: "30",  durationUnit: "mins",      rating: 4.6, reviewCount: 180, price: 149 },
  { id: "s5",  name: "Pipe Repair",              description: "Fast leak detection & repair",              category: "plumbing",     image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=240&fit=crop", duration: "1",   durationUnit: "hr",        rating: 4.7, reviewCount: 290, price: 199 },
  { id: "s6",  name: "Tap Installation",         description: "New tap & faucet fitting",                  category: "plumbing",     image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=240&fit=crop", duration: "45",  durationUnit: "mins",      rating: 4.5, reviewCount: 160, price: 149,  originalPrice: 299,  discount: 50 },
  { id: "s7",  name: "Water Tank Cleaning",      description: "Overhead tank deep cleaning",               category: "plumbing",     image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=240&fit=crop", duration: "2",   durationUnit: "hrs",       rating: 4.8, reviewCount: 410, price: 599 },
  { id: "s8",  name: "Drain Unclogging",         description: "Kitchen and bathroom drain cleaning",       category: "plumbing",     image: "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=400&h=240&fit=crop", duration: "1",   durationUnit: "hr",        rating: 4.6, reviewCount: 230, price: 249,  originalPrice: 499,  discount: 50 },
  { id: "s9",  name: "Deep Home Cleaning",       description: "Complete house cleaning service",           category: "cleaning",     image: "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=400&h=240&fit=crop", duration: "3",   durationUnit: "hrs",       rating: 4.9, reviewCount: 680, price: 299,  originalPrice: 599,  discount: 50 },
  { id: "s10", name: "Bathroom Cleaning",        description: "Deep bathroom sanitization",                category: "cleaning",     image: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=240&fit=crop", duration: "1",   durationUnit: "hr",        rating: 4.7, reviewCount: 340, price: 149 },
  { id: "s11", name: "Kitchen Cleaning",         description: "Kitchen with chimney cleaning",             category: "cleaning",     image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=240&fit=crop", duration: "2",   durationUnit: "hrs",       rating: 4.8, reviewCount: 290, price: 199 },
  { id: "s12", name: "Sofa & Carpet Cleaning",   description: "Deep cleaning with stain removal",          category: "cleaning",     image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=240&fit=crop", duration: "2",   durationUnit: "hrs",       rating: 4.6, reviewCount: 210, price: 399,  originalPrice: 799,  discount: 50 },
  { id: "s13", name: "Daily Home Cook",          description: "Professional meal preparation",             category: "cooking",      image: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=400&h=240&fit=crop", duration: "",    durationUnit: "Monthly",   rating: 4.9, reviewCount: 520, price: 8000 },
  { id: "s14", name: "Party Cooking",            description: "Professional event catering",               category: "cooking",      image: "https://images.unsplash.com/photo-1555244162-803834f70033?w=400&h=240&fit=crop", duration: "",    durationUnit: "Per event", rating: 4.8, reviewCount: 310, price: 2999 },
  { id: "s15", name: "Tiffin Service",           description: "Fresh home-cooked tiffin",                  category: "cooking",      image: "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=400&h=240&fit=crop", duration: "",    durationUnit: "Monthly",   rating: 4.7, reviewCount: 440, price: 3000, originalPrice: 4000, discount: 25 },
  { id: "s16", name: "Diet Meal Prep",           description: "Customized healthy meals",                  category: "cooking",      image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=240&fit=crop", duration: "",    durationUnit: "Monthly",   rating: 4.8, reviewCount: 270, price: 4000 },
  { id: "s17", name: "Furniture Assembly",       description: "Bed, wardrobe installation",                category: "carpentry",    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=240&fit=crop", duration: "2",   durationUnit: "hrs",       rating: 4.7, reviewCount: 360, price: 399 },
  { id: "s18", name: "Door & Window Repair",     description: "Door fitting & lock installation",          category: "carpentry",    image: "https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?w=400&h=240&fit=crop", duration: "1.5", durationUnit: "hrs",       rating: 4.6, reviewCount: 190, price: 299,  originalPrice: 599,  discount: 50 },
  { id: "s19", name: "Cabinet Installation",     description: "Kitchen cabinet installation",              category: "carpentry",    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=240&fit=crop", duration: "2.5", durationUnit: "hrs",       rating: 4.8, reviewCount: 280, price: 499 },
  { id: "s20", name: "Wood Polishing",           description: "Furniture polishing service",               category: "carpentry",    image: "https://images.unsplash.com/photo-1611269154421-4e27233ac5c5?w=400&h=240&fit=crop", duration: "3",   durationUnit: "hrs",       rating: 4.7, reviewCount: 210, price: 599 },
  { id: "s21", name: "Cockroach Control",        description: "Complete cockroach elimination",            category: "pest-control", image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=240&fit=crop", duration: "1.5", durationUnit: "hrs",       rating: 4.8, reviewCount: 460, price: 499,  originalPrice: 999,  discount: 50 },
  { id: "s22", name: "Termite Treatment",        description: "Anti-termite wood treatment",               category: "pest-control", image: "https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=400&h=240&fit=crop", duration: "2",   durationUnit: "hrs",       rating: 4.6, reviewCount: 320, price: 799 },
  { id: "s23", name: "Mosquito Spray",           description: "Mosquito control & fogging",                category: "pest-control", image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=400&h=240&fit=crop", duration: "1",   durationUnit: "hr",        rating: 4.7, reviewCount: 190, price: 399,  originalPrice: 699,  discount: 43 },
  { id: "s24", name: "Daily Dishwashing",        description: "Professional daily dishwashing service",    category: "dish-washing", image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=240&fit=crop", duration: "",    durationUnit: "Monthly",   rating: 4.5, reviewCount: 150, price: 2500 },
  { id: "s25", name: "After-Party Cleanup",      description: "Complete kitchen cleanup after events",     category: "dish-washing", image: "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=400&h=240&fit=crop", duration: "2",   durationUnit: "hrs",       rating: 4.6, reviewCount: 140, price: 599 },
  { id: "s26", name: "Interior Painting",        description: "Full home interior paint job",              category: "painting",     image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&h=240&fit=crop", duration: "2",   durationUnit: "days",      rating: 4.8, reviewCount: 390, price: 4999, originalPrice: 7999, discount: 38 },
  { id: "s27", name: "Exterior Painting",        description: "Weatherproof exterior coating",             category: "painting",     image: "https://images.unsplash.com/photo-1615529182904-14819c35db37?w=400&h=240&fit=crop", duration: "3",   durationUnit: "days",      rating: 4.7, reviewCount: 240, price: 7999 },
  { id: "s28", name: "Loading / Unloading",      description: "Heavy lifting & shifting help",             category: "labour",       image: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400&h=240&fit=crop", duration: "4",   durationUnit: "hrs",       rating: 4.5, reviewCount: 510, price: 399 },
  { id: "s29", name: "House Shifting",           description: "Packers & movers assistance",               category: "labour",       image: "https://images.unsplash.com/photo-1530435460869-d13625c69bbf?w=400&h=240&fit=crop", duration: "1",   durationUnit: "Full day",  rating: 4.7, reviewCount: 430, price: 1999, originalPrice: 3999, discount: 50 },
  { id: "s30", name: "Washing Machine Repair",   description: "All brands washing machine fix",            category: "appliance",    image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=400&h=240&fit=crop", duration: "1.5", durationUnit: "hrs",       rating: 4.7, reviewCount: 480, price: 349,  originalPrice: 699,  discount: 50 },
  { id: "s31", name: "Refrigerator Repair",      description: "Cooling & compressor repair",               category: "appliance",    image: "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400&h=240&fit=crop", duration: "1.5", durationUnit: "hrs",       rating: 4.6, reviewCount: 370, price: 449 },
  { id: "s32", name: "TV Repair",                description: "LED, LCD & smart TV repair",                category: "appliance",    image: "https://images.unsplash.com/photo-1593359677879-a4bb92f4a4bf?w=400&h=240&fit=crop", duration: "1",   durationUnit: "hr",        rating: 4.7, reviewCount: 300, price: 349,  originalPrice: 699,  discount: 50 },
]

const iconMap: Record<string, React.ElementType> = {
  grid: LayoutGrid, zap: Zap, droplets: Droplets, sparkles: Sparkles,
  "chef-hat": ChefHat, hammer: Hammer, bug: Bug, utensils: UtensilsCrossed,
  paintbrush: Paintbrush, "hard-hat": HardHat, wrench: Wrench,
}

const SERVICE_FEE = 29

// ─── CategorySidebar ──────────────────────────────────────────────────────────

function CategorySidebar({ activeCategory, onSelect }: { activeCategory: string; onSelect: (id: string) => void }) {
  return (
    <aside style={{ width: 168, flexShrink: 0, background: '#ffffff', borderRight: '1px solid #F1F5F9', height: '100vh', position: 'sticky', top: 0, overflowY: 'auto' }}>
      <div style={{ padding: '16px 8px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 8px', marginBottom: 10 }}>
          Categories
        </p>
        {categories.map(cat => {
          const Icon = iconMap[cat.icon] ?? LayoutGrid
          const active = activeCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 10, width: '100%', textAlign: 'left',
                background: active ? '#FFF7ED' : 'transparent',
                borderLeft: active ? '3px solid #F97316' : '3px solid transparent',
                cursor: 'pointer', border: 'none',
                borderLeftWidth: 3, borderLeftStyle: 'solid',
                borderLeftColor: active ? '#F97316' : 'transparent',
                marginBottom: 2, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#FFF7ED' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: active ? '#F97316' : '#EEF2FF',
              }}>
                <Icon size={14} style={{ color: active ? '#ffffff' : '#1A3C6E' }} />
              </span>
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#F97316' : '#475569', lineHeight: 1.3 }}>
                {cat.label}
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

// ─── ServiceCard ──────────────────────────────────────────────────────────────

function ServiceCard({ service, inCart, onAdd }: { service: Service; inCart: boolean; onAdd: (s: Service) => void }) {
  return (
    <div
      style={{
        background: '#ffffff', borderRadius: 14, overflow: 'hidden',
        border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(249,115,22,0.13)'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', height: 144, overflow: 'hidden', background: '#F1F5F9' }}>
        <img src={service.image} alt={service.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 55%)' }} />

        {service.discount && (
          <span style={{ position: 'absolute', top: 8, left: 8, background: '#10B981', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 6 }}>
            {service.discount}% OFF
          </span>
        )}

        {(service.duration || service.durationUnit) && (
          <span style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10, padding: '3px 7px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={10} />
            {service.duration} {service.durationUnit}
          </span>
        )}

        <button
          onClick={() => onAdd(service)}
          style={{
            position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%',
            background: inCart ? '#1A3C6E' : '#ffffff', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (!inCart) (e.currentTarget as HTMLElement).style.background = '#F97316' }}
          onMouseLeave={e => { if (!inCart) (e.currentTarget as HTMLElement).style.background = '#ffffff' }}
        >
          {inCart
            ? <Check size={13} style={{ color: '#ffffff' }} />
            : <Plus size={13} style={{ color: '#F97316' }} />
          }
        </button>

        {inCart && (
          <span style={{ position: 'absolute', top: 8, right: 42, background: '#10B981', color: '#fff', fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 20 }}>
            Added
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', flex: 1, gap: 3 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1A3C6E', lineHeight: 1.3 }} className="line-clamp-1">
          {service.name}
        </p>
        <p style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.4 }} className="line-clamp-1">
          {service.description}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <Star size={11} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{service.rating}</span>
          <span style={{ fontSize: 11, color: '#CBD5E1' }}>({service.reviewCount})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#F97316' }}>₹{service.price.toLocaleString('en-IN')}</span>
          {service.originalPrice && (
            <span style={{ fontSize: 11, color: '#CBD5E1', textDecoration: 'line-through' }}>₹{service.originalPrice.toLocaleString('en-IN')}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── CartPanel ────────────────────────────────────────────────────────────────

function CartPanel({ items, onUpdateQty, onRemove, onClose }: {
  items: CartItem[]
  onUpdateQty: (id: string, delta: number) => void
  onRemove: (id: string) => void
  onClose: () => void
}) {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const total = subtotal + SERVICE_FEE

  return (
    <aside style={{ width: 272, flexShrink: 0, background: '#ffffff', borderLeft: '1px solid #F1F5F9', height: '100vh', position: 'sticky', top: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: '#FFF7ED', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingCart size={16} style={{ color: '#F97316' }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#1A3C6E' }}>Your Cart</span>
          <span style={{ background: '#F97316', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 8px' }}>
            {items.reduce((s, i) => s + i.qty, 0)}
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#1A3C6E')}
          onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}>
          <X size={16} />
        </button>
      </div>

      {/* Items */}
      <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(item => (
          <div key={item.id} style={{ padding: '10px 12px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1A3C6E', flex: 1, paddingRight: 8, lineHeight: 1.3 }} className="line-clamp-2">
                {item.name}
              </p>
              <button onClick={() => onRemove(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', padding: 0, flexShrink: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                onMouseLeave={e => (e.currentTarget.style.color = '#CBD5E1')}>
                <Trash2 size={13} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => onUpdateQty(item.id, -1)} style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px solid #FDBA74', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F97316' }}>
                  <Minus size={11} />
                </button>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#1A3C6E', minWidth: 16, textAlign: 'center' }}>{item.qty}</span>
                <button onClick={() => onUpdateQty(item.id, 1)} style={{ width: 24, height: 24, borderRadius: '50%', border: '1.5px solid #FDBA74', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F97316' }}>
                  <Plus size={11} />
                </button>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#F97316' }}>₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals + CTA */}
      {items.length > 0 && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid #F1F5F9' }}>
          <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
            {[['Subtotal', `₹${subtotal.toLocaleString('en-IN')}`], ['Service Fee', `₹${SERVICE_FEE}`]].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{val}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#1A3C6E' }}>Total</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#1A3C6E' }}>₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <button
            style={{ width: '100%', background: '#F97316', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 0', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(249,115,22,0.3)', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#EA580C')}
            onMouseLeave={e => (e.currentTarget.style.background = '#F97316')}
          >
            Proceed to Book →
          </button>
        </div>
      )}
    </aside>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const [activeCategory, setActiveCategory] = useState("all")
  const [search, setSearch] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)

  const filtered = useMemo(() => {
    return services.filter(s => {
      const matchCat = activeCategory === "all" || s.category === activeCategory
      const matchSearch = search.trim() === "" ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase())
      return matchCat && matchSearch
    })
  }, [activeCategory, search])

  const categoryLabel = categories.find(c => c.id === activeCategory)?.label ?? "All"
  const cartIds = new Set(cart.map(i => i.id))
  const totalCartItems = cart.reduce((s, i) => s + i.qty, 0)

  function handleAdd(service: Service) {
    setCart(prev => prev.find(i => i.id === service.id) ? prev : [...prev, { id: service.id, name: service.name, price: service.price, qty: 1 }])
    setCartOpen(true)
  }

  function handleUpdateQty(id: string, delta: number) {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
  }

  function handleRemove(id: string) {
    setCart(prev => {
      const next = prev.filter(i => i.id !== id)
      if (next.length === 0) setCartOpen(false)
      return next
    })
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F7FA' }}>

      <CategorySidebar activeCategory={activeCategory} onSelect={setActiveCategory} />

      {/* MAIN */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', minWidth: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1A3C6E', marginBottom: 4 }}>
              {activeCategory === "all" ? "All Services" : `${categoryLabel} Services`}
            </h1>
            <p style={{ fontSize: 13, color: '#94A3B8' }}>{filtered.length} service{filtered.length !== 1 ? 's' : ''} available</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#CBD5E1', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search services..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 34, paddingRight: 14, paddingTop: 9, paddingBottom: 9, fontSize: 13, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 10, outline: 'none', width: 210, color: '#1A3C6E', transition: 'border-color 0.15s' }}
                onFocus={e => (e.target.style.borderColor = '#F97316')}
                onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>
            {/* Cart button when cart has items but panel is closed */}
            {totalCartItems > 0 && !cartOpen && (
              <button
                onClick={() => setCartOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F97316', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 10px rgba(249,115,22,0.25)', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#EA580C')}
                onMouseLeave={e => (e.currentTarget.style.background = '#F97316')}
              >
                <ShoppingCart size={15} />
                Cart
                <span style={{ background: '#fff', color: '#F97316', fontSize: 11, fontWeight: 800, borderRadius: 20, padding: '1px 7px' }}>{totalCartItems}</span>
              </button>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#F1F5F9', margin: '16px 0 20px' }} />

        {/* Grid or Empty */}
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
            <div style={{ background: '#FFF7ED', borderRadius: '50%', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Search size={32} style={{ color: '#FDBA74' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1A3C6E', marginBottom: 4 }}>No services found</p>
            <p style={{ fontSize: 13, color: '#94A3B8' }}>Try a different search or category</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {filtered.map(service => (
              <ServiceCard
                key={service.id}
                service={service}
                inCart={cartIds.has(service.id)}
                onAdd={handleAdd}
              />
            ))}
          </div>
        )}
      </main>

      {/* CART PANEL */}
      {cartOpen && (
        <CartPanel
          items={cart}
          onUpdateQty={handleUpdateQty}
          onRemove={handleRemove}
          onClose={() => setCartOpen(false)}
        />
      )}
    </div>
  )
}