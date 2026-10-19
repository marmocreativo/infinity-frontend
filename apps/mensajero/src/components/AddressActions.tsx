import { useState } from 'react';
import { Navigation, Share2 } from 'lucide-react';

interface AddressActionsProps {
  address: string;
  lat: string;
  lng: string;
  label: string;
}

const btnClass =
  'flex items-center gap-1.5 bg-background border border-border rounded-lg px-3 py-1.5 font-body text-xs text-foreground hover:border-primary/50 transition-colors';

export default function AddressActions({ address, lat, lng, label }: AddressActionsProps) {
  const [copied, setCopied] = useState(false);

  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  const shareUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  async function handleShare() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: label, text: address, url: shareUrl });
      } catch {
        // El usuario canceló el menú de compartir
      }
      return;
    }

    // Respaldo: copiar al portapapeles
    try {
      await navigator.clipboard.writeText(`${address}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin soporte de portapapeles
    }
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      <a href={googleUrl} target="_blank" rel="noopener noreferrer" className={btnClass}>
        <Navigation size={14} className="text-primary" />
        Google Maps
      </a>
      <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className={btnClass}>
        <Navigation size={14} className="text-primary" />
        Waze
      </a>
      <button type="button" onClick={handleShare} className={btnClass}>
        <Share2 size={14} className="text-primary" />
        {copied ? 'Copiado' : 'Compartir'}
      </button>
    </div>
  );
}