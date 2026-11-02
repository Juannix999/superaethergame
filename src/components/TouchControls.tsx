import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Zap, Shield } from 'lucide-react';
import { sound } from '../game/audio';

interface TouchControlsProps {
  onTouchDelta: (dx: number, dy: number) => void;
  onDash: () => void;
  onSpecial: () => void;
  dashReady: boolean;
  dashCooldownPct: number;
  specialReady: boolean;
  specialCooldownPct: number;
  specialName: string;
  sensitivity?: 'low' | 'normal' | 'high';
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onTouchDelta,
  onDash,
  onSpecial,
  dashReady,
  dashCooldownPct,
  specialReady,
  specialCooldownPct,
  specialName,
  sensitivity = 'normal',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const [activeTouchPos, setActiveTouchPos] = useState<{ x: number; y: number } | null>(null);

  // Multiplier tuned for silky 1:1 direct flight control
  const sensitivityMultiplier =
    sensitivity === 'low' ? 0.95 : sensitivity === 'high' ? 1.45 : 1.18;

  // Handle pointer down on the direct touch flight zone
  const handlePointerDown = (e: React.PointerEvent) => {
    // Prevent taking over if already tracking
    if (touchIdRef.current !== null) return;

    // Double tap anywhere on screen triggers Dash
    const now = performance.now();
    if (now - lastTapTimeRef.current < 280) {
      sound.vibrate(25);
      onDash();
    }
    lastTapTimeRef.current = now;

    e.preventDefault();
    touchIdRef.current = e.pointerId;
    lastPosRef.current = { x: e.clientX, y: e.clientY };

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setActiveTouchPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }

    sound.vibrate(10);
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (touchIdRef.current !== e.pointerId || !lastPosRef.current) return;

      const dx = (e.clientX - lastPosRef.current.x) * sensitivityMultiplier;
      const dy = (e.clientY - lastPosRef.current.y) * sensitivityMultiplier;

      lastPosRef.current = { x: e.clientX, y: e.clientY };

      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setActiveTouchPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }

      onTouchDelta(dx, dy);
    },
    [onTouchDelta, sensitivityMultiplier]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (touchIdRef.current === e.pointerId) {
        touchIdRef.current = null;
        lastPosRef.current = null;
        setActiveTouchPos(null);
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none select-none z-30 touch-none overflow-hidden"
    >
      {/* 1. Full Screen Direct Touch Drag Zone (Direct finger movement, NO joystick bar) */}
      <div
        onPointerDown={handlePointerDown}
        className="pointer-events-auto absolute inset-0 touch-none"
      />

      {/* 2. Sleek Tactical Holographic Touch Reticle (Subtle tactile feedback following finger) */}
      {activeTouchPos && (
        <div
          className="absolute pointer-events-none transition-opacity duration-150 animate-in fade-in"
          style={{
            left: `${activeTouchPos.x}px`,
            top: `${activeTouchPos.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="relative w-14 h-14 rounded-full border border-cyan-400/40 bg-cyan-500/10 backdrop-blur-xs flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <div className="w-4 h-4 rounded-full border border-cyan-300/60" />
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            {/* Crosshair accents */}
            <div className="absolute top-0 w-0.5 h-2 bg-cyan-400/60" />
            <div className="absolute bottom-0 w-0.5 h-2 bg-cyan-400/60" />
            <div className="absolute left-0 w-2 h-0.5 bg-cyan-400/60" />
            <div className="absolute right-0 w-2 h-0.5 bg-cyan-400/60" />
          </div>
        </div>
      )}

      {/* 3. Mobile Flight Controls Cluster (Dash and Special in bottom-right corner) */}
      <div className="absolute right-3 sm:right-6 bottom-4 sm:bottom-6 pointer-events-auto flex items-end gap-3 touch-none z-40">
        {/* Dash Evade Button */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            sound.vibrate(25);
            onDash();
          }}
          disabled={!dashReady}
          className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-full flex flex-col items-center justify-center font-bold text-xs shadow-xl transition-transform active:scale-90 border-2 select-none ${
            dashReady
              ? 'bg-gradient-to-b from-cyan-500 to-sky-700 border-cyan-300 text-white shadow-cyan-500/40 ring-1 ring-cyan-400/60'
              : 'bg-slate-900/85 border-slate-700/60 text-slate-500'
          }`}
          title="Dash Esquiva (Doble toque en pantalla también activa Dash)"
        >
          <Zap className="w-6 h-6 mb-0.5 fill-current" />
          <span className="text-[10px] tracking-tight font-mono font-bold">DASH</span>

          {/* Radial cooldown overlay */}
          {!dashReady && (
            <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center text-[11px] font-mono font-bold text-slate-300">
              {Math.ceil(dashCooldownPct * 100)}%
            </div>
          )}
        </button>

        {/* Special Ultimate Ability Button */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            sound.vibrate([35, 20, 50]);
            onSpecial();
          }}
          disabled={!specialReady}
          className={`relative w-20 h-20 sm:w-22 sm:h-22 rounded-full flex flex-col items-center justify-center font-bold text-xs shadow-2xl transition-transform active:scale-90 border-2 select-none ${
            specialReady
              ? 'bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 border-amber-300 text-white shadow-amber-500/50 ring-2 ring-amber-400/70 animate-pulse'
              : 'bg-slate-900/85 border-slate-700/60 text-slate-500'
          }`}
          title={`Habilidad Especial: ${specialName}`}
        >
          <Shield className="w-7 h-7 mb-0.5 fill-current" />
          <span className="text-[10px] font-mono font-bold tracking-tight uppercase truncate max-w-[70px]">
            {specialName.slice(0, 9)}
          </span>

          {/* Radial cooldown overlay */}
          {!specialReady && (
            <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center text-xs font-mono font-bold text-amber-300">
              {Math.ceil(specialCooldownPct * 100)}%
            </div>
          )}
        </button>
      </div>
    </div>
  );
};
