'use client';
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, X, Search } from 'lucide-react';

export interface OptionItem { id: number; name: string; }
export interface SelectValue { id: number | null; name: string; }

interface SearchableSelectProps {
  label: string;
  items: OptionItem[];
  value: SelectValue;
  onChange: (v: SelectValue) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export function SearchableSelect({ label, items, value, onChange, placeholder, required, error }: SearchableSelectProps) {
  const [query, setQuery] = useState(value.name ?? '');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value.name ?? ''); }, [value.name, value.id]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        commit();
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const filtered = items.filter(i => i.name.toLowerCase().includes(query.trim().toLowerCase()));
  const exact = items.find(i => i.name.toLowerCase() === query.trim().toLowerCase());

  const commit = () => {
    const trimmed = query.trim();
    if (!trimmed) { onChange({ id: null, name: '' }); return; }
    const match = items.find(i => i.name.toLowerCase() === trimmed.toLowerCase());
    onChange({ id: match ? match.id : null, name: match ? match.name : trimmed });
  };

  const pick = (item: OptionItem) => {
    onChange({ id: item.id, name: item.name });
    setQuery(item.name);
    setOpen(false);
  };

  const createNew = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    onChange({ id: null, name: trimmed });
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-1">
        {label} {required && <span className="text-amber-400">*</span>}
      </label>
      <div className="relative">
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? `Search or type new ${label.toLowerCase()}...`}
          className={`w-full bg-black border rounded-2xl pl-10 pr-9 py-3.5 text-sm focus:outline-none ${error ? 'border-rose-500' : 'border-white/15 focus:border-amber-400'}`}
        />
        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30" />
      </div>
      {open && (
        <div className="absolute z-20 mt-2 w-full bg-zinc-900 border border-white/15 rounded-2xl max-h-56 overflow-y-auto shadow-xl">
          {filtered.map(item => (
            <button key={item.id} type="button" onClick={() => pick(item)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-amber-400/10 hover:text-amber-300 transition">
              {item.name}
            </button>
          ))}
          {query.trim() && !exact && (
            <button type="button" onClick={createNew}
              className="w-full text-left px-4 py-2.5 text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 border-t border-white/10">
              <Plus size={13} /> Create &quot;{query.trim()}&quot;
            </button>
          )}
          {filtered.length === 0 && !query.trim() && (
            <div className="px-4 py-3 text-xs text-white/30">Start typing to search or create new.</div>
          )}
        </div>
      )}
      {error && <div className="text-[10px] text-rose-400 mt-1">{error}</div>}
    </div>
  );
}

interface MultiSearchableSelectProps {
  label: string;
  items: OptionItem[];
  values: SelectValue[];
  onChange: (v: SelectValue[]) => void;
  placeholder?: string;
}

export function MultiSearchableSelect({ label, items, values, onChange, placeholder }: MultiSearchableSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const selectedNames = new Set(values.map(v => v.name.toLowerCase()));
  const filtered = items.filter(i => !selectedNames.has(i.name.toLowerCase()) && i.name.toLowerCase().includes(query.trim().toLowerCase()));
  const exact = items.find(i => i.name.toLowerCase() === query.trim().toLowerCase());

  const addItem = (v: SelectValue) => {
    if (selectedNames.has(v.name.toLowerCase())) return;
    onChange([...values, v]);
    setQuery('');
    setOpen(false);
  };
  const removeItem = (name: string) => onChange(values.filter(v => v.name.toLowerCase() !== name.toLowerCase()));

  return (
    <div ref={wrapRef} className="relative">
      <label className="text-[10px] uppercase tracking-widest text-white/50 block mb-2">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map(v => (
          <span key={v.name} className="flex items-center gap-1.5 bg-amber-400/15 text-amber-300 border border-amber-400/30 px-3 py-1.5 rounded-full text-xs">
            {v.name}
            <button type="button" onClick={() => removeItem(v.name)} className="hover:text-rose-400"><X size={12} /></button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter' && query.trim()) {
              e.preventDefault();
              const match = items.find(i => i.name.toLowerCase() === query.trim().toLowerCase());
              addItem(match ? { id: match.id, name: match.name } : { id: null, name: query.trim() });
            }
          }}
          placeholder={placeholder ?? `Search or add new...`}
          className="w-full bg-black border border-white/15 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-amber-400"
        />
      </div>
      {open && (query.trim() || filtered.length > 0) && (
        <div className="absolute z-20 mt-2 w-full bg-zinc-900 border border-white/15 rounded-2xl max-h-52 overflow-y-auto shadow-xl">
          {filtered.map(item => (
            <button key={item.id} type="button" onClick={() => addItem({ id: item.id, name: item.name })}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-amber-400/10 hover:text-amber-300 transition">
              {item.name}
            </button>
          ))}
          {query.trim() && !exact && (
            <button type="button" onClick={() => addItem({ id: null, name: query.trim() })}
              className="w-full text-left px-4 py-2.5 text-sm text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 border-t border-white/10">
              <Plus size={13} /> Create &quot;{query.trim()}&quot;
            </button>
          )}
        </div>
      )}
    </div>
  );
}