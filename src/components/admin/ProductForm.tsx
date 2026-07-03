'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Save, X, Plus, Trash2, Eye, FileEdit, Rocket, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Taxonomies } from '../../app/admin/dashboard/CatalogTab';
import { SearchableSelect, MultiSearchableSelect, type SelectValue } from './SearchableSelect';
import { ImageUploader } from './ImageUploader';

interface Size { label: string; price: number; discountPrice?: number | null; stock: number; weight?: string; }

export interface ProductFormValues {
  id?: number;
  name: string;
  code: string;
  slug: string;
  brand: string; brandId: number | null;
  category: string; categoryId: number | null;
  gender: string;
  status: string;
  draft: boolean;
  description: string;
  familyIds: number[];
  newFamilyNames: string[];
  topNotes: string; middleNotes: string; baseNotes: string;
  concentration: string; longevity: string; sillage: string; season: string; occasion: string;
  images: string[]; image: string; video: string;
  sizes: Size[];
  collectionIds: number[];
  seoTitle: string; seoDescription: string; metaKeywords: string;
}

const GENDERS = ['Unisex', 'Men', 'Women'];
const PRODUCT_STATUSES = ['In Stock', 'Out of Stock', 'Coming Soon', 'Best Seller', 'Featured', 'Flash Sale', 'Limited Edition', 'New Arrival'];
const CONCENTRATIONS = ['Parfum', 'Eau de Parfum', 'Eau de Toilette', 'Eau de Cologne', 'Eau Fraiche'];
const LONGEVITIES = ['Poor', 'Moderate', 'Long Lasting', 'Very Long Lasting', 'Eternal'];
const SILLAGES = ['Intimate', 'Moderate', 'Strong', 'Enormous'];
const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter', 'All Seasons'];
const OCCASIONS = ['Daily', 'Office', 'Evening', 'Date Night', 'Special Occasion', 'Sport'];
const COLLECTION_PRESETS = ['Featured', 'New Arrival', 'Best Seller', 'Trending', 'Flash Sale', 'Limited Edition', 'Clearance', 'Recommended', 'Exclusive'];
const SIZE_PRESETS = ['2ml', '3ml', '5ml', '10ml', '15ml', '20ml', '30ml', '50ml', '60ml', '75ml', '90ml', '100ml', '120ml', '150ml', '200ml'];

const SECTIONS = ['Basic Info', 'Fragrance', 'Images', 'Pricing', 'Collections', 'SEO'] as const;
type Section = (typeof SECTIONS)[number];

export function emptyProductForm(): ProductFormValues {
  return {
    name: '', code: '', slug: '',
    brand: '', brandId: null, category: '', categoryId: null,
    gender: 'Unisex', status: 'In Stock', draft: false,
    description: '', familyIds: [], newFamilyNames: [],
    topNotes: '', middleNotes: '', baseNotes: '',
    concentration: '', longevity: '', sillage: '', season: '', occasion: '',
    images: [], image: '', video: '',
    sizes: [{ label: '50ml', price: 0, discountPrice: null, stock: 10 }],
    collectionIds: [],
    seoTitle: '', seoDescription: '', metaKeywords: '',
  };
}

interface ProductFormProps {
  tax: Taxonomies;
  initial: ProductFormValues;
  isEditing: boolean;
  onSaved: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function ProductForm({ tax, initial, isEditing, onSaved, onCancel, onDelete }: ProductFormProps) {
  const [form, setForm] = useState<ProductFormValues>(initial);
  const [section, setSection] = useState<Section>('Basic Info');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  // Tracks the id of the product once it's been created on the server —
  // needed because `isEditing` (a prop) never changes mid-session, so without
  // this, every autosave/publish after the first would POST a brand-new
  // product instead of updating the one already created.
  const [createdId, setCreatedId] = useState<number | null>(initial.id ?? null);
  const savingRef = useRef(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialJson = useRef(JSON.stringify(initial));

  const effectiveIsEditing = isEditing || createdId !== null;

  useEffect(() => {
    setForm(initial);
    initialJson.current = JSON.stringify(initial);
    setCreatedId(initial.id ?? null);
    setDirty(false);
  }, [initial]);

  // Track unsaved changes
  useEffect(() => {
    setDirty(JSON.stringify(form) !== initialJson.current);
  }, [form]);

  // Warn before leaving the page with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // Autosave draft every 20s while dirty
  useEffect(() => {
    if (!dirty) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      saveDraftSilently();
    }, 20000);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, dirty]);

  const brandItems = tax.brands.filter(b => b.enabled).map(b => ({ id: b.id, name: b.name }));
  const categoryItems = tax.categories.filter(c => c.enabled).map(c => ({ id: c.id, name: c.name }));
  const familyItems = tax.families.filter(f => f.enabled).map(f => ({ id: f.id, name: f.name }));
  const collectionItems = tax.collections.filter(c => c.enabled).map(c => ({ id: c.id, name: c.name }));

  const selectedFamilyValues: SelectValue[] = useMemo(() => {
    const fromIds = form.familyIds.map(id => {
      const f = tax.families.find(x => x.id === id);
      return f ? { id: f.id, name: f.name } : null;
    }).filter(Boolean) as SelectValue[];
    const fromNew = form.newFamilyNames.map(name => ({ id: null, name }));
    return [...fromIds, ...fromNew];
  }, [form.familyIds, form.newFamilyNames, tax.families]);

  const setField = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const setSize = (i: number, patch: Partial<Size>) =>
    setForm(f => ({ ...f, sizes: f.sizes.map((sz, idx) => (idx === i ? { ...sz, ...patch } : sz)) }));

  const addSize = () => setForm(f => ({ ...f, sizes: [...f.sizes, { label: '', price: 0, discountPrice: null, stock: 0 }] }));
  const removeSize = (i: number) => setForm(f => ({ ...f, sizes: f.sizes.filter((_, idx) => idx !== i) }));

  const toggleCollection = (id: number) =>
    setForm(f => ({ ...f, collectionIds: f.collectionIds.includes(id) ? f.collectionIds.filter(x => x !== id) : [...f.collectionIds, id] }));

  const buildPayload = (draft: boolean) => ({
    ...form,
    draft,
    familyIds: selectedFamilyValues.filter(v => v.id !== null).map(v => v.id as number),
    newFamilyNames: selectedFamilyValues.filter(v => v.id === null).map(v => v.name),
  });

  const validate = (draft: boolean): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Product name is required.';
    if (!draft && !form.sizes.some(s => s.label && s.price > 0)) errs.sizes = 'Add at least one size with a price.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Please fix the highlighted fields.');
      if (errs.name) setSection('Basic Info');
      else if (errs.sizes) setSection('Pricing');
      return false;
    }
    return true;
  };

  const submit = async (draft: boolean) => {
    if (!validate(draft)) return;
    if (savingRef.current) return; // an autosave or another submit is already in flight
    savingRef.current = true;
    setSaving(true);
    try {
      const editingNow = effectiveIsEditing;
      const method = editingNow ? 'PUT' : 'POST';
      const url = editingNow ? `/api/products/${createdId ?? form.id}` : '/api/products';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload(draft)) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Save failed'); return; }
      if (!editingNow && data.product?.id) {
        // First successful save of a new product — remember its id so every
        // save after this one updates it instead of creating a duplicate.
        setCreatedId(data.product.id);
        setForm(f => ({ ...f, id: data.product.id, code: data.product.code ?? f.code }));
      }
      toast.success(draft ? 'Draft saved' : editingNow ? 'Product updated — live on the website' : `Published! Code: ${data.product.code}`);
      setDirty(false);
      initialJson.current = JSON.stringify(form);
      onSaved();
    } catch {
      toast.error('Save failed — check your connection');
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const saveDraftSilently = async () => {
    if (!form.name.trim()) return; // nothing meaningful to save yet
    if (savingRef.current) return; // don't autosave while a save is already in flight
    savingRef.current = true;
    try {
      const editingNow = effectiveIsEditing;
      const method = editingNow ? 'PUT' : 'POST';
      const url = editingNow ? `/api/products/${createdId ?? form.id}` : '/api/products';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload(true)) });
      const data = await res.json();
      if (res.ok) {
        if (!editingNow && data.product?.id) {
          setCreatedId(data.product.id);
          setForm(f => ({ ...f, id: data.product.id, code: data.product.code ?? f.code }));
        }
        setLastSavedAt(new Date());
        setDirty(false);
        initialJson.current = JSON.stringify(form);
      }
    } catch {
      // silent — autosave failures shouldn't interrupt the admin
    } finally {
      savingRef.current = false;
    }
  };

  const handleCancel = () => {
    if (dirty && !confirm('You have unsaved changes. Leave without saving?')) return;
    onCancel();
  };

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-8 pt-6 sm:pt-8 pb-4 flex-wrap gap-3">
        <div>
          <div className="serif-heading text-xl sm:text-2xl">{isEditing ? 'Edit Product' : 'New Product'}</div>
          <div className="text-xs text-white/40 mt-1 flex items-center gap-3 flex-wrap">
            {form.code && <span className="font-mono text-amber-400">{form.code}</span>}
            {lastSavedAt && <span>Draft autosaved {lastSavedAt.toLocaleTimeString()}</span>}
            {dirty && <span className="text-amber-400 flex items-center gap-1"><AlertTriangle size={11} /> Unsaved changes</span>}
          </div>
        </div>
        <button onClick={handleCancel} className="text-xs px-4 py-2 border border-white/30 rounded-2xl hover:bg-white/5">CANCEL</button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 px-4 sm:px-8 flex-wrap border-b border-white/10 pb-4">
        {SECTIONS.map(s => (
          <button key={s} type="button" onClick={() => setSection(s)}
            className={`px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs uppercase tracking-widest transition ${section === s ? 'bg-amber-400 text-black font-medium' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-8 space-y-6">
        {/* ===== BASIC INFO ===== */}
        {section === 'Basic Info' && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-1">Product Name <span className="text-amber-400">*</span></label>
              <input value={form.name} onChange={e => setField('name', e.target.value)}
                className={`w-full bg-black border rounded-2xl px-5 py-3.5 text-sm focus:outline-none ${errors.name ? 'border-rose-500' : 'border-white/15 focus:border-amber-400'}`} />
              {errors.name && <div className="text-[10px] text-rose-400 mt-1">{errors.name}</div>}
              <div className="text-[10px] text-white/30 mt-1">This becomes the page title and drives the auto-generated slug.</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-1">Product Code</label>
                <input value={form.code || 'Generated after first save'} disabled
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white/40 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-1">Slug</label>
                <input value={form.slug} onChange={e => setField('slug', e.target.value)} placeholder="auto-generated from name"
                  className="w-full bg-black border border-white/15 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-amber-400" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SearchableSelect label="Brand" items={brandItems} required
                value={{ id: form.brandId, name: form.brand }}
                onChange={v => setForm(f => ({ ...f, brandId: v.id, brand: v.name }))} />
              <SearchableSelect label="Category" items={categoryItems} required
                value={{ id: form.categoryId, name: form.category }}
                onChange={v => setForm(f => ({ ...f, categoryId: v.id, category: v.name }))} />
            </div>
            <div className="text-[10px] text-white/30 -mt-2">Typing a new brand or category and selecting &quot;Create&quot; adds it instantly — no need to leave this page.</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-1">Gender</label>
                <select value={form.gender} onChange={e => setField('gender', e.target.value)}
                  className="w-full bg-black border border-white/15 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-amber-400">
                  {GENDERS.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-1">Product Status</label>
                <select value={form.status} onChange={e => setField('status', e.target.value)}
                  className="w-full bg-black border border-white/15 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-amber-400">
                  {PRODUCT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-1">Short Description</label>
              <textarea rows={3} value={form.description} onChange={e => setField('description', e.target.value)}
                className="w-full bg-black border border-white/15 rounded-3xl px-5 py-4 text-sm focus:outline-none focus:border-amber-400 resize-none" />
            </div>
          </div>
        )}

        {/* ===== FRAGRANCE ===== */}
        {section === 'Fragrance' && (
          <div className="space-y-4">
            <MultiSearchableSelect label="Fragrance Families (multi-select, creates new automatically)"
              items={familyItems} values={selectedFamilyValues}
              onChange={vals => setForm(f => ({
                ...f,
                familyIds: vals.filter(v => v.id !== null).map(v => v.id as number),
                newFamilyNames: vals.filter(v => v.id === null).map(v => v.name),
              }))} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input placeholder="Top Notes" value={form.topNotes} onChange={e => setField('topNotes', e.target.value)}
                className="bg-black border border-white/15 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400" />
              <input placeholder="Middle Notes" value={form.middleNotes} onChange={e => setField('middleNotes', e.target.value)}
                className="bg-black border border-white/15 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400" />
              <input placeholder="Base Notes" value={form.baseNotes} onChange={e => setField('baseNotes', e.target.value)}
                className="bg-black border border-white/15 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-1">Concentration</label>
                <select value={form.concentration} onChange={e => setField('concentration', e.target.value)}
                  className="w-full bg-black border border-white/15 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-amber-400">
                  <option value="">— Select —</option>
                  {CONCENTRATIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-1">Longevity</label>
                <select value={form.longevity} onChange={e => setField('longevity', e.target.value)}
                  className="w-full bg-black border border-white/15 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-amber-400">
                  <option value="">— Select —</option>
                  {LONGEVITIES.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-1">Sillage</label>
                <select value={form.sillage} onChange={e => setField('sillage', e.target.value)}
                  className="w-full bg-black border border-white/15 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-amber-400">
                  <option value="">— Select —</option>
                  {SILLAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-1">Season</label>
                <select value={form.season} onChange={e => setField('season', e.target.value)}
                  className="w-full bg-black border border-white/15 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-amber-400">
                  <option value="">— Select —</option>
                  {SEASONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-1">Occasion</label>
              <select value={form.occasion} onChange={e => setField('occasion', e.target.value)}
                className="w-full bg-black border border-white/15 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-amber-400">
                <option value="">— Select —</option>
                {OCCASIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* ===== IMAGES ===== */}
        {section === 'Images' && (
          <ImageUploader
            images={form.images}
            onChange={imgs => setForm(f => ({ ...f, images: imgs, image: imgs[0] ?? '' }))}
            video={form.video}
            onVideoChange={v => setField('video', v)}
          />
        )}

        {/* ===== PRICING ===== */}
        {section === 'Pricing' && (
          <div>
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
              <div>
                <div className="text-xs tracking-widest text-white/60">SIZES, PRICES & STOCK</div>
                <div className="text-[10px] text-white/30 mt-1">Common sizes: {SIZE_PRESETS.slice(0, 8).join(', ')}...</div>
              </div>
              <button type="button" onClick={addSize} className="text-xs text-amber-400 flex items-center gap-1 hover:text-amber-300">
                <Plus size={13} /> ADD SIZE
              </button>
            </div>
            {errors.sizes && <div className="text-[10px] text-rose-400 mb-2">{errors.sizes}</div>}
            <div className="space-y-3 sm:space-y-2">
              {/* Header row — desktop only, columns line up with the grid below */}
              <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr_32px] gap-2 text-[9px] text-white/40 uppercase px-1">
                <span>Size</span><span>Regular Price</span><span>Discount</span><span>Stock</span><span>Weight</span><span></span>
              </div>
              {form.sizes.map((sz, i) => (
                <div key={i} className="border border-white/10 sm:border-none rounded-2xl p-3 sm:p-0 grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr_32px] gap-2">
                  <div>
                    <label className="text-[9px] text-white/40 uppercase block mb-1 sm:hidden">Size</label>
                    <input list="size-presets" placeholder="50ml" value={sz.label} onChange={e => setSize(i, { label: e.target.value })}
                      className="w-full bg-black border border-white/15 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/40 uppercase block mb-1 sm:hidden">Regular Price</label>
                    <input type="number" placeholder="0" value={sz.price || ''} onChange={e => setSize(i, { price: Number(e.target.value) })}
                      className="w-full bg-black border border-white/15 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/40 uppercase block mb-1 sm:hidden">Discount</label>
                    <input type="number" placeholder="—" value={sz.discountPrice ?? ''} onChange={e => setSize(i, { discountPrice: e.target.value ? Number(e.target.value) : null })}
                      className="w-full bg-black border border-white/15 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/40 uppercase block mb-1 sm:hidden">Stock</label>
                    <input type="number" placeholder="0" value={sz.stock ?? ''} onChange={e => setSize(i, { stock: Number(e.target.value) })}
                      className="w-full bg-black border border-white/15 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/40 uppercase block mb-1 sm:hidden">Weight</label>
                    <input placeholder="opt." value={sz.weight ?? ''} onChange={e => setSize(i, { weight: e.target.value })}
                      className="w-full bg-black border border-white/15 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
                  </div>
                  <div className="flex items-end sm:items-stretch col-span-2 sm:col-span-1">
                    <button type="button" onClick={() => removeSize(i)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 text-rose-400 hover:bg-rose-500/10 rounded-xl py-2 sm:py-0">
                      <X size={15} />
                      <span className="text-xs sm:hidden">Remove size</span>
                    </button>
                  </div>
                </div>
              ))}
              <datalist id="size-presets">
                {SIZE_PRESETS.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>
        )}

        {/* ===== COLLECTIONS ===== */}
        {section === 'Collections' && (
          <div>
            <div className="text-xs tracking-widest text-white/60 mb-3">COLLECTIONS — drive homepage sections</div>
            <div className="flex flex-wrap gap-2">
              {collectionItems.length === 0 && COLLECTION_PRESETS.map(name => (
                <span key={name} className="px-4 py-2 rounded-full text-xs border border-white/10 text-white/30">{name} (add in Catalog tab first)</span>
              ))}
              {collectionItems.map(c => (
                <button key={c.id} type="button" onClick={() => toggleCollection(c.id)}
                  className={`px-4 py-2 rounded-full text-xs border transition ${form.collectionIds.includes(c.id) ? 'bg-sky-400 text-black border-sky-400 font-medium' : 'border-white/20 text-white/60 hover:border-white/50'}`}>
                  {form.collectionIds.includes(c.id) ? '✓ ' : ''}{c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===== SEO ===== */}
        {section === 'SEO' && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-1">SEO Title</label>
              <input value={form.seoTitle} onChange={e => setField('seoTitle', e.target.value)} placeholder={form.name || 'Defaults to product name'}
                className="w-full bg-black border border-white/15 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-amber-400" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-1">SEO Description</label>
              <textarea rows={2} value={form.seoDescription} onChange={e => setField('seoDescription', e.target.value)}
                className="w-full bg-black border border-white/15 rounded-3xl px-5 py-4 text-sm focus:outline-none focus:border-amber-400 resize-none" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-1">Meta Keywords</label>
              <input value={form.metaKeywords} onChange={e => setField('metaKeywords', e.target.value)} placeholder="comma, separated, keywords"
                className="w-full bg-black border border-white/15 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-amber-400" />
            </div>
          </div>
        )}
      </div>

      {/* ===== PUBLISH BAR ===== */}
      <div className="border-t border-white/10 px-4 sm:px-8 py-6 flex flex-col sm:flex-row flex-wrap gap-3">
        {form.slug && (
          <a href={`/product/${form.slug}`} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 px-5 py-3 border border-white/20 rounded-2xl text-xs hover:bg-white/5">
            <Eye size={14} /> PREVIEW
          </a>
        )}
        <button type="button" onClick={() => submit(true)} disabled={saving}
          className="flex items-center justify-center gap-2 px-5 py-3 border border-white/20 rounded-2xl text-xs hover:bg-white/5 disabled:opacity-50">
          <FileEdit size={14} /> SAVE DRAFT
        </button>
        <button type="button" onClick={() => submit(false)} disabled={saving}
          className="flex-1 sm:min-w-[200px] flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-black rounded-2xl font-medium text-sm tracking-widest hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60">
          <Rocket size={16} /> {saving ? 'SAVING...' : isEditing ? 'UPDATE — GOES LIVE INSTANTLY' : 'PUBLISH TO WEBSITE'}
        </button>
        {isEditing && onDelete && (
          <button type="button" onClick={onDelete}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-rose-500/10 text-rose-400 rounded-2xl text-xs hover:bg-rose-500 hover:text-white transition">
            <Trash2 size={14} /> DELETE
          </button>
        )}
      </div>
    </div>
  );
}
