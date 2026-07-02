'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Upload, Save, LogOut, X, Pin, Check, EyeOff, MessageSquare } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import LiveComments from '@/components/LiveComments';
import CatalogTab, { type Taxonomies } from './CatalogTab';

interface Size { label: string; price: number; discountPrice?: number | null; stock: number; weight?: string; }
interface Product {
  id: number; code: string; name: string; brand: string; category: string; gender: string;
  fragranceFamily: string; description: string; topNotes: string; middleNotes: string;
  baseNotes: string; image: string; images: string[]; video: string; status: string; views: number; sizes: Size[];
  categoryId: number | null; brandId: number | null; familyIds: number[]; collectionIds: number[];
}
interface Order {
  id: number; code: string; name: string; phone: string; email: string; address: string;
  city: string; payment: string; items: { productId: number; name: string; size: string; quantity: number; price: number }[];
  total: number; status: string; createdAt: string;
}
interface Review {
  id: number; productId: number; orderCode: string; name: string; rating: number;
  message: string; approved: boolean; pinned: boolean; adminReply: string; createdAt: string;
}

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Packed', 'Ready for Dispatch', 'Out for Delivery', 'Delivered', 'Cancelled', 'Refunded'];
const PRODUCT_STATUSES = ['In Stock', 'Out of Stock', 'Coming Soon', 'Best Seller', 'Featured', 'Flash Sale', 'Limited Edition', 'New Arrival'];
const TABS = ['Dashboard', 'Products', 'Catalog', 'Orders', 'Reviews', 'Comments', 'Settings'] as const;
type Tab = (typeof TABS)[number];

const SETTING_GROUPS: { title: string; fields: [string, string][] }[] = [
  { title: 'Business Identity', fields: [['businessName', 'Business Name'], ['tagline', 'Tagline'], ['description', 'Business Description'], ['email', 'Business Email'], ['phone', 'Phone Number'], ['whatsapp', 'WhatsApp Number (2547...)']] },
  { title: 'Location', fields: [['address', 'Address'], ['city', 'City'], ['country', 'Country'], ['hours', 'Business Hours'], ['mapsEmbed', 'Google Maps Embed Link']] },
  { title: 'Social Media', fields: [['facebook', 'Facebook URL'], ['instagram', 'Instagram URL'], ['tiktok', 'TikTok URL'], ['twitter', 'X (Twitter) URL'], ['youtube', 'YouTube URL']] },
  { title: 'Homepage', fields: [['heroTitle', 'Hero Title'], ['heroSubtitle', 'Hero Subtitle'], ['heroImage', 'Hero Image URL'], ['primaryColor', 'Theme Primary Color']] },
  { title: 'SEO', fields: [['seoTitle', 'SEO Title'], ['seoDescription', 'SEO Description'], ['seoKeywords', 'SEO Keywords']] },
  { title: 'Footer & Developer', fields: [['footerCopyright', 'Footer Copyright'], ['developerName', 'Developer Name'], ['developerPhone', 'Developer Phone'], ['developerEmail', 'Developer Email']] },
];

const TOGGLES: [string, string][] = [
  ['enableWhatsappButton', 'Floating WhatsApp Button'],
  ['enableNewsletter', 'Newsletter Section'],
  ['maintenanceMode', 'Maintenance Mode'],
];

const emptyForm = {
  name: '', brand: '', category: '', gender: 'Unisex', fragranceFamily: '', description: '',
  topNotes: '', middleNotes: '', baseNotes: '', image: '', video: '', status: 'In Stock',
  sizes: [{ label: '50ml', price: 0, discountPrice: null, stock: 10 }] as Size[],
  images: [] as string[],
  categoryId: null as number | null,
  brandId: null as number | null,
  familyIds: [] as number[],
  collectionIds: [] as number[],
};

export default function DashboardClient() {
  const [tab, setTab] = useState<Tab>('Dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});
  const [tax, setTax] = useState<Taxonomies>({ categories: [], brands: [], families: [], collections: [] });
  const [form, setForm] = useState<typeof emptyForm>({ ...emptyForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});

  const loadAll = useCallback(async () => {
    try {
      const [p, o, r, st, tx] = await Promise.all([
        fetch('/api/products').then(x => x.json()),
        fetch('/api/orders').then(x => x.json()),
        fetch('/api/reviews?all=1').then(x => x.json()),
        fetch('/api/settings').then(x => x.json()),
        fetch('/api/taxonomy').then(x => x.json()),
      ]);
      setProducts(p.products ?? []);
      setOrdersList(o.orders ?? []);
      setReviewsList(r.reviews ?? []);
      setSettingsMap(st.settings ?? {});
      setTax({ categories: tx.categories ?? [], brands: tx.brands ?? [], families: tx.families ?? [], collections: tx.collections ?? [] });
    } catch { toast.error('Failed to load data'); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ---------- Products ---------- */
  const resetForm = () => {
    setForm({ ...emptyForm, sizes: [{ label: '50ml', price: 0, discountPrice: null, stock: 10 }], images: [], familyIds: [], collectionIds: [] });
    setEditingId(null);
  };

  // Unlimited image uploads — each appends to the gallery
  const uploadImage = async (files: FileList) => {
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 10)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok) setForm(f => ({ ...f, images: [...f.images, data.url], image: f.images.length === 0 ? data.url : f.image }));
        else toast.error(data.error || 'Upload failed');
      }
      toast.success('HD image(s) uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const toggleId = (key: 'familyIds' | 'collectionIds', id: number) =>
    setForm(f => ({ ...f, [key]: f[key].includes(id) ? f[key].filter(x => x !== id) : [...f[key], id] }));

  const saveProduct = async () => {
    if (!form.name.trim()) { toast.error('Product name is required'); return; }
    if (!form.sizes.some(sz => sz.label && sz.price > 0)) { toast.error('Add at least one size with a price'); return; }
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/products/${editingId}` : '/api/products';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || 'Save failed'); return; }
    toast.success(editingId ? 'Product updated — live on the website' : `Published! Code: ${data.product.code}`);
    resetForm();
    loadAll();
  };

  const editProduct = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name, brand: p.brand, category: p.category, gender: p.gender, fragranceFamily: p.fragranceFamily,
      description: p.description, topNotes: p.topNotes, middleNotes: p.middleNotes, baseNotes: p.baseNotes,
      image: p.image, video: p.video, status: p.status, sizes: p.sizes.length ? [...p.sizes] : [{ label: '50ml', price: 0, discountPrice: null, stock: 0 }],
      images: p.images?.length ? [...p.images] : (p.image ? [p.image] : []),
      categoryId: p.categoryId, brandId: p.brandId,
      familyIds: [...(p.familyIds ?? [])], collectionIds: [...(p.collectionIds ?? [])],
    });
    setTab('Products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteProduct = async (id: number) => {
    if (!confirm('Delete this product permanently?')) return;
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Product deleted'); if (editingId === id) resetForm(); loadAll(); }
    else toast.error('Delete failed');
  };

  const setSize = (i: number, patch: Partial<Size>) => setForm(f => ({ ...f, sizes: f.sizes.map((sz, idx) => idx === i ? { ...sz, ...patch } : sz) }));

  /* ---------- Orders ---------- */
  const updateOrderStatus = async (id: number, status: string) => {
    const res = await fetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    if (res.ok) { toast.success(`Order marked ${status}`); setOrdersList(prev => prev.map(o => o.id === id ? { ...o, status } : o)); }
    else toast.error('Update failed');
  };

  /* ---------- Reviews ---------- */
  const patchReview = async (id: number, patch: Record<string, unknown>, msg: string) => {
    const res = await fetch(`/api/reviews/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    if (res.ok) { toast.success(msg); const data = await res.json(); setReviewsList(prev => prev.map(r => r.id === id ? data.review : r)); }
    else toast.error('Action failed');
  };
  const deleteReview = async (id: number) => {
    if (!confirm('Delete this review?')) return;
    const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Review deleted'); setReviewsList(prev => prev.filter(r => r.id !== id)); }
  };

  /* ---------- Settings ---------- */
  const saveSettings = async () => {
    setSavingSettings(true);
    const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settingsMap) });
    setSavingSettings(false);
    if (res.ok) toast.success('Settings saved — the website updated instantly');
    else toast.error('Failed to save settings');
  };

  /* ---------- Analytics ---------- */
  const now = new Date();
  const isSameDay = (d: string) => new Date(d).toDateString() === now.toDateString();
  const validOrders = ordersList.filter(o => !['Cancelled', 'Refunded'].includes(o.status));
  const salesToday = validOrders.filter(o => isSameDay(o.createdAt)).reduce((s, o) => s + o.total, 0);
  const weekAgo = Date.now() - 7 * 86400000;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const salesWeek = validOrders.filter(o => new Date(o.createdAt).getTime() > weekAgo).reduce((s, o) => s + o.total, 0);
  const salesMonth = validOrders.filter(o => new Date(o.createdAt).getTime() >= monthStart).reduce((s, o) => s + o.total, 0);
  const revenue = validOrders.reduce((s, o) => s + o.total, 0);
  const customers = new Set(ordersList.map(o => o.phone)).size;
  const lowStock = products.flatMap(p => p.sizes.filter(sz => sz.stock > 0 && sz.stock <= 5).map(sz => ({ product: p.name, size: sz.label, stock: sz.stock })));
  const outOfStock = products.flatMap(p => p.sizes.filter(sz => sz.stock === 0).map(sz => ({ product: p.name, size: sz.label })));
  const topProducts = Object.entries(
    validOrders.flatMap(o => o.items).reduce<Record<string, number>>((acc, it) => { acc[it.name] = (acc[it.name] ?? 0) + it.quantity; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const mostViewed = [...products].sort((a, b) => b.views - a.views).slice(0, 5);
  // Last 7 days revenue bars
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
  const dailyRevenue = days.map(d => validOrders.filter(o => new Date(o.createdAt).toDateString() === d.toDateString()).reduce((s, o) => s + o.total, 0));
  const maxDaily = Math.max(...dailyRevenue, 1);
  const fmt = (n: number) => `KES ${n.toLocaleString()}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Toaster position="top-right" />

      <nav className="bg-black border-b border-amber-400/30 py-4 sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-6 flex items-center justify-between flex-wrap gap-3">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-2xl flex items-center justify-center text-black font-serif text-xl">{(settingsMap.businessName || 'S').charAt(0)}</div>
            <div>
              <div className="serif-heading text-xl tracking-tighter uppercase">{settingsMap.businessName || 'The Scent Atelier'}</div>
              <div className="text-[10px] text-amber-400 -mt-1">ADMINISTRATOR</div>
            </div>
          </a>
          <div className="flex gap-1 flex-wrap">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2.5 rounded-2xl text-xs uppercase tracking-widest transition ${tab === t ? 'bg-amber-400 text-black font-medium' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                {t}
              </button>
            ))}
          </div>
          <button onClick={async () => { await fetch('/api/admin/login', { method: 'DELETE' }); toast.success('Signed out'); setTimeout(() => window.location.href = '/admin/login', 600); }}
            className="bg-white/5 hover:bg-rose-500/10 hover:text-rose-400 p-3 rounded-2xl transition"><LogOut size={17} /></button>
        </div>
      </nav>

      <div className="max-w-screen-2xl mx-auto px-6 py-8">

        {/* ============ DASHBOARD / ANALYTICS ============ */}
        {tab === 'Dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {[['Sales Today', fmt(salesToday)], ['This Week', fmt(salesWeek)], ['This Month', fmt(salesMonth)], ['Total Revenue', fmt(revenue)]].map(([label, val], i) => (
                <div key={i} className="bg-zinc-900 rounded-3xl p-7 border border-white/10">
                  <div className="text-amber-400 text-xs tracking-widest uppercase">{label}</div>
                  <div className="text-3xl font-light mt-3">{val}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {[['Orders', String(ordersList.length)], ['Customers', String(customers)], ['Products', String(products.length)], ['Pending Reviews', String(reviewsList.filter(r => !r.approved).length)]].map(([label, val], i) => (
                <div key={i} className="bg-zinc-900 rounded-3xl p-7 border border-white/10">
                  <div className="text-sky-400 text-xs tracking-widest uppercase">{label}</div>
                  <div className="text-3xl font-light mt-3">{val}</div>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Revenue chart */}
              <div className="bg-zinc-900 rounded-3xl p-8 border border-white/10">
                <div className="text-sm tracking-widest text-white/60 mb-6">REVENUE — LAST 7 DAYS</div>
                <div className="flex items-end gap-3 h-40">
                  {dailyRevenue.map((v, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full bg-gradient-to-t from-amber-500 to-yellow-300 rounded-t-xl transition-all" style={{ height: `${Math.max(4, (v / maxDaily) * 100)}%` }} title={fmt(v)}></div>
                      <div className="text-[9px] text-white/40">{days[i].toLocaleDateString('en', { weekday: 'short' })}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Top selling */}
              <div className="bg-zinc-900 rounded-3xl p-8 border border-white/10">
                <div className="text-sm tracking-widest text-white/60 mb-6">TOP SELLING PRODUCTS</div>
                {topProducts.length === 0 ? <div className="text-white/40 text-sm">No sales yet.</div> : topProducts.map(([name, qty], i) => (
                  <div key={i} className="flex justify-between py-2.5 border-b border-white/5 text-sm"><span>{i + 1}. {name}</span><span className="text-amber-400">{qty} sold</span></div>
                ))}
                <div className="text-sm tracking-widest text-white/60 mt-8 mb-4">MOST VIEWED</div>
                {mostViewed.map((p, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-white/5 text-sm"><span>{p.name}</span><span className="text-white/50">{p.views} views</span></div>
                ))}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-zinc-900 rounded-3xl p-8 border border-rose-500/30">
                <div className="text-sm tracking-widest text-rose-400 mb-5">⚠️ LOW STOCK ALERTS (≤ 5)</div>
                {lowStock.length === 0 ? <div className="text-white/40 text-sm">All stock levels healthy.</div> : lowStock.map((l, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-white/5 text-sm"><span>{l.product} ({l.size})</span><span className="text-rose-400">{l.stock} left</span></div>
                ))}
              </div>
              <div className="bg-zinc-900 rounded-3xl p-8 border border-white/10">
                <div className="text-sm tracking-widest text-white/60 mb-5">OUT OF STOCK</div>
                {outOfStock.length === 0 ? <div className="text-white/40 text-sm">Nothing is out of stock.</div> : outOfStock.map((l, i) => (
                  <div key={i} className="py-2 border-b border-white/5 text-sm text-white/70">{l.product} ({l.size})</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============ PRODUCTS ============ */}
        {tab === 'Products' && (
          <div className="grid xl:grid-cols-12 gap-8">
            <div className="xl:col-span-5 bg-zinc-900 border border-white/10 rounded-3xl p-8 h-fit">
              <div className="flex justify-between items-center mb-6">
                <div className="serif-heading text-2xl">{editingId ? 'Edit Product' : 'New Product'}</div>
                {editingId && <button onClick={resetForm} className="text-xs px-4 py-2 border border-white/30 rounded-2xl">CANCEL</button>}
              </div>

              {/* Unlimited image gallery */}
              <div className="mb-6">
                <div onClick={() => document.getElementById('hd-up')?.click()}
                  className="border border-dashed border-white/30 hover:border-amber-400 h-40 rounded-3xl flex flex-col items-center justify-center cursor-pointer relative overflow-hidden">
                  {form.images[0] ? <img src={form.images[0]} className="absolute inset-0 w-full h-full object-cover opacity-60" alt="" /> : null}
                  <div className="relative z-10 text-center">
                    <Upload size={30} className="text-amber-400 mb-2 mx-auto" />
                    <div className="text-sm">{uploading ? 'Uploading...' : 'Upload HD Images (unlimited)'}</div>
                    <div className="text-xs text-white/50 mt-1">JPG, PNG, WebP • Max 8MB each • Select multiple</div>
                  </div>
                  <input id="hd-up" type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => e.target.files?.length && uploadImage(e.target.files)} />
                </div>
                {form.images.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {form.images.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img} className={`w-14 h-14 rounded-xl object-cover border-2 ${i === 0 ? 'border-amber-400' : 'border-white/10'}`} alt="" />
                        <button onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i), image: i === 0 ? (f.images[1] ?? '') : f.image }))}
                          className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full w-5 h-5 text-[10px] opacity-0 group-hover:opacity-100 transition">✕</button>
                        {i === 0 && <div className="absolute bottom-0 inset-x-0 bg-amber-400 text-black text-[8px] text-center rounded-b-lg">MAIN</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <input placeholder="Product Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-black border border-white/15 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-amber-400" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-1">Brand</label>
                    <select value={form.brandId ?? ''} onChange={e => { const id = e.target.value ? Number(e.target.value) : null; setForm(f => ({ ...f, brandId: id, brand: tax.brands.find(b => b.id === id)?.name ?? '' })); }}
                      className="w-full bg-black border border-white/15 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-amber-400">
                      <option value="">— Select brand —</option>
                      {tax.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-1">Category (one only)</label>
                    <select value={form.categoryId ?? ''} onChange={e => { const id = e.target.value ? Number(e.target.value) : null; setForm(f => ({ ...f, categoryId: id, category: tax.categories.find(c => c.id === id)?.name ?? '' })); }}
                      className="w-full bg-black border border-white/15 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-amber-400">
                      <option value="">— Select category —</option>
                      {tax.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="bg-black border border-white/15 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-amber-400">
                    {['Unisex', 'Men', 'Women'].map(g => <option key={g}>{g}</option>)}
                  </select>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="bg-black border border-white/15 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-amber-400">
                    {PRODUCT_STATUSES.map(st => <option key={st}>{st}</option>)}
                  </select>
                </div>

                {/* Fragrance families multi-select */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Fragrance Families (multi-select)</label>
                  <div className="flex flex-wrap gap-2">
                    {tax.families.filter(fm => fm.enabled).map(fm => (
                      <button key={fm.id} type="button" onClick={() => toggleId('familyIds', fm.id)}
                        className={`px-4 py-2 rounded-full text-xs border transition ${form.familyIds.includes(fm.id) ? 'bg-amber-400 text-black border-amber-400 font-medium' : 'border-white/20 text-white/60 hover:border-white/50'}`}>
                        {form.familyIds.includes(fm.id) ? '✓ ' : ''}{fm.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Collections multi-select */}
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">Collections (drive homepage sections)</label>
                  <div className="flex flex-wrap gap-2">
                    {tax.collections.filter(c => c.enabled).map(c => (
                      <button key={c.id} type="button" onClick={() => toggleId('collectionIds', c.id)}
                        className={`px-4 py-2 rounded-full text-xs border transition ${form.collectionIds.includes(c.id) ? 'bg-sky-400 text-black border-sky-400 font-medium' : 'border-white/20 text-white/60 hover:border-white/50'}`}>
                        {form.collectionIds.includes(c.id) ? '✓ ' : ''}{c.name}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea placeholder="Description" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full bg-black border border-white/15 rounded-3xl px-5 py-4 text-sm focus:outline-none focus:border-amber-400 resize-none" />
                <div className="grid grid-cols-3 gap-3">
                  <input placeholder="Top Notes" value={form.topNotes} onChange={e => setForm(f => ({ ...f, topNotes: e.target.value }))} className="bg-black border border-white/15 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400" />
                  <input placeholder="Middle Notes" value={form.middleNotes} onChange={e => setForm(f => ({ ...f, middleNotes: e.target.value }))} className="bg-black border border-white/15 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400" />
                  <input placeholder="Base Notes" value={form.baseNotes} onChange={e => setForm(f => ({ ...f, baseNotes: e.target.value }))} className="bg-black border border-white/15 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400" />
                </div>
                <input placeholder="Video URL (optional)" value={form.video} onChange={e => setForm(f => ({ ...f, video: e.target.value }))} className="w-full bg-black border border-white/15 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-amber-400" />

                {/* Unlimited sizes */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-xs tracking-widest text-white/60">SIZES, PRICES & STOCK</div>
                    <button onClick={() => setForm(f => ({ ...f, sizes: [...f.sizes, { label: '', price: 0, discountPrice: null, stock: 0 }] }))} className="text-xs text-amber-400 flex items-center gap-1"><Plus size={13} /> ADD SIZE</button>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr_32px] gap-2 text-[9px] text-white/40 uppercase px-1"><span>Size</span><span>Price</span><span>Discount</span><span>Stock</span><span>Weight</span><span></span></div>
                    {form.sizes.map((sz, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr_32px] gap-2">
                        <input placeholder="50ml" value={sz.label} onChange={e => setSize(i, { label: e.target.value })} className="bg-black border border-white/15 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                        <input type="number" placeholder="0" value={sz.price || ''} onChange={e => setSize(i, { price: Number(e.target.value) })} className="bg-black border border-white/15 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                        <input type="number" placeholder="—" value={sz.discountPrice ?? ''} onChange={e => setSize(i, { discountPrice: e.target.value ? Number(e.target.value) : null })} className="bg-black border border-white/15 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                        <input type="number" placeholder="0" value={sz.stock ?? ''} onChange={e => setSize(i, { stock: Number(e.target.value) })} className="bg-black border border-white/15 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                        <input placeholder="opt." value={sz.weight ?? ''} onChange={e => setSize(i, { weight: e.target.value })} className="bg-black border border-white/15 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                        <button onClick={() => setForm(f => ({ ...f, sizes: f.sizes.filter((_, idx) => idx !== i) }))} className="text-rose-400 hover:bg-rose-500/10 rounded-xl"><X size={15} className="mx-auto" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={saveProduct} className="w-full py-5 bg-gradient-to-r from-amber-400 to-yellow-500 text-black rounded-3xl font-medium flex items-center justify-center gap-3 text-sm tracking-widest hover:brightness-110 active:scale-[0.98] transition">
                  <Save size={18} /> {editingId ? 'UPDATE — GOES LIVE INSTANTLY' : 'PUBLISH TO WEBSITE'}
                </button>
              </div>
            </div>

            <div className="xl:col-span-7">
              <div className="text-2xl serif-heading mb-5">Inventory • {products.length} products</div>
              <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-white/10 overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-black"><tr className="text-left text-xs text-white/50 border-b border-white/10">
                    <th className="pl-6 py-4">PRODUCT</th><th>CODE</th><th>SIZES / STOCK</th><th>STATUS</th><th>VIEWS</th><th></th>
                  </tr></thead>
                  <tbody className="text-sm divide-y divide-white/10">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-zinc-800/60 group">
                        <td className="pl-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={p.image || '/images/noir-oud.jpg'} className="w-12 h-12 rounded-xl object-cover border border-white/10" alt="" />
                            <div><div className="font-medium">{p.name}</div><div className="text-xs text-white/40">{p.brand}</div></div>
                          </div>
                        </td>
                        <td className="font-mono text-amber-400 text-xs">{p.code}</td>
                        <td>
                          <div className="flex flex-wrap gap-1.5 py-1">
                            {p.sizes.map(sz => (
                              <span key={sz.label} className={`text-[10px] px-2.5 py-1 rounded-full ${sz.stock === 0 ? 'bg-rose-900/60 text-rose-300' : sz.stock <= 5 ? 'bg-amber-900/60 text-amber-300' : 'bg-emerald-900/60 text-emerald-300'}`}>
                                {sz.label}: {sz.stock}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td><span className="text-[10px] px-3 py-1 rounded-full bg-white/5">{p.status}</span></td>
                        <td className="text-white/50 text-xs">{p.views}</td>
                        <td className="pr-4">
                          <div className="flex gap-1 opacity-40 group-hover:opacity-100">
                            <button onClick={() => editProduct(p)} className="p-2.5 hover:bg-white/10 rounded-xl"><Edit2 size={15} /></button>
                            <button onClick={() => deleteProduct(p.id)} className="p-2.5 hover:bg-rose-900/50 text-rose-400 rounded-xl"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-[10px] text-white/30 mt-4 text-center">Stock deducts automatically on every order. Zero stock → auto “Out of Stock” (unless Coming Soon). Customers never see stock numbers.</div>
            </div>
          </div>
        )}

        {/* ============ ORDERS ============ */}
        {tab === 'Orders' && (
          <div>
            <div className="text-2xl serif-heading mb-6">Orders • {ordersList.length}</div>
            {ordersList.length === 0 ? (
              <div className="bg-zinc-900 rounded-3xl p-16 text-center text-white/40 border border-white/10">No orders yet. They will appear here the moment a customer checks out.</div>
            ) : (
              <div className="space-y-4">
                {ordersList.map(o => (
                  <div key={o.id} className="bg-zinc-900 border border-white/10 rounded-3xl p-6">
                    <div className="flex flex-wrap justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono text-amber-400">{o.code}</span>
                          <span className="text-xs text-white/40">{new Date(o.createdAt).toLocaleString()}</span>
                          <span className="text-xs bg-white/5 px-3 py-1 rounded-full">{o.payment}</span>
                        </div>
                        <div className="mt-2 text-sm">{o.name} • <a href={`tel:${o.phone}`} className="text-sky-400">{o.phone}</a></div>
                        <div className="text-xs text-white/50">{o.address || '—'}, {o.city}</div>
                        <div className="mt-3 space-y-1 text-sm text-white/70">
                          {o.items.map((it, i) => <div key={i}>{it.name} ({it.size}) ×{it.quantity} — KES {(it.price * it.quantity).toLocaleString()}</div>)}
                        </div>
                        <div className="mt-2 font-medium">Total: KES {o.total.toLocaleString()}</div>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <select value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)}
                          className={`bg-black border rounded-2xl px-5 py-3 text-sm focus:outline-none cursor-pointer ${o.status === 'Delivered' ? 'border-emerald-500 text-emerald-400' : o.status === 'Cancelled' || o.status === 'Refunded' ? 'border-rose-500 text-rose-400' : 'border-amber-400/50 text-amber-300'}`}>
                          {ORDER_STATUSES.map(st => <option key={st}>{st}</option>)}
                        </select>
                        <a href={`https://wa.me/${o.phone.replace(/[^0-9]/g, '').replace(/^0/, '254')}?text=${encodeURIComponent(`Hello ${o.name}! Update on your order ${o.code}: status is now "${o.status}". Thank you for shopping with ${settingsMap.businessName || 'us'}!`)}`}
                          target="_blank" className="text-xs text-emerald-400 hover:underline flex items-center gap-1"><MessageSquare size={13} /> Notify via WhatsApp</a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ REVIEWS ============ */}
        {tab === 'Reviews' && (
          <div>
            <div className="text-2xl serif-heading mb-6">Verified Reviews • {reviewsList.length} <span className="text-sm text-white/40 font-sans">({reviewsList.filter(r => !r.approved).length} awaiting approval)</span></div>
            {reviewsList.length === 0 ? (
              <div className="bg-zinc-900 rounded-3xl p-16 text-center text-white/40 border border-white/10">No reviews yet. Only verified buyers can submit reviews.</div>
            ) : (
              <div className="space-y-4">
                {reviewsList.map(r => {
                  const product = products.find(p => p.id === r.productId);
                  return (
                    <div key={r.id} className={`bg-zinc-900 border rounded-3xl p-6 ${r.approved ? 'border-white/10' : 'border-amber-400/50'}`}>
                      <div className="flex flex-wrap justify-between gap-4">
                        <div className="flex-1 min-w-[240px]">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-medium">{r.name}</span>
                            <span className="text-amber-400 text-sm">{'★'.repeat(r.rating)}</span>
                            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-3 py-1 rounded-full">✓ VERIFIED • {r.orderCode}</span>
                            {!r.approved && <span className="text-[10px] bg-amber-400/15 text-amber-400 px-3 py-1 rounded-full">PENDING APPROVAL</span>}
                            {r.pinned && <span className="text-[10px] bg-sky-500/15 text-sky-400 px-3 py-1 rounded-full">📌 PINNED</span>}
                          </div>
                          <div className="text-xs text-white/40 mt-1">Product: {product?.name ?? `#${r.productId}`} • {new Date(r.createdAt).toLocaleDateString()}</div>
                          <p className="text-white/75 text-sm mt-3">{r.message}</p>
                          {r.adminReply && <div className="mt-3 border-l-2 border-amber-400 pl-4 text-xs text-white/60">Your reply: {r.adminReply}</div>}
                          <div className="mt-4 flex gap-2">
                            <input placeholder="Write a reply..." value={replyDrafts[r.id] ?? ''} onChange={e => setReplyDrafts(d => ({ ...d, [r.id]: e.target.value }))}
                              className="flex-1 bg-black border border-white/15 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                            <button onClick={() => { patchReview(r.id, { adminReply: replyDrafts[r.id] ?? '' }, 'Reply saved'); }} className="bg-white/10 hover:bg-white/20 px-5 rounded-2xl text-xs">REPLY</button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {!r.approved
                            ? <button onClick={() => patchReview(r.id, { approved: true }, 'Review approved & live')} className="flex items-center gap-2 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-white px-5 py-2.5 rounded-2xl text-xs transition"><Check size={14} /> APPROVE</button>
                            : <button onClick={() => patchReview(r.id, { approved: false }, 'Review hidden')} className="flex items-center gap-2 bg-white/5 hover:bg-white/15 px-5 py-2.5 rounded-2xl text-xs transition"><EyeOff size={14} /> HIDE</button>}
                          <button onClick={() => patchReview(r.id, { pinned: !r.pinned }, r.pinned ? 'Unpinned' : 'Pinned to top')} className="flex items-center gap-2 bg-white/5 hover:bg-white/15 px-5 py-2.5 rounded-2xl text-xs transition"><Pin size={14} /> {r.pinned ? 'UNPIN' : 'PIN'}</button>
                          <button onClick={() => deleteReview(r.id)} className="flex items-center gap-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white px-5 py-2.5 rounded-2xl text-xs transition"><Trash2 size={14} /> DELETE</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============ CATALOG: categories, brands, families, collections ============ */}
        {tab === 'Catalog' && (
          <div>
            <div className="text-2xl serif-heading mb-2">Catalog Management</div>
            <div className="text-white/40 text-sm mb-6">Professional taxonomy: one Category per perfume, many Fragrance Families, many Collections, managed Brands. Nothing is hardcoded.</div>
            <CatalogTab tax={tax} reload={loadAll} />
          </div>
        )}

        {/* ============ COMMENTS ============ */}
        {tab === 'Comments' && (
          <div>
            <div className="text-2xl serif-heading mb-2">Live Client Comments — Moderation</div>
            <div className="text-white/40 text-sm mb-4">Hover any comment to delete it.</div>
            <LiveComments isAdmin />
          </div>
        )}

        {/* ============ SETTINGS ============ */}
        {tab === 'Settings' && (
          <div className="max-w-4xl">
            <div className="flex justify-between items-center mb-8 flex-wrap gap-3">
              <div>
                <div className="text-2xl serif-heading">Website Settings</div>
                <div className="text-white/40 text-sm">Every change updates the public website instantly. No code edits ever needed.</div>
              </div>
              <button onClick={saveSettings} disabled={savingSettings}
                className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-10 py-4 rounded-3xl text-sm font-medium tracking-widest hover:brightness-110 active:scale-95 transition disabled:opacity-60">
                {savingSettings ? 'SAVING...' : 'SAVE ALL SETTINGS'}
              </button>
            </div>

            {/* Feature toggles */}
            <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 mb-6">
              <div className="text-sm tracking-widest text-amber-400 mb-6">FEATURE TOGGLES</div>
              <div className="grid md:grid-cols-3 gap-4">
                {TOGGLES.map(([key, label]) => {
                  const on = settingsMap[key] === 'true';
                  return (
                    <button key={key} onClick={() => setSettingsMap(m => ({ ...m, [key]: on ? 'false' : 'true' }))}
                      className={`flex items-center justify-between px-6 py-4 rounded-2xl border transition ${on ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/15 bg-black'}`}>
                      <span className="text-sm">{label}</span>
                      <span className={`w-11 h-6 rounded-full relative transition ${on ? 'bg-emerald-500' : 'bg-white/20'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}></span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {SETTING_GROUPS.map(group => (
              <div key={group.title} className="bg-zinc-900 border border-white/10 rounded-3xl p-8 mb-6">
                <div className="text-sm tracking-widest text-amber-400 mb-6 uppercase">{group.title}</div>
                <div className="grid md:grid-cols-2 gap-5">
                  {group.fields.map(([key, label]) => (
                    <div key={key} className={key === 'description' || key === 'seoDescription' ? 'md:col-span-2' : ''}>
                      <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1.5">{label}</label>
                      {key === 'description' || key === 'seoDescription' ? (
                        <textarea rows={2} value={settingsMap[key] ?? ''} onChange={e => setSettingsMap(m => ({ ...m, [key]: e.target.value }))}
                          className="w-full bg-black border border-white/15 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-amber-400 resize-none" />
                      ) : (
                        <input value={settingsMap[key] ?? ''} onChange={e => setSettingsMap(m => ({ ...m, [key]: e.target.value }))}
                          className="w-full bg-black border border-white/15 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-amber-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button onClick={saveSettings} disabled={savingSettings}
              className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black py-5 rounded-3xl text-sm font-medium tracking-widest hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60">
              {savingSettings ? 'SAVING...' : 'SAVE ALL SETTINGS — UPDATES WEBSITE INSTANTLY'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
