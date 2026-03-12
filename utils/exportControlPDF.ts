import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import {
  DEFAULT_ELEMENT_TYPE_COLOR,
  ELEMENT_TYPE_COLORS,
  ELEMENT_TYPE_LABELS,
} from '@/constants/controls';
import { Control, ControlImage, Program } from '@/types/project';

/** Max width for PDF images (A4 content ~600px; 800px keeps quality with headroom). */
const PDF_IMAGE_MAX_WIDTH = 800;

/** JPEG quality for PDF export (0–1; 0.75 balances size vs quality). */
const PDF_IMAGE_COMPRESS = 0.75;

/** Convert any URI to a compressed base64 data URI for PDF embedding. */
async function uriToBase64(uri: string): Promise<string> {
  try {
    let localUri = uri;

    if (!uri.startsWith('file://')) {
      const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!cacheDir) throw new Error('No cache or document directory available');
      const ext = uri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
      const dest = `${cacheDir}pdf_img_${Date.now()}.${ext}`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      localUri = dest;
    }

    // Compress and resize before embedding to reduce PDF size
    try {
      const result = await manipulateAsync(
        localUri,
        [{ resize: { width: PDF_IMAGE_MAX_WIDTH } }],
        {
          format: SaveFormat.JPEG,
          compress: PDF_IMAGE_COMPRESS,
          base64: true,
        }
      );

      if (result.base64) {
        return `data:image/jpeg;base64,${result.base64}`;
      }
    } catch (manipulateError) {
      console.warn('[exportControlPDF] image compression failed, using original:', uri, manipulateError);
    }

    // Fallback: use original image without compression
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mime =
      ext === 'png'
        ? 'image/png'
        : ext === 'gif'
          ? 'image/gif'
          : ext === 'webp'
            ? 'image/webp'
            : 'image/jpeg';

    return `data:${mime};base64,${base64}`;
  } catch (e) {
    console.warn('[exportControlPDF] failed to encode image:', uri, e);
    return '';
  }
}

function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function imagesToHtml(images: ControlImage[] | undefined): Promise<string> {
  if (!images || images.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon">-</div>
        <div class="empty-text">לא נוספו תמונות עבור סעיף זה</div>
      </div>
    `;
  }

  const blocks = await Promise.all(
    images.map(async (img, index) => {
      const src = await uriToBase64(img.uri);

      const imgTag = src
        ? `
          <div class="image-frame">
            <img src="${src}" class="section-image" />
          </div>
        `
        : `
          <div class="image-frame image-placeholder">
            <div>תמונה לא זמינה</div>
          </div>
        `;

      const desc = img.description?.trim()
        ? `
          <div class="note-box">
            <div class="note-title">הערות</div>
            <div class="note-content">${escapeHtml(img.description)}</div>
          </div>
        `
        : '';

      return `
        <div class="img-card">
          <div class="img-card-header">
            <div class="img-index">תמונה ${index + 1}</div>
          </div>
          ${imgTag}
          ${desc}
        </div>
      `;
    })
  );

  return `<div class="img-grid">${blocks.join('')}</div>`;
}

function renderInfoItem(label: string, value?: string | null, extraClass = ''): string {
  if (!value) return '';
  return `
    <div class="info-item ${extraClass}">
      <div class="info-label">${label}</div>
      <div class="info-value">${escapeHtml(value)}</div>
    </div>
  `;
}

async function programsToHtml(programs: Program[]): Promise<string> {
  if (!programs || programs.length === 0) return '';

  const cards = await Promise.all(
    programs.map(async (p) => {
      let imgHtml = '';
      if (p.imageUri) {
        const src = await uriToBase64(p.imageUri);
        if (src) {
          imgHtml = `
            <div class="program-card-image">
              <img src="${src}" />
            </div>
          `;
        }
      }

      const hasImage = !!imgHtml;

      return `
        <div class="program-card ${hasImage ? 'program-card--with-image' : ''}">
          <div class="program-card-info">
            <div class="program-card-title">${escapeHtml(p.name)}</div>
            <div class="program-card-meta">
              <span>מס׳ ${escapeHtml(String(p.number ?? ''))}</span>
              <span>גרסה ${escapeHtml(String(p.version ?? ''))}</span>
              <span>${escapeHtml(String(p.date ?? ''))}</span>
            </div>
          </div>
          ${imgHtml}
        </div>
      `;
    })
  );

  return `
    <section class="section-card">
      <div class="section-head">
        <h2>תוכניות</h2>
        <div class="section-subtitle">מסמכים ותוכניות קשורות</div>
      </div>

      <div class="programs-grid">
        ${cards.join('')}
      </div>
    </section>
  `;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' '
    + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** Sanitize a string for use in filenames (replace spaces/slashes with underscores). */
function sanitizeFilenamePart(value: string | undefined | null): string {
  if (!value) return '';
  return String(value)
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .trim() || '';
}

export async function exportControlPDF(control: Control): Promise<void> {
  const typeColor =
    ELEMENT_TYPE_COLORS[control.elementType as keyof typeof ELEMENT_TYPE_COLORS] ??
    DEFAULT_ELEMENT_TYPE_COLOR;

  const typeLabel =
    ELEMENT_TYPE_LABELS[control.elementType as keyof typeof ELEMENT_TYPE_LABELS] ??
    String(control.elementType);

  const [programsHtml, ironHtml, electricHtml, installationHtml, waterHtml, otherHtml, concreteHtml] =
    await Promise.all([
      programsToHtml(control.programs),
      imagesToHtml(control.IronControlImages),
      control.electricNeeded === false
        ? Promise.resolve(`
            <div class="status-box not-needed-box">
              <span class="status-dot"></span>
              לא נדרש עבור אלמנט זה
            </div>
          `)
        : imagesToHtml(control.ElectricalControlImages),
      control.installationNeeded === false
        ? Promise.resolve(`
            <div class="status-box not-needed-box">
              <span class="status-dot"></span>
              לא נדרש עבור אלמנט זה
            </div>
          `)
        : imagesToHtml(control.InstallationControlImages),
      control.waterNeeded === false
        ? Promise.resolve(`
            <div class="status-box not-needed-box">
              <span class="status-dot"></span>
              לא נדרש עבור אלמנט זה
            </div>
          `)
        : imagesToHtml(control.WaterControlImages),
      imagesToHtml(control.otherControlImages),
      imagesToHtml(control.ConcreteControlImages),
    ]);

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @page {
      size: A4;
      margin: 18mm 14mm 18mm 14mm;
    }

    :root {
      --accent: ${typeColor};
      --accent-soft: ${typeColor}15;
      --bg: #f4f6f8;
      --card: #ffffff;
      --text: #111827;
      --muted: #6b7280;
      --line: #e5e7eb;
      --soft-line: #eef2f7;
      --chip-bg: #f8fafc;
      --table-head: #f8fafc;
      --shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
      --radius-lg: 18px;
      --radius-md: 12px;
      --radius-sm: 10px;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      direction: rtl;
      text-align: right;
      font-family: Arial, Helvetica, sans-serif;
      color: var(--text);
      background: var(--bg);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      padding: 0;
      font-size: 13px;
      line-height: 1.55;
    }

    .report {
      width: 100%;
    }

    .hero {
      background: linear-gradient(135deg, #ffffff 0%, #f9fbfc 100%);
      border: 1px solid var(--line);
      border-top: 6px solid var(--accent);
      border-radius: 22px;
      padding: 22px;
      box-shadow: var(--shadow);
      margin-bottom: 18px;
      page-break-inside: avoid;
    }

    .hero-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 16px;
    }

    .title-wrap {
      flex: 1;
    }

    .title {
      margin: 0 0 8px 0;
      font-size: 26px;
      line-height: 1.2;
      font-weight: 800;
      color: #0f172a;
    }

    .subtitle {
      color: var(--muted);
      font-size: 13px;
    }

    .type-badge {
      display: inline-block;
      padding: 8px 14px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      border: 1px solid ${typeColor}40;
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .info-item {
      background: var(--chip-bg);
      border: 1px solid var(--soft-line);
      border-radius: 14px;
      padding: 12px 14px;
      min-height: 64px;
    }

    .info-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--muted);
      margin-bottom: 6px;
    }

    .info-value {
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
      word-break: break-word;
    }

    .section-card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: 18px;
      box-shadow: var(--shadow);
      margin-bottom: 16px;
      page-break-inside: avoid;
    }

    .section-head {
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--soft-line);
    }

    .section-head h2 {
      margin: 0 0 4px 0;
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
    }

    .section-subtitle {
      font-size: 12px;
      color: var(--muted);
    }

    .programs-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .program-card {
      border: 1px solid var(--line);
      border-radius: 14px;
      overflow: hidden;
      background: #fff;
      page-break-inside: avoid;
      padding: 14px;
    }

    .program-card--with-image {
      display: flex;
      flex-direction: row-reverse;
      align-items: center;
      gap: 14px;
    }

    .program-card-info {
      flex: 1;
      min-width: 0;
    }

    .program-card-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .program-card-meta {
      font-size: 11px;
      color: var(--muted);
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .program-card-meta span {
      color: #475569;
    }

    .program-card-image {
      flex-shrink: 0;
      width: 160px;
      height: 110px;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid var(--soft-line);
      background: #f8fafc;
    }

    .program-card-image img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    .img-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .img-card {
      border: 1px solid var(--line);
      border-radius: 16px;
      overflow: hidden;
      background: #fff;
      page-break-inside: avoid;
    }

    .img-card-header {
      padding: 10px 12px;
      background: #fbfcfd;
      border-bottom: 1px solid var(--soft-line);
    }

    .img-index {
      font-size: 12px;
      font-weight: 700;
      color: #475569;
    }

    .image-frame {
      width: 100%;
      background: #f8fafc;
      padding: 10px;
      border-bottom: 1px solid var(--soft-line);
    }

    .section-image {
      width: 100%;
      max-height: 260px;
      display: block;
      object-fit: contain;
      border-radius: 12px;
      background: #fff;
    }

    .image-placeholder {
      height: 180px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-weight: 600;
    }

    .note-box {
      margin: 12px;
      border: 1px solid #e8ecf3;
      border-radius: 12px;
      overflow: hidden;
      background: #fcfcfd;
    }

    .note-title {
      background: #f6f8fb;
      color: #475569;
      font-size: 11px;
      font-weight: 800;
      padding: 8px 10px;
      border-bottom: 1px solid #e8ecf3;
    }

    .note-content {
      padding: 10px 12px;
      font-size: 13px;
      color: #334155;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .empty-state,
    .status-box {
      border: 1px dashed #cbd5e1;
      border-radius: 14px;
      padding: 18px;
      text-align: center;
      background: #fafcff;
      color: #64748b;
      font-size: 13px;
      font-weight: 600;
    }

    .empty-icon {
      font-size: 22px;
      margin-bottom: 6px;
      color: #94a3b8;
    }

    .not-needed-box {
      background: #fcfcfd;
      border-style: solid;
      color: #475569;
    }

    .status-dot {
      display: inline-block;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--accent);
      margin-left: 8px;
      vertical-align: middle;
    }

    .page-break {
      page-break-before: always;
    }

    @media print {
      .hero,
      .section-card,
      .img-card {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="report">
    <div class="hero">
      <div class="hero-top">
        <div class="title-wrap">
          <h1 class="title">${escapeHtml(control.elementName)}</h1>
          <div class="subtitle">דוח בקרת אלמנט</div>
        </div>
        <div class="type-badge">${escapeHtml(typeLabel)}</div>
      </div>

      <div class="info-grid">
        ${renderInfoItem('מפלס', control.Level?.name)}
        ${renderInfoItem('מיקום', control.elementLocation)}
        ${renderInfoItem('סוג בטון', control.concreateType?.name)}
        ${renderInfoItem('סוג אלמנט', typeLabel)}
        ${(control.updatedAt ?? control.createdAt)
          ? renderInfoItem('תאריך ושעה', formatDateTime(control.updatedAt ?? control.createdAt!))
          : ''}
      </div>
    </div>

    ${programsHtml}

    <section class="section-card">
      <div class="section-head">
        <h2>בקרת ברזל</h2>
        <div class="section-subtitle">תמונות והערות מהשטח</div>
      </div>
      ${ironHtml}
    </section>

    <section class="section-card">
      <div class="section-head">
        <h2>בקרת חשמל</h2>
        <div class="section-subtitle">תמונות והערות מהשטח</div>
      </div>
      ${electricHtml}
    </section>

    <section class="section-card">
      <div class="section-head">
        <h2>בקרת אינסטלציה</h2>
        <div class="section-subtitle">תמונות והערות מהשטח</div>
      </div>
      ${installationHtml}
    </section>

    <section class="section-card">
      <div class="section-head">
        <h2>בקרת מיזוג אוויר</h2>
        <div class="section-subtitle">תמונות והערות מהשטח</div>
      </div>
      ${waterHtml}
    </section>

    <section class="section-card">
      <div class="section-head">
        <h2>בקרת שונות</h2>
        <div class="section-subtitle">תמונות והערות מהשטח</div>
      </div>
      ${otherHtml}
    </section>

    <section class="section-card">
      <div class="section-head">
        <h2>יציקה</h2>
        <div class="section-subtitle">תמונות והערות מהשטח</div>
      </div>
      ${concreteHtml}
    </section>
  </div>
</body>
</html>`;

  const { uri: tempUri } = await Print.printToFileAsync({ html });

  const elementName = sanitizeFilenamePart(control.elementName);
  const level = sanitizeFilenamePart(control.Level?.name);
  const location = sanitizeFilenamePart(control.elementLocation);
  const elementType = sanitizeFilenamePart(typeLabel);
  const dateStr = (control.updatedAt ?? control.createdAt)
    ? new Date(control.updatedAt ?? control.createdAt!).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const parts = [elementName, level, location, elementType, dateStr].filter(Boolean);
  const customFilename = (parts.length > 0 ? parts.join('_') : 'control_report') + '.pdf';

  let shareUri = tempUri;
  const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (cacheDir && customFilename) {
    const destUri = `${cacheDir}${customFilename}`;
    await FileSystem.copyAsync({ from: tempUri, to: destUri });
    shareUri = destUri;
  }

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(shareUri, {
      mimeType: 'application/pdf',
      dialogTitle: `${control.elementName} דוח בקרת אלמנט`,
      UTI: 'com.adobe.pdf',
    });
  }
}