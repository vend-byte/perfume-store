'use client';

import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export interface TaxItem {
  id: number; name: string; enabled: boolean; sortOrder: number;
  image?: string; description?: string; logo?: string; country?: string; website?: string;
}
export interface Taxonomies {
  categories: TaxItem[]; brands: TaxItem[]; families: TaxItem[]; collections: TaxItem[];
}

const TYPES: { key: keyof Taxonomies; label: string; extras: 'category' | 'brand' | 'none' }[] = [
  { key: 'categories', label: 'Categories', extras: 'category' },
  { key: 'brands', label: 'Brands', extras: 'brand' },
  { key: 'families', label: 'Fragrance Families', extras: 'none' },
  { key: 'collections', label: 'Collections', extras: 'none' },
];

export default function CatalogTab({ tax, reload }: { tax: Taxonomies; reload: () => void }) {
  const [active, setActive] = useState<keyof Taxonomies>('categories');
  const [newItem, setNewItem] = useState({ name: '', country: '', website: '', description: '' });
  const [editId, setEditId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<TaxItem>>({});

  const conf = TYPES.find(t => t.key === active)!;
  const items = [...tax[active]].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

  const api = (path: string, method: string, body?: unknown) =>
    fetch(`/api/taxonomy/${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });

  const create = async () => {
    if (newItem.name.trim().length < 2) { toast.error('Enter a name'); return; }
    const res = await api(active, 'POST', { ...newItem, sortOrder: items.length + 1 });
    if (res.ok) { toast.success(`${conf.label.slice(0, -1) || 'Item'} added — live on the website`); setNewItem({ name: '', country: '', website: '', description: '' }); reload(); }
    else toast.error((await res.json()).error || 'Failed');
  };

  const patch = async (id: number, body: Record<string, unknown>, msg: string) => {
    const res = await api(`${active}/${id}`, 'PUT', body);
    if (res.ok) { toast.success(msg); reload(); } else toast.error('Failed');
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this item? Products linked to it will simply become unlinked.')) return;
    const res = await api(`${active}/${id}`, 'DELETE');
    if (res.ok) { toast.success('Deleted'); reload(); } else toast.error('Failed');
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const a = items[index], b = items[target];
    await Promise.all([
      api(`${active}/${a.id}`, 'PUT', { sortOrder: target + 1 }),
      api(`${active}/${b.id}`, 'PUT', { sortOrder: index + 1 }),
    ]);
    reload();
  };

  const saveEdit = async (id: number) => {
    await patch(id, editDraft as Record<string, unknown>, 'Updated');
    setEditId(null); setEditDraft({});
  };

  return (
    <div>
      <div className="flex gap-2 mb-8 flex-wrap">
        {TYPES.map(t => (
          <button key={t.key} onClick={() => { setActive(t.key); setEditId(null); }}
            className={`px-6 py-3 rounded-2xl text-sm transition ${active === t.key ? 'bg-amber-400 text-black font-medium' : 'bg-white/5 hover:bg-white/10'}`}>
            {t.label} <span className="opacity-60">({tax[t.key].length})</span>
          </button>
        ))}
      </div>

      {/* Create */}
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 mb-6">
        <div className="text-xs tracking-widest text-amber-400 mb-4">ADD NEW {conf.label.toUpperCase()}</div>
        <div className="flex gap-3 flex-wrap">
          <input placeholder="Name *" value={newItem.name} onChange={e => setNewItem(n => ({ ...n, name: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && create()}
            className="flex-1 min-w-[200px] bg-black border border-white/15 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-amber-400" />
          {conf.extras === 'brand' && (
            <>
              <input placeholder="Country" value={newItem.country} onChange={e => setNewItem(n => ({ ...n, country: e.target.value }))}
                className="w-40 bg-black border border-white/15 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-amber-400" />
              <input placeholder="Website (optional)" value={newItem.website} onChange={e => setNewItem(n => ({ ...n, website: e.target.value }))}
                className="w-56 bg-black border border-white/15 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-amber-400" />
            </>
          )}
          {conf.extras !== 'none' && (
            <input placeholder="Description" value={newItem.description} onChange={e => setNewItem(n => ({ ...n, description: e.target.value }))}
              className="flex-1 min-w-[200px] bg-black border border-white/15 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-amber-400" />
          )}
          <button onClick={create} className="bg-amber-400 text-black px-8 rounded-2xl text-sm font-medium flex items-center gap-2 hover:brightness-110 py-3.5"><Plus size={16} /> ADD</button>
        </div>
      </div>

      {/* List */}
      <div className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden">
        {items.map((item, i) => (
          <div key={item.id} className={`flex items-center gap-4 px-6 py-4 border-b border-white/5 ${!item.enabled ? 'opacity-40' : ''}`}>
            <div className="flex flex-col gap-1">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-white/40 hover:text-white disabled:opacity-20"><ArrowUp size={14} /></button>
              <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-white/40 hover:text-white disabled:opacity-20"><ArrowDown size={14} /></button>
            </div>

            {editId === item.id ? (
              <div className="flex-1 flex gap-2 flex-wrap items-center">
                <input value={editDraft.name ?? item.name} onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                  className="bg-black border border-amber-400 rounded-xl px-4 py-2 text-sm focus:outline-none flex-1 min-w-[160px]" autoFocus />
                {conf.extras === 'brand' && (
                  <>
                    <input placeholder="Country" value={editDraft.country ?? item.country ?? ''} onChange={e => setEditDraft(d => ({ ...d, country: e.target.value }))}
                      className="bg-black border border-white/20 rounded-xl px-4 py-2 text-sm w-32 focus:outline-none focus:border-amber-400" />
                    <input placeholder="Website" value={editDraft.website ?? item.website ?? ''} onChange={e => setEditDraft(d => ({ ...d, website: e.target.value }))}
                      className="bg-black border border-white/20 rounded-xl px-4 py-2 text-sm w-48 focus:outline-none focus:border-amber-400" />
                  </>
                )}
                {conf.extras !== 'none' && (
                  <input placeholder="Description" value={editDraft.description ?? item.description ?? ''} onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))}
                    className="bg-black border border-white/20 rounded-xl px-4 py-2 text-sm flex-1 min-w-[160px] focus:outline-none focus:border-amber-400" />
                )}
                <button onClick={() => saveEdit(item.id)} className="bg-emerald-500 text-white p-2 rounded-xl"><Check size={15} /></button>
                <button onClick={() => { setEditId(null); setEditDraft({}); }} className="bg-white/10 p-2 rounded-xl"><X size={15} /></button>
              </div>
            ) : (
              <div className="flex-1 cursor-pointer" onClick={() => { setEditId(item.id); setEditDraft({}); }}>
                <span className="font-medium">{item.name}</span>
                {item.country && <span className="text-white/40 text-xs ml-3">{item.country}</span>}
                {item.description && <span className="text-white/40 text-xs ml-3 hidden md:inline">{item.description.slice(0, 60)}</span>}
              </div>
            )}

            {/* Enable toggle */}
            <button onClick={() => patch(item.id, { enabled: !item.enabled }, item.enabled ? 'Disabled — hidden from website' : 'Enabled — visible on website')}
              className={`w-11 h-6 rounded-full relative transition flex-shrink-0 ${item.enabled ? 'bg-emerald-500' : 'bg-white/20'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${item.enabled ? 'left-[22px]' : 'left-0.5'}`}></span>
            </button>
            <button onClick={() => remove(item.id)} className="text-rose-400 hover:bg-rose-500/10 p-2.5 rounded-xl flex-shrink-0"><Trash2 size={15} /></button>
          </div>
        ))}
        {items.length === 0 && <div className="p-10 text-center text-white/40 text-sm">Nothing here yet — add the first one above.</div>}
      </div>
      <div className="text-[10px] text-white/30 mt-4 text-center">Reorder with arrows • Click a name to edit • Toggle to enable/disable • Changes update the public website instantly.</div>
    </div>
  );
}
