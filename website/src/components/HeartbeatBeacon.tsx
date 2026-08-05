"use client";
import { useEffect } from 'react';
import { heartbeat } from '@/lib/api';

/** Sends a heartbeat to the common backend on first render.
 *  This is what makes Super Admin → System Status flip the "Website"
 *  indicator from `not_connected` → `connected`. */
export default function HeartbeatBeacon() {
  useEffect(() => {
    heartbeat({
      client: 'website',
      version: '0.1.0',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  }, []);
  return null;
}
