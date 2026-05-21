"use client";
import { useEffect, useRef, useState } from "react";

function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = null;
    function step(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

export function AnimatedKpiCard({
  label,
  rawValue,
  sub,
  color = "text-white",
}: {
  label: string;
  rawValue: number;
  sub: string;
  color?: string;
}) {
  const display = useCountUp(rawValue, 1400);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 leading-tight">{label}</p>
      <p className={`text-xl font-bold ${color} tabular-nums`}>{display.toLocaleString("es-CR")}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}
