"use client";

import { useEffect, useRef } from "react";

/* A fixed "Cycling Road" rail down the left edge using the actual Pokémon
 * Red/Blue Route 17 map. As you scroll the page the road scrolls upward (you
 * ride down it) while the rider stays put and pedals — camera-follows-player,
 * like the games. Hidden on narrow screens. Swap /public/trainer.gif for a
 * different rider sprite. */

const FALLBACK =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/25.gif";

export default function ScrollTrainer() {
  const roadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const road = roadRef.current;
    if (!road) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      // road slides up as you scroll down → you travel down the road
      road.style.backgroundPositionY = `${-(window.scrollY * 0.55).toFixed(1)}px`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <aside className="cycling-rail" aria-hidden="true">
      <div ref={roadRef} className="cycling-road" />
      <div className="cycling-rider">
        <img
          src="/trainer.gif"
          alt=""
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src !== FALLBACK) img.src = FALLBACK;
          }}
        />
      </div>
    </aside>
  );
}
