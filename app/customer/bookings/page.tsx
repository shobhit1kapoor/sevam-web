'use client';
 
import { Phone, MapPin, Calendar, Star, Check, HelpCircle, Headphones } from 'lucide-react';
import { useState } from 'react';
 
interface ActiveBooking {
  id: string; serviceName: string; workerName: string; workerRole: string;
  workerImage: string; currentStep: number; estimatedTime: string;
  bookingDate: string; bookingTime: string; address: string;
  price: number; rating: number; jobsCompleted: number;
}
interface UpcomingBooking {
  id: string; serviceName: string; providerName: string; date: string;
  time: string; address: string; price: number; icon: string; within24Hours: boolean;
}
interface CompletedBooking {
  id: string; serviceName: string; completedDate: string; workerName: string;
  price: number; icon: string; rated: boolean; rating?: number;
}
 
export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed'>('active');
 
  const activeBooking: ActiveBooking = {
    id: '1', serviceName: 'AC Repair & Service',
    workerName: 'Rajesh Kumar', workerRole: 'Senior AC Technician',
    workerImage: 'https://images.unsplash.com/photo-1627776880991-808c5996527b?w=200&q=80',
    currentStep: 2, estimatedTime: '~25 mins remaining',
    bookingDate: 'Today', bookingTime: '2:30 PM',
    address: 'A-204, Skyline Apartments, Koramangala',
    price: 599, rating: 4.8, jobsCompleted: 342,
  };
 
  const upcomingBookings: UpcomingBooking[] = [
    { id: '2', serviceName: 'Deep Home Cleaning', providerName: 'CleanPro Services', date: 'Tomorrow', time: '10:00 AM', address: 'A-204, Skyline Apartments, Koramangala', price: 499, icon: '🧹', within24Hours: true },
    { id: '3', serviceName: 'Plumbing Service', providerName: 'QuickFix Solutions', date: 'Mar 5, 2026', time: '2:00 PM', address: 'B-101, Green Valley, Whitefield', price: 299, icon: '🔧', within24Hours: false },
    { id: '8', serviceName: 'Painting Service', providerName: 'ColorCraft Professionals', date: 'Mar 8, 2026', time: '9:00 AM', address: 'C-305, Lake View Residency, Indiranagar', price: 1999, icon: '🎨', within24Hours: false },
  ];
 
  const completedBookings: CompletedBooking[] = [
    { id: '4', serviceName: 'Electrical Wiring', completedDate: 'Feb 28, 2026', workerName: 'Amit Singh', price: 599, icon: '🔌', rated: true, rating: 5 },
    { id: '5', serviceName: 'Salon at Home', completedDate: 'Feb 25, 2026', workerName: 'Priya Sharma', price: 399, icon: '💆', rated: false },
    { id: '6', serviceName: 'Car Washing', completedDate: 'Feb 20, 2026', workerName: 'Vikram Reddy', price: 299, icon: '🚗', rated: true, rating: 4 },
    { id: '7', serviceName: 'Pest Control', completedDate: 'Feb 15, 2026', workerName: 'Suresh Patel', price: 799, icon: '🐛', rated: true, rating: 5 },
  ];
 
  const progressSteps = ['Confirmed', 'En Route', 'Arrived', 'In Progress', 'Done'];
 
  const tabs = [
    { key: 'active' as const, label: 'Active', count: 1 },
    { key: 'upcoming' as const, label: 'Upcoming', count: upcomingBookings.length },
    { key: 'completed' as const, label: 'Completed', count: completedBookings.length },
  ];
 
  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#F5F7FA' }}>
 
      {/* LEFT SIDEBAR */}
      <aside style={{ width: 220, background: '#ffffff', borderRight: '1px solid #E8ECF0', position: 'sticky', top: 0, height: '100vh', overflow: 'auto', flexShrink: 0 }}>
        <div style={{ padding: '32px 20px' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 28 }}>My Bookings</h1>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tabs.map(tab => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: active ? '#F8FAFC' : 'transparent',
                    borderLeft: active ? '2px solid #F97316' : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: 14, fontWeight: active ? 600 : 400, color: active ? '#0F172A' : '#64748B' }}>
                    {tab.label}
                  </span>
                  {active && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>{tab.count}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
 
      {/* MAIN CONTENT — centered with max width */}
      <main style={{ flex: 1, overflow: 'auto', padding: '32px 40px', background: '#F5F7FA' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
 
          {/* ACTIVE TAB */}
          {activeTab === 'active' && (
            <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #E8ECF0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
 
              {/* Header */}
              <div style={{ padding: '24px 28px', borderBottom: '1px solid #E8ECF0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>{activeBooking.serviceName}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B' }}>
                      <Calendar style={{ width: 14, height: 14 }} />
                      <span>{activeBooking.bookingDate}, {activeBooking.bookingTime}</span>
                    </div>
                  </div>
                  <span style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8 }}>
                    In Progress
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', border: '1px solid #E8ECF0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#64748B' }}>
                  <MapPin style={{ width: 14, height: 14, color: '#94A3B8', flexShrink: 0 }} />
                  <span>{activeBooking.address}</span>
                </div>
              </div>
 
              {/* Worker */}
              <div style={{ padding: '20px 28px', borderBottom: '1px solid #E8ECF0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <img src={activeBooking.workerImage} alt={activeBooking.workerName}
                      style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }} />
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>{activeBooking.workerName}</p>
                      <p style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>{activeBooking.workerRole}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
                        <Star style={{ width: 12, height: 12, color: '#F59E0B', fill: '#F59E0B' }} />
                        <span style={{ fontWeight: 600 }}>{activeBooking.rating}</span>
                        <span style={{ color: '#CBD5E1' }}>•</span>
                        <span>{activeBooking.jobsCompleted} jobs</span>
                      </div>
                    </div>
                  </div>
                  <button style={{ width: 38, height: 38, borderRadius: 8, border: '1px solid #E8ECF0', background: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
                  >
                    <Phone style={{ width: 15, height: 15, color: '#64748B' }} />
                  </button>
                </div>
              </div>
 
              {/* Progress */}
              <div style={{ padding: '20px 28px', background: '#F8FAFC', borderBottom: '1px solid #E8ECF0' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 20 }}>
                  Service Progress
                </p>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 13, left: 13, right: 13, height: 2, background: '#E2E8F0', borderRadius: 2 }}>
                    <div style={{ height: 2, background: '#F97316', borderRadius: 2, width: `${(activeBooking.currentStep / (progressSteps.length - 1)) * 100}%`, transition: 'width 0.4s ease' }} />
                  </div>
                  <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between' }}>
                    {progressSteps.map((step, i) => {
                      const done = i < activeBooking.currentStep;
                      const current = i === activeBooking.currentStep;
                      return (
                        <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done || current ? '#F97316' : '#ffffff', border: done || current ? 'none' : '2px solid #E2E8F0', boxShadow: current ? '0 0 0 3px rgba(249,115,22,0.15)' : 'none' }}>
                            {done ? <Check style={{ width: 13, height: 13, color: '#fff' }} />
                              : current ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                              : <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#CBD5E1' }} />}
                          </div>
                          <p style={{ fontSize: 11, fontWeight: i <= activeBooking.currentStep ? 600 : 400, color: i <= activeBooking.currentStep ? '#0F172A' : '#94A3B8', textAlign: 'center' }}>
                            {step}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ marginTop: 20, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#78350F' }}>Estimated Completion</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>{activeBooking.estimatedTime}</span>
                </div>
              </div>
 
              {/* Actions */}
              <div style={{ padding: '20px 28px' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <button style={{ flex: 1, padding: '12px 0', borderRadius: 8, border: '1px solid #E2E8F0', background: '#ffffff', fontSize: 14, fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
                  >Call Worker</button>
                  <button style={{ flex: 1, padding: '12px 0', borderRadius: 8, border: 'none', background: '#F97316', fontSize: 14, fontWeight: 700, color: '#ffffff', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#EA580C')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#F97316')}
                  >Live Track</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', border: '1px solid #E8ECF0', borderRadius: 8, padding: '12px 16px' }}>
                  <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>Total Amount</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>₹{activeBooking.price}</span>
                </div>
              </div>
            </div>
          )}
 
          {/* UPCOMING TAB */}
          {activeTab === 'upcoming' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {upcomingBookings.map(booking => (
                <div key={booking.id}
                  style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #E8ECF0', borderTop: booking.within24Hours ? '3px solid #F97316' : '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)')}
                >
                  {booking.within24Hours && (
                    <div style={{ background: '#FFF7ED', borderBottom: '1px solid #FED7AA', padding: '7px 20px', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F97316' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#EA580C' }}>Upcoming within 24 hours</span>
                    </div>
                  )}
                  <div style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                          {booking.icon}
                        </div>
                        <div>
                          <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>{booking.serviceName}</p>
                          <p style={{ fontSize: 12, color: '#94A3B8' }}>{booking.providerName}</p>
                        </div>
                      </div>
                      <p style={{ fontSize: 17, fontWeight: 700, color: '#0F172A' }}>₹{booking.price}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#64748B' }}>
                        <Calendar style={{ width: 13, height: 13, color: '#94A3B8' }} />
                        <span>{booking.date}, {booking.time}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#64748B' }}>
                        <MapPin style={{ width: 13, height: 13, color: '#94A3B8', flexShrink: 0 }} />
                        <span>{booking.address}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
                      <button style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#ffffff', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
                      >Reschedule</button>
                      <button style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'none', fontSize: 13, fontWeight: 600, color: '#EF4444', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >Cancel</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
 
          {/* COMPLETED TAB */}
          {activeTab === 'completed' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {completedBookings.map(booking => (
                <div key={booking.id}
                  style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)')}
                >
                  <div style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                            {booking.icon}
                          </div>
                          <div style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#22C55E', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check style={{ width: 9, height: 9, color: '#fff' }} />
                          </div>
                        </div>
                        <div>
                          <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 3 }}>{booking.serviceName}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94A3B8' }}>
                            <Calendar style={{ width: 11, height: 11 }} />
                            <span>{booking.completedDate}</span>
                            <span>•</span>
                            <span>{booking.workerName}</span>
                          </div>
                        </div>
                      </div>
                      <span style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 6 }}>
                        Completed
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div>
                          <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 3 }}>Amount Paid</p>
                          <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>₹{booking.price}</p>
                        </div>
                        {booking.rated ? (
                          <div>
                            <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>Your Rating</p>
                            <div style={{ display: 'flex', gap: 2 }}>
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} style={{ width: 14, height: 14, color: i < (booking.rating ?? 0) ? '#F59E0B' : '#E2E8F0', fill: i < (booking.rating ?? 0) ? '#F59E0B' : '#E2E8F0' }} />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <button style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#ffffff', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
                          >
                            <Star style={{ width: 13, height: 13 }} /> Rate Service
                          </button>
                        )}
                      </div>
                      <button style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#F97316', fontSize: 13, fontWeight: 700, color: '#ffffff', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#EA580C')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#F97316')}
                      >Rebook</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
 
        </div>
      </main>
 
      {/* RIGHT PANEL */}
      <aside style={{ width: 260, background: '#ffffff', borderLeft: '1px solid #E8ECF0', position: 'sticky', top: 0, height: '100vh', overflow: 'auto', flexShrink: 0 }}>
        <div style={{ padding: '32px 20px' }}>
 
          {activeTab === 'active' && (
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>Booking Summary</p>
              <div style={{ background: '#F8FAFC', border: '1px solid #E8ECF0', borderRadius: 10, padding: '14px 16px' }}>
                {[
                  { label: 'Status', value: 'In Progress', color: '#059669' },
                  { label: 'Date', value: activeBooking.bookingDate, color: '#0F172A' },
                  { label: 'Time', value: activeBooking.bookingTime, color: '#0F172A' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: '#64748B' }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: row.color }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 10, marginTop: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#64748B' }}>Total</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>₹{activeBooking.price}</span>
                </div>
              </div>
            </div>
          )}
 
          {activeTab === 'upcoming' && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E8ECF0', borderRadius: 10, padding: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: 30, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{upcomingBookings.length}</p>
                <p style={{ fontSize: 13, color: '#64748B' }}>Upcoming Bookings</p>
              </div>
            </div>
          )}
 
          {activeTab === 'completed' && (
            <div style={{ marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E8ECF0', borderRadius: 10, padding: '18px', textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{completedBookings.length}</p>
                <p style={{ fontSize: 13, color: '#64748B' }}>Total Completed</p>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E8ECF0', borderRadius: 10, padding: '18px', textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                  ₹{completedBookings.reduce((s, b) => s + b.price, 0)}
                </p>
                <p style={{ fontSize: 13, color: '#64748B' }}>Total Spent</p>
              </div>
            </div>
          )}
 
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>Need Help?</p>
            {[
              { Icon: Headphones, label: 'Contact Support' },
              { Icon: HelpCircle, label: 'Help Center' },
            ].map(({ Icon, label }) => (
              <button key={label}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#ffffff', fontSize: 13, fontWeight: 500, color: '#475569', cursor: 'pointer', marginBottom: 8 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
              >
                <Icon style={{ width: 14, height: 14 }} /> {label}
              </button>
            ))}
          </div>
        </div>
      </aside>
 
    </div>
  );
}
 