'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Heart, Search, Menu, X, MapPin, Shield, Plus, Star, PackageSearch } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import LiveComments from '@/components/LiveComments';

/* ---------- Types ---------- */
interface Size { label: string; price: number; discountPrice?: number | null; stock: number; weight?: string; }
interface Product {
  id: number; code: string; name: string; brand: string; category: string; gender: string;
  fragranceFamily: string; description: string; topNotes: string; middleNotes: string;
  baseNotes: string; image: string; images: string[]; video: string; status: string; sizes: Size[];
  categoryId: number | null; brandId: number | null; familyIds: number[]; collectionIds: number[];
}
interface TaxItem { id: number; name: string; enabled: boolean; sortOrder: number; country?: string; description?: string; }
interface Taxonomy { categories: TaxItem[]; brands: TaxItem[]; families: TaxItem[]; collections: TaxItem[]; }
interface CartItem {
  productId: number; name: string; brand: string; image: string; code: string;
  size: string; quantity: number; unitPrice: number;
}
interface ReviewItem {
  id: number; name: string; rating: number; message: string; pinned: boolean;
  adminReply: string; createdAt: string;
}
type Settings = Record<string, string>;

const WA_ICON = (cls: string) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={cls} fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.485-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.05-.52-.099-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.355l-.14-.083-3.086.806.817-2.992-.198-.125a9.868 9.868 0 01-1.52-5.26c0-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.822 11.822 0 0012.004 1C6.477 1 2 5.477 2 11.004c0 2.105.554 4.16 1.604 5.96L1 22l5.127-1.345a11.81 11.81 0 005.88 1.55h.005c6.527 0 11.834-5.31 11.834-11.837 0-3.157-1.23-6.124-3.467-8.35"/></svg>
);

const fmt = (n: number) => `KES ${n.toLocaleString()}`;

export default function TheScentAtelier() {
  const [settings, setSettings] = useState<Settings>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [tax, setTax] = useState<Taxonomy>({ categories: [], brands: [], families: [], collections: [] });
  const [loaded, setLoaded] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<{ categoryId: number | null; brandId: number | null; familyId: number | null; collectionId: number | null; gender: string | null; availability: boolean }>({ categoryId: null, brandId: null, familyId: null, collectionId: null, gender: null, availability: false });
  const [sortBy, setSortBy] = useState<'newest' | 'bestselling' | 'price-asc' | 'price-desc'>('newest');
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<Size | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  // Checkout
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkout, setCheckout] = useState({ name: '', phone: '', email: '', estate: '', street: '', apartment: '', landmark: '', city: 'Nairobi', payment: 'M-Pesa' });
  const [placing, setPlacing] = useState(false);
  // Tracking
  const [trackOpen, setTrackOpen] = useState(false);
  const [track, setTrack] = useState({ code: '', phone: '' });
  const [trackResult, setTrackResult] = useState<any>(null);
  // Reviews
  const [productReviews, setProductReviews] = useState<ReviewItem[]>([]);
  const [reviewForm, setReviewForm] = useState({ name: '', orderCode: '', phone: '', rating: 5, message: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);

  const s = (key: string, fallback = '') => settings[key] || fallback;
  const waNumber = s('whatsapp', '254721606729');
  const waHref = `https://wa.me/${waNumber}`;
  const waLink = (text: string) => `${waHref}?text=${encodeURIComponent(text)}`;

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
    ]).then(([st, pr]) => {
      setSettings(st.settings ?? {});
      setProducts(pr.products ?? []);
      setLoaded(true);
    }).catch(() => setLoaded(true));
    fetch('/api/taxonomy').then(r => r.json())
      .then(tx => setTax({ categories: (tx.categories ?? []).filter((x: TaxItem) => x.enabled), brands: (tx.brands ?? []).filter((x: TaxItem) => x.enabled), families: (tx.families ?? []).filter((x: TaxItem) => x.enabled), collections: (tx.collections ?? []).filter((x: TaxItem) => x.enabled) }))
      .catch(() => {});
  }, []);

  const clearFilters = () => { setFilters({ categoryId: null, brandId: null, familyId: null, collectionId: null, gender: null, availability: false }); setSearchTerm(''); };
  const hasActiveFilters = searchTerm !== '' || Object.values(filters).some(v => v !== null && v !== false);

  const openProduct = useCallback(async (p: Product) => {
    setSelectedProduct(p);
    setSelectedSize(p.sizes[0] ?? null);
    setShowReviewForm(false);
    setProductReviews([]);
    fetch(`/api/products/${p.id}`).catch(() => {}); // count a view
    try {
      const res = await fetch(`/api/reviews?productId=${p.id}`);
      const data = await res.json();
      setProductReviews(data.reviews ?? []);
    } catch { /* ignore */ }
  }, []);

  const minPrice = (p: Product) => {
    if (p.sizes.length === 0) return 0;
    return Math.min(...p.sizes.map(sz => sz.discountPrice || sz.price));
  };
  const hasDiscount = (p: Product) => p.sizes.some(sz => sz.discountPrice);
  const inStock = (p: Product) => p.sizes.some(sz => sz.stock > 0) && p.status !== 'Out of Stock' && p.status !== 'Coming Soon';

  const addToCart = (product: Product, size: Size | null) => {
    if (!size) { toast.error('Please select a size'); return; }
    if (!inStock(product) || size.stock <= 0) { toast.error('This size is currently unavailable'); return; }
    const unitPrice = size.discountPrice || size.price;
    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === product.id && i.size === size.label);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { productId: product.id, name: product.name, brand: product.brand, image: product.image, code: product.code, size: size.label, quantity: 1, unitPrice }];
    });
    setIsCartOpen(true);
    toast.success(`${product.name} (${size.label}) added to cart`, { icon: '🛍️', style: { background: '#1f2937', color: '#d4af77', border: '1px solid #d4af77' } });
  };

  const changeQty = (index: number, delta: number) => {
    setCart(prev => prev.map((item, i) => i === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
  };
  const removeFromCart = (index: number) => setCart(prev => prev.filter((_, i) => i !== index));
  const cartTotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const toggleWishlist = (id: number) => {
    setWishlist(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    toast.success(wishlist.includes(id) ? 'Removed from wishlist' : 'Added to wishlist ❤️');
  };

  const whatsappInquiry = (product: Product, size?: Size | null) => {
    const price = size ? (size.discountPrice || size.price) : minPrice(product);
    window.open(waLink(
      `Hello ${s('businessName', 'The Scent Atelier')}! 👋\n\nI'm interested in this fragrance:\n\n🧴 Product: ${product.name}\n🏷️ Brand: ${product.brand}\n🔖 Code: ${product.code}\n📂 Category: ${product.category}\n👤 Gender: ${product.gender}\n` +
      (size ? `📏 Size: ${size.label}\n` : '') +
      `💰 Price: ${fmt(price)}\n\nPlease share more details and availability. Thank you!`
    ), '_blank');
    toast.success('Opening WhatsApp inquiry...', { icon: '💬' });
  };

  const placeOrder = async () => {
    if (placing) return;
    if (checkout.name.trim().length < 2) { toast.error('Enter your full name'); return; }
    if (!/^\+?[0-9\s-]{9,15}$/.test(checkout.phone.trim())) { toast.error('Enter a valid phone number'); return; }
    setPlacing(true);
    try {
      const address = [checkout.estate, checkout.street, checkout.apartment, checkout.landmark].filter(Boolean).join(', ');
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: checkout.name.trim(), phone: checkout.phone.trim(), email: checkout.email.trim(),
          address, city: checkout.city, payment: checkout.payment,
          items: cart.map(i => ({ productId: i.productId, size: i.size, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Could not place the order'); setPlacing(false); return; }

      const order = data.order;
      const msg =
        `Hello ${s('businessName', 'The Scent Atelier')}! 🛍️\n\nNEW ORDER: ${order.code}\n\n` +
        `👤 Customer: ${order.name}\n📞 Phone: ${order.phone}\n📍 Address: ${order.address || '-'}, ${order.city}\n💳 Payment: ${order.payment}\n\n` +
        `Items:\n` +
        order.items.map((it: any, i: number) => `${i + 1}. ${it.name} (${it.size}) x${it.quantity} @ ${fmt(it.price)} = ${fmt(it.price * it.quantity)}`).join('\n') +
        `\n\n💰 GRAND TOTAL: ${fmt(order.total)}\n\nThank you!`;
      window.open(waLink(msg), '_blank');
      toast.success(`Order ${order.code} placed! Save this code to track your order.`, { duration: 8000 });
      setCart([]); setCheckoutOpen(false); setIsCartOpen(false);
      // Refresh products so stock/status changes reflect immediately
      fetch('/api/products').then(r => r.json()).then(d => setProducts(d.products ?? []));
    } catch {
      toast.error('Network error. Please try again.');
    } finally { setPlacing(false); }
  };

  const doTrack = async () => {
    setTrackResult(null);
    try {
      const res = await fetch(`/api/orders/track?code=${encodeURIComponent(track.code.trim())}&phone=${encodeURIComponent(track.phone.trim())}`);
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Order not found'); return; }
      setTrackResult(data.order);
    } catch { toast.error('Network error'); }
  };

  const submitReview = async () => {
    if (!selectedProduct) return;
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProduct.id, ...reviewForm }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Could not submit review'); return; }
      toast.success(data.message || 'Review submitted for approval!', { duration: 6000 });
      setShowReviewForm(false);
      setReviewForm({ name: '', orderCode: '', phone: '', rating: 5, message: '' });
    } catch { toast.error('Network error'); }
  };

  const subscribeNewsletter = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newsletterEmail)) { toast.error('Please enter a valid email address'); return; }
    toast.success('Welcome to the family! 💌'); setNewsletterEmail('');
  };

  // Best-selling rank derived from views as a proxy signal available client-side
  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase();
    const list = products.filter(p => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      const f = filters;
      return matchesSearch
        && (!f.categoryId || p.categoryId === f.categoryId)
        && (!f.brandId || p.brandId === f.brandId)
        && (!f.familyId || (p.familyIds ?? []).includes(f.familyId))
        && (!f.collectionId || (p.collectionIds ?? []).includes(f.collectionId))
        && (!f.gender || p.gender === f.gender)
        && (!f.availability || inStock(p));
    });
    const min = (p: Product) => p.sizes.length ? Math.min(...p.sizes.map(sz => sz.discountPrice || sz.price)) : 0;
    switch (sortBy) {
      case 'price-asc': return [...list].sort((a, b) => min(a) - min(b));
      case 'price-desc': return [...list].sort((a, b) => min(b) - min(a));
      case 'bestselling': return [...list].sort((a, b) => ((b as unknown as { views?: number }).views ?? 0) - ((a as unknown as { views?: number }).views ?? 0));
      default: return list; // newest (API returns desc by createdAt)
    }
  }, [products, searchTerm, filters, sortBy]);

  // Homepage collection sections auto-populate from Collections
  const collectionSections = useMemo(() =>
    tax.collections
      .map(c => ({ ...c, items: products.filter(p => (p.collectionIds ?? []).includes(c.id)) }))
      .filter(c => c.items.length > 0)
      .slice(0, 4),
    [tax.collections, products]);

  const relatedProducts = useMemo(() => {
    if (!selectedProduct) return [];
    return products.filter(p => p.id !== selectedProduct.id && (
      p.categoryId === selectedProduct.categoryId ||
      (p.familyIds ?? []).some(f => (selectedProduct.familyIds ?? []).includes(f))
    )).slice(0, 4);
  }, [selectedProduct, products]);

  const catName = (id: number | null) => tax.categories.find(c => c.id === id)?.name ?? '';
  const brandName = (id: number | null) => tax.brands.find(b => b.id === id)?.name ?? '';

  const scrollToShop = () => document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });

  /* ---------- Maintenance mode ---------- */
  if (loaded && s('maintenanceMode') === 'true') {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center px-6 text-center">
        <div className="text-7xl mb-8">🛠️</div>
        <h1 className="text-5xl serif-heading mb-4">{s('businessName', 'The Scent Atelier')}</h1>
        <p className="text-white/60 max-w-md">We are polishing something beautiful. The boutique will reopen shortly.</p>
        <a href={waHref} target="_blank" className="mt-10 bg-emerald-500 text-white px-10 py-4 rounded-full flex items-center gap-3">{WA_ICON('w-5 h-5')} Chat with us</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white overflow-x-hidden">
      <Toaster position="top-right" />

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full flex items-center justify-center text-black font-serif text-2xl">
                {s('businessName', 'S').charAt(0)}
              </div>
              <div>
                <div className="text-xl tracking-tighter serif-heading text-white uppercase">{s('businessName', 'The Scent Atelier')}</div>
                <div className="text-[10px] text-amber-400 -mt-1 tracking-[3px] uppercase">{s('city', 'Nairobi')}</div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm uppercase tracking-widest">
              <Link href="#shop" className="hover:text-amber-400 transition-colors">SHOP</Link>
              <Link href="#brands" className="hover:text-amber-400 transition-colors">BRANDS</Link>
              <button onClick={() => setTrackOpen(true)} className="hover:text-amber-400 transition-colors uppercase tracking-widest flex items-center gap-2"><PackageSearch size={15}/> TRACK ORDER</button>
              <Link href="#comments" className="hover:text-amber-400 transition-colors flex items-center gap-2">
                REVIEWS
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
              </Link>
            </div>

            <div className="flex items-center gap-5">
              <div className="relative hidden sm:block">
                <input type="text" placeholder="SEARCH..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white/5 border border-white/20 pl-10 pr-4 py-2.5 w-40 lg:w-64 text-sm focus:outline-none focus:border-amber-400 placeholder:text-white/40 rounded-full transition-all" />
                <Search className="absolute left-4 top-3.5 text-white/40" size={16} />
              </div>

              <button onClick={() => setIsCartOpen(true)} className="relative hover:text-amber-400 transition-colors">
                <ShoppingCart size={22} />
                {cart.length > 0 && <div className="absolute -top-1.5 -right-1.5 bg-rose-500 text-[10px] w-5 h-5 rounded-full flex items-center justify-center">{cart.reduce((a, b) => a + b.quantity, 0)}</div>}
              </button>

              <a href="/admin/login" className="hover:text-amber-400 transition-colors hidden sm:flex items-center gap-1.5 text-xs uppercase tracking-widest border border-white/30 px-4 py-2 rounded-3xl" title="Admin Portal">
                <Shield size={15} /> ADMIN
              </a>

              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden">{isMenuOpen ? <X size={24} /> : <Menu size={24} />}</button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-black border-t border-white/10 px-6 py-8">
              <div className="flex flex-col gap-6 text-lg">
                <Link href="#shop" onClick={() => setIsMenuOpen(false)} className="hover:text-amber-400">SHOP ALL</Link>
                <Link href="#brands" onClick={() => setIsMenuOpen(false)} className="hover:text-amber-400">BRANDS</Link>
                <button onClick={() => { setIsMenuOpen(false); setTrackOpen(true); }} className="text-left hover:text-amber-400">TRACK ORDER</button>
                <Link href="#comments" onClick={() => setIsMenuOpen(false)} className="hover:text-amber-400">LIVE REVIEWS 🟢</Link>
                <a href="/admin/login" className="hover:text-amber-400">ADMIN</a>
                <a href={waHref} target="_blank" className="flex items-center gap-3 text-emerald-400">{WA_ICON('w-5 h-5')} WHATSAPP US</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* HERO */}
      <div className="relative min-h-[100svh] flex items-center justify-center pt-28 pb-24">
        <div className="absolute inset-0 overflow-hidden">
          <img src={s('heroImage', 'https://picsum.photos/id/1015/2000/1200')} alt="Luxury Perfume" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/70"></div>
        </div>

        <div className="relative z-20 text-center px-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 text-amber-400 text-xs tracking-[4px] px-6 py-2.5 rounded-full mb-6 border border-amber-400/30 uppercase">
            {s('city', 'Nairobi')} • {s('country', 'Kenya')}
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl serif-heading tracking-tighter leading-none mb-5">
            {s('heroTitle', 'EVERY FRAGRANCE TELLS YOUR STORY')}
          </h1>
          <p className="text-base md:text-xl text-white/70 max-w-md mx-auto mb-8">{s('heroSubtitle', s('tagline'))}</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={scrollToShop} className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-14 py-5 rounded-full text-sm tracking-widest hover:brightness-110 active:scale-95 transition-all font-bold shadow-2xl shadow-amber-500/30">
              EXPLORE COLLECTION →
            </button>
            <a href={waLink(`Hello ${s('businessName', 'The Scent Atelier')}! I would like to know more about your luxury fragrances.`)} target="_blank"
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-5 rounded-full text-sm tracking-widest transition-all flex items-center justify-center gap-3 font-bold shadow-2xl shadow-emerald-500/30 active:scale-95">
              {WA_ICON('w-5 h-5')} <span>CHAT WITH US</span>
            </a>
          </div>
        </div>
      </div>

      {/* Floating WhatsApp (toggle from settings) */}
      {s('enableWhatsappButton', 'true') !== 'false' && (
        <a href={waHref} target="_blank" className="fixed bottom-8 right-8 z-50 bg-emerald-500 hover:bg-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl floating-whatsapp text-white">
          {WA_ICON('w-9 h-9')}
        </a>
      )}

      {/* TRUST BAR */}
      <div className="bg-black py-5 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center items-center gap-x-12 gap-y-4 text-xs tracking-widest text-white/60">
          {['FREE SHIPPING OVER KES 15,000', '30 DAY MONEY BACK GUARANTEE', 'AUTHENTIC LUXURY PERFUMES', s('hours', 'MON - SAT: 9AM - 7PM').toUpperCase()].map((t, i) => (
            <div key={i} className="flex items-center gap-3"><div className="w-5 h-px bg-amber-400"></div>{t}</div>
          ))}
        </div>
      </div>

      {/* SHOP */}
      <section id="shop" className="max-w-7xl mx-auto px-6 py-24">
        <div className="flex justify-between items-end mb-10 flex-wrap gap-4">
          <div>
            <div className="uppercase text-amber-400 text-sm tracking-[3px]">CURATED FOR YOU</div>
            <h2 className="text-4xl md:text-5xl serif-heading tracking-tight">Signature Scents</h2>
          </div>
          <button onClick={clearFilters} className="group flex items-center gap-2 text-sm hover:text-amber-400 transition-colors">
            VIEW ENTIRE COLLECTION <span className="group-hover:translate-x-1 transition">→</span>
          </button>
        </div>

        {/* PROFESSIONAL FILTER BAR */}
        <div className="bg-zinc-950 border border-white/10 rounded-3xl p-5 mb-10 flex flex-wrap gap-3 items-center">
          <select value={filters.categoryId ?? ''} onChange={e => setFilters(f => ({ ...f, categoryId: e.target.value ? Number(e.target.value) : null }))}
            className="bg-black border border-white/15 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-amber-400 cursor-pointer">
            <option value="">All Categories</option>
            {tax.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.brandId ?? ''} onChange={e => setFilters(f => ({ ...f, brandId: e.target.value ? Number(e.target.value) : null }))}
            className="bg-black border border-white/15 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-amber-400 cursor-pointer">
            <option value="">All Brands</option>
            {tax.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={filters.familyId ?? ''} onChange={e => setFilters(f => ({ ...f, familyId: e.target.value ? Number(e.target.value) : null }))}
            className="bg-black border border-white/15 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-amber-400 cursor-pointer">
            <option value="">All Fragrance Families</option>
            {tax.families.map(fm => <option key={fm.id} value={fm.id}>{fm.name}</option>)}
          </select>
          <select value={filters.collectionId ?? ''} onChange={e => setFilters(f => ({ ...f, collectionId: e.target.value ? Number(e.target.value) : null }))}
            className="bg-black border border-white/15 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-amber-400 cursor-pointer">
            <option value="">All Collections</option>
            {tax.collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.gender ?? ''} onChange={e => setFilters(f => ({ ...f, gender: e.target.value || null }))}
            className="bg-black border border-white/15 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-amber-400 cursor-pointer">
            <option value="">All Genders</option>
            {['Men', 'Women', 'Unisex'].map(g => <option key={g}>{g}</option>)}
          </select>
          <button onClick={() => setFilters(f => ({ ...f, availability: !f.availability }))}
            className={`px-4 py-3 rounded-2xl text-xs border transition ${filters.availability ? 'bg-emerald-500 text-white border-emerald-500' : 'border-white/15 text-white/60 hover:border-white/40'}`}>
            {filters.availability ? '✓ ' : ''}In Stock Only
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-white/40 uppercase tracking-widest">Sort</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="bg-black border border-white/15 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-amber-400 cursor-pointer">
              <option value="newest">Newest</option>
              <option value="bestselling">Best Selling</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 bg-amber-400 text-black text-xs px-4 py-3 rounded-2xl hover:bg-amber-300 transition">
              CLEAR <X size={13} />
            </button>
          )}
        </div>

        {!loaded ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map(i => <div key={i} className="bg-zinc-950 border border-white/10 rounded-3xl h-[430px] animate-pulse" />)}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 border border-white/10 rounded-3xl bg-zinc-950">
            <div className="text-6xl mb-6 opacity-40">🔍</div>
            <div className="text-2xl serif-heading mb-3">No fragrances found</div>
            <button onClick={clearFilters} className="mt-4 bg-white text-black px-10 py-3 rounded-full text-sm tracking-widest hover:bg-amber-400 transition">SHOW ALL</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredProducts.map(product => (
              <motion.div key={product.id} whileHover={{ y: -10 }} className="luxury-card group bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden cursor-pointer" onClick={() => openProduct(product)}>
                <div className="relative">
                  <img src={product.image || '/images/noir-oud.jpg'} alt={product.name} loading="lazy" className="w-full h-72 object-cover" />
                  {hasDiscount(product) && <div className="absolute top-5 right-5 bg-rose-600 text-white text-xs font-medium px-4 py-1 rounded-full">SALE</div>}
                  <button onClick={(e) => { e.stopPropagation(); toggleWishlist(product.id); }} className="absolute top-5 left-5 w-9 h-9 bg-black/60 hover:bg-black rounded-2xl flex items-center justify-center text-white transition-all">
                    <Heart className={`w-4 h-4 ${wishlist.includes(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black h-32"></div>
                  <div className="absolute bottom-5 left-5 right-5">
                    <div className="text-xs text-amber-400 mb-1 tracking-widest uppercase">{product.brand}</div>
                    <div className="text-2xl serif-heading tracking-tight">{product.name}</div>
                    <div className="text-xl font-light mt-1">From {fmt(minPrice(product))}</div>
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-white/10 text-sm">
                  <div className={`flex items-center gap-2 mb-3 text-xs ${inStock(product) ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>{product.status}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); openProduct(product); }} className="flex-1 bg-white text-black px-4 py-2.5 text-xs rounded-3xl hover:bg-amber-400 transition-all flex items-center justify-center gap-2 font-medium">
                      <Plus size={14} /> SELECT SIZE
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); whatsappInquiry(product); }} title="Inquire on WhatsApp" className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 text-xs rounded-3xl transition-all flex items-center gap-2">
                      {WA_ICON('w-4 h-4')} ASK
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* HOMEPAGE COLLECTION SECTIONS — auto-populate from Collections */}
      {collectionSections.map(col => (
        <section key={col.id} className="max-w-7xl mx-auto px-6 py-14">
          <div className="flex justify-between items-baseline mb-8 flex-wrap gap-3">
            <div>
              <div className="uppercase text-amber-400 text-xs tracking-[3px]">COLLECTION</div>
              <h3 className="text-3xl md:text-4xl serif-heading tracking-tight">{col.name}</h3>
            </div>
            <button onClick={() => { clearFilters(); setFilters(f => ({ ...f, collectionId: col.id })); scrollToShop(); }}
              className="text-sm hover:text-amber-400 transition-colors">VIEW ALL →</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {col.items.slice(0, 4).map(p => (
              <div key={p.id} onClick={() => openProduct(p)} className="group cursor-pointer bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden hover:border-amber-400/40 transition-all">
                <div className="relative h-44 md:h-56 overflow-hidden">
                  <img src={p.image || '/images/noir-oud.jpg'} loading="lazy" alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                </div>
                <div className="p-4">
                  <div className="text-[10px] text-amber-400 uppercase tracking-widest">{p.brand}</div>
                  <div className="serif-heading text-lg leading-tight">{p.name}</div>
                  <div className="text-sm font-light mt-1">From {fmt(minPrice(p))}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* CATEGORIES (from Categories module) */}
      {tax.categories.length > 0 && (
        <section className="bg-zinc-950 py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-14">
              <div className="text-amber-400 text-sm tracking-widest">SHOP BY CATEGORY</div>
              <h3 className="text-4xl md:text-5xl serif-heading mt-3">Categories</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {tax.categories.map(cat => {
                const count = products.filter(p => p.categoryId === cat.id).length;
                return (
                  <motion.div key={cat.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { clearFilters(); setFilters(f => ({ ...f, categoryId: cat.id })); scrollToShop(); toast.success(`Showing ${cat.name}`, { icon: '✨' }); }}
                    className="group bg-black border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center h-44 hover:border-amber-400/50 transition-all cursor-pointer">
                    <div className="text-xl serif-heading mb-1">{cat.name}</div>
                    <div className="text-white/40 text-xs">{count > 0 ? `${count} fragrance${count !== 1 ? 's' : ''}` : 'Explore'}</div>
                    <div className="mt-3 text-[10px] text-amber-400 opacity-0 group-hover:opacity-100 transition tracking-widest">SHOP NOW →</div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* BRANDS (from Brands module) */}
      {tax.brands.length > 0 && (
        <section id="brands" className="max-w-7xl mx-auto px-6 py-24">
          <div className="flex justify-between items-baseline mb-12 flex-wrap gap-3">
            <h2 className="text-4xl md:text-5xl serif-heading tracking-tight">House of Legends</h2>
            <div className="text-white/50 text-sm uppercase">{s('city', 'Nairobi')} • {s('country', 'Kenya')}</div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-white/10">
            {tax.brands.map(brand => (
              <button key={brand.id} onClick={() => { clearFilters(); setFilters(f => ({ ...f, brandId: brand.id })); scrollToShop(); }}
                className="bg-zinc-950 h-24 flex flex-col items-center justify-center hover:bg-amber-400 hover:text-black active:scale-95 transition-all cursor-pointer px-2 group">
                <span className="text-sm md:text-base tracking-[3px] uppercase">{brand.name}</span>
                {brand.country && <span className="text-[9px] text-white/40 group-hover:text-black/60 mt-1">{brand.country}</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* LIVE CLIENT COMMENTS */}
      <LiveComments />

      {/* FOOTER (fully dynamic) */}
      <footer className="bg-black pt-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-12 gap-y-14">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full flex items-center justify-center text-black font-serif text-2xl">{s('businessName', 'S').charAt(0)}</div>
              <div className="text-3xl serif-heading">{s('businessName', 'The Scent Atelier')}</div>
            </div>
            <p className="max-w-xs text-white/60 leading-relaxed">{s('description')}</p>
            <div className="mt-8 flex gap-10 text-sm flex-wrap">
              <div>
                <div className="text-white/40 mb-2 uppercase text-xs tracking-widest">Showroom</div>
                <div className="flex items-start gap-2"><MapPin className="mt-1 w-4 h-4 text-amber-400" /><div>{s('address')}<br />{s('city')}, {s('country')}</div></div>
              </div>
              <div>
                <div className="text-white/40 mb-2 uppercase text-xs tracking-widest">Contact</div>
                <a href={`tel:${s('phone')}`} className="block hover:text-amber-400">{s('phone')}</a>
                <a href={waHref} target="_blank" className="block text-emerald-400 hover:underline">WhatsApp</a>
                {s('email') && <a href={`mailto:${s('email')}`} className="block hover:text-amber-400">{s('email')}</a>}
              </div>
            </div>
            {/* Socials */}
            <div className="mt-8 flex gap-4 text-xs uppercase tracking-widest">
              {[['facebook', 'Facebook'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['twitter', 'X'], ['youtube', 'YouTube']].map(([key, label]) =>
                s(key) ? <a key={key} href={s(key)} target="_blank" rel="noopener noreferrer" className="border border-white/20 px-4 py-2 rounded-full hover:bg-white hover:text-black transition">{label}</a> : null
              )}
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="uppercase text-xs tracking-widest text-white/50 mb-6">QUICK LINKS</div>
            <div className="space-y-4 text-sm">
              <button onClick={() => { clearFilters(); scrollToShop(); }} className="block hover:text-amber-400 transition-colors">Shop All Fragrances</button>
              <button onClick={() => setTrackOpen(true)} className="block hover:text-amber-400 transition-colors">Track Your Order</button>
              <button onClick={() => window.open(waLink(`Hello! I would like to purchase a Gift Card from ${s('businessName', 'The Scent Atelier')}. 🎁`), '_blank')} className="block hover:text-amber-400 transition-colors">Gift Cards</button>
              <button onClick={() => document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })} className="block hover:text-amber-400 transition-colors">Live Reviews</button>
            </div>
          </div>

          <div className="md:col-span-4">
            {s('enableNewsletter', 'true') !== 'false' && (
              <div className="bg-zinc-950 border border-white/10 rounded-3xl p-8">
                <div className="text-sm mb-4">NEWSLETTER</div>
                <div className="text-white/70 leading-tight">Early access to new releases, private events and seasonal fragrance guides.</div>
                <div className="mt-6 flex">
                  <input type="email" placeholder="YOUR EMAIL" value={newsletterEmail} onChange={(e) => setNewsletterEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && subscribeNewsletter()}
                    className="bg-transparent border border-white/30 flex-1 min-w-0 px-6 py-4 text-sm focus:outline-none focus:border-amber-400 rounded-l-3xl" />
                  <button onClick={subscribeNewsletter} className="bg-white text-black px-8 rounded-r-3xl text-sm tracking-wider hover:bg-amber-400 active:scale-95 transition-all">JOIN</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-20 border-t border-white/10 py-8">
          <div className="max-w-7xl mx-auto px-6 text-xs flex flex-col md:flex-row justify-between items-center gap-4 text-white/50">
            <div>{s('footerCopyright', '© 2026 The Scent Atelier.')}</div>
            <div className="text-center md:text-right">
              Website Designed &amp; Maintained by <span className="text-amber-400">{s('developerName')}</span><br />
              <a href={`tel:${s('developerPhone')}`} className="hover:text-white">{s('developerPhone')}</a> • <a href={`mailto:${s('developerEmail')}`} className="hover:text-white">{s('developerEmail')}</a>
            </div>
          </div>
        </div>
      </footer>

      {/* PRODUCT MODAL */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-start md:items-center justify-center p-4 md:p-6 overflow-y-auto" onClick={() => setSelectedProduct(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-zinc-900 max-w-5xl w-full rounded-3xl overflow-hidden flex flex-col md:flex-row my-6" onClick={e => e.stopPropagation()}>
              <div className="md:w-5/12 bg-black relative min-h-[240px] flex flex-col">
                <div className="relative flex-1 min-h-[240px]">
                  <img src={selectedProduct.image || '/images/noir-oud.jpg'} alt={selectedProduct.name} className="w-full h-full object-cover absolute inset-0" />
                </div>
                {(selectedProduct.images?.length ?? 0) > 1 && (
                  <div className="flex gap-2 p-3 bg-black overflow-x-auto">
                    {selectedProduct.images.map((img, i) => (
                      <img key={i} src={img} onClick={() => setSelectedProduct(p => p ? { ...p, image: img } : p)}
                        className={`w-14 h-14 rounded-xl object-cover cursor-pointer border-2 transition ${selectedProduct.image === img ? 'border-amber-400' : 'border-white/10 hover:border-white/40'}`} alt="" />
                    ))}
                  </div>
                )}
              </div>

              <div className="md:w-7/12 p-8 md:p-10">
                <div className="flex justify-between">
                  <div>
                    <div className="text-amber-400 text-xs tracking-[2px] uppercase">{brandName(selectedProduct.brandId) || selectedProduct.brand}</div>
                    <h3 className="text-3xl md:text-4xl serif-heading tracking-tight mt-1">{selectedProduct.name}</h3>
                    <div className="text-xs text-white/50 mt-1">CODE: {selectedProduct.code} • {selectedProduct.gender}{catName(selectedProduct.categoryId) ? ` • ${catName(selectedProduct.categoryId)}` : ''}</div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(selectedProduct.familyIds ?? []).map(fid => {
                        const fam = tax.families.find(f => f.id === fid);
                        return fam ? <span key={fid} className="text-[10px] bg-amber-400/10 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full">{fam.name}</span> : null;
                      })}
                      {(selectedProduct.collectionIds ?? []).map(cid => {
                        const col = tax.collections.find(c => c.id === cid);
                        return col ? <span key={`c${cid}`} className="text-[10px] bg-sky-400/10 text-sky-300 border border-sky-400/30 px-3 py-1 rounded-full">{col.name}</span> : null;
                      })}
                    </div>
                  </div>
                  <button onClick={() => setSelectedProduct(null)} className="text-white/40 hover:text-white text-xl">✕</button>
                </div>

                {selectedSize && (
                  <div className="flex items-center gap-4 mt-6">
                    <div className="text-3xl font-light">{fmt(selectedSize.discountPrice || selectedSize.price)}</div>
                    {selectedSize.discountPrice && <div className="text-white/40 line-through">{fmt(selectedSize.price)}</div>}
                    {selectedSize.stock <= 0 && <div className="text-xs bg-rose-500/10 text-rose-400 px-4 py-1 rounded-3xl">SIZE UNAVAILABLE</div>}
                  </div>
                )}

                <div className="mt-6">
                  <div className="text-xs uppercase tracking-widest text-white/50 mb-3">SELECT SIZE</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.sizes.map(size => (
                      <button key={size.label} onClick={() => setSelectedSize(size)} disabled={size.stock <= 0}
                        className={`border px-5 py-2.5 text-sm rounded-2xl transition-all ${selectedSize?.label === size.label ? 'border-amber-400 bg-amber-400 text-black' : size.stock <= 0 ? 'border-white/10 text-white/25 line-through cursor-not-allowed' : 'border-white/30 hover:border-white/70'}`}>
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(selectedProduct.topNotes || selectedProduct.middleNotes || selectedProduct.baseNotes) && (
                  <div className="grid grid-cols-3 gap-4 text-xs mt-8 border-t border-white/10 pt-6">
                    <div><div className="text-white/40 uppercase tracking-widest mb-1">Top</div>{selectedProduct.topNotes}</div>
                    <div><div className="text-white/40 uppercase tracking-widest mb-1">Heart</div>{selectedProduct.middleNotes}</div>
                    <div><div className="text-white/40 uppercase tracking-widest mb-1">Base</div>{selectedProduct.baseNotes}</div>
                  </div>
                )}

                <p className="mt-6 text-sm leading-relaxed text-white/70">{selectedProduct.description}</p>

                <div className="mt-8 flex gap-3">
                  <button onClick={() => { addToCart(selectedProduct, selectedSize); setSelectedProduct(null); }}
                    disabled={!selectedSize || selectedSize.stock <= 0}
                    className="flex-1 bg-white text-black py-4 text-sm tracking-[1px] rounded-3xl hover:bg-amber-300 transition-all font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                    ADD TO CART {selectedSize ? `— ${fmt(selectedSize.discountPrice || selectedSize.price)}` : ''}
                  </button>
                  <button onClick={() => toggleWishlist(selectedProduct.id)} className="border border-white/30 hover:border-white px-6 rounded-3xl transition-all">♡</button>
                </div>

                <button onClick={() => whatsappInquiry(selectedProduct, selectedSize)}
                  className="mt-3 w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 text-sm rounded-3xl transition-all font-medium flex items-center justify-center gap-3">
                  {WA_ICON('w-5 h-5')} INQUIRE ON WHATSAPP
                </button>

                {/* VERIFIED REVIEWS */}
                <div className="mt-10 border-t border-white/10 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm uppercase tracking-widest text-white/60">Verified Reviews ({productReviews.length})</div>
                    <button onClick={() => setShowReviewForm(v => !v)} className="text-xs text-amber-400 hover:underline">{showReviewForm ? 'Cancel' : 'Write a review'}</button>
                  </div>

                  {showReviewForm && (
                    <div className="bg-black rounded-3xl p-6 mb-5 space-y-3">
                      <div className="text-xs text-white/50">Only verified purchases can review. Enter the order code and phone number from your purchase.</div>
                      <div className="grid grid-cols-2 gap-3">
                        <input placeholder="Order code (e.g. ORD-XXXX)" value={reviewForm.orderCode} onChange={e => setReviewForm(f => ({ ...f, orderCode: e.target.value }))} className="bg-zinc-900 border border-white/20 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400" />
                        <input placeholder="Phone used at checkout" value={reviewForm.phone} onChange={e => setReviewForm(f => ({ ...f, phone: e.target.value }))} className="bg-zinc-900 border border-white/20 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400" />
                      </div>
                      <input placeholder="Your name" value={reviewForm.name} onChange={e => setReviewForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-zinc-900 border border-white/20 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400" />
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button key={n} onClick={() => setReviewForm(f => ({ ...f, rating: n }))}><Star size={22} className={n <= reviewForm.rating ? 'fill-amber-400 text-amber-400' : 'text-white/20'} /></button>
                        ))}
                      </div>
                      <textarea placeholder="Your review..." rows={3} value={reviewForm.message} onChange={e => setReviewForm(f => ({ ...f, message: e.target.value }))} className="w-full bg-zinc-900 border border-white/20 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 resize-none" />
                      <button onClick={submitReview} className="w-full bg-amber-400 text-black py-3 rounded-2xl text-sm font-medium hover:brightness-110 transition">SUBMIT VERIFIED REVIEW</button>
                    </div>
                  )}

                  {productReviews.length === 0 ? (
                    <div className="text-white/40 text-sm">No reviews yet. Be the first verified buyer to review.</div>
                  ) : (
                    <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                      {productReviews.map(r => (
                        <div key={r.id} className="bg-black rounded-2xl p-5">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-medium text-sm">{r.name}</span>
                            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-3 py-1 rounded-full">✓ VERIFIED PURCHASE</span>
                            {r.pinned && <span className="text-[10px] bg-amber-400/15 text-amber-400 px-3 py-1 rounded-full">📌 PINNED</span>}
                            <span className="text-amber-400 text-xs ml-auto">{'★'.repeat(r.rating)}</span>
                          </div>
                          <p className="text-white/70 text-sm mt-2">{r.message}</p>
                          {r.adminReply && <div className="mt-3 border-l-2 border-amber-400 pl-4 text-xs text-white/60"><span className="text-amber-400">Reply from {s('businessName', 'the shop')}:</span> {r.adminReply}</div>}
                          <div className="text-[10px] text-white/30 mt-2">{new Date(r.createdAt).toLocaleDateString()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* RELATED PRODUCTS */}
                {relatedProducts.length > 0 && (
                  <div className="mt-8 border-t border-white/10 pt-6">
                    <div className="text-sm uppercase tracking-widest text-white/60 mb-4">You May Also Like</div>
                    <div className="grid grid-cols-4 gap-3">
                      {relatedProducts.map(rp => (
                        <div key={rp.id} onClick={() => openProduct(rp)} className="cursor-pointer group">
                          <img src={rp.image || '/images/noir-oud.jpg'} className="w-full aspect-square object-cover rounded-2xl border border-white/10 group-hover:border-amber-400/50 transition" alt={rp.name} />
                          <div className="text-[11px] mt-2 leading-tight truncate">{rp.name}</div>
                          <div className="text-[10px] text-white/40">From {fmt(minPrice(rp))}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SLIDING CART + CHECKOUT */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <div className="fixed inset-0 bg-black/70 z-[110]" onClick={() => { setIsCartOpen(false); setCheckoutOpen(false); }}></div>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-zinc-950 border-l border-white/10 z-[120] flex flex-col">
              <div className="px-7 pt-7 pb-5 border-b border-white/10 flex justify-between items-center">
                <div className="uppercase tracking-widest text-sm">{checkoutOpen ? 'Checkout' : `Your Cart (${cart.length})`}</div>
                <button onClick={() => { setIsCartOpen(false); setCheckoutOpen(false); }} className="text-white/60"><X size={26} /></button>
              </div>

              {checkoutOpen ? (
                <div className="flex-1 overflow-auto p-7 space-y-4">
                  <div className="text-xs text-white/50 uppercase tracking-widest">Delivery Details</div>
                  <input placeholder="Full Name *" value={checkout.name} onChange={e => setCheckout(c => ({ ...c, name: e.target.value }))} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-amber-400" />
                  <input placeholder="Phone Number *" value={checkout.phone} onChange={e => setCheckout(c => ({ ...c, phone: e.target.value }))} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-amber-400" />
                  <input placeholder="Email (optional)" value={checkout.email} onChange={e => setCheckout(c => ({ ...c, email: e.target.value }))} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-amber-400" />
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Estate" value={checkout.estate} onChange={e => setCheckout(c => ({ ...c, estate: e.target.value }))} className="bg-black border border-white/20 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-amber-400" />
                    <input placeholder="Street" value={checkout.street} onChange={e => setCheckout(c => ({ ...c, street: e.target.value }))} className="bg-black border border-white/20 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-amber-400" />
                    <input placeholder="Apartment" value={checkout.apartment} onChange={e => setCheckout(c => ({ ...c, apartment: e.target.value }))} className="bg-black border border-white/20 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-amber-400" />
                    <input placeholder="Landmark" value={checkout.landmark} onChange={e => setCheckout(c => ({ ...c, landmark: e.target.value }))} className="bg-black border border-white/20 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-amber-400" />
                  </div>
                  <input placeholder="City" value={checkout.city} onChange={e => setCheckout(c => ({ ...c, city: e.target.value }))} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-amber-400" />
                  <div className="text-xs text-white/50 uppercase tracking-widest pt-2">Payment Method</div>
                  <div className="grid grid-cols-2 gap-3">
                    {['M-Pesa', 'Cash on Delivery'].map(m => (
                      <button key={m} onClick={() => setCheckout(c => ({ ...c, payment: m }))}
                        className={`py-4 rounded-2xl text-sm border transition ${checkout.payment === m ? 'border-amber-400 bg-amber-400 text-black font-medium' : 'border-white/20 hover:border-white/50'}`}>{m}</button>
                    ))}
                  </div>
                  <div className="flex justify-between text-lg pt-4"><div>TOTAL</div><div className="font-light">{fmt(cartTotal)}</div></div>
                  <button onClick={placeOrder} disabled={placing}
                    className="w-full py-5 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-medium rounded-3xl text-sm tracking-widest hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60">
                    {placing ? 'PLACING ORDER...' : 'PLACE ORDER & SEND VIA WHATSAPP'}
                  </button>
                  <button onClick={() => setCheckoutOpen(false)} className="w-full py-3.5 border border-white/25 rounded-3xl text-sm tracking-widest hover:border-white/60 transition">BACK TO CART</button>
                </div>
              ) : cart.length > 0 ? (
                <>
                  <div className="flex-1 overflow-auto p-7 space-y-7">
                    {cart.map((item, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="w-20 h-20 bg-zinc-800 rounded-2xl overflow-hidden flex-shrink-0">
                          <img src={item.image || '/images/noir-oud.jpg'} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-white/60">{item.brand}</div>
                          <div className="font-medium leading-tight">{item.name}</div>
                          <div className="text-xs text-white/40 mt-1">SIZE: {item.size}</div>
                          <div className="flex justify-between items-end mt-3">
                            <div className="flex items-center gap-3">
                              <button onClick={() => changeQty(index, -1)} className="w-7 h-7 border border-white/30 rounded-full hover:border-white">−</button>
                              <span className="text-sm">{item.quantity}</span>
                              <button onClick={() => changeQty(index, 1)} className="w-7 h-7 border border-white/30 rounded-full hover:border-white">+</button>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-light">{fmt(item.unitPrice * item.quantity)}</div>
                              <button onClick={() => removeFromCart(index)} className="text-[10px] text-rose-400 hover:text-rose-500">REMOVE</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-7 border-t border-white/10">
                    <div className="flex justify-between text-lg mb-5"><div>TOTAL</div><div className="font-light">{fmt(cartTotal)}</div></div>
                    <button onClick={() => setCheckoutOpen(true)} className="w-full py-5 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-medium rounded-3xl text-sm tracking-widest hover:brightness-110 active:scale-[0.98] transition">
                      PROCEED TO CHECKOUT
                    </button>
                    <button onClick={() => setIsCartOpen(false)} className="w-full mt-3 py-4 border border-white/25 hover:border-white/60 rounded-3xl text-sm tracking-widest transition">CONTINUE SHOPPING</button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-10">
                  <div className="text-7xl mb-6 opacity-30">🛍️</div>
                  <div className="text-2xl serif-heading mb-3">Your cart is empty</div>
                  <button onClick={() => { setIsCartOpen(false); scrollToShop(); }} className="mt-10 bg-white text-black px-10 py-3 rounded-3xl text-sm font-medium hover:bg-amber-400 active:scale-95 transition-all">BROWSE COLLECTION</button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ORDER TRACKING MODAL */}
      <AnimatePresence>
        {trackOpen && (
          <div className="fixed inset-0 bg-black/85 z-[130] flex items-center justify-center p-6" onClick={() => { setTrackOpen(false); setTrackResult(null); }}>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <div className="text-2xl serif-heading">Track Your Order</div>
                <button onClick={() => { setTrackOpen(false); setTrackResult(null); }} className="text-white/50 hover:text-white"><X size={22} /></button>
              </div>
              <div className="space-y-3">
                <input placeholder="Order Code (e.g. ORD-XXXX)" value={track.code} onChange={e => setTrack(t => ({ ...t, code: e.target.value }))} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-amber-400" />
                <input placeholder="Phone used at checkout" value={track.phone} onChange={e => setTrack(t => ({ ...t, phone: e.target.value }))} className="w-full bg-black border border-white/20 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-amber-400" />
                <button onClick={doTrack} className="w-full bg-amber-400 text-black py-4 rounded-2xl text-sm font-medium tracking-widest hover:brightness-110 transition">TRACK ORDER</button>
              </div>
              {trackResult && (
                <div className="mt-6 bg-black rounded-2xl p-6">
                  <div className="flex justify-between items-center">
                    <div className="font-mono text-amber-400 text-sm">{trackResult.code}</div>
                    <div className="text-xs bg-emerald-500/15 text-emerald-400 px-4 py-1.5 rounded-full">{trackResult.status}</div>
                  </div>
                  <div className="mt-4 space-y-1 text-sm text-white/70">
                    {trackResult.items.map((it: any, i: number) => <div key={i}>{it.name} ({it.size}) ×{it.quantity}</div>)}
                  </div>
                  <div className="mt-4 flex justify-between text-sm"><span className="text-white/50">Total</span><span>{fmt(trackResult.total)}</span></div>
                  <div className="text-[10px] text-white/30 mt-2">Placed {new Date(trackResult.createdAt).toLocaleString()}</div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
