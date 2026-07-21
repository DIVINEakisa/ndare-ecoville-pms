/**
 * QRManagementPage — Batch QR Code Generator
 *
 * Three tabs:
 *   1. Batch Table QR  — venue name + table range → grid of QR cards
 *   2. Batch Room QR   — floor/building + room range or list → grid of QR cards
 *   3. Single QR       — original one-at-a-time generator (preserved)
 *
 * Export options:
 *   • Print All (PDF)  — browser print with @media print grid layout
 *   • Download ZIP     — all QRs rendered to canvas, packed into a ZIP
 */
import { saveAs } from 'file-saver';
import { AnimatePresence, motion } from 'framer-motion';
import JSZip from 'jszip';
import {
  BedDouble,
  Download,
  Grid3X3,
  Loader2,
  Printer,
  QrCode,
  Sparkles,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { PageHeader } from '../../components/ui/PageHeader';

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL         = 'https://ndare-ecoville-pms-frontend.vercel.app';
const PROPERTY_SEGMENT = '6a51f788e588c84332106995';
const BRAND_GREEN      = '#3F6212';
const HOTEL_NAME       = 'Ndare Ecoville';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'table' | 'room' | 'single';

interface QREntry {
  id:    string;   // unique key
  label: string;   // e.g. "Main Restaurant — Table 05"
  url:   string;   // full URL encoded in the QR
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse a comma-separated or range string into individual numbers/strings. */
function parseRoomList(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];
  // comma-separated: "101, 102, 203"
  if (trimmed.includes(',')) {
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [trimmed];
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Render one QRCodeCanvas (hidden off-screen) to a PNG blob. */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas toBlob failed'))), 'image/png');
  });
}

// ─── Page root ────────────────────────────────────────────────────────────────

export function QRManagementPage() {
  const [tab, setTab] = useState<Tab>('table');

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'table',  label: 'Batch Tables', icon: UtensilsCrossed },
    { id: 'room',   label: 'Batch Rooms',  icon: BedDouble       },
    { id: 'single', label: 'Single QR',    icon: QrCode          },
  ];

  return (
    <div>
      <PageHeader
        title="QR Code Manager"
        breadcrumb={['Workspace', 'Admin', 'QR Management']}
      />

      {/* Tab bar */}
      <div className="mb-6 flex gap-2 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === id
                ? 'bg-lime-700 text-white shadow'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {tab === 'table'  && <BatchTableGenerator />}
          {tab === 'room'   && <BatchRoomGenerator />}
          {tab === 'single' && <SingleQRGenerator />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Batch Table Generator ────────────────────────────────────────────────────

function BatchTableGenerator() {
  const [venue,      setVenue]      = useState('Main Restaurant');
  const [startTable, setStartTable] = useState('1');
  const [endTable,   setEndTable]   = useState('10');
  const [entries,    setEntries]    = useState<QREntry[]>([]);
  const [zipping,    setZipping]    = useState(false);

  function generate() {
    const start = parseInt(startTable, 10);
    const end   = parseInt(endTable,   10);
    if (!venue.trim() || isNaN(start) || isNaN(end) || start > end) return;
    if (end - start > 199) { alert('Maximum 200 QR codes per batch.'); return; }

    const venueName = venue.trim();
    const result: QREntry[] = [];
    for (let t = start; t <= end; t++) {
      const venueParam = encodeURIComponent(venueName);
      result.push({
        id:    `table-${t}`,
        label: `${venueName} — Table ${pad(t)}`,
        url:   `${BASE_URL}/order/${PROPERTY_SEGMENT}?type=table&number=${t}&venue=${venueParam}&table=${t}`,
      });
    }
    setEntries(result);
  }

  const isValid =
    venue.trim().length > 0 &&
    !isNaN(parseInt(startTable, 10)) &&
    !isNaN(parseInt(endTable, 10)) &&
    parseInt(startTable, 10) <= parseInt(endTable, 10);

  return (
    <BatchLayout
      title="Batch Table QR Generator"
      description="Generate QR codes for every table in a venue in one click."
      form={
        <div className="grid gap-4">
          <Field label="Venue / Area Name">
            <input value={venue} onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Main Restaurant, Pool Bar, Terrace"
              className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Table #">
              <input type="number" min="1" value={startTable}
                onChange={(e) => setStartTable(e.target.value)} className={inputCls} />
            </Field>
            <Field label="End Table #">
              <input type="number" min="1" value={endTable}
                onChange={(e) => setEndTable(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <button onClick={generate} disabled={!isValid}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-700 py-3 text-sm font-bold text-white shadow-lg shadow-lime-700/25 transition hover:bg-lime-600 disabled:cursor-not-allowed disabled:opacity-50">
            <Grid3X3 className="h-4 w-4" />
            Generate {isValid ? `${parseInt(endTable,10) - parseInt(startTable,10) + 1} QR Codes` : 'QR Codes'}
          </button>
        </div>
      }
      entries={entries}
      zipping={zipping}
      setZipping={setZipping}
      filenamePrefix={`tables_${venue.replace(/\s+/g, '_').toLowerCase()}`}
    />
  );
}

// ─── Batch Room Generator ─────────────────────────────────────────────────────

function BatchRoomGenerator() {
  const [floor,      setFloor]      = useState('');
  const [startRoom,  setStartRoom]  = useState('101');
  const [endRoom,    setEndRoom]    = useState('110');
  const [customList, setCustomList] = useState('');
  const [useList,    setUseList]    = useState(false);
  const [entries,    setEntries]    = useState<QREntry[]>([]);
  const [zipping,    setZipping]    = useState(false);

  function generate() {
    let roomNumbers: string[] = [];

    if (useList) {
      roomNumbers = parseRoomList(customList);
    } else {
      const start = parseInt(startRoom, 10);
      const end   = parseInt(endRoom,   10);
      if (isNaN(start) || isNaN(end) || start > end) return;
      if (end - start > 199) { alert('Maximum 200 QR codes per batch.'); return; }
      for (let r = start; r <= end; r++) roomNumbers.push(String(r));
    }

    if (roomNumbers.length === 0) return;
    const prefix = floor.trim() ? `${floor.trim()} — ` : '';

    const result: QREntry[] = roomNumbers.map((num) => ({
      id:    `room-${num}`,
      label: `${prefix}Room ${num}`,
      url:   `${BASE_URL}/order/${PROPERTY_SEGMENT}?type=room&number=${num}&room=${num}`,
    }));
    setEntries(result);
  }

  const rangeValid =
    !isNaN(parseInt(startRoom, 10)) &&
    !isNaN(parseInt(endRoom,   10)) &&
    parseInt(startRoom, 10) <= parseInt(endRoom, 10);
  const isValid = useList ? customList.trim().length > 0 : rangeValid;

  return (
    <BatchLayout
      title="Batch Room QR Generator"
      description="Generate QR codes for guest rooms — use a range or paste a custom list."
      form={
        <div className="grid gap-4">
          <Field label="Building / Floor (optional)">
            <input value={floor} onChange={(e) => setFloor(e.target.value)}
              placeholder="e.g. Ground Floor, Block A"
              className={inputCls} />
          </Field>

          {/* Range vs custom list toggle */}
          <div className="flex gap-2">
            {[false, true].map((v) => (
              <button key={String(v)} type="button" onClick={() => setUseList(v)}
                className={`flex-1 rounded-xl border-2 py-2 text-xs font-bold transition ${
                  useList === v
                    ? 'border-lime-600 bg-lime-50 text-lime-700 dark:bg-lime-950/40 dark:text-lime-300'
                    : 'border-slate-200 text-slate-500 dark:border-slate-700'
                }`}>
                {v ? 'Custom list' : 'Number range'}
              </button>
            ))}
          </div>

          {!useList ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Room">
                <input type="number" min="1" value={startRoom}
                  onChange={(e) => setStartRoom(e.target.value)} className={inputCls} />
              </Field>
              <Field label="End Room">
                <input type="number" min="1" value={endRoom}
                  onChange={(e) => setEndRoom(e.target.value)} className={inputCls} />
              </Field>
            </div>
          ) : (
            <Field label="Room numbers (comma-separated)">
              <input value={customList} onChange={(e) => setCustomList(e.target.value)}
                placeholder="e.g. 101, 102, 205, 301"
                className={inputCls} />
            </Field>
          )}

          <button onClick={generate} disabled={!isValid}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-700 py-3 text-sm font-bold text-white shadow-lg shadow-lime-700/25 transition hover:bg-lime-600 disabled:cursor-not-allowed disabled:opacity-50">
            <Grid3X3 className="h-4 w-4" />
            Generate QR Codes
          </button>
        </div>
      }
      entries={entries}
      zipping={zipping}
      setZipping={setZipping}
      filenamePrefix={`rooms${floor ? '_' + floor.replace(/\s+/g, '_').toLowerCase() : ''}`}
    />
  );
}

// ─── Shared batch layout ──────────────────────────────────────────────────────

function BatchLayout({
  title, description, form, entries, zipping, setZipping, filenamePrefix,
}: {
  title:          string;
  description:    string;
  form:           React.ReactNode;
  entries:        QREntry[];
  zipping:        boolean;
  setZipping:     (v: boolean) => void;
  filenamePrefix: string;
}) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  // Hidden canvas container for ZIP rendering
  const hiddenRef = useRef<HTMLDivElement>(null);

  // ── Print ──────────────────────────────────────────────────────────────────
  function handlePrint() {
    window.print();
  }

  // ── ZIP download ───────────────────────────────────────────────────────────
  const handleZip = useCallback(async () => {
    if (entries.length === 0 || zipping) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('qr-codes')!;

      for (const entry of entries) {
        // Find the hidden canvas we rendered for this entry
        const canvas = hiddenRef.current?.querySelector<HTMLCanvasElement>(
          `[data-qr-id="${entry.id}"]`
        );
        if (!canvas) continue;

        // Draw a full card: white bg + QR centred with padding + label
        const CARD_W = 400;
        const CARD_H = 480;
        const QR_SIZE = 280;
        const QR_X = (CARD_W - QR_SIZE) / 2;
        const QR_Y = 60;

        const out = document.createElement('canvas');
        out.width  = CARD_W;
        out.height = CARD_H;
        const ctx = out.getContext('2d')!;

        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, CARD_W, CARD_H);

        // Header band
        ctx.fillStyle = BRAND_GREEN;
        ctx.fillRect(0, 0, CARD_W, 48);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(HOTEL_NAME.toUpperCase(), CARD_W / 2, 30);

        // QR code image from the hidden canvas
        ctx.drawImage(canvas, QR_X, QR_Y, QR_SIZE, QR_SIZE);

        // Label
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        const labelY = QR_Y + QR_SIZE + 30;
        ctx.fillText(entry.label, CARD_W / 2, labelY);

        // Footer note
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText('Scan to order • No app required', CARD_W / 2, labelY + 26);

        const blob = await canvasToBlob(out);
        const safeName = entry.label.replace(/[^a-z0-9_\-]/gi, '_');
        folder.file(`${safeName}.png`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `${filenamePrefix}_qrcodes.zip`);
    } finally {
      setZipping(false);
    }
  }, [entries, zipping, setZipping, filenamePrefix]);

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">

      {/* ── LEFT: config form ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-1 text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
        <p className="mb-6 text-sm text-slate-500">{description}</p>
        {form}

        {/* Export actions — only shown when there are entries */}
        {entries.length > 0 && (
          <div className="mt-5 grid gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-xs font-semibold text-slate-500">
                {entries.length} QR code{entries.length !== 1 ? 's' : ''} ready
              </p>
            </div>
            <button onClick={handlePrint}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <Printer className="h-4 w-4" />
              Print All (PDF Grid)
            </button>
            <button onClick={handleZip} disabled={zipping}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-700 py-3 text-sm font-bold text-white shadow-lg shadow-lime-700/25 transition hover:bg-lime-600 disabled:opacity-60">
              {zipping
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Building ZIP…</>
                : <><Download className="h-4 w-4" /> Download All as ZIP</>}
            </button>
          </div>
        )}
      </div>

      {/* ── RIGHT: preview grid ── */}
      <div>
        {entries.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900">
            <Sparkles className="mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm font-semibold">Fill in the form and click Generate</p>
            <p className="mt-1 text-xs">QR cards will appear here for preview</p>
          </div>
        ) : (
          <>
            {/* Screen preview grid */}
            <div ref={printAreaRef} id="qr-print-area"
              className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {entries.map((entry) => (
                <QRCard key={entry.id} entry={entry} />
              ))}
            </div>

            {/* Hidden canvases used for ZIP rendering — off-screen */}
            <div ref={hiddenRef} aria-hidden="true"
              className="pointer-events-none absolute -left-[9999px] top-0">
              {entries.map((entry) => (
                <QRCodeCanvas
                  key={entry.id}
                  data-qr-id={entry.id}
                  value={entry.url}
                  size={280}
                  fgColor={BRAND_GREEN}
                  bgColor="#ffffff"
                  level="M"
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Print styles injected inline ── */}
      <style>{printStyles}</style>
    </div>
  );
}

// ─── Individual QR card ───────────────────────────────────────────────────────

function QRCard({ entry }: { entry: QREntry }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="qr-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md dark:border-slate-700"
    >
      {/* Brand header */}
      <div className="bg-[#3F6212] px-4 py-3 text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-lime-200">{HOTEL_NAME}</p>
      </div>

      {/* QR + label */}
      <div className="flex flex-col items-center px-4 py-5">
        <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
          <QRCodeSVG
            value={entry.url}
            size={140}
            fgColor={BRAND_GREEN}
            bgColor="#ffffff"
            level="M"
          />
        </div>
        <p className="mt-3 text-center text-xs font-bold leading-snug text-slate-800 dark:text-white">
          {entry.label}
        </p>
        <div className="mt-2 flex items-center gap-1 rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-slate-800">
          <QrCode className="h-3 w-3 text-lime-700" />
          <p className="text-[10px] font-semibold text-slate-500">Scan to order</p>
        </div>
      </div>

      {/* URL preview */}
      <div className="border-t border-slate-100 px-4 py-2 dark:border-slate-800">
        <p className="break-all font-mono text-[9px] text-slate-400 leading-relaxed">{entry.url}</p>
      </div>
    </motion.div>
  );
}

// ─── CSS injected for print mode ──────────────────────────────────────────────

const printStyles = `
@media print {
  /* Hide everything except the QR grid */
  body > * { display: none !important; }
  #qr-print-area { display: grid !important; }

  /* Show the grid inside the app shell */
  body #root,
  body #root > *,
  body #root > * > *,
  body #root > * > * > * { display: contents !important; }

  #qr-print-area {
    position: fixed !important;
    inset: 0 !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 12px !important;
    padding: 16px !important;
    background: white !important;
  }

  .qr-card {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
    border: 1px solid #e2e8f0 !important;
    border-radius: 12px !important;
    overflow: hidden !important;
    box-shadow: none !important;
  }

  /* 3 per row on A4 portrait; 4 per row in landscape */
  @page { size: A4 portrait; margin: 10mm; }
}
`;

// ─── Single QR Generator (original, preserved) ───────────────────────────────

function SingleQRGenerator() {
  const [locationType,   setLocationType]   = useState<'room' | 'table'>('room');
  const [locationNumber, setLocationNumber] = useState('101');

  const qrValue = `${BASE_URL}/order/${PROPERTY_SEGMENT}?type=${locationType}&number=${locationNumber}`;
  const svgRef  = useRef<SVGSVGElement | null>(null);

  function handleDownload() {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgString  = serializer.serializeToString(svg);
    const svgBlob    = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url        = URL.createObjectURL(svgBlob);
    const img        = new Image();
    img.onload = () => {
      const PADDING = 48;
      const SIZE    = 200 + PADDING * 2;
      const canvas  = document.createElement('canvas');
      canvas.width  = SIZE;
      canvas.height = SIZE;
      const ctx     = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, PADDING, PADDING, 200, 200);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const link    = document.createElement('a');
        link.href     = URL.createObjectURL(blob);
        link.download = `ndare_ecoville_${locationType}_${locationNumber}.png`;
        link.click();
        URL.revokeObjectURL(link.href);
      }, 'image/png');
    };
    img.src = url;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-1 text-base font-semibold text-slate-900 dark:text-white">Generate Single QR Code</h2>
        <p className="mb-6 text-sm text-slate-500">Configure one location and download a print-ready PNG.</p>

        <div className="mb-5 flex gap-3">
          {(['room', 'table'] as const).map((type) => (
            <button key={type} type="button" onClick={() => setLocationType(type)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 py-3 text-sm font-bold capitalize transition ${
                locationType === type
                  ? 'border-lime-600 bg-lime-50 text-lime-700 dark:border-lime-700 dark:bg-lime-950/40 dark:text-lime-300'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950'
              }`}>
              {type === 'room' ? <BedDouble className="h-4 w-4" /> : <UtensilsCrossed className="h-4 w-4" />}
              {type === 'room' ? 'Room' : 'Table'}
            </button>
          ))}
        </div>

        <Field label={locationType === 'room' ? 'Room Number' : 'Table Number'}>
          <input type="text" value={locationNumber}
            onChange={(e) => setLocationNumber(e.target.value)}
            placeholder={locationType === 'room' ? 'e.g. 105' : 'e.g. 12'}
            className={inputCls} />
        </Field>

        <div className="my-5 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Embedded URL</p>
          <p className="break-all font-mono text-xs text-lime-700 dark:text-lime-400">{qrValue}</p>
        </div>

        <button onClick={handleDownload} disabled={!locationNumber.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-700 py-3 text-sm font-bold text-white shadow-lg shadow-lime-700/25 transition hover:bg-lime-600 disabled:opacity-50">
          <Download className="h-4 w-4" />
          Download Print-Ready PNG
        </button>
      </div>

      {/* Preview card */}
      <div className="flex justify-center">
        <div className="w-full max-w-xs overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="bg-[#3F6212] px-6 py-5 text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-lime-200">{HOTEL_NAME}</p>
          </div>
          <div className="flex flex-col items-center px-6 py-7">
            <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
              <QRCodeSVG ref={svgRef as React.RefObject<SVGSVGElement>}
                value={qrValue} size={200} fgColor={BRAND_GREEN} bgColor="#ffffff" level="M" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
              {locationType === 'room' ? 'Room' : 'Table'}
            </p>
            <p className="mt-0.5 text-4xl font-black text-slate-900">{locationNumber || '—'}</p>
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <QrCode className="h-3.5 w-3.5 text-lime-700" />
                <p className="text-xs font-semibold text-slate-700">Scan to order food &amp; drinks</p>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">No app required · Works on any phone</p>
            </div>
          </div>
          <div className="border-t border-slate-100 px-6 py-3 text-center">
            <p className="text-[10px] text-slate-400">Your order will be delivered directly to your {locationType}.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tiny shared components ───────────────────────────────────────────────────

const inputCls = 'h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none ring-lime-700 transition placeholder:font-normal placeholder:text-slate-400 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}
