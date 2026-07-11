import { motion } from 'framer-motion';
import {
  BedDouble,
  Building2,
  Download,
  QrCode,
  UtensilsCrossed
} from 'lucide-react';
import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { PageHeader } from '../../components/ui/PageHeader';

// ─── constants ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://ndare-ecoville-pms-frontend.vercel.app';
// Property ID for Ndare Ecoville — used as the path segment
const PROPERTY_SEGMENT = '6a51f788e588c84332106995';
const BRAND_GREEN = '#3F6212'; // lime-800 — matches our Tailwind palette

// ─── Page ─────────────────────────────────────────────────────────────────────
export function QRManagementPage() {
  const [locationType,   setLocationType]   = useState<'room' | 'table'>('room');
  const [locationNumber, setLocationNumber] = useState('101');

  const qrValue = `${BASE_URL}/order/${PROPERTY_SEGMENT}?type=${locationType}&number=${locationNumber}`;

  const svgRef = useRef<SVGSVGElement | null>(null);

  function handleDownload() {
    const svg = svgRef.current;
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgString  = serializer.serializeToString(svg);
    const svgBlob    = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url        = URL.createObjectURL(svgBlob);

    // Draw SVG onto a canvas so we can export a crisp PNG
    const img = new Image();
    img.onload = () => {
      const PADDING = 48;
      const SIZE    = 200 + PADDING * 2;
      const canvas  = document.createElement('canvas');
      canvas.width  = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d')!;

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, SIZE, SIZE);

      // Draw QR code centred with padding
      ctx.drawImage(img, PADDING, PADDING, 200, 200);

      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const link     = document.createElement('a');
        link.href      = URL.createObjectURL(blob);
        link.download  = `ndare_ecoville_${locationType}_${locationNumber}.png`;
        link.click();
        URL.revokeObjectURL(link.href);
      }, 'image/png');
    };
    img.src = url;
  }

  const isValid = locationNumber.trim().length > 0;

  return (
    <div>
      <PageHeader
        title="QR Management"
        breadcrumb={['Workspace', 'Admin', 'QR Management']}
      />

      <div className="grid gap-8 lg:grid-cols-[420px_1fr]">

        {/* ── LEFT: Config form ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-1 text-base font-semibold text-slate-900 dark:text-white">
            Generate QR Code
          </h2>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
            Configure the location then download the print-ready PNG.
          </p>

          {/* Location type toggle */}
          <div className="mb-5">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Location Type
            </label>
            <div className="flex gap-3">
              {(['room', 'table'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setLocationType(type)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 py-3 text-sm font-bold capitalize transition ${
                    locationType === type
                      ? 'border-lime-600 bg-lime-50 text-lime-700 dark:border-lime-700 dark:bg-lime-950/40 dark:text-lime-300'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400'
                  }`}
                >
                  {type === 'room'
                    ? <BedDouble className="h-4 w-4" />
                    : <UtensilsCrossed className="h-4 w-4" />}
                  {type === 'room' ? 'Room' : 'Table'}
                </button>
              ))}
            </div>
          </div>

          {/* Number input */}
          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {locationType === 'room' ? 'Room Number' : 'Table Number'}
            </label>
            <input
              type="text"
              value={locationNumber}
              onChange={(e) => setLocationNumber(e.target.value)}
              placeholder={locationType === 'room' ? 'e.g. 105' : 'e.g. 12'}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-900 outline-none ring-lime-700 transition placeholder:font-normal placeholder:text-slate-400 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Embedded URL preview */}
          <div className="mb-6 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Embedded URL
            </p>
            <p className="break-all font-mono text-xs text-lime-700 dark:text-lime-400">
              {qrValue}
            </p>
          </div>

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={!isValid}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-lime-700/25 transition hover:bg-lime-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Download Print-Ready PNG
          </button>
          <p className="mt-2 text-center text-xs text-slate-400">
            Saves as{' '}
            <span className="font-mono text-slate-600 dark:text-slate-300">
              ndare_ecoville_{locationType}_{locationNumber || 'X'}.png
            </span>
          </p>
        </div>

        {/* ── RIGHT: Print card preview ── */}
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-1 text-base font-semibold text-slate-900 dark:text-white">
              Print Card Preview
            </h2>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
              This is how the printed card will look when placed in the {locationType}.
            </p>

            <div className="flex justify-center">
              <motion.div
                key={qrValue}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-xs"
              >
                {/* ── Simulated print card ── */}
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 dark:border-slate-700 dark:bg-white">
                  {/* Card header */}
                  <div className="bg-[#3F6212] px-6 py-5 text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-lime-200">
                      Ndare Ecoville
                    </p>
                    <p className="mt-0.5 text-[11px] text-lime-300/80">
                      Property Management System
                    </p>
                  </div>

                  {/* QR code area */}
                  <div className="flex flex-col items-center px-6 py-7">
                    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                      {/* Hidden ref for download — rendered off-screen */}
                      <QRCodeSVG
                        ref={svgRef as React.RefObject<SVGSVGElement>}
                        value={qrValue}
                        size={200}
                        fgColor={BRAND_GREEN}
                        bgColor="#ffffff"
                        level="M"
                      />
                    </div>

                    {/* Location label */}
                    <div className="mt-4 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                        {locationType === 'room' ? 'Room' : 'Table'}
                      </p>
                      <p className="mt-0.5 text-4xl font-black tracking-tight text-slate-900">
                        {locationNumber || '—'}
                      </p>
                    </div>

                    {/* Instruction */}
                    <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <QrCode className="h-3.5 w-3.5 text-lime-700" />
                        <p className="text-xs font-semibold text-slate-700">
                          Scan to order food & drinks
                        </p>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        No app required · Works on any phone
                      </p>
                    </div>
                  </div>

                  {/* Card footer */}
                  <div className="border-t border-slate-100 px-6 py-3 text-center">
                    <p className="text-[10px] text-slate-400">
                      Your order will be delivered directly to your {locationType}.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Bulk generation hint */}
          <div className="rounded-2xl border border-lime-200/60 bg-lime-50 p-5 dark:border-lime-900/40 dark:bg-lime-950/20">
            <p className="text-sm font-semibold text-lime-800 dark:text-lime-300">
              💡 Printing tip
            </p>
            <p className="mt-1 text-sm text-lime-700/80 dark:text-lime-400/80">
              Download each PNG individually, then print on A6 card stock (105 × 148 mm).
              Laminating the cards will protect them from spills and extend their lifespan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
