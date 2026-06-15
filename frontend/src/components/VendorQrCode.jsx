import { useRef } from 'react';
import QRCode from 'react-qr-code';

/** Download the rendered QR SVG as a PNG file. */
export function downloadQrPng(svgEl, filename = 'vendor-qr.png') {
  if (!svgEl) return;
  const svgData = new XMLSerializer().serializeToString(svgEl);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const pad = 16;
    const canvas = document.createElement('canvas');
    canvas.width = img.width + pad * 2;
    canvas.height = img.height + pad * 2;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FAF7F2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, pad, pad);
    const a = document.createElement('a');
    a.download = filename;
    a.href = canvas.toDataURL('image/png');
    a.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

export default function VendorQrCode({ value, size = 160, label = 'Vendor shop QR code' }) {
  const wrapRef = useRef(null);

  if (!value) {
    return (
      <div style={{ width: size, height: size, background: 'var(--surface-2)', borderRadius: 8, margin: '0 auto' }} aria-hidden />
    );
  }

  return (
    <div
      ref={wrapRef}
      style={{
        background: '#FAF7F2',
        borderRadius: 'var(--r3)',
        padding: '1rem',
        display: 'inline-flex',
        border: '1px solid var(--border-lt)',
      }}
      aria-label={label}
    >
      <QRCode
        value={value}
        size={size}
        bgColor="#FAF7F2"
        fgColor="#3A2510"
        level="M"
        style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
      />
    </div>
  );
}

export function getQrSvgElement(containerEl) {
  return containerEl?.querySelector('svg') || null;
}
