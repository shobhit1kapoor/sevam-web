'use client';
 
import {
  Heart, Wallet, Gift, MapPin, Star, Tag,
  HelpCircle, Bell, Shield, FileText, LogOut,
  ChevronRight, BadgeCheck, User, Package,
  CreditCard, Settings, MessageCircle
} from 'lucide-react';
import { useState } from 'react';
 
export default function ProfilePage() {
  const [activeSection, setActiveSection] = useState('account');
 
  const user = {
    name: 'Priya Sharma',
    email: 'priya.sharma@email.com',
    phone: '+91 98765 43210',
    verified: true,
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    memberSince: 'March 2024',
  };
 
  const stats = [
    { label: 'Total Bookings', value: '24', icon: Package, iconColor: '#2563EB', bg: '#EFF6FF' },
    { label: 'Wallet Balance', value: '₹450', icon: Wallet, iconColor: '#16A34A', bg: '#F0FDF4' },
    { label: 'Saved Addresses', value: '3', icon: MapPin, iconColor: '#F97316', bg: '#FFF7ED' },
    { label: 'Reward Points', value: '1,240', icon: Star, iconColor: '#D97706', bg: '#FFFBEB' },
  ];
 
  const sidebarSections = [
    { id: 'account', label: 'Account Settings', icon: User },
    { id: 'orders', label: 'My Bookings', icon: Package },
    { id: 'payments', label: 'Payment Methods', icon: CreditCard },
    { id: 'addresses', label: 'Manage Addresses', icon: MapPin },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];
 
  const accountMenuItems = [
    { id: 'profile', label: 'Edit Profile', description: 'Change your name, email and phone number', icon: User },
    { id: 'addresses', label: 'Manage Addresses', description: 'Edit, add or remove addresses', icon: MapPin },
    { id: 'wallet', label: 'Sevam Wallet', description: 'View balance and transaction history', icon: Wallet },
    { id: 'favorites', label: 'Saved Services', description: 'View and manage your favorite services', icon: Heart },
    { id: 'reviews', label: 'My Reviews & Ratings', description: 'See all your reviews and ratings', icon: Star },
    { id: 'coupons', label: 'Coupons & Offers', description: 'View available coupons and offers', icon: Tag },
    { id: 'refer', label: 'Refer & Earn', description: 'Invite friends and earn rewards', icon: Gift },
  ];
 
  const supportMenuItems = [
    { id: 'help', label: 'Help Center', description: 'Get help with your bookings', icon: HelpCircle },
    { id: 'support', label: 'Contact Support', description: '24/7 customer support', icon: MessageCircle },
    { id: 'settings', label: 'Settings', description: 'Manage your preferences', icon: Settings },
  ];
 
  const legalMenuItems = [
    { id: 'privacy', label: 'Privacy Policy', icon: Shield },
    { id: 'terms', label: 'Terms & Conditions', icon: FileText },
  ];
 
  const placeholderIcons: Record<string, React.ElementType> = {
    orders: Package, payments: CreditCard, addresses: MapPin, notifications: Bell,
  };
 
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '32px 32px' }}>
 
        {/* Page title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>My Account</h1>
          <p style={{ fontSize: 13, color: '#94A3B8' }}>Manage your profile and preferences</p>
        </div>
 
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {stats.map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label}
                style={{ background: '#ffffff', border: '1px solid #E8ECF0', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)')}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Icon style={{ width: 18, height: 18, color: stat.iconColor }} />
                </div>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>{stat.value}</p>
                <p style={{ fontSize: 12, color: '#94A3B8' }}>{stat.label}</p>
              </div>
            );
          })}
        </div>
 
        {/* 2-col layout */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
 
          {/* LEFT SIDEBAR */}
          <div style={{ width: 240, flexShrink: 0, background: '#ffffff', border: '1px solid #E8ECF0', borderRadius: 12, overflow: 'hidden', position: 'sticky', top: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
 
            {/* User info */}
            <div style={{ padding: '20px 20px', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={user.image} alt={user.name}
                    style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                  {user.verified && (
                    <div style={{ position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderRadius: '50%', background: '#22C55E', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BadgeCheck style={{ width: 8, height: 8, color: '#fff' }} />
                    </div>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{user.name}</p>
                  <p style={{ fontSize: 11, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{user.email}</p>
                </div>
              </div>
              <p style={{ fontSize: 11, color: '#CBD5E1' }}>Member since {user.memberSince}</p>
            </div>
 
            {/* Nav */}
            <nav style={{ padding: '8px' }}>
              {sidebarSections.map(section => {
                const Icon = section.icon;
                const active = activeSection === section.id;
                return (
                  <button key={section.id} onClick={() => setActiveSection(section.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 2, transition: 'all 0.15s', background: active ? '#FFF7ED' : 'transparent', color: active ? '#F97316' : '#64748B' }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <Icon style={{ width: 15, height: 15 }} />
                    <span style={{ fontSize: 13, fontWeight: active ? 600 : 400 }}>{section.label}</span>
                  </button>
                );
              })}
            </nav>
 
            {/* Logout */}
            <div style={{ padding: '8px', borderTop: '1px solid #F1F5F9' }}>
              <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#EF4444', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <LogOut style={{ width: 15, height: 15 }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>Logout</span>
              </button>
            </div>
          </div>
 
          {/* RIGHT CONTENT */}
          <div style={{ flex: 1, background: '#ffffff', border: '1px solid #E8ECF0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
 
            {activeSection === 'account' && (
              <>
                {/* Section header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>Account Information</h2>
                  <p style={{ fontSize: 13, color: '#94A3B8' }}>Manage your account settings and preferences</p>
                </div>
 
                {/* Personal info */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>Personal Information</p>
                      <p style={{ fontSize: 12, color: '#94A3B8' }}>Update your personal details</p>
                    </div>
                    <button style={{ fontSize: 13, fontWeight: 600, color: '#F97316', background: 'none', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#EA580C')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#F97316')}
                    >Edit</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 5 }}>Full Name</p>
                      <p style={{ fontSize: 14, color: '#0F172A' }}>{user.name}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 5 }}>Phone Number</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <p style={{ fontSize: 14, color: '#0F172A' }}>{user.phone}</p>
                        {user.verified && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#16A34A' }}>
                            <BadgeCheck style={{ width: 12, height: 12 }} /> Verified
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 5 }}>Email Address</p>
                      <p style={{ fontSize: 14, color: '#0F172A' }}>{user.email}</p>
                    </div>
                  </div>
                </div>
 
                {/* Account options */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 12 }}>Account Options</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {accountMenuItems.map(item => {
                      const Icon = item.icon;
                      return (
                        <button key={item.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', transition: 'background 0.15s', width: '100%' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}>
                            <Icon style={{ width: 17, height: 17, color: '#64748B' }} />
                          </div>
                          <div style={{ flex: 1, textAlign: 'left' }}>
                            <p style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', marginBottom: 2 }}>{item.label}</p>
                            <p style={{ fontSize: 12, color: '#94A3B8' }}>{item.description}</p>
                          </div>
                          <ChevronRight style={{ width: 16, height: 16, color: '#CBD5E1', flexShrink: 0 }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
 
                {/* Support */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 12 }}>Support & Help</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {supportMenuItems.map(item => {
                      const Icon = item.icon;
                      return (
                        <button key={item.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', transition: 'background 0.15s', width: '100%' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon style={{ width: 17, height: 17, color: '#64748B' }} />
                          </div>
                          <div style={{ flex: 1, textAlign: 'left' }}>
                            <p style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', marginBottom: 2 }}>{item.label}</p>
                            <p style={{ fontSize: 12, color: '#94A3B8' }}>{item.description}</p>
                          </div>
                          <ChevronRight style={{ width: 16, height: 16, color: '#CBD5E1', flexShrink: 0 }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
 
                {/* Legal */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 12 }}>Legal</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                    {legalMenuItems.map(item => {
                      const Icon = item.icon;
                      return (
                        <button key={item.id}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, border: '1px solid #E8ECF0', background: '#ffffff', fontSize: 13, color: '#64748B', cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
                        >
                          <Icon style={{ width: 14, height: 14 }} />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
 
                {/* Footer */}
                <div style={{ padding: '14px 24px', background: '#F8FAFC', textAlign: 'center' }}>
                  <p style={{ fontSize: 12, color: '#CBD5E1' }}>Sevam v1.0.0 • Made with ❤️ in India</p>
                </div>
              </>
            )}
 
            {/* Placeholder for other sections */}
            {activeSection !== 'account' && (() => {
              const PlaceholderIcon = placeholderIcons[activeSection];
              const section = sidebarSections.find(s => s.id === activeSection);
              return (
                <div style={{ padding: '80px 24px', textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    {PlaceholderIcon && <PlaceholderIcon style={{ width: 28, height: 28, color: '#94A3B8' }} />}
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>{section?.label}</p>
                  <p style={{ fontSize: 13, color: '#94A3B8' }}>This section is under development</p>
                </div>
              );
            })()}
 
          </div>
        </div>
      </div>
    </div>
  );
}