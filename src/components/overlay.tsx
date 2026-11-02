'use client';
import { useEffect, useState } from 'react';
import type { Featured } from '@/lib/engine';
export function FeaturedCard({ featured }: { featured: Featured }) {
  return <div className="featured-card"><div className="eyebrow"><span className="dot" /> CHAT WANTS TO KNOW <span className="demo-mini">DEMO</span></div><h2>{featured.title}</h2><p>{featured.count} unique chatters when featured</p><div className="overlay-brand">✦ chat copilot</div></div>;
}
export default function Overlay({ token }: { token: string }) {
  const [featured, setFeatured] = useState<Featured | null>(null);
  useEffect(() => {
    let stopped = false; let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { const r = await fetch(`/api/overlay/${token}`, { cache: 'no-store', signal: AbortSignal.timeout(4000) }); if (!r.ok) throw Error(); const data = await r.json(); if (!stopped) setFeatured(data.featured); }
      catch { if (!stopped) setFeatured(null); }
      if (!stopped) timer = setTimeout(poll, 1000);
    };
    poll(); return () => { stopped = true; clearTimeout(timer); };
  }, [token]);
  return <main className="overlay-canvas">{featured && <FeaturedCard featured={featured} />}</main>;
}
