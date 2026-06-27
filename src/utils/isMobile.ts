import { useState, useEffect } from 'react';

export const isMobile = (): boolean => window.innerWidth <= 768;

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handler = () => setMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return mobile;
}
