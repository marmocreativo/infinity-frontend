import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { MapPin, Search } from 'lucide-react';
import { searchAddresses, type GeocodeResult } from '../lib/geocode';

const inputClass =
  'w-full bg-card text-foreground font-body px-3 py-2 pr-10 rounded-lg border border-border focus:border-primary focus:outline-none text-sm';

interface Props {
  value: string;
  onValueChange: (text: string) => void;
  /** Se llama con el primer resultado al escribir (picked=false) y con el elegido de la lista (picked=true) */
  onResolve: (result: GeocodeResult, picked: boolean) => void;
  placeholder?: string;
  required?: boolean;
}

/** Campo de dirección con búsqueda: sugerencias mientras escribes, Enter o la lupa para buscar ya */
export default function AddressSearch({ value, onValueChange, onResolve, placeholder, required }: Props) {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  // Cierra la lista al hacer clic fuera
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  async function run(query: string) {
    const id = ++seq.current;
    setLoading(true);
    setNotFound(false);

    const found = await searchAddresses(query);
    if (id !== seq.current) return; // llegó una búsqueda más nueva

    setLoading(false);
    setResults(found);
    setOpen(found.length > 0);
    setNotFound(found.length === 0);

    if (found.length > 0) onResolve(found[0], false);
  }

  function handleChange(text: string) {
    onValueChange(text);
    if (timer.current) clearTimeout(timer.current);

    if (text.trim().length < 5) {
      seq.current++;
      setResults([]);
      setOpen(false);
      setNotFound(false);
      setLoading(false);
      return;
    }

    timer.current = setTimeout(() => run(text), 700);
  }

  function searchNow() {
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length >= 3) run(value);
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault(); // no avanza el formulario
      searchNow();
    }
    if (e.key === 'Escape') setOpen(false);
  }

  function pick(r: GeocodeResult) {
    seq.current++;
    onValueChange(r.displayName);
    setOpen(false);
    setResults([]);
    setNotFound(false);
    setLoading(false);
    onResolve(r, true);
  }

  return (
    <div ref={box} className="relative">
      <input
        className={inputClass}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKey}
        onFocus={() => results.length > 0 && setOpen(true)}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
      />

      <button
        type="button"
        onClick={searchNow}
        aria-label="Buscar dirección"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-primary"
      >
        {loading ? <span className="font-body text-[10px]">...</span> : <Search size={16} />}
      </button>

      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1 z-[1100] bg-popover border border-border rounded-lg shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lng}-${i}`}>
              <button
                type="button"
                onClick={() => pick(r)}
                className="w-full flex items-start gap-2 text-left px-3 py-2 hover:bg-card transition-colors"
              >
                <MapPin size={14} className="text-primary shrink-0 mt-0.5" />
                <span className="font-body text-xs text-foreground">{r.displayName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {notFound && !loading && (
        <p className="font-body text-xs text-status-enroute mt-1">
          No encontramos esa dirección. Prueba con calle, número y colonia, o marca el punto directamente en el mapa.
        </p>
      )}
    </div>
  );
}
