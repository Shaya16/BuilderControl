import { Asset } from 'expo-asset';
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

const PDF_IMAGE_MAX_WIDTH = 600;
const PDF_IMAGE_COMPRESS = 0.5;

const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const DEBUG_LOG_ENDPOINT = 'http://127.0.0.1:7243/ingest/0563c332-c1a6-4a1d-8d03-7d74631f6e53';

function debugPdfLog(params: {
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
}): void {
  if (!__DEV__) return;
  fetch(DEBUG_LOG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      runId: params.runId,
      hypothesisId: params.hypothesisId,
      location: params.location,
      message: params.message,
      data: params.data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}

function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) +
    ' ' +
    d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })
  );
}

function sanitizeFilenamePart(value: string | undefined | null): string {
  if (!value) return '';
  return (
    String(value)
      .replace(/[/\\:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .trim() || ''
  );
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function uriToBase64(uri: string): Promise<string> {
  try {
    let localUri = uri;

    if (!uri.startsWith('file://')) {
      const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!cacheDir) throw new Error('No cache or document directory available');

      const ext = uri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
      const dest = `${cacheDir}pdf_img_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      await FileSystem.copyAsync({ from: uri, to: dest });
      localUri = dest;
    }

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
    } catch (err) {
      console.warn('[exportControlPDF] image compression failed, using original:', uri, err);
    }

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

function renderInfoItem(label: string, value?: string | null): string {
  if (!value) return '';
  return `
    <div class="info-item">
      <div class="info-label">${escapeHtml(label)}</div>
      <div class="info-value">${escapeHtml(value)}</div>
    </div>
  `;
}

function renderPage(params: {
  headerTitle: string;
  body: string;
  logoBase64?: string;
  footerLeft?: string;
  footerRight?: string;
  pageNumber?: number;
  totalPages?: number;
}): string {
  const {
    headerTitle,
    body,
    logoBase64,
    footerLeft = 'Builder Control',
    footerRight = 'דוח בקרה',
    pageNumber,
    totalPages,
  } = params;

  const pageNumberHtml =
    pageNumber != null && totalPages != null
      ? `<div class="footer-page">עמוד ${pageNumber} מתוך ${totalPages}</div>`
      : '';

  const logoHtml = logoBase64
    ? `<img src="${logoBase64}" class="header-logo-img" />`
    : '';

  return `
    <div class="pdf-page">
      <div class="page-header">
        <div class="header-logo">${logoHtml}</div>
        <div class="header-title">${escapeHtml(headerTitle)}</div>
      </div>

      <div class="page-content">
        ${body}
      </div>

      <div class="page-footer">
        <div class="footer-branding">
          <div class="footer-watermark-badge">
            <span class="footer-watermark-icon">✦</span>
            <span class="footer-watermark-text">${escapeHtml(footerLeft)}</span>
          </div>
          <span class="footer-credit">MADE BY SHAY AVIVI</span>
        </div>
        ${pageNumberHtml}
        <div class="footer-label">${escapeHtml(footerRight)}</div>
      </div>
    </div>
  `;
}

function renderSection(title: string, subtitle: string, content: string, headerExtra?: string): string {
  return `
    <section class="section-card">
      <div class="section-head">
        <div class="section-head-row">
          <h2>${escapeHtml(title)}</h2>
          ${headerExtra ?? ''}
        </div>
        <div class="section-subtitle">${escapeHtml(subtitle)}</div>
      </div>
      ${content}
    </section>
  `;
}

function renderStatusCard(message: string): string {
  return `
    <div class="status-card">
      <span class="status-dot"></span>
      ${escapeHtml(message)}
    </div>
  `;
}

function renderEmptyState(message: string): string {
  return `
    <div class="empty-state">
      <div class="empty-state-text">${escapeHtml(message)}</div>
    </div>
  `;
}

async function programsToCards(programs: Program[] | undefined): Promise<string[]> {
  if (!programs || programs.length === 0) return [];

  return Promise.all(
    programs.map(async (program) => {
      let imageHtml = '';

      if (program.imageUri) {
        const src = await uriToBase64(program.imageUri);
        if (src) {
          imageHtml = `
            <div class="program-image">
              <img src="${src}" />
            </div>
          `;
        }
      }

      return `
        <div class="program-card ${imageHtml ? 'program-card-with-image' : ''}">
          <div class="program-main">
            <div class="program-title">${escapeHtml(program.name)}</div>
            <div class="program-meta">
              ${program.number != null ? `<span>מס׳ ${escapeHtml(String(program.number))}</span>` : ''}
              ${program.version != null ? `<span>גרסה ${escapeHtml(String(program.version))}</span>` : ''}
              ${program.date ? `<span>${escapeHtml(String(program.date))}</span>` : ''}
            </div>
          </div>
          ${imageHtml}
        </div>
      `;
    })
  );
}

const IMAGE_BATCH_SIZE = 3;

async function imagesToCards(images: ControlImage[] | undefined): Promise<string[]> {
  if (!images || images.length === 0) {
    return [renderEmptyState('לא נוספו תמונות עבור סעיף זה')];
  }

  const results: string[] = [];
  for (let batchStart = 0; batchStart < images.length; batchStart += IMAGE_BATCH_SIZE) {
    const batch = images.slice(batchStart, batchStart + IMAGE_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (img, batchIndex) => {
        const index = batchStart + batchIndex;
        const src = await uriToBase64(img.uri);

        const imageHtml = src
          ? `
            <div class="image-wrap">
              <img src="${src}" class="section-image" />
            </div>
          `
          : `
            <div class="image-wrap image-placeholder">
              <div>תמונה לא זמינה</div>
            </div>
          `;

        const noteHtml = img.description?.trim()
          ? `
            <div class="note-box">
              <div class="note-title">הערות</div>
              <div class="note-content">${escapeHtml(img.description)}</div>
            </div>
          `
          : '';

        return `
          <div class="image-card">
            <div class="image-card-header">תמונה ${index + 1}</div>
            ${imageHtml}
            ${noteHtml}
          </div>
        `;
      })
    );
    results.push(...batchResults);
  }
  return results;
}

function renderProgramsPages(params: {
  headerTitle: string;
  cards: string[];
  logoBase64?: string;
  cardsPerPage?: number;
  runId?: string;
  startPageIndex?: number;
  totalPages?: number;
}): string {
  const { headerTitle, cards, logoBase64, cardsPerPage = 4, runId, startPageIndex, totalPages } = params;
  if (!cards.length) return '';

  const chunks = chunkArray(cards, cardsPerPage);

  if (runId) {
    // #region agent log
    debugPdfLog({
      runId,
      hypothesisId: 'H_LAYOUT_CHUNKING',
      location: 'utils/exportControlPDF.ts:renderProgramsPages',
      message: 'Program pages chunked',
      data: {
        headerTitle,
        cardsCount: cards.length,
        cardsPerPage,
        chunkCount: chunks.length,
        chunkSizes: chunks.map((chunk) => chunk.length),
      },
    });
    // #endregion
  }

  return chunks
    .map((chunk, i) =>
      renderPage({
        headerTitle,
        logoBase64,
        body: renderSection(
          'תוכניות',
          'מסמכים ותוכניות קשורות',
          `<div class="stack">${chunk.join('')}</div>`
        ),
        pageNumber: startPageIndex != null && totalPages != null ? startPageIndex + i : undefined,
        totalPages,
      })
    )
    .join('');
}

function renderImagePages(params: {
  headerTitle: string;
  title: string;
  subtitle: string;
  cards: string[];
  logoBase64?: string;
  cardsPerPage?: number;
  runId?: string;
  startPageIndex?: number;
  totalPages?: number;
  headerExtra?: string;
}): string {
  const { headerTitle, title, subtitle, cards, logoBase64, cardsPerPage = 4, runId, startPageIndex, totalPages, headerExtra } = params;
  if (!cards.length) return '';

  const chunks = chunkArray(cards, cardsPerPage);

  if (runId) {
    // #region agent log
    debugPdfLog({
      runId,
      hypothesisId: 'H_LAYOUT_CHUNKING',
      location: 'utils/exportControlPDF.ts:renderImagePages',
      message: 'Image pages chunked',
      data: {
        title,
        subtitle,
        cardsCount: cards.length,
        cardsPerPage,
        chunkCount: chunks.length,
        chunkSizes: chunks.map((chunk) => chunk.length),
      },
    });
    // #endregion
  }

  return chunks
    .map((chunk, i) =>
      renderPage({
        headerTitle,
        logoBase64,
        body: renderSection(
          title,
          subtitle,
          `<div class="grid-2">${chunk.join('')}</div>`,
          i === 0 ? headerExtra : undefined
        ),
        pageNumber: startPageIndex != null && totalPages != null ? startPageIndex + i : undefined,
        totalPages,
      })
    )
    .join('');
}

function buildHtmlDocument(pages: string, typeColor: string): string {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <style>
    @page {
      size: ${A4_WIDTH}pt ${A4_HEIGHT}pt;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #111827;
      direction: rtl;
      text-align: right;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      line-height: 1.5;
    }

    :root {
      --accent: ${typeColor};
      --accent-soft: ${typeColor}18;
      --line: #e5e7eb;
      --muted: #6b7280;
      --soft-bg: #f8fafc;
      --section-bg: #ffffff;
    }

    .pdf-page {
      width: ${A4_WIDTH}pt;

      padding: 22pt 14pt 16pt 14pt;
      display: flex;
      flex-direction: column;
      background: #fff;
      page-break-after: always;
      break-after: page;
    }

    .pdf-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .page-header {
      display: flex;
      flex-direction: row-reverse;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding-bottom: 8pt;
      border-bottom: 2px solid var(--accent);
      flex-shrink: 0;
    }

    .header-logo {
      width: 70px;
      height: 70px;
      border-radius: 8px;
      background: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }

    .header-logo-img {
      width: 70px;
      height: 70px;
      object-fit: contain;
      border-radius: 8px;
      display: block;
    }

    .header-title {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
    }

    .page-content {
      min-height: 690pt;
      padding-top: 12pt;
      padding-bottom: 12pt;
    }

    .page-footer {
      display: flex;
      flex-direction: row-reverse;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-top: 16pt;
      padding-top: 6pt;
      border-top: 1px solid var(--line);
    }

    .footer-branding {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 3px;
    }

    .footer-watermark-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
      border: 0.5px solid #cbd5e1;
      border-radius: 4px;
      padding: 2px 6px 2px 5px;
    }

    .footer-watermark-icon {
      font-size: 8px;
      color: #475569;
      line-height: 1;
    }

    .footer-watermark-text {
      font-size: 9px;
      font-weight: 700;
      color: #334155;
      letter-spacing: 0.4px;
    }

    .footer-credit {
      font-size: 7px;
      font-weight: 500;
      color: #94a3b8;
      letter-spacing: 1.4px;
      text-transform: uppercase;
      opacity: 0.75;
      text-align: right;
    }

    .footer-label,
    .footer-page {
      font-size: 9px;
      color: #94a3b8;
      font-weight: 600;
    }

    .footer-page {
      flex: 1;
      text-align: center;
    }

    .hero {
      border: 1px solid var(--line);
      border-top: 6px solid var(--accent);
      border-radius: 20px;
      padding: 20px;
      background: linear-gradient(135deg, #ffffff 0%, #fafcff 100%);
      page-break-inside: avoid;
      break-inside: avoid;
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
      min-width: 0;
    }

    .title {
      margin: 0 0 8px 0;
      font-size: 26px;
      line-height: 1.2;
      font-weight: 800;
      color: #0f172a;
      word-break: break-word;
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
      border: 1px solid ${typeColor}55;
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 12px;
    }

    .info-item {
      border: 1px solid #edf2f7;
      background: var(--soft-bg);
      border-radius: 12px;
      padding: 12px;
      min-height: 60px;
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
      color: #111827;
      word-break: break-word;
    }

    .section-card {
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--section-bg);
      padding: 18px;
    }

    .section-head {
      border-bottom: 1px solid #eef2f7;
      margin-bottom: 14px;
      padding-bottom: 10px;
    }

    .section-head-row {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 10px;
    }

    .section-head h2 {
      margin: 0 0 4px 0;
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
    }

    .validated-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }

    .validated-yes {
      background: #e8f5e9;
      border: 1px solid #66bb6a;
      color: #2e7d32;
    }

    .validated-no {
      background: #ffebee;
      border: 1px solid #ef9a9a;
      color: #c62828;
    }

    .section-subtitle {
      font-size: 12px;
      color: var(--muted);
    }

    .stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .program-card,
    .image-card,
    .status-card,
    .empty-state {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .program-card {
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 14px;
      background: #fff;
      overflow: hidden;
    }

    .program-card-with-image {
      display: flex;
      flex-direction: row-reverse;
      align-items: center;
      gap: 14px;
    }

    .program-main {
      flex: 1;
      min-width: 0;
    }

    .program-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
      word-break: break-word;
    }

    .program-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      font-size: 11px;
      color: #475569;
    }

    .program-image {
      width: 140px;
      height: 95px;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #edf2f7;
      background: #f8fafc;
      flex-shrink: 0;
    }

    .program-image img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    .image-card {
      border: 1px solid var(--line);
      border-radius: 16px;
      overflow: hidden;
      background: #fff;
    }

    .image-card-header {
      padding: 10px 12px;
      background: #fbfcfd;
      border-bottom: 1px solid #eef2f7;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
    }

    .image-wrap {
      width: 100%;
      padding: 10px;
      background: #f8fafc;
      border-bottom: 1px solid #eef2f7;
    }

    .section-image {
      width: 100%;
      max-height: 200px;
      object-fit: contain;
      display: block;
      border-radius: 10px;
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
      padding: 8px 10px;
      background: #f6f8fb;
      border-bottom: 1px solid #e8ecf3;
      font-size: 11px;
      font-weight: 800;
      color: #475569;
    }

    .note-content {
      padding: 10px 12px;
      font-size: 13px;
      color: #334155;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 110px;
      overflow: hidden;
    }

    .status-card,
    .empty-state {
      border: 1px dashed #cbd5e1;
      border-radius: 14px;
      padding: 18px;
      text-align: center;
      background: #fafcff;
      color: #64748b;
      font-size: 13px;
      font-weight: 600;
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

    .empty-state-text {
      color: #64748b;
    }
  </style>
</head>
<body>
  ${pages}
</body>
</html>`;
}

async function resolveLogoBase64(logoUri?: string): Promise<string> {
  if (logoUri) {
    const base64 = await uriToBase64(logoUri);
    if (base64) return base64;
  }
  try {
    const [asset] = await Asset.loadAsync(require('../assets/images/icon.png'));
    const assetUri = asset.localUri ?? asset.uri;
    if (assetUri) {
      const base64 = await uriToBase64(assetUri);
      if (base64) return base64;
    }
  } catch {}
  return '';
}

export async function generateControlPDFFile(
  control: Control,
  options?: { logoUri?: string },
): Promise<string> {
  const runId = `pdf-export-${Date.now()}`;
  const typeColor =
    ELEMENT_TYPE_COLORS[control.elementType as keyof typeof ELEMENT_TYPE_COLORS] ??
    DEFAULT_ELEMENT_TYPE_COLOR;

  const typeLabel =
    ELEMENT_TYPE_LABELS[control.elementType as keyof typeof ELEMENT_TYPE_LABELS] ??
    String(control.elementType);

  const headerTitle = `${control.elementName} - דוח בקרת אלמנט`;

  const logoBase64 = await resolveLogoBase64(options?.logoUri);

  const [
    programCards,
    ironCards,
    electricCards,
    installationCards,
    waterCards,
    otherCards,
    concreteCards,
  ] = await Promise.all([
    programsToCards(control.programs),
    imagesToCards(control.IronControlImages),
    control.electricNeeded === false
      ? Promise.resolve([renderStatusCard('לא נדרש עבור אלמנט זה')])
      : imagesToCards(control.ElectricalControlImages),
    control.installationNeeded === false
      ? Promise.resolve([renderStatusCard('לא נדרש עבור אלמנט זה')])
      : imagesToCards(control.InstallationControlImages),
    control.waterNeeded === false
      ? Promise.resolve([renderStatusCard('לא נדרש עבור אלמנט זה')])
      : imagesToCards(control.WaterControlImages),
    imagesToCards(control.otherControlImages),
    imagesToCards(control.ConcreteControlImages),
  ]);

  console.log(`[PDF] "${control.elementName}" images: iron=${ironCards.length} elec=${electricCards.length} inst=${installationCards.length} water=${waterCards.length} other=${otherCards.length} concrete=${concreteCards.length} programs=${programCards.length}`);

  const validatedConcreteHtml = control.validated_concrete
    ? `<span class="validated-badge validated-yes">היציקה אושרה ב${control.validated_concrete_at ? new Date(control.validated_concrete_at).toLocaleDateString('he-IL') : ''} בשעה ${control.validated_concrete_at ? new Date(control.validated_concrete_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : ''}</span>`
    : `<span class="validated-badge validated-no">היציקה לא אושרה</span>`;

  const CARDS_PER_PAGE = 4;
  const programChunks = programCards.length ? chunkArray(programCards, CARDS_PER_PAGE).length : 0;
  const ironChunks = ironCards.length ? chunkArray(ironCards, CARDS_PER_PAGE).length : 0;
  const electricChunks = electricCards.length ? chunkArray(electricCards, CARDS_PER_PAGE).length : 0;
  const installationChunks = installationCards.length ? chunkArray(installationCards, CARDS_PER_PAGE).length : 0;
  const waterChunks = waterCards.length ? chunkArray(waterCards, CARDS_PER_PAGE).length : 0;
  const otherChunks = otherCards.length ? chunkArray(otherCards, CARDS_PER_PAGE).length : 0;
  const concreteChunks = concreteCards.length ? chunkArray(concreteCards, CARDS_PER_PAGE).length : 0;

  const totalPages =
    1 +
    programChunks +
    ironChunks +
    electricChunks +
    installationChunks +
    waterChunks +
    otherChunks +
    concreteChunks;

  let pageIndex = 1;

  const heroPage = renderPage({
    headerTitle,
    logoBase64,
    body: `
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
            ? renderInfoItem(
                'תאריך ושעה',
                formatDateTime(control.updatedAt ?? control.createdAt!)
              )
            : ''}
        </div>
      </div>
    `,
    pageNumber: 1,
    totalPages,
  });
  pageIndex += 1;

  const pages = [
    heroPage,
    renderProgramsPages({
      headerTitle,
      logoBase64,
      cards: programCards,
      runId,
      startPageIndex: pageIndex,
      totalPages,
    }),
    (() => {
      pageIndex += programChunks;
      return renderImagePages({
        headerTitle,
        logoBase64,
        title: 'בקרת ברזל',
        subtitle: 'תמונות והערות מהשטח',
        cards: ironCards,
        runId,
        startPageIndex: pageIndex,
        totalPages,
      });
    })(),
    (() => {
      pageIndex += ironChunks;
      return renderImagePages({
        headerTitle,
        logoBase64,
        title: 'בקרת חשמל',
        subtitle: 'תמונות והערות מהשטח',
        cards: electricCards,
        runId,
        startPageIndex: pageIndex,
        totalPages,
      });
    })(),
    (() => {
      pageIndex += electricChunks;
      return renderImagePages({
        headerTitle,
        logoBase64,
        title: 'בקרת אינסטלציה',
        subtitle: 'תמונות והערות מהשטח',
        cards: installationCards,
        runId,
        startPageIndex: pageIndex,
        totalPages,
      });
    })(),
    (() => {
      pageIndex += installationChunks;
      return renderImagePages({
        headerTitle,
        logoBase64,
        title: 'בקרת מיזוג אוויר',
        subtitle: 'תמונות והערות מהשטח',
        cards: waterCards,
        runId,
        startPageIndex: pageIndex,
        totalPages,
      });
    })(),
    (() => {
      pageIndex += waterChunks;
      return renderImagePages({
        headerTitle,
        logoBase64,
        title: 'בקרת שונות',
        subtitle: 'תמונות והערות מהשטח',
        cards: otherCards,
        runId,
        startPageIndex: pageIndex,
        totalPages,
      });
    })(),
    (() => {
      pageIndex += otherChunks;
      return renderImagePages({
        headerTitle,
        logoBase64,
        title: 'יציקה',
        subtitle: 'תמונות והערות מהשטח',
        cards: concreteCards,
        runId,
        startPageIndex: pageIndex,
        totalPages,
        headerExtra: validatedConcreteHtml,
      });
    })(),
  ]
    .filter(Boolean)
    .join('');

  const html = buildHtmlDocument(pages, typeColor);

  // #region agent log
  debugPdfLog({
    runId,
    hypothesisId: 'H_RENDERED_PAGE_COUNT',
    location: 'utils/exportControlPDF.ts:exportControlPDF:html',
    message: 'PDF HTML assembled',
    data: {
      elementName: control.elementName,
      programCards: programCards.length,
      ironCards: ironCards.length,
      electricCards: electricCards.length,
      installationCards: installationCards.length,
      waterCards: waterCards.length,
      otherCards: otherCards.length,
      concreteCards: concreteCards.length,
      renderedPageCount: (pages.match(/class="pdf-page"/g) ?? []).length,
      renderedSectionCount: (pages.match(/class="section-card"/g) ?? []).length,
      hasPageBreakBeforeRule: html.includes('.pdf-page + .pdf-page') && html.includes('page-break-before: always'),
      hasFixedPageHeight: html.includes(`height: ${A4_HEIGHT}pt;`),
      hasSectionCardFullHeight: html.includes('.section-card') && html.includes('height: 100%;'),
      hasBreakInsideAvoid: html.includes('break-inside: avoid'),
    },
  });
  // #endregion

  // #region agent log
  debugPdfLog({
    runId,
    hypothesisId: 'H_PRINT_CONFIG',
    location: 'utils/exportControlPDF.ts:exportControlPDF:printConfig',
    message: 'Print config prepared',
    data: {
      printWidth: A4_WIDTH,
      printHeight: A4_HEIGHT,
      htmlLength: html.length,
      usesAtPageSizeRule: html.includes('@page'),
      usesExplicitPrintDimensions: true,
    },
  });
  // #endregion

  console.log(`[PDF] "${control.elementName}" printing (${(html.length / 1024).toFixed(0)}KB HTML, ${totalPages} pages)...`);
  const printStart = Date.now();
  const { uri: tempUri } = await Print.printToFileAsync({
    html,
    width: A4_WIDTH,
    height: A4_HEIGHT,
  });
  console.log(`[PDF] "${control.elementName}" print done in ${Date.now() - printStart}ms`);

  // #region agent log
  debugPdfLog({
    runId,
    hypothesisId: 'H_PRINT_RESULT',
    location: 'utils/exportControlPDF.ts:exportControlPDF:printResult',
    message: 'Print completed',
    data: {
      tempUri,
      generatedFile: Boolean(tempUri),
    },
  });
  // #endregion

  const elementName = sanitizeFilenamePart(control.elementName);
  const level = sanitizeFilenamePart(control.Level?.name);
  const location = sanitizeFilenamePart(control.elementLocation);
  const elementType = sanitizeFilenamePart(typeLabel);
  const dateStr = control.updatedAt ?? control.createdAt
    ? new Date(control.updatedAt ?? control.createdAt!).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const parts = [elementName, level, location, elementType, dateStr].filter(Boolean);
  const customFilename = `${parts.length ? parts.join('_') : 'control_report'}.pdf`;

  let fileUri = tempUri;
  const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;

  if (cacheDir) {
    const destUri = `${cacheDir}${customFilename}`;

    try {
      const existing = await FileSystem.getInfoAsync(destUri);
      if (existing.exists) {
        await FileSystem.deleteAsync(destUri, { idempotent: true });
      }
    } catch (e) {
      console.warn('[exportControlPDF] failed to clear existing file:', e);
    }

    await FileSystem.copyAsync({ from: tempUri, to: destUri });
    fileUri = destUri;
  }

  return fileUri;
}

export async function exportControlPDF(
  control: Control,
  options?: { logoUri?: string },
): Promise<void> {
  const fileUri = await generateControlPDFFile(control, options);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/pdf',
      dialogTitle: `${control.elementName} דוח בקרת אלמנט`,
      UTI: 'com.adobe.pdf',
    });
  }
}