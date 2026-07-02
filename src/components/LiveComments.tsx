'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Send, Star, Trash2 } from 'lucide-react';

interface CommentItem {
  id: number;
  name: string;
  message: string;
  rating: number;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 30) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const AVATAR_COLORS = [
  'from-amber-400 to-yellow-600',
  'from-rose-400 to-pink-600',
  'from-emerald-400 to-teal-600',
  'from-sky-400 to-blue-600',
  'from-violet-400 to-purple-600',
];

export default function LiveComments({ isAdmin = false }: { isAdmin?: boolean }) {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [isPosting, setIsPosting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const knownIds = useRef<Set<number>>(new Set());

  const fetchComments = useCallback(async (notifyNew = false) => {
    try {
      const res = await fetch('/api/comments', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const fresh: CommentItem[] = data.comments ?? [];

      if (notifyNew && knownIds.current.size > 0) {
        const newOnes = fresh.filter(c => !knownIds.current.has(c.id));
        if (newOnes.length > 0) {
          toast(`${newOnes.length} new client comment${newOnes.length > 1 ? 's' : ''} just arrived`, { icon: '🔔' });
        }
      }
      knownIds.current = new Set(fresh.map(c => c.id));
      setItems(fresh);
      setLoaded(true);
    } catch {
      // Silent — will retry on next poll
    }
  }, []);

  useEffect(() => {
    fetchComments(false);
    const interval = setInterval(() => fetchComments(true), 8000);
    return () => clearInterval(interval);
  }, [fetchComments]);

  // Remember client name between visits
  useEffect(() => {
    const saved = localStorage.getItem('tsa_comment_name');
    if (saved) setName(saved);
  }, []);

  const submit = async () => {
    if (isPosting) return;
    if (name.trim().length < 2) { toast.error('Please enter your name'); return; }
    if (message.trim().length < 3) { toast.error('Please write a comment'); return; }

    setIsPosting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), message: message.trim(), rating }),
      });
      const data = await res.json();
      if (res.ok && data.comment) {
        localStorage.setItem('tsa_comment_name', name.trim());
        setMessage('');
        knownIds.current.add(data.comment.id);
        setItems(prev => [data.comment, ...prev]);
        toast.success('Thank you! Your comment is live. ✨');
      } else {
        toast.error(data.error || 'Could not post your comment');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this comment?')) return;
    const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setItems(prev => prev.filter(c => c.id !== id));
      toast.success('Comment deleted');
    } else {
      toast.error('Not authorized');
    }
  };

  const avg = items.length
    ? (items.reduce((s, c) => s + c.rating, 0) / items.length).toFixed(1)
    : null;

  return (
    <section id="comments" className="bg-black py-24 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-amber-400 text-sm tracking-widest">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            LIVE CLIENT WALL
          </div>
          <h3 className="text-4xl md:text-5xl serif-heading mt-3 text-white">Share Your Experience</h3>
          <p className="text-white/50 mt-4 max-w-md mx-auto">
            Leave a live comment — it appears instantly for everyone visiting The Scent Atelier.
          </p>
          {avg && (
            <div className="mt-6 inline-flex items-center gap-3 bg-zinc-900 border border-white/10 px-6 py-2.5 rounded-full text-sm">
              <span className="text-amber-400 text-lg">★</span>
              <span className="text-white font-medium">{avg}</span>
              <span className="text-white/40">average from {items.length} client{items.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-12 gap-10">
          {/* Post form */}
          <div className="lg:col-span-5">
            <div className="bg-zinc-950 border border-white/10 rounded-3xl p-8 lg:sticky lg:top-28">
              <div className="text-xs tracking-widest text-white/50 mb-6">LEAVE A LIVE COMMENT</div>

              <label className="block text-xs uppercase tracking-widest text-amber-400 mb-2">Your Name</label>
              <input
                type="text"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aisha from Westlands"
                className="w-full bg-black border border-white/20 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-amber-400 placeholder:text-white/30 mb-6"
              />

              <label className="block text-xs uppercase tracking-widest text-amber-400 mb-2">Your Rating</label>
              <div className="flex items-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-125 active:scale-95"
                    aria-label={`${star} star`}
                  >
                    <Star
                      size={30}
                      className={
                        star <= (hoverRating || rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-white/20'
                      }
                    />
                  </button>
                ))}
                <span className="ml-3 text-white/50 text-sm">{rating}/5</span>
              </div>

              <label className="block text-xs uppercase tracking-widest text-amber-400 mb-2">Your Comment</label>
              <textarea
                value={message}
                maxLength={500}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(); }}
                placeholder="Tell everyone about your experience with The Scent Atelier..."
                rows={4}
                className="w-full bg-black border border-white/20 rounded-3xl px-6 py-5 text-white focus:outline-none focus:border-amber-400 placeholder:text-white/30 resize-none"
              />
              <div className="text-right text-[10px] text-white/30 mt-1 mb-6">{message.length}/500</div>

              <button
                onClick={submit}
                disabled={isPosting}
                className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-medium py-5 rounded-3xl text-sm tracking-widest flex items-center justify-center gap-3 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {isPosting ? 'POSTING...' : 'POST LIVE COMMENT'}
                {!isPosting && <Send size={16} />}
              </button>

              <div className="text-center text-[10px] text-white/30 mt-5">
                Comments appear instantly and update live for all visitors.
              </div>
            </div>
          </div>

          {/* Live wall */}
          <div className="lg:col-span-7">
            {!loaded ? (
              <div className="space-y-5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-zinc-950 border border-white/10 rounded-3xl p-7 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/10"></div>
                      <div className="flex-1 space-y-3">
                        <div className="h-3 w-32 bg-white/10 rounded"></div>
                        <div className="h-3 w-full bg-white/5 rounded"></div>
                        <div className="h-3 w-2/3 bg-white/5 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="bg-zinc-950 border border-white/10 rounded-3xl p-16 text-center h-full flex flex-col items-center justify-center">
                <div className="text-6xl mb-6 opacity-40">💬</div>
                <div className="text-2xl serif-heading text-white mb-2">Be the first to comment</div>
                <p className="text-white/50">Your comment will appear here live for everyone to see.</p>
              </div>
            ) : (
              <div className="space-y-5 max-h-[720px] overflow-y-auto pr-2 [scrollbar-width:thin]">
                <AnimatePresence initial={false}>
                  {items.map((c) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: -16, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 40 }}
                      transition={{ duration: 0.35 }}
                      className="bg-zinc-950 border border-white/10 rounded-3xl p-7 hover:border-amber-400/30 transition-colors group"
                    >
                      <div className="flex gap-4">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${AVATAR_COLORS[c.id % AVATAR_COLORS.length]} flex items-center justify-center text-black font-bold text-lg flex-shrink-0`}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3">
                              <span className="text-white font-medium">{c.name}</span>
                              <span className="text-amber-400 text-sm tracking-tight">
                                {'★'.repeat(c.rating)}<span className="text-white/15">{'★'.repeat(5 - c.rating)}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] text-white/35">{timeAgo(c.createdAt)}</span>
                              {isAdmin && (
                                <button
                                  onClick={() => remove(c.id)}
                                  className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 transition p-1"
                                  title="Delete comment (admin)"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-white/75 mt-2 leading-relaxed break-words">{c.message}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
