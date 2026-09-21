import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import {
  ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, ChevronLeft, Clock3, Compass,
  CreditCard, Filter, Heart, Home, LayoutDashboard, MapPin, Menu, MoreHorizontal, Plus, Search,
  Settings2, ShieldCheck, Sparkles, Star,
  Trophy, UserRound, Users, X, Zap
} from 'lucide-react';
import {
  getGetAvailabilityQueryKey, getGetDashboardSummaryQueryKey, getGetTurfQueryKey, getListBookingsQueryKey,
  getListReviewsQueryKey, getListTurfsQueryKey, useCreateBooking, useCreateReview, useCreateTurf,
  useCreateTurfBlock, useGetAvailability, useGetDashboardSummary, useGetTurf, useListBookings,
  useListReviews, useListTurfs, useUpdateTurfApproval
} from '@workspace/api-client-react';
import type { AvailabilitySlot, Booking, Turf } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient();
type UserRole = 'player' | 'owner' | 'admin';
const authStorageKey = 'turfly-auth-role';

function readAuthRole(): UserRole | null {
  const role = localStorage.getItem(authStorageKey);
  return role === 'player' || role === 'owner' || role === 'admin' ? role : null;
}

function useAuthRole() {
  const [role, setRole] = useState<UserRole | null>(() => readAuthRole());
  useEffect(() => {
    const syncRole = () => setRole(readAuthRole());
    window.addEventListener('turfly-auth-changed', syncRole);
    return () => window.removeEventListener('turfly-auth-changed', syncRole);
  }, []);
  return role;
}

function persistAuthRole(role: UserRole) {
  localStorage.setItem(authStorageKey, role);
  localStorage.setItem('turfly-role', role);
  window.dispatchEvent(new Event('turfly-auth-changed'));
}

function clearAuthRole() {
  localStorage.removeItem(authStorageKey);
  localStorage.removeItem('turfly-role');
  window.dispatchEvent(new Event('turfly-auth-changed'));
}

function roleHome(role: UserRole) {
  return role === 'owner' ? '/owner' : role === 'admin' ? '/admin' : '/';
}

const fallbackPhotos = [
  'https://images.pexels.com/photos/114296/pexels-photo-114296.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/1268855/pexels-photo-1268855.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/1263349/pexels-photo-1263349.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/209977/pexels-photo-209977.jpeg?auto=compress&cs=tinysrgb&w=1200',
];

function money(value?: number) { return `₹${(value ?? 0).toLocaleString('en-IN')}`; }
function formatDate(value: string) { return new Date(value).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }); }
function formatTime(value: string) { return new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }); }
function photo(turf: Turf, index = 0) { return (index ? turf.gallery?.[index - 1] : turf.imageUrl) || fallbackPhotos[(Number(turf.id) || 0) % fallbackPhotos.length]; }

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = useAuthRole();
  const nav = role === 'player'
    ? [
      { href: '/', label: 'Discover', icon: Compass },
      { href: '/bookings', label: 'My bookings', icon: CalendarDays },
    ]
    : role === 'owner'
      ? [{ href: '/owner', label: 'Owner studio', icon: LayoutDashboard }]
      : [{ href: '/admin', label: 'Admin pulse', icon: ShieldCheck }];
  const brandHref = role === 'admin' ? '/admin' : roleHome(role || 'player');
  return <div className="grain min-h-[100dvh] bg-background">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[246px] flex-col bg-sidebar px-5 py-6 text-sidebar-foreground lg:flex">
      <Link href={brandHref} data-testid="link-brand" className="mb-12 flex items-center gap-3 px-2">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[4px_4px_0_hsl(var(--accent))]"><Zap size={20} strokeWidth={2.8} /></span>
        <span className="font-serif text-2xl font-bold tracking-[-.06em]">turfly<span className="text-primary">.</span></span>
      </Link>
      <p className="px-3 pb-3 font-mono text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/45">Play local / play better</p>
      <nav className="space-y-1">
        {nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${location === href ? 'bg-sidebar-accent text-primary' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}><Icon size={18} /><span>{label}</span>{href === '/bookings' && <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 font-mono text-[10px] text-primary-foreground">2</span>}</Link>)}
      </nav>
      <div className="mt-auto">
        {role !== 'admin' && <Link href="/settings" data-testid="link-settings" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"><Settings2 size={18} /> Account settings</Link>}
        <div className="mt-4 flex items-center gap-3 border-t border-sidebar-border pt-4"><span className="grid h-9 w-9 place-items-center rounded-full bg-accent font-serif font-bold text-accent-foreground">{role === 'owner' ? 'OW' : role === 'admin' ? 'AD' : 'AR'}</span><div><p className="text-sm font-bold">{role === 'owner' ? 'Turf owner' : role === 'admin' ? 'Turfly admin' : 'Aarav Rao'}</p><p className="font-mono text-[10px] uppercase tracking-wide text-sidebar-foreground/45">{role} account</p></div><button aria-label="Sign out" data-testid="button-sign-out" onClick={() => { clearAuthRole(); window.location.href = '/login'; }} className="ml-auto rounded-lg p-1 text-sidebar-foreground/45 hover:bg-sidebar-accent hover:text-sidebar-foreground"><MoreHorizontal size={16} /></button></div>
      </div>
    </aside>
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur lg:hidden"><Link href={brandHref} className="font-serif text-2xl font-bold tracking-[-.06em]">turfly<span className="text-primary">.</span></Link><button data-testid="button-mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} className="rounded-lg p-2">{mobileOpen ? <X /> : <Menu />}</button></header>
    {mobileOpen && <div className="fixed inset-x-0 top-16 z-20 border-b border-border bg-card p-4 lg:hidden"><nav className="grid gap-1">{nav.map(({ href, label, icon: Icon }) => <Link onClick={() => setMobileOpen(false)} key={href} href={href} className="flex items-center gap-3 rounded-lg p-3 font-semibold"><Icon size={18} />{label}</Link>)}</nav></div>}
    <main className="min-h-[100dvh] lg:ml-[246px]">{children}</main>
  </div>;
}

function Button({ children, onClick, variant = 'primary', className = '', testId, disabled = false }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'dark' | 'ghost' | 'outline'; className?: string; testId?: string; disabled?: boolean }) {
  const styles = { primary: 'bg-primary text-primary-foreground hover:-translate-y-0.5 shadow-[3px_3px_0_hsl(var(--accent))]', dark: 'bg-secondary text-secondary-foreground hover:bg-secondary/90', ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground', outline: 'border border-border bg-card hover:border-accent hover:text-accent' };
  return <button disabled={disabled} data-testid={testId} onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold transition-all disabled:pointer-events-none disabled:opacity-50 ${styles[variant]} ${className}`}>{children}</button>;
}
function Tag({ children, color = 'muted' }: { children: React.ReactNode; color?: 'muted' | 'yellow' | 'teal' | 'red' }) { return <span className={`inline-flex rounded-full px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wide ${color === 'yellow' ? 'bg-primary text-primary-foreground' : color === 'teal' ? 'bg-accent/15 text-accent' : color === 'red' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>{children}</span>; }
function Stars({ rating }: { rating: number }) { return <span className="inline-flex items-center gap-1 font-mono text-xs font-medium"><Star size={13} fill="currentColor" className="text-primary" /> {rating.toFixed(1)}</span>; }
function LoadingCards() { return <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[1,2,3].map(i => <div key={i} className="animate-pulse overflow-hidden rounded-2xl bg-card"><div className="h-48 bg-muted" /><div className="space-y-3 p-5"><div className="h-4 w-2/3 rounded bg-muted" /><div className="h-3 w-1/2 rounded bg-muted" /><div className="h-8 rounded bg-muted" /></div></div>)}</div>; }
function ErrorState({ retry }: { retry?: () => void }) { return <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center"><ShieldCheck className="mx-auto mb-3 text-destructive" size={28} /><h3 className="font-serif text-xl font-bold">The pitch lights are out</h3><p className="mt-1 text-sm text-muted-foreground">We could not load this view. Try again in a moment.</p>{retry && <Button onClick={retry} variant="outline" className="mt-4">Retry</Button>}</div>; }
function EmptyState({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) { return <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center"><div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/20 text-accent"><Compass size={23} /></div><h3 className="font-serif text-xl font-bold">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{detail}</p>{action}</div>; }

function TurfCard({ turf }: { turf: Turf }) {
  const [saved, setSaved] = useState(false);
  return <Link href={`/turf/${turf.id}`} data-testid={`card-turf-${turf.id}`} className="hover-lift group block overflow-hidden rounded-2xl border border-card-border bg-card">
    <div className="relative h-52 overflow-hidden"><img src={photo(turf)} alt={turf.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-secondary/70 via-transparent to-transparent" /><div className="absolute left-4 top-4 flex gap-2"><Tag color="yellow">Verified</Tag><Tag>{turf.city}</Tag></div><button aria-label={`Save ${turf.name}`} aria-pressed={saved} data-testid={`button-save-${turf.id}`} onClick={(e) => { e.preventDefault(); setSaved(!saved); }} className={`absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-secondary/70 backdrop-blur transition-transform hover:scale-110 ${saved ? 'text-primary' : 'text-card'}`}><Heart size={16} fill={saved ? 'currentColor' : 'none'} /></button><div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-card"><div><p className="font-mono text-[10px] uppercase tracking-wider text-primary/90">{turf.games?.slice(0, 2).join(' · ')}</p><h3 className="mt-1 font-serif text-2xl font-bold leading-none">{turf.name}</h3></div><Stars rating={turf.rating || 0} /></div></div>
    <div className="p-4"><div className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin size={14} className="text-accent" />{turf.location}</div><div className="mt-4 flex items-end justify-between"><div><span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">from</span><p className="font-serif text-xl font-bold">{money(turf.startingPrice)}<span className="font-sans text-xs font-medium text-muted-foreground"> / hr</span></p></div><span className="inline-flex items-center gap-1 text-xs font-bold text-accent">View pitch <ArrowUpRight size={14} /></span></div></div>
  </Link>;
}

function Discover() {
  const [search, setSearch] = useState(''); const [game, setGame] = useState(''); const [city, setCity] = useState('');
  const params = useMemo(() => ({ search: search || undefined, game: game || undefined, location: city || undefined }), [search, game, city]);
  const turfs = useListTurfs(params); const list = turfs.data || [];
  return <div className="mx-auto max-w-[1440px] px-5 py-8 md:px-10 md:py-12">
    <section className="relative overflow-hidden rounded-[2rem] bg-secondary px-6 py-10 text-secondary-foreground md:px-12 md:py-14"><div className="absolute -right-20 -top-36 h-[440px] w-[440px] rounded-full border-[50px] border-primary/20" /><div className="absolute bottom-[-90px] right-[15%] h-64 w-64 rounded-full border-[28px] border-accent/20" /><div className="relative max-w-3xl"><div className="mb-5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.2em] text-primary"><span className="h-2 w-2 rounded-full bg-primary" /> Make today a game day</div><h1 className="font-serif text-5xl font-bold leading-[.95] tracking-[-.055em] md:text-7xl">Find your next<br /><span className="text-primary">home ground.</span></h1><p className="mt-6 max-w-lg text-sm leading-6 text-secondary-foreground/65 md:text-base">The best local pitches, sorted for people who would rather play than scroll.</p></div><div className="relative mt-9 grid gap-2 rounded-2xl bg-card p-2 text-foreground shadow-2xl md:grid-cols-[1.3fr_1fr_1fr_auto]"><label className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-3"><Search size={18} className="text-accent" /><input data-testid="input-search-turfs" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search a pitch or neighbourhood" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></label><label className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-3"><MapPin size={17} className="text-accent" /><select data-testid="select-city" value={city} onChange={e => setCity(e.target.value)} className="w-full bg-transparent text-sm outline-none"><option value="">Everywhere</option><option value="Bengaluru">Bengaluru</option><option value="Mumbai">Mumbai</option><option value="Delhi">Delhi</option></select></label><label className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-3"><Trophy size={17} className="text-accent" /><select data-testid="select-game" value={game} onChange={e => setGame(e.target.value)} className="w-full bg-transparent text-sm outline-none"><option value="">Any game</option><option value="football">Football</option><option value="cricket">Cricket</option><option value="pickleball">Pickleball</option></select></label><Button testId="button-find-pitch" className="min-h-12 px-6">Find a pitch <ArrowRight size={16} /></Button></div></section>
    <div className="flex flex-wrap items-center justify-between gap-4 py-9"><div><p className="font-mono text-[11px] uppercase tracking-[.18em] text-accent">Curated for your city</p><h2 className="mt-1 font-serif text-3xl font-bold tracking-[-.04em]">Pitches worth the detour<span className="text-primary">.</span></h2></div><div className="flex items-center gap-2"><Button onClick={() => document.querySelector<HTMLInputElement>('[data-testid="input-search-turfs"]')?.focus()} variant="outline" className="gap-2" testId="button-open-filters"><Filter size={15} /> Filters <ChevronDown size={14} /></Button><span className="font-mono text-xs text-muted-foreground">{list.length} results</span></div></div>
    {turfs.isLoading ? <LoadingCards /> : turfs.isError ? <ErrorState retry={() => turfs.refetch()} /> : list.length === 0 ? <EmptyState title="No pitches in that pocket" detail="Try a wider search or clear one of the filters. New grounds land here every week." action={<Button onClick={() => { setSearch(''); setGame(''); setCity(''); }} className="mt-5">Clear filters</Button>} /> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{list.map(turf => <TurfCard key={turf.id} turf={turf} />)}</div>}
    <section className="mt-20 grid gap-5 overflow-hidden rounded-3xl bg-primary p-7 text-primary-foreground md:grid-cols-[1fr_auto] md:items-end md:p-10"><div><p className="font-mono text-[10px] uppercase tracking-[.2em]">For turf owners</p><h2 className="mt-3 max-w-xl font-serif text-4xl font-bold leading-none tracking-[-.05em]">Your ground.<br />A fuller calendar.</h2><p className="mt-4 max-w-md text-sm leading-6 opacity-70">Bring your availability online and let the right teams find you.</p></div><Link href="/owner" data-testid="link-owner-cta" className="inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-extrabold text-secondary-foreground">Open owner studio <ArrowUpRight size={16} /></Link></section>
  </div>;
}

function Detail() {
  const { turfId = '' } = useParams<{ turfId: string }>(); const [date, setDate] = useState(new Date().toISOString().slice(0,10)); const [game, setGame] = useState('football'); const [players, setPlayers] = useState(10); const [selected, setSelected] = useState<AvailabilitySlot | null>(null); const [booked, setBooked] = useState<Booking | null>(null); const [reviewText, setReviewText] = useState(''); const [reviewRating, setReviewRating] = useState(5);
  const turf = useGetTurf(turfId, { query: { queryKey: getGetTurfQueryKey(turfId) } }); const slots = useGetAvailability(turfId, { date, game, players }, { query: { queryKey: getGetAvailabilityQueryKey(turfId, { date, game, players }) } }); const reviews = useListReviews({ turfId }); const bookingHistory = useListBookings({ status: 'completed' }); const createBooking = useCreateBooking(); const createReview = useCreateReview(); const t = turf.data;
  if (turf.isLoading) return <div className="mx-auto max-w-6xl px-5 py-12"><LoadingCards /></div>; if (turf.isError || !t) return <div className="mx-auto max-w-6xl px-5 py-12"><ErrorState retry={() => turf.refetch()} /></div>;
  const create = () => { if (!selected) return; createBooking.mutate({ data: { turfId, game, startTime: selected.startTime, endTime: selected.endTime, players, amount: selected.price } }, { onSuccess: (b) => { setBooked(b); queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetAvailabilityQueryKey(turfId, { date, game, players }) }); } }); };
  return <div className="mx-auto max-w-[1280px] px-5 py-7 md:px-10 md:py-10"><Link href="/" data-testid="link-back-discover" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"><ChevronLeft size={16} /> Back to discover</Link>
    <div className="grid gap-5 lg:grid-cols-[1.4fr_.6fr]"><div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-2"><div className="relative col-span-2 row-span-2 min-h-[320px] overflow-hidden rounded-3xl md:min-h-[440px]"><img src={photo(t)} alt={t.name} className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-secondary/75 via-transparent to-transparent" /><div className="absolute bottom-6 left-6 text-card"><Tag color="yellow">Approved turf</Tag><h1 className="mt-3 font-serif text-4xl font-bold leading-none tracking-[-.05em] md:text-6xl">{t.name}</h1></div></div>{[1,2,3].map(i => <div key={i} className="hidden overflow-hidden rounded-2xl md:block"><img src={photo(t, i)} alt="" className="h-full w-full object-cover" /></div>)}</div>
      <div className="rounded-3xl border border-card-border bg-card p-6 md:p-8"><div className="flex items-center justify-between"><Stars rating={t.rating || 0} /><span className="text-xs text-muted-foreground">{t.reviewCount} reviews</span></div><div className="mt-6 flex items-start gap-2 text-sm text-muted-foreground"><MapPin size={17} className="mt-0.5 text-accent" />{t.location}, {t.city}</div><p className="mt-5 text-sm leading-6 text-muted-foreground">{t.description}</p><div className="mt-7 border-t border-border pt-6"><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Ground notes</p><div className="mt-3 flex flex-wrap gap-2">{(t.amenities || ['Floodlights', 'Parking', 'Changing room']).map(a => <Tag key={a} color="teal">{a}</Tag>)}</div></div><div className="mt-8 flex items-end justify-between"><div><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Starting at</span><p className="font-serif text-3xl font-bold">{money(t.startingPrice)}<span className="font-sans text-xs font-normal text-muted-foreground"> / hr</span></p></div><Button onClick={() => document.getElementById('availability')?.scrollIntoView({ behavior: 'smooth' })} testId="button-scroll-book">Book this ground <ArrowRight size={16} /></Button></div></div></div>
    <div id="availability" className="mt-14 grid gap-8 lg:grid-cols-[1fr_330px]"><div><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-[11px] uppercase tracking-widest text-accent">Live availability</p><h2 className="mt-1 font-serif text-3xl font-bold">Pick your window<span className="text-primary">.</span></h2></div><div className="flex gap-2"><input data-testid="input-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm" /><select data-testid="select-booking-game" value={game} onChange={e => setGame(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm"><option value="football">Football</option><option value="cricket">Cricket</option><option value="pickleball">Pickleball</option></select></div></div><div className="mb-5 flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground"><Users size={16} className="text-accent" /><input data-testid="input-players" type="number" min="1" max="30" value={players} onChange={e => setPlayers(Number(e.target.value))} className="w-14 bg-transparent font-bold text-foreground outline-none" /> players <span className="ml-auto font-mono text-[10px] uppercase">Prices update live</span></div>{slots.isLoading ? <div className="grid gap-3 md:grid-cols-2">{[1,2,3,4].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div> : slots.isError ? <ErrorState retry={() => slots.refetch()} /> : slots.data?.length ? <div className="grid gap-3 md:grid-cols-2">{slots.data.map(slot => <button disabled={!slot.available} data-testid={`button-slot-${slot.id}`} key={slot.id} onClick={() => slot.available && setSelected(slot)} className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${selected?.id === slot.id ? 'border-accent bg-accent/10 ring-2 ring-accent/20' : 'border-card-border bg-card hover-lift'} ${!slot.available ? 'cursor-not-allowed opacity-45' : ''}`}><div className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-xl ${selected?.id === slot.id ? 'bg-accent text-accent-foreground' : 'bg-muted text-accent'}`}><Clock3 size={16} /></span><div><p className="font-bold">{slot.label || `${formatTime(slot.startTime)} – ${formatTime(slot.endTime)}`}</p><p className="text-xs text-muted-foreground">{slot.available ? 'Open for booking' : slot.reason || 'Unavailable'}</p></div></div><span className="font-serif text-lg font-bold">{money(slot.price)}</span></button>)}</div> : <EmptyState title="No windows for this day" detail="Try another date, or check a different game format." />}</div>
      <aside className="self-start rounded-3xl bg-secondary p-6 text-secondary-foreground lg:sticky lg:top-6"><p className="font-mono text-[10px] uppercase tracking-widest text-primary">Your booking</p><h3 className="mt-3 font-serif text-2xl font-bold">{selected ? `${formatDate(selected.startTime)}` : 'Nothing selected yet'}</h3>{selected && <div className="mt-5 space-y-3 border-t border-secondary-foreground/15 pt-5 text-sm"><div className="flex justify-between"><span className="text-secondary-foreground/60">Window</span><span>{formatTime(selected.startTime)} – {formatTime(selected.endTime)}</span></div><div className="flex justify-between"><span className="text-secondary-foreground/60">Format</span><span className="capitalize">{game}</span></div><div className="flex justify-between"><span className="text-secondary-foreground/60">Players</span><span>{players}</span></div><div className="flex justify-between pt-3 font-serif text-xl font-bold"><span>Total</span><span className="text-primary">{money(selected.price)}</span></div></div>}<Button disabled={!selected || createBooking.isPending} onClick={create} variant="primary" testId="button-confirm-booking" className="mt-7 w-full">{createBooking.isPending ? 'Reserving…' : booked ? 'Reserved' : 'Confirm booking'} <Check size={16} /></Button>{booked && <p className="mt-3 text-center text-xs text-primary">Booking confirmed. See you on the ground.</p>}</aside></div>
    <section className="mt-16 border-t border-border pt-12"><div className="mb-6 flex items-end justify-between"><div><p className="font-mono text-[11px] uppercase tracking-widest text-accent">From the sideline</p><h2 className="mt-1 font-serif text-3xl font-bold">What players say</h2></div><span className="font-mono text-xs text-muted-foreground">{reviews.data?.length || 0} notes</span></div>{reviews.data?.length ? <div className="grid gap-4 md:grid-cols-2">{reviews.data.map(r => <article key={r.id} className="rounded-2xl border border-card-border bg-card p-5"><div className="flex items-center justify-between"><span className="font-bold">{r.authorName}</span><Stars rating={r.rating} /></div><p className="mt-4 text-sm leading-6 text-muted-foreground">“{r.comment}”</p>{r.ownerReply && <p className="mt-4 border-l-2 border-primary pl-3 text-xs text-muted-foreground"><strong className="text-foreground">Owner reply: </strong>{r.ownerReply}</p>}</article>)}</div> : <EmptyState title="Be first on the whistle" detail="Completed bookings unlock a review for this ground." />}<div className="mt-6 rounded-2xl border border-card-border bg-card p-5"><p className="font-mono text-[10px] uppercase tracking-widest text-accent">Share the signal</p><h3 className="mt-1 font-serif text-xl font-bold">Leave a note for the next team</h3><div className="mt-4 flex gap-1">{[1,2,3,4,5].map(value => <button key={value} data-testid={`button-review-rating-${value}`} onClick={() => setReviewRating(value)} className={`rounded-lg p-2 ${value <= reviewRating ? 'text-primary' : 'text-muted'}`}><Star size={19} fill="currentColor" /></button>)}</div><textarea data-testid="input-review-comment" value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="How did the ground feel?" className="mt-2 min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none" /><div className="mt-3 flex justify-end"><Button disabled={!reviewText.trim() || (!booked?.id && !bookingHistory.data?.some(b => b.turfId === turfId)) || createReview.isPending} onClick={() => createReview.mutate({ data: { turfId, bookingId: booked?.id || bookingHistory.data?.find(b => b.turfId === turfId)?.id || '', rating: reviewRating, comment: reviewText } }, { onSuccess: () => { setReviewText(''); queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey({ turfId }) }); } })} testId="button-submit-review">{createReview.isPending ? 'Posting…' : 'Post review'} <ArrowRight size={15} /></Button></div></div></section>
  </div>;
}

function Bookings() {
  const [status, setStatus] = useState<string>(''); const bookings = useListBookings(status ? { status } : undefined); const list = bookings.data || [];
  return <div className="mx-auto max-w-6xl px-5 py-10 md:px-10 md:py-14"><PageIntro eyebrow="Your matchday" title="Bookings" detail="Every pitch you have claimed, in one clean lineup." /><div className="mb-8 flex gap-2 overflow-x-auto">{['', 'confirmed', 'pending', 'completed', 'cancelled'].map(s => <button data-testid={`button-filter-bookings-${s || 'all'}`} key={s || 'all'} onClick={() => setStatus(s)} className={`rounded-full px-4 py-2 text-xs font-bold capitalize ${status === s ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}>{s || 'All bookings'}</button>)}</div>{bookings.isLoading ? <LoadingCards /> : bookings.isError ? <ErrorState retry={() => bookings.refetch()} /> : list.length ? <div className="space-y-3">{list.map(b => <BookingRow key={b.id} booking={b} />)}</div> : <EmptyState title="No bookings in this lineup" detail="Find a local pitch and your next game will show up here." action={<Link href="/" className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-bold">Find a pitch <ArrowRight size={15} className="ml-2" /></Link>} />}</div>;
}
function BookingRow({ booking: b }: { booking: Booking }) { const [, setLocation] = useLocation(); return <article data-testid={`row-booking-${b.id}`} className="hover-lift grid gap-4 rounded-2xl border border-card-border bg-card p-5 md:grid-cols-[1fr_auto_auto] md:items-center"><div className="flex items-start gap-4"><div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/20 text-accent"><Trophy size={20} /></div><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-serif text-xl font-bold">{b.turfName}</h3><Tag color={b.status === 'confirmed' ? 'teal' : b.status === 'cancelled' ? 'red' : 'yellow'}>{b.status}</Tag></div><p className="mt-1 text-sm text-muted-foreground">{formatDate(b.startTime)} · {formatTime(b.startTime)} – {formatTime(b.endTime)} · {b.game} · {b.players} players</p></div></div><div className="md:text-right"><p className="font-serif text-xl font-bold">{money(b.amount)}</p><p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{b.paymentStatus}</p></div><Button onClick={() => setLocation(`/turf/${b.turfId}`)} variant="outline" testId={`button-view-booking-${b.id}`}>Details <ArrowRight size={15} /></Button></article>; }
function PageIntro({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) { return <div className="mb-10 flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-[11px] uppercase tracking-[.18em] text-accent">{eyebrow}</p><h1 className="mt-2 font-serif text-5xl font-bold tracking-[-.06em]">{title}<span className="text-primary">.</span></h1><p className="mt-3 max-w-xl text-sm text-muted-foreground">{detail}</p></div>{action}</div>; }

function LoginPage() {
  const [, setLocation] = useLocation();
  const [selectedRole, setSelectedRole] = useState<'player' | 'owner'>('player');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    persistAuthRole(selectedRole);
    setLocation(roleHome(selectedRole));
  };

  return <div className="grain min-h-[100dvh] bg-secondary text-secondary-foreground">
    <div className="mx-auto grid min-h-[100dvh] max-w-[1240px] lg:grid-cols-[.85fr_1.15fr]">
      <section className="relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-36 -top-28 h-[420px] w-[420px] rounded-full border-[52px] border-primary/20" />
        <div className="absolute -bottom-20 left-[-100px] h-[330px] w-[330px] rounded-full border-[30px] border-accent/20" />
        <Link href="/login" className="relative flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[4px_4px_0_hsl(var(--accent))]"><Zap size={20} strokeWidth={2.8} /></span>
          <span className="font-serif text-2xl font-bold tracking-[-.06em]">turfly<span className="text-primary">.</span></span>
        </Link>
        <div className="relative max-w-md">
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[.2em] text-primary">Play local / play better</p>
          <h1 className="font-serif text-6xl font-bold leading-[.94] tracking-[-.06em]">Your next game starts here<span className="text-primary">.</span></h1>
          <p className="mt-6 max-w-sm text-sm leading-6 text-secondary-foreground/65">One account for the pitches you play on, or the ground you run.</p>
        </div>
        <p className="relative font-mono text-[10px] uppercase tracking-[.16em] text-secondary-foreground/40">Turfly marketplace · Bengaluru and beyond</p>
      </section>
      <main className="flex min-h-[100dvh] items-center bg-background px-5 py-10 text-foreground md:px-12">
        <div className="mx-auto w-full max-w-xl">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Zap size={20} /></span>
            <span className="font-serif text-2xl font-bold tracking-[-.06em]">turfly<span className="text-primary">.</span></span>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[.18em] text-accent">Welcome back</p>
          <h2 className="mt-2 font-serif text-4xl font-bold tracking-[-.05em] md:text-5xl">Sign in to your ground<span className="text-primary">.</span></h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Choose the workspace that matches how you use Turfly.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button type="button" data-testid="button-login-role-player" onClick={() => setSelectedRole('player')} className={`rounded-2xl border p-5 text-left transition-all ${selectedRole === 'player' ? 'border-accent bg-accent/10 ring-2 ring-accent/15' : 'border-card-border bg-card hover:border-accent/50'}`}>
              <UserRound className="mb-7 text-accent" size={22} />
              <p className="font-serif text-xl font-bold">Player</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Discover pitches, book a slot, and share your matchday experience.</p>
            </button>
            <button type="button" data-testid="button-login-role-owner" onClick={() => setSelectedRole('owner')} className={`rounded-2xl border p-5 text-left transition-all ${selectedRole === 'owner' ? 'border-accent bg-accent/10 ring-2 ring-accent/15' : 'border-card-border bg-card hover:border-accent/50'}`}>
              <LayoutDashboard className="mb-7 text-accent" size={22} />
              <p className="font-serif text-xl font-bold">Turf owner</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Manage your listings, availability, bookings, and earnings.</p>
            </button>
          </div>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block"><span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Email address</span><input required autoComplete="email" type="email" data-testid="input-login-email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" /></label>
            <label className="block"><span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Password</span><input required autoComplete="current-password" type="password" data-testid="input-login-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15" /></label>
            <button type="submit" data-testid="button-login-submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-extrabold text-primary-foreground shadow-[3px_3px_0_hsl(var(--accent))] transition hover:-translate-y-0.5">Continue as {selectedRole === 'player' ? 'player' : 'turf owner'} <ArrowRight size={16} /></button>
          </form>
          <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">Demo workspace · any valid email and password will continue</p>
        </div>
      </main>
    </div>
  </div>;
}

function AdminLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    persistAuthRole('admin');
    setLocation('/admin');
  };

  return <div className="grain flex min-h-[100dvh] items-center justify-center bg-secondary px-5 py-10 text-secondary-foreground">
    <div className="w-full max-w-md rounded-3xl bg-background p-7 text-foreground shadow-2xl md:p-10">
      <Link href="/login" className="mb-12 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><ShieldCheck size={20} /></span>
        <span className="font-serif text-2xl font-bold tracking-[-.06em]">turfly<span className="text-primary">.</span></span>
      </Link>
      <p className="font-mono text-[11px] uppercase tracking-[.18em] text-accent">Restricted workspace</p>
      <h1 className="mt-2 font-serif text-4xl font-bold tracking-[-.05em]">Admin pulse<span className="text-primary">.</span></h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Sign in to review listings and monitor the marketplace.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <label className="block"><span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Admin email</span><input required autoComplete="email" type="email" data-testid="input-admin-email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@turfly.in" className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15" /></label>
        <label className="block"><span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Password</span><input required autoComplete="current-password" type="password" data-testid="input-admin-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15" /></label>
        <button type="submit" data-testid="button-admin-login-submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3.5 text-sm font-extrabold text-secondary-foreground transition hover:bg-secondary/90">Enter admin workspace <ArrowRight size={16} /></button>
      </form>
      <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">Private admin route · demo workspace</p>
    </div>
  </div>;
}

function AccessDenied({ role }: { role: UserRole }) {
  const [, setLocation] = useLocation();
  return <div className="mx-auto flex min-h-[70dvh] max-w-xl items-center px-5 py-12 md:px-10">
    <div className="w-full rounded-3xl border border-card-border bg-card p-8 text-center md:p-12">
      <ShieldCheck className="mx-auto mb-5 text-accent" size={32} />
      <p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">Workspace boundary</p>
      <h1 className="mt-2 font-serif text-3xl font-bold">That view is not part of this account<span className="text-primary">.</span></h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">You are signed in as a {role}. This account can only open its own workspace.</p>
      <Button onClick={() => setLocation(roleHome(role))} className="mt-6">Go to my workspace <ArrowRight size={16} /></Button>
    </div>
  </div>;
}

function Owner() {
  const [showBlock, setShowBlock] = useState(false); const [turfId, setTurfId] = useState(''); const [form, setForm] = useState({ name: '', city: '', location: '', description: '', imageUrl: fallbackPhotos[0], games: 'football', startingPrice: '1200' });
  const turfs = useListTurfs(); const bookings = useListBookings(); const summary = useGetDashboardSummary(); const createTurf = useCreateTurf(); const createBlock = useCreateTurfBlock(); const [block, setBlock] = useState({ startTime: '', endTime: '', reason: 'maintenance' });
  const mine = turfs.data || []; const upcoming = bookings.data?.filter(b => ['pending', 'confirmed'].includes(b.status)) || [];
  const stats: { label: string; value: string | number; icon: typeof Home }[] = [['Live listings', summary.data?.approvedTurfs ?? mine.filter(t => t.approvalStatus === 'approved').length, Home], ['Upcoming games', summary.data?.upcomingBookings ?? upcoming.length, CalendarDays], ['Gross revenue', money(summary.data?.grossRevenue), CreditCard], ['Commission', money(summary.data?.platformCommission), Zap]].map(([label, value, icon]) => ({ label: String(label), value: value as string | number, icon: icon as typeof Home }));
  return <div className="mx-auto max-w-6xl px-5 py-10 md:px-10 md:py-14"><PageIntro eyebrow="Owner studio" title="Run your ground" detail="Keep your calendar sharp, your listings clear, and your best hours booked." action={<Button onClick={() => document.getElementById('new-listing')?.scrollIntoView({ behavior: 'smooth' })} testId="button-new-listing"><Plus size={16} /> Add listing</Button>} /><div className="grid gap-4 md:grid-cols-4">{stats.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-card-border bg-card p-5"><Icon size={18} className="text-accent" /><p className="mt-6 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 font-serif text-3xl font-bold">{value}</p></div>)}</div><div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_.85fr]"><section><div className="mb-4 flex items-center justify-between"><h2 className="font-serif text-2xl font-bold">Your listings</h2><Tag>{mine.length} total</Tag></div>{mine.length ? <div className="space-y-3">{mine.map(t => <div key={t.id} className="flex items-center gap-4 rounded-2xl border border-card-border bg-card p-4"><img src={photo(t)} alt="" className="h-16 w-20 rounded-xl object-cover" /><div className="min-w-0 flex-1"><h3 className="font-bold">{t.name}</h3><p className="truncate text-xs text-muted-foreground">{t.location}, {t.city}</p></div><Tag color={t.approvalStatus === 'approved' ? 'teal' : t.approvalStatus === 'rejected' ? 'red' : 'yellow'}>{t.approvalStatus}</Tag><Button variant="ghost" testId={`button-edit-turf-${t.id}`}><MoreHorizontal size={18} /></Button></div>)}</div> : <EmptyState title="Your studio is quiet" detail="Submit your first listing and start opening your calendar." />}</section><section><div className="mb-4 flex items-center justify-between"><h2 className="font-serif text-2xl font-bold">Upcoming requests</h2><Tag>{upcoming.length} visible</Tag></div>{upcoming.length ? <div className="space-y-3">{upcoming.map(b => <BookingRow key={b.id} booking={b} />)}</div> : <EmptyState title="No requests yet" detail="When players find your ground, approvals appear here." />}</section></div>
    <section id="new-listing" className="mt-10 rounded-3xl bg-secondary p-6 text-secondary-foreground md:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-widest text-primary">New listing</p><h2 className="mt-2 font-serif text-3xl font-bold">Put your pitch on the map</h2></div><Tag color="yellow">Review in 1–2 days</Tag></div><div className="mt-7 grid gap-3 md:grid-cols-2"><input data-testid="input-listing-name" placeholder="Listing name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-secondary-foreground/15 bg-secondary-foreground/5 px-4 py-3 text-sm outline-none placeholder:text-secondary-foreground/45" /><input data-testid="input-listing-city" placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="rounded-xl border border-secondary-foreground/15 bg-secondary-foreground/5 px-4 py-3 text-sm outline-none placeholder:text-secondary-foreground/45" /><input data-testid="input-listing-location" placeholder="Neighbourhood / address" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="rounded-xl border border-secondary-foreground/15 bg-secondary-foreground/5 px-4 py-3 text-sm outline-none placeholder:text-secondary-foreground/45" /><input data-testid="input-listing-price" type="number" placeholder="Starting price / hour" value={form.startingPrice} onChange={e => setForm({ ...form, startingPrice: e.target.value })} className="rounded-xl border border-secondary-foreground/15 bg-secondary-foreground/5 px-4 py-3 text-sm outline-none placeholder:text-secondary-foreground/45" /><textarea data-testid="input-listing-description" placeholder="What makes this ground worth the trip?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="min-h-24 rounded-xl border border-secondary-foreground/15 bg-secondary-foreground/5 px-4 py-3 text-sm outline-none placeholder:text-secondary-foreground/45 md:col-span-2" /></div><div className="mt-5 flex justify-end"><Button disabled={createTurf.isPending} onClick={() => createTurf.mutate({ data: { name: form.name, city: form.city, location: form.location, description: form.description, imageUrl: form.imageUrl, games: [form.games], startingPrice: Number(form.startingPrice) } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTurfsQueryKey() }); setForm({ ...form, name: '', description: '' }); } })} testId="button-submit-listing">{createTurf.isPending ? 'Submitting…' : 'Submit for approval'} <ArrowRight size={16} /></Button></div></section>
    <section className="mt-8 rounded-3xl border border-card-border bg-card p-6 md:p-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-widest text-accent">Calendar control</p><h2 className="mt-1 font-serif text-2xl font-bold">Block a time window</h2></div><Button variant="outline" onClick={() => setShowBlock(!showBlock)} testId="button-toggle-block">{showBlock ? 'Close' : 'Block time'} <Clock3 size={16} /></Button></div>{showBlock && <div className="mt-6 grid gap-3 md:grid-cols-4"><select data-testid="select-block-turf" value={turfId} onChange={e => setTurfId(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-3 text-sm"><option value="">Choose listing</option>{mine.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select><input data-testid="input-block-start" type="datetime-local" value={block.startTime} onChange={e => setBlock({ ...block, startTime: e.target.value })} className="rounded-xl border border-border bg-background px-3 py-3 text-sm" /><input data-testid="input-block-end" type="datetime-local" value={block.endTime} onChange={e => setBlock({ ...block, endTime: e.target.value })} className="rounded-xl border border-border bg-background px-3 py-3 text-sm" /><Button disabled={!turfId || createBlock.isPending} onClick={() => createBlock.mutate({ turfId, data: { startTime: block.startTime, endTime: block.endTime, reason: block.reason as 'maintenance' | 'owner_use' } }, { onSuccess: () => setShowBlock(false) })} testId="button-submit-block">Save block <Check size={16} /></Button></div>}</section>
  </div>;
}

function Admin() {
  const turfs = useListTurfs(); const bookings = useListBookings(); const summary = useGetDashboardSummary(); const approve = useUpdateTurfApproval(); const pending = (turfs.data || []).filter(t => t.approvalStatus === 'pending');
  return <div className="mx-auto max-w-6xl px-5 py-10 md:px-10 md:py-14"><PageIntro eyebrow="Admin pulse" title="Keep the game moving" detail="A clear view of supply, trust, and the bookings crossing the platform." /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[['Approved turfs', summary.data?.approvedTurfs ?? 0], ['In review', summary.data?.pendingApprovals ?? pending.length], ['Upcoming', summary.data?.upcomingBookings ?? 0], ['Gross revenue', money(summary.data?.grossRevenue)], ['Your commission', money(summary.data?.platformCommission)]].map(([a,b]) => <div key={String(a)} className="rounded-2xl border border-card-border bg-card p-4"><p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{a}</p><p className="mt-3 font-serif text-2xl font-bold">{b}</p></div>)}</div><section className="mt-10"><div className="mb-5 flex items-end justify-between"><div><p className="font-mono text-[11px] uppercase tracking-widest text-accent">Trust queue</p><h2 className="mt-1 font-serif text-3xl font-bold">Listings awaiting a call</h2></div><Tag color="yellow">{pending.length} pending</Tag></div>{turfs.isLoading ? <LoadingCards /> : turfs.isError ? <ErrorState retry={() => turfs.refetch()} /> : pending.length ? <div className="space-y-3">{pending.map(t => <div key={t.id} className="grid gap-4 rounded-2xl border border-card-border bg-card p-4 md:grid-cols-[88px_1fr_auto] md:items-center"><img src={photo(t)} alt="" className="h-20 w-full rounded-xl object-cover md:w-[88px]" /><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-serif text-xl font-bold">{t.name}</h3><Tag>{t.city}</Tag></div><p className="mt-1 text-sm text-muted-foreground">{t.location} · {t.ownerName} · {t.games?.join(', ')}</p><p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{t.description}</p></div><div className="flex gap-2 md:flex-col"><Button disabled={approve.isPending} onClick={() => approve.mutate({ turfId: t.id, data: { status: 'approved' } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTurfsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); } })} testId={`button-approve-${t.id}`} className="text-xs"><Check size={15} /> Approve</Button><Button disabled={approve.isPending} onClick={() => approve.mutate({ turfId: t.id, data: { status: 'rejected' } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTurfsQueryKey() }) })} variant="outline" testId={`button-reject-${t.id}`} className="text-xs"><X size={15} /> Reject</Button></div></div>)}</div> : <EmptyState title="The queue is clear" detail="Every submitted listing has been reviewed. Nice work." />}</section><section className="mt-12"><div className="mb-5 flex items-center justify-between"><h2 className="font-serif text-3xl font-bold">All booking visibility</h2><Tag>{bookings.data?.length ?? 0} bookings</Tag></div><BookingLog /></section></div>;
}
function BookingLog() { const bookings = useListBookings(); return bookings.data?.length ? <div className="overflow-x-auto rounded-2xl border border-card-border bg-card"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-border bg-muted/50 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="p-4">Ground</th><th className="p-4">When</th><th className="p-4">Format</th><th className="p-4">Value</th><th className="p-4">Status</th></tr></thead><tbody>{bookings.data.map(b => <tr key={b.id} className="border-b border-border last:border-0"><td className="p-4 font-bold">{b.turfName}</td><td className="p-4 text-muted-foreground">{formatDate(b.startTime)} · {formatTime(b.startTime)}</td><td className="p-4 capitalize">{b.game}</td><td className="p-4 font-bold">{money(b.amount)}</td><td className="p-4"><Tag color={b.status === 'confirmed' ? 'teal' : 'yellow'}>{b.status}</Tag></td></tr>)}</tbody></table></div> : <EmptyState title="No booking traffic yet" detail="The platform log will populate as players reserve a time." />; }

function Settings() {
  const role = useAuthRole();
  if (!role) return null;
  return <div className="mx-auto max-w-3xl px-5 py-10 md:px-10 md:py-14">
    <PageIntro eyebrow="Your account" title="Settings" detail="Manage your Turfly session and account details." />
    <div className="space-y-4">
      <section className="rounded-2xl border border-card-border bg-card p-6">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent font-serif text-xl font-bold text-accent-foreground">{role === 'owner' ? 'OW' : 'AR'}</span>
          <div><h2 className="font-serif text-2xl font-bold">{role === 'owner' ? 'Turf owner' : 'Aarav Rao'}</h2><p className="text-sm text-muted-foreground">{role === 'owner' ? 'owner@turfly.in' : 'aarav@example.com'}</p></div>
        </div>
      </section>
      <section className="rounded-2xl border border-card-border bg-card p-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-accent">Current workspace</p>
        <h2 className="mt-2 font-serif text-2xl font-bold capitalize">{role === 'owner' ? 'Turf owner' : 'Player'} account</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{role === 'owner' ? 'You can manage listings, availability, booking requests, and owner earnings.' : 'You can discover pitches, reserve slots, and review completed games.'}</p>
        <button data-testid="button-settings-sign-out" onClick={() => { clearAuthRole(); window.location.href = '/login'; }} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-extrabold transition hover:border-destructive hover:text-destructive">Sign out <ArrowRight size={15} /></button>
      </section>
    </div>
  </div>;
}

function Router() {
  const [location] = useLocation();
  const role = useAuthRole();

  if (location === '/login') return role ? <Redirect to={roleHome(role)} /> : <LoginPage />;
  if (location === '/admin' && role !== 'admin') return <AdminLogin />;
  if (!role) return <Redirect to="/login" />;

  const allowed = role === 'player'
    ? location === '/' || location.startsWith('/turf/') || location === '/bookings' || location === '/settings'
    : role === 'owner'
      ? location === '/owner' || location === '/settings'
      : location === '/admin';

  if (!allowed) return <ErrorBoundary resetKey={location}><Shell><AccessDenied role={role} /></Shell></ErrorBoundary>;
  return <ErrorBoundary resetKey={location}><Shell><Switch><Route path="/" component={Discover} /><Route path="/turf/:turfId" component={Detail} /><Route path="/bookings" component={Bookings} /><Route path="/owner" component={Owner} /><Route path="/admin" component={Admin} /><Route path="/settings" component={Settings} /><Route component={NotFound} /></Switch></Shell></ErrorBoundary>;
}
function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>; }
export default App;