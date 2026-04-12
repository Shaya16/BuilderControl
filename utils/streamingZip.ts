import { File as FSFile } from 'expo-file-system';

/**
 * Minimal streaming ZIP writer that writes directly to disk.
 *
 * Unlike JSZip, this never holds the full ZIP in memory — it writes each
 * file entry (header + data) to disk one at a time and only keeps a small
 * central-directory record per entry (~100 bytes each).
 *
 * Only supports STORE (no compression), which is ideal for already-compressed
 * images (JPEG/PNG) and avoids the CPU/memory overhead of DEFLATE.
 */

// ---------------------------------------------------------------------------
// CRC-32 (required by ZIP format even for STORE)
// ---------------------------------------------------------------------------

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function textToBytes(str: string): Uint8Array {
  // Simple UTF-8 encoder (TextEncoder not available in Hermes)
  const arr: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) {
      arr.push(c);
    } else if (c < 0x800) {
      arr.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdbff) {
      // Surrogate pair
      const next = str.charCodeAt(++i);
      const cp = 0x10000 + ((c - 0xd800) << 10) + (next - 0xdc00);
      arr.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
    } else {
      arr.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return new Uint8Array(arr);
}

/** Read a 16-bit little-endian value from a buffer at offset. */
function readU16(buf: Uint8Array, offset: number): number {
  return buf[offset] | (buf[offset + 1] << 8);
}

/** Read a 32-bit little-endian unsigned value from a buffer at offset. */
function readU32(buf: Uint8Array, offset: number): number {
  return (
    (buf[offset] |
      (buf[offset + 1] << 8) |
      (buf[offset + 2] << 16) |
      (buf[offset + 3] << 24)) >>>
    0
  );
}

/** Decode a UTF-8 Uint8Array to a string (TextDecoder not available in Hermes). */
export function bytesToText(bytes: Uint8Array): string {
  const chars: string[] = [];
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b < 0x80) {
      chars.push(String.fromCharCode(b));
      i++;
    } else if ((b & 0xe0) === 0xc0) {
      const cp = ((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f);
      chars.push(String.fromCharCode(cp));
      i += 2;
    } else if ((b & 0xf0) === 0xe0) {
      const cp =
        ((b & 0x0f) << 12) |
        ((bytes[i + 1] & 0x3f) << 6) |
        (bytes[i + 2] & 0x3f);
      chars.push(String.fromCharCode(cp));
      i += 3;
    } else {
      // 4-byte sequence → surrogate pair
      const cp =
        ((b & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f);
      const adjusted = cp - 0x10000;
      chars.push(
        String.fromCharCode(0xd800 + (adjusted >> 10)),
        String.fromCharCode(0xdc00 + (adjusted & 0x3ff)),
      );
      i += 4;
    }
  }
  return chars.join('');
}

/** Write a 16-bit little-endian value into a buffer at offset. */
function writeU16(buf: Uint8Array, offset: number, value: number) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >>> 8) & 0xff;
}

/** Write a 32-bit little-endian value into a buffer at offset. */
function writeU32(buf: Uint8Array, offset: number, value: number) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >>> 8) & 0xff;
  buf[offset + 2] = (value >>> 16) & 0xff;
  buf[offset + 3] = (value >>> 24) & 0xff;
}

/** Convert a Date to DOS date/time format. */
function dosDateTime(date: Date): { time: number; date: number } {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return {
    time: (hours << 11) | (minutes << 5) | (seconds >> 1),
    date: ((year - 1980) << 9) | (month << 5) | day,
  };
}

// ---------------------------------------------------------------------------
// Central directory entry record (kept in memory — small per entry)
// ---------------------------------------------------------------------------

interface CentralEntry {
  nameBytes: Uint8Array;
  crc: number;
  size: number;
  localHeaderOffset: number;
  dosTime: number;
  dosDate: number;
}

// ---------------------------------------------------------------------------
// StreamingZipWriter
// ---------------------------------------------------------------------------

export class StreamingZipWriter {
  private handle: ReturnType<InstanceType<typeof FSFile>['open']>;
  private offset = 0;
  private entries: CentralEntry[] = [];
  private now = new Date();

  constructor(outputPath: string) {
    const file = new FSFile(outputPath);
    // Ensure the file exists before opening (FSFile.open throws if it doesn't).
    // Use overwrite to handle re-exporting on the same day.
    file.create({ overwrite: true });
    this.handle = file.open();
  }

  /** Close the file handle without writing central directory (for error cleanup). */
  close(): void {
    try {
      this.handle.close();
    } catch {
      // Already closed or invalid — ignore
    }
  }

  /** Add a file entry to the ZIP. Writes directly to disk. */
  addFile(relativePath: string, data: Uint8Array): void {
    const nameBytes = textToBytes(relativePath);
    const crc = crc32(data);
    const size = data.length;
    const { time: dosTime, date: dosDate } = dosDateTime(this.now);

    // Record for central directory (tiny — just metadata)
    this.entries.push({
      nameBytes,
      crc,
      size,
      localHeaderOffset: this.offset,
      dosTime,
      dosDate,
    });

    // --- Local file header (30 bytes + filename) ---
    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeU32(localHeader, 0, 0x04034b50); // Local file header signature
    writeU16(localHeader, 4, 20);         // Version needed to extract (2.0)
    writeU16(localHeader, 6, 0x0800);     // General purpose bit flag (UTF-8)
    writeU16(localHeader, 8, 0);          // Compression method: STORE
    writeU16(localHeader, 10, dosTime);   // Last mod file time
    writeU16(localHeader, 12, dosDate);   // Last mod file date
    writeU32(localHeader, 14, crc);       // CRC-32
    writeU32(localHeader, 18, size);      // Compressed size (= uncompressed for STORE)
    writeU32(localHeader, 22, size);      // Uncompressed size
    writeU16(localHeader, 26, nameBytes.length); // File name length
    writeU16(localHeader, 28, 0);         // Extra field length
    localHeader.set(nameBytes, 30);       // File name

    // Write header + data to disk
    this.handle.writeBytes(localHeader);
    this.offset += localHeader.length;

    this.handle.writeBytes(data);
    this.offset += data.length;
  }

  /** Finalize the ZIP (write central directory + EOCD) and close the file. */
  finalize(): void {
    const centralDirStart = this.offset;

    // --- Central directory entries ---
    for (const entry of this.entries) {
      const cdEntry = new Uint8Array(46 + entry.nameBytes.length);
      writeU32(cdEntry, 0, 0x02014b50);  // Central directory header signature
      writeU16(cdEntry, 4, 20);           // Version made by
      writeU16(cdEntry, 6, 20);           // Version needed to extract
      writeU16(cdEntry, 8, 0x0800);       // General purpose bit flag (UTF-8)
      writeU16(cdEntry, 10, 0);           // Compression method: STORE
      writeU16(cdEntry, 12, entry.dosTime);
      writeU16(cdEntry, 14, entry.dosDate);
      writeU32(cdEntry, 16, entry.crc);
      writeU32(cdEntry, 20, entry.size);  // Compressed size
      writeU32(cdEntry, 24, entry.size);  // Uncompressed size
      writeU16(cdEntry, 28, entry.nameBytes.length);
      writeU16(cdEntry, 30, 0);           // Extra field length
      writeU16(cdEntry, 32, 0);           // File comment length
      writeU16(cdEntry, 34, 0);           // Disk number start
      writeU16(cdEntry, 36, 0);           // Internal file attributes
      writeU32(cdEntry, 38, 0);           // External file attributes
      writeU32(cdEntry, 42, entry.localHeaderOffset);
      cdEntry.set(entry.nameBytes, 46);

      this.handle.writeBytes(cdEntry);
      this.offset += cdEntry.length;
    }

    const centralDirSize = this.offset - centralDirStart;

    // --- End of central directory record (22 bytes) ---
    const eocd = new Uint8Array(22);
    writeU32(eocd, 0, 0x06054b50);        // EOCD signature
    writeU16(eocd, 4, 0);                 // Disk number
    writeU16(eocd, 6, 0);                 // Disk with central directory
    writeU16(eocd, 8, this.entries.length);  // Entries on this disk
    writeU16(eocd, 10, this.entries.length); // Total entries
    writeU32(eocd, 12, centralDirSize);      // Central directory size
    writeU32(eocd, 16, centralDirStart);     // Central directory offset
    writeU16(eocd, 20, 0);                   // Comment length

    this.handle.writeBytes(eocd);
    this.handle.close();
  }
}

// ---------------------------------------------------------------------------
// ZIP Reader Entry
// ---------------------------------------------------------------------------

interface ZipReadEntry {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod: number; // 0 = STORE, 8 = DEFLATE
  localHeaderOffset: number;
}

// ---------------------------------------------------------------------------
// StreamingZipReader — reads ZIP files without loading the full archive
// ---------------------------------------------------------------------------

/**
 * Streaming ZIP reader that uses FileHandle random access to read files
 * one at a time. Only holds one file's data in memory at any point.
 *
 * Supports STORE (uncompressed) entries only. Use `isAllStore()` to check
 * before reading; fall back to JSZip for DEFLATE entries.
 */
export class StreamingZipReader {
  private handle: ReturnType<InstanceType<typeof FSFile>['open']>;
  private fileSize: number;
  private entries = new Map<string, ZipReadEntry>();

  constructor(zipPath: string) {
    const file = new FSFile(zipPath);
    this.handle = file.open();
    this.fileSize = this.handle.size ?? 0;

    if (this.fileSize < 22) {
      this.handle.close();
      throw new Error('קובץ ZIP לא תקין: קובץ קטן מדי');
    }

    this.parseEOCD();
  }

  // --- Public API ---

  /** Check if a file exists in the archive. */
  hasFile(name: string): boolean {
    return this.entries.has(name);
  }

  /** List all file paths in the archive. */
  listFiles(): string[] {
    return Array.from(this.entries.keys());
  }

  /** True if every entry uses STORE compression (no DEFLATE). */
  isAllStore(): boolean {
    for (const entry of this.entries.values()) {
      if (entry.compressionMethod !== 0) return false;
    }
    return true;
  }

  /** Number of entries in the archive. */
  get entryCount(): number {
    return this.entries.size;
  }

  /**
   * Read a single file's raw bytes. Only supports STORE entries.
   * Throws if the file is not found or uses DEFLATE compression.
   */
  readFile(name: string): Uint8Array {
    const entry = this.entries.get(name);
    if (!entry) {
      throw new Error(`קובץ לא נמצא בארכיון: ${name}`);
    }
    if (entry.compressionMethod !== 0) {
      throw new Error(`קובץ דחוס בפורמט לא נתמך: ${name}`);
    }

    // Seek to local file header
    this.handle.offset = entry.localHeaderOffset;
    const localHeader = this.handle.readBytes(30);

    // Validate signature
    if (readU32(localHeader, 0) !== 0x04034b50) {
      throw new Error(`כותרת קובץ ZIP לא תקינה: ${name}`);
    }

    // Get actual filename + extra field lengths from local header
    // (may differ from central directory)
    const localNameLen = readU16(localHeader, 26);
    const localExtraLen = readU16(localHeader, 28);

    // Skip past filename + extra field to reach file data
    const dataOffset =
      entry.localHeaderOffset + 30 + localNameLen + localExtraLen;
    this.handle.offset = dataOffset;

    // Read file data
    if (entry.uncompressedSize === 0) {
      return new Uint8Array(0);
    }
    return this.handle.readBytes(entry.uncompressedSize);
  }

  /** Read a file as a UTF-8 string. */
  readFileAsText(name: string): string {
    return bytesToText(this.readFile(name));
  }

  /** Close the file handle. */
  close(): void {
    try {
      this.handle.close();
    } catch {
      // Already closed — ignore
    }
  }

  // --- Private parsing ---

  private parseEOCD(): void {
    // Read last 256 bytes (or whole file if smaller) to find EOCD signature
    const searchSize = Math.min(256, this.fileSize);
    this.handle.offset = this.fileSize - searchSize;
    const tail = this.handle.readBytes(searchSize);

    // Scan backwards for EOCD signature 0x06054b50
    let eocdOffset = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
      if (
        tail[i] === 0x50 &&
        tail[i + 1] === 0x4b &&
        tail[i + 2] === 0x05 &&
        tail[i + 3] === 0x06
      ) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset === -1) {
      throw new Error('קובץ ZIP לא תקין: לא נמצא EOCD');
    }

    const numEntries = readU16(tail, eocdOffset + 8);
    const centralDirSize = readU32(tail, eocdOffset + 12);
    const centralDirOffset = readU32(tail, eocdOffset + 16);

    this.parseCentralDirectory(centralDirOffset, centralDirSize, numEntries);
  }

  private parseCentralDirectory(
    offset: number,
    _size: number,
    numEntries: number,
  ): void {
    this.handle.offset = offset;

    for (let i = 0; i < numEntries; i++) {
      const header = this.handle.readBytes(46);

      // Validate signature
      if (readU32(header, 0) !== 0x02014b50) {
        throw new Error('קובץ ZIP לא תקין: כותרת central directory שגויה');
      }

      const compressionMethod = readU16(header, 10);
      const compressedSize = readU32(header, 20);
      const uncompressedSize = readU32(header, 24);
      const nameLen = readU16(header, 28);
      const extraLen = readU16(header, 30);
      const commentLen = readU16(header, 32);
      const localHeaderOffset = readU32(header, 42);

      // Read filename
      const nameBytes = this.handle.readBytes(nameLen);
      const name = bytesToText(nameBytes);

      // Skip extra field + comment
      if (extraLen + commentLen > 0) {
        this.handle.offset =
          (this.handle.offset ?? 0) + extraLen + commentLen;
      }

      this.entries.set(name, {
        name,
        compressedSize,
        uncompressedSize,
        compressionMethod,
        localHeaderOffset,
      });
    }
  }
}
