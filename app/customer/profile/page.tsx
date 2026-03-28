'use client';

import {
  User, MapPin, CreditCard, Shield, LogOut, Edit,
  Share2, HelpCircle, Home, Briefcase, MapPinned,
  Plus, Trash2, Eye, EyeOff, Lock, Smartphone,
  Check, ChevronRight
} from 'lucide-react';
import { useEffect, useState } from 'react';
import Navbar from '@/components/dashboardnavbar';
import { supabase } from '@/lib/db/supabase';

const PROFILE_STORAGE_KEY = 'sevam_profile';

type AddressLabel = 'HOME' | 'OFFICE' | 'OTHER';

type AddressCard = {
  id: string;
  type: string;
  label: AddressLabel;
  address: string;
  city: string;
  isDefault: boolean;
};

type AddressesApiResponse = {
  addresses: Array<{
    id: string;
    label: AddressLabel;
    line1: string;
    line2: string | null;
    landmark: string | null;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
  }>;
};

const FALLBACK_ADDRESSES: AddressCard[] = [
  {
    id: 'fallback-home',
    type: 'Home',
    label: 'HOME',
    address: 'A-204, Skyline Apartments, Koramangala, 4th Block',
    city: 'Bengaluru - 560034',
    isDefault: true,
  },
  {
    id: 'fallback-office',
    type: 'Office',
    label: 'OFFICE',
    address: 'WeWork Galaxy, Level 8, Residency Road',
    city: 'Bengaluru - 560025',
    isDefault: false,
  },
  {
    id: 'fallback-other',
    type: 'Other',
    label: 'OTHER',
    address: 'Brigade Gateway, Flat 5C, Rajajinagar',
    city: 'Bengaluru - 560010',
    isDefault: false,
  },
];

function cleanPhone(phone?: string) {
  const value = (phone ?? '').trim();
  return value.startsWith('oauth_') ? '' : value;
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('personal-info');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);
  const [profileOverride, setProfileOverride] = useState<{ name?: string; email?: string; phone?: string } | null>(null);
  const [newPhone, setNewPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [contactErr, setContactErr] = useState('');
  const [contactLoading, setContactLoading] = useState(false);
  const [addresses, setAddresses] = useState<AddressCard[]>(FALLBACK_ADDRESSES);
  const [addressesLoading, setAddressesLoading] = useState(false);

  const user = {
    name: profileOverride?.name || 'Customer',
    email: profileOverride?.email || '',
    phone: profileOverride?.phone || '',
    dob: '14 August 1995',
    gender: 'Male',
    verified: true,
    memberSince: 'Jan 2024',
    referralCode: 'NIKHIL40',
    initials: (profileOverride?.name?.charAt(0) || 'C').toUpperCase(),
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as { name?: string; email?: string; phone?: string };
      if (parsed && (parsed.name || parsed.email || parsed.phone)) {
        setProfileOverride({
          name: parsed.name,
          email: parsed.email,
          phone: cleanPhone(parsed.phone),
        });
      }
    } catch {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadProfileAndAddresses = async () => {
      try {
        setAddressesLoading(true);
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;

        if (!accessToken) {
          if (isMounted) {
            setAddressesLoading(false);
          }
          return;
        }

        const [profileResponse, addressesResponse] = await Promise.all([
          fetch('/api/customer/profile', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            cache: 'no-store',
          }),
          fetch('/api/customer/addresses', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            cache: 'no-store',
          }),
        ]);

        if (isMounted && profileResponse.ok) {
          const profileData = (await profileResponse.json()) as {
            user?: { name?: string; phone?: string };
            profile?: { email?: string };
          };

          if (profileData.user || profileData.profile) {
            persistProfile({
              name: profileData.user?.name,
              email: profileData.profile?.email,
              phone: cleanPhone(profileData.user?.phone),
            });
          }
        }

        if (isMounted && addressesResponse.ok) {
          const addressesData = (await addressesResponse.json()) as AddressesApiResponse;
          const mappedAddresses: AddressCard[] = (addressesData.addresses ?? []).map((addr) => {
            const line2 = addr.line2?.trim() ? `, ${addr.line2.trim()}` : '';
            const landmark = addr.landmark?.trim() ? `, ${addr.landmark.trim()}` : '';

            return {
              id: addr.id,
              type: addr.label === 'HOME' ? 'Home' : addr.label === 'OFFICE' ? 'Office' : 'Other',
              label: addr.label,
              address: `${addr.line1}${line2}${landmark}`,
              city: `${addr.city} - ${addr.pincode}`,
              isDefault: addr.isDefault,
            };
          });

          if (mappedAddresses.length > 0) {
            setAddresses(mappedAddresses);
          }
        }
      } catch {
        // Keep fallback data to avoid blocking profile screen on transient failures.
      } finally {
        if (isMounted) {
          setAddressesLoading(false);
        }
      }
    };

    void loadProfileAndAddresses();

    return () => {
      isMounted = false;
    };
  }, []);

  const normalizePhone = (value: string) => {
    const trimmed = value.replace(/\s+/g, '').trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('+')) return trimmed;
    return `+91${trimmed.replace(/^0+/, '')}`;
  };

  const persistProfile = (next: { name?: string; email?: string; phone?: string }) => {
    const merged = {
      name: next.name ?? user.name,
      email: next.email ?? user.email,
      phone: next.phone ?? user.phone,
    };
    setProfileOverride(merged);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(merged));
  };

  const handleSendPhoneOtp = async () => {
    try {
      setContactErr('');
      setContactMsg('');
      setContactLoading(true);
      const normalized = normalizePhone(newPhone);
      if (!normalized) {
        setContactErr('Please enter a valid phone number.');
        return;
      }

      const { error } = await supabase.auth.updateUser({ phone: normalized });
      if (error) {
        setContactErr(error.message || 'Failed to send OTP.');
        return;
      }

      setNewPhone(normalized);
      setPhoneOtpSent(true);
      setContactMsg('OTP sent to your phone. Enter OTP to verify.');
    } catch {
      setContactErr('Failed to send OTP.');
    } finally {
      setContactLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    try {
      setContactErr('');
      setContactMsg('');
      setContactLoading(true);

      if (!phoneOtp.trim()) {
        setContactErr('Please enter OTP.');
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        phone: newPhone,
        token: phoneOtp.trim(),
        type: 'phone_change',
      });

      if (error) {
        setContactErr(error.message || 'Phone verification failed.');
        return;
      }

      persistProfile({ phone: newPhone });
      setPhoneOtpSent(false);
      setPhoneOtp('');
      setContactMsg('Phone number verified successfully.');
    } catch {
      setContactErr('Phone verification failed.');
    } finally {
      setContactLoading(false);
    }
  };

  const handleSendEmailVerification = async () => {
    try {
      setContactErr('');
      setContactMsg('');
      setContactLoading(true);

      if (!newEmail.trim()) {
        setContactErr('Please enter email address.');
        return;
      }

      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) {
        setContactErr(error.message || 'Failed to send verification email.');
        return;
      }

      setContactMsg('Verification email sent. Please check your inbox to confirm.');
      persistProfile({ email: newEmail.trim() });
    } catch {
      setContactErr('Failed to send verification email.');
    } finally {
      setContactLoading(false);
    }
  };

  const paymentMethods = [
    { id: 1, type: 'Google Pay', details: 'nikhil@oksbi', emoji: '🔵', color: '#3B82F6', isDefault: true },
    { id: 2, type: 'HDFC Visa •••• 4289', details: 'Expires 08/27', emoji: '💳', color: '#8B5CF6', isDefault: false },
  ];

  const menuItems = [
    { id: 'personal-info', label: 'Personal Info', icon: User },
    { id: 'saved-addresses', label: 'Saved Addresses', icon: MapPin },
    { id: 'payment-methods', label: 'Payment Methods', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const S = {
    sectionHeader: { padding: '20px 28px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' } as React.CSSProperties,
    sectionIcon: { width: 40, height: 40, borderRadius: 10, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as React.CSSProperties,
    label: { fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6, display: 'block' },
    value: { fontSize: 15, fontWeight: 500, color: '#0F172A' },
    btnPrimary: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#F97316', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
    btnOutline: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#FFF7ED', color: '#F97316', border: '1px solid #FED7AA', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
    input: { width: '100%', padding: '12px 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, color: '#0F172A', outline: 'none', boxSizing: 'border-box' as const },
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9' }}>
      <Navbar />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 32px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>My Account</h1>
            <p style={{ fontSize: 13, color: '#94A3B8' }}>Manage your profile, addresses, and preferences</p>
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#EF4444' }}>
            <LogOut style={{ width: 15, height: 15 }} /> Sign Out
          </button>
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* LEFT SIDEBAR */}
          <div style={{ width: 256, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Profile card */}
            <div style={{ background: 'linear-gradient(135deg, #1A3C6E 0%, #2563EB 100%)', borderRadius: 18, padding: '24px 20px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <span style={{ fontSize: 26, fontWeight: 800, color: '#1A3C6E' }}>{user.initials}</span>
                  <div style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%', background: '#F97316', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check style={{ width: 10, height: 10, color: '#fff' }} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <p style={{ fontSize: 15, fontWeight: 700 }}>{user.name}</p>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check style={{ width: 9, height: 9, color: '#fff' }} />
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>{user.email}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Member since {user.memberSince}</p>
            </div>

            {/* Nav menu */}
            <div style={{ background: '#ffffff', borderRadius: 14, overflow: 'hidden', padding: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              {menuItems.map(item => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button key={item.id} onClick={() => setActiveTab(item.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: active ? '#FFF7ED' : 'transparent', color: active ? '#F97316' : '#64748B', marginBottom: 2, transition: 'all 0.15s' }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <Icon style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: 14, fontWeight: active ? 600 : 400, flex: 1, textAlign: 'left' as const }}>{item.label}</span>
                    {active && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#F97316' }} />}
                  </button>
                );
              })}
            </div>

            {/* Help card */}
            <div style={{ background: 'linear-gradient(135deg, #1A3C6E 0%, #2563EB 100%)', borderRadius: 18, padding: '24px 20px', textAlign: 'center', color: '#fff' }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <HelpCircle style={{ width: 22, height: 22, color: '#fff' }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Need help?</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>Our support team is available 24/7</p>
              <button style={{ width: '100%', padding: '11px 0', background: '#F97316', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#EA580C')}
                onMouseLeave={e => (e.currentTarget.style.background = '#F97316')}
              >Contact Support</button>
            </div>
          </div>

          {/* RIGHT CONTENT */}
          <div style={{ flex: 1, background: '#ffffff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

            {/* ── PERSONAL INFO ── */}
            {activeTab === 'personal-info' && (
              <>
                <div style={S.sectionHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={S.sectionIcon}><User style={{ width: 20, height: 20, color: '#F97316' }} /></div>
                    <div>
                      <p style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>Personal Information</p>
                      <p style={{ fontSize: 13, color: '#94A3B8' }}>Manage your name, contact details and bio</p>
                    </div>
                  </div>
                  <button style={S.btnOutline}><Edit style={{ width: 14, height: 14 }} /> Edit</button>
                </div>

                <div style={{ padding: '28px 28px', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 40px' }}>
                    <div>
                      <span style={S.label}>Full Name</span>
                      <p style={S.value}>{user.name}</p>
                    </div>
                    <div>
                      <span style={S.label}>Phone Number</span>
                      {user.phone ? (
                        <p style={S.value}>{user.phone}</p>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            placeholder="Add phone number"
                            style={{ ...S.input, maxWidth: 230, padding: '9px 10px' }}
                          />
                          {!phoneOtpSent ? (
                            <button style={S.btnOutline} onClick={handleSendPhoneOtp} disabled={contactLoading}>Verify</button>
                          ) : (
                            <>
                              <input
                                value={phoneOtp}
                                onChange={(e) => setPhoneOtp(e.target.value)}
                                placeholder="OTP"
                                style={{ ...S.input, width: 90, padding: '9px 10px' }}
                              />
                              <button style={S.btnOutline} onClick={handleVerifyPhoneOtp} disabled={contactLoading}>Submit</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={S.label}>Email Address</span>
                      {user.email ? (
                        <p style={{ ...S.value, color: '#2563EB' }}>{user.email}</p>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="Add email address"
                            style={{ ...S.input, maxWidth: 320, padding: '9px 10px' }}
                          />
                          <button style={S.btnOutline} onClick={handleSendEmailVerification} disabled={contactLoading}>Verify</button>
                        </div>
                      )}
                    </div>
                    <div>
                      <span style={S.label}>Date of Birth</span>
                      <p style={S.value}>{user.dob}</p>
                    </div>
                    <div>
                      <span style={S.label}>Gender</span>
                      <p style={{ ...S.value, color: '#2563EB' }}>{user.gender}</p>
                    </div>
                  </div>
                </div>

                {(contactMsg || contactErr) && (
                  <div style={{ padding: '0 28px 12px' }}>
                    {contactMsg && <p style={{ fontSize: 13, color: '#16A34A' }}>{contactMsg}</p>}
                    {contactErr && <p style={{ fontSize: 13, color: '#EF4444' }}>{contactErr}</p>}
                  </div>
                )}

                {/* Referral card */}
                <div style={{ padding: '20px 28px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #1A3C6E 0%, #2563EB 100%)', borderRadius: 16, padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                        <Share2 style={{ width: 14, height: 14, color: '#F97316' }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#F97316', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>Referral Code</span>
                      </div>
                      <p style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 4, letterSpacing: '0.02em' }}>{user.referralCode}</p>
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Share & earn ₹100 per successful referral</p>
                    </div>
                    <button style={{ padding: '12px 24px', background: '#F97316', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#EA580C')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#F97316')}
                    >Share Now</button>
                  </div>
                </div>
              </>
            )}

            {/* ── SAVED ADDRESSES ── */}
            {activeTab === 'saved-addresses' && (
              <>
                <div style={S.sectionHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={S.sectionIcon}><MapPin style={{ width: 20, height: 20, color: '#F97316' }} /></div>
                    <div>
                      <p style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>Saved Addresses</p>
                      <p style={{ fontSize: 13, color: '#94A3B8' }}>Manage your delivery and service locations</p>
                    </div>
                  </div>
                  <button style={S.btnPrimary}><Plus style={{ width: 14, height: 14 }} /> Add Address</button>
                </div>

                <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {addressesLoading && (
                    <p style={{ fontSize: 13, color: '#94A3B8' }}>Loading saved addresses...</p>
                  )}

                  {addresses.map(addr => {
                    const Icon = addr.label === 'HOME' ? Home : addr.label === 'OFFICE' ? Briefcase : MapPinned;
                    return (
                      <div key={addr.id}
                        style={{ border: '1.5px solid #F1F5F9', borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 16, transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget.style.borderColor = '#FED7AA'); (e.currentTarget.style.background = '#FFFBF7'); }}
                        onMouseLeave={e => { (e.currentTarget.style.borderColor = '#F1F5F9'); (e.currentTarget.style.background = '#fff'); }}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon style={{ width: 18, height: 18, color: '#F97316' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{addr.type}</p>
                            {addr.isDefault && (
                              <span style={{ background: '#FFF7ED', color: '#F97316', border: '1px solid #FED7AA', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>Default</span>
                            )}
                          </div>
                          <p style={{ fontSize: 13, color: '#374151', marginBottom: 2 }}>{addr.address}</p>
                          <p style={{ fontSize: 12, color: '#94A3B8' }}>{addr.city}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          {!addr.isDefault && (
                            <button style={{ fontSize: 12, fontWeight: 600, color: '#F97316', background: 'none', border: 'none', cursor: 'pointer' }}>Set Default</button>
                          )}
                          <button style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #F1F5F9', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Edit style={{ width: 14, height: 14, color: '#94A3B8' }} />
                          </button>
                          <button style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #F1F5F9', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 style={{ width: 14, height: 14, color: '#94A3B8' }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add new */}
                  <button style={{ width: '100%', border: '2px dashed #E2E8F0', borderRadius: 14, padding: '20px', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: '#94A3B8', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget.style.borderColor = '#FDBA74'); (e.currentTarget.style.color = '#F97316'); }}
                    onMouseLeave={e => { (e.currentTarget.style.borderColor = '#E2E8F0'); (e.currentTarget.style.color = '#94A3B8'); }}
                  >
                    <Plus style={{ width: 16, height: 16 }} /> Add a New Address
                  </button>
                </div>
              </>
            )}

            {/* ── PAYMENT METHODS ── */}
            {activeTab === 'payment-methods' && (
              <>
                <div style={S.sectionHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={S.sectionIcon}><CreditCard style={{ width: 20, height: 20, color: '#F97316' }} /></div>
                    <div>
                      <p style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>Payment Methods</p>
                      <p style={{ fontSize: 13, color: '#94A3B8' }}>Manage your UPI, cards and Sevam wallet</p>
                    </div>
                  </div>
                  <button style={S.btnPrimary}><Plus style={{ width: 14, height: 14 }} /> Add Method</button>
                </div>

                {/* Wallet */}
                <div style={{ padding: '20px 28px', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', borderRadius: 16, padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 8 }}>SEVAM WALLET</p>
                      <p style={{ fontSize: 36, fontWeight: 900, color: '#fff', marginBottom: 4 }}>₹340.00</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>Last topped up: 15 Mar 2026</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                      <button style={{ padding: '10px 20px', background: '#fff', color: '#F97316', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Add Money</button>
                      <button style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>History</button>
                    </div>
                  </div>
                </div>

                {/* Payment list */}
                <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {paymentMethods.map(method => (
                    <div key={method.id}
                      style={{ border: '1.5px solid #F1F5F9', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget.style.borderColor = '#FED7AA'); (e.currentTarget.style.background = '#FFFBF7'); }}
                      onMouseLeave={e => { (e.currentTarget.style.borderColor = '#F1F5F9'); (e.currentTarget.style.background = '#fff'); }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: method.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                        {method.emoji}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{method.type}</p>
                          {method.isDefault && (
                            <span style={{ background: '#FFF7ED', color: '#F97316', border: '1px solid #FED7AA', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>Default</span>
                          )}
                        </div>
                        <p style={{ fontSize: 13, color: '#94A3B8' }}>{method.details}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {!method.isDefault && (
                          <button style={{ fontSize: 12, fontWeight: 600, color: '#F97316', background: 'none', border: 'none', cursor: 'pointer' }}>Set Default</button>
                        )}
                        <button style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #F1F5F9', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Trash2 style={{ width: 14, height: 14, color: '#94A3B8' }} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button style={{ width: '100%', border: '2px dashed #E2E8F0', borderRadius: 14, padding: '20px', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: '#94A3B8', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget.style.borderColor = '#FDBA74'); (e.currentTarget.style.color = '#F97316'); }}
                    onMouseLeave={e => { (e.currentTarget.style.borderColor = '#E2E8F0'); (e.currentTarget.style.color = '#94A3B8'); }}
                  >
                    <Plus style={{ width: 16, height: 16 }} /> Add Payment Method
                  </button>
                </div>
              </>
            )}

            {/* ── SECURITY ── */}
            {activeTab === 'security' && (
              <>
                <div style={{ ...S.sectionHeader, justifyContent: 'flex-start', gap: 14 }}>
                  <div style={S.sectionIcon}><Shield style={{ width: 20, height: 20, color: '#F97316' }} /></div>
                  <div>
                    <p style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>Security</p>
                    <p style={{ fontSize: 13, color: '#94A3B8' }}>Manage your password and account access</p>
                  </div>
                </div>

                {/* Change password */}
                <div style={{ padding: '24px 28px', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Lock style={{ width: 16, height: 16, color: '#F97316' }} />
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Change Password</p>
                  </div>

                  <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <span style={S.label}>Current Password</span>
                      <input type="password" defaultValue="••••••••" style={S.input}
                        onFocus={e => (e.target.style.borderColor = '#F97316')}
                        onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
                      />
                    </div>
                    <div>
                      <span style={S.label}>New Password</span>
                      <div style={{ position: 'relative' }}>
                        <input type={showPassword ? 'text' : 'password'} defaultValue="••••••••"
                          style={{ ...S.input, paddingRight: 44 }}
                          onFocus={e => (e.target.style.borderColor = '#F97316')}
                          onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
                        />
                        <button onClick={() => setShowPassword(!showPassword)}
                          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                          {showPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <span style={S.label}>Confirm New Password</span>
                      <input type="password" defaultValue="••••••••" style={S.input}
                        onFocus={e => (e.target.style.borderColor = '#F97316')}
                        onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
                      />
                    </div>
                    <button style={{ ...S.btnPrimary, width: 'fit-content', padding: '12px 24px', fontSize: 14 }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#EA580C')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#F97316')}
                    >Update Password</button>
                  </div>
                </div>

                {/* 2FA */}
                <div style={{ padding: '22px 28px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Two-Factor Authentication</p>
                    <p style={{ fontSize: 13, color: '#94A3B8' }}>Add an extra layer of security to your account via OTP on login</p>
                  </div>
                  <button onClick={() => setTwoFactor(!twoFactor)}
                    style={{ width: 48, height: 26, borderRadius: 13, background: twoFactor ? '#F97316' : '#E2E8F0', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <span style={{ position: 'absolute', top: 3, left: twoFactor ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                  </button>
                </div>

                {/* Active sessions */}
                <div style={{ padding: '22px 28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Smartphone style={{ width: 16, height: 16, color: '#F97316' }} />
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Active Sessions</p>
                  </div>
                  <div style={{ border: '1.5px solid #F1F5F9', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Smartphone style={{ width: 18, height: 18, color: '#16A34A' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>Chrome on MacOS</p>
                        <p style={{ fontSize: 12, color: '#94A3B8' }}>Bengaluru, IN · Active now</p>
                      </div>
                    </div>
                    <span style={{ background: '#DCFCE7', color: '#16A34A', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>This device</span>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}