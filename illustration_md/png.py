"""Small standard-library validator for saved, static RGB/RGBA comic PNGs."""
import struct
import zlib


def validate_png(data, source):
    """Check chunks, checksums and scanline framing, without rendering pixels.

    Supported subset: non-interlaced 8-bit RGB/RGBA, at most 32 million pixels
    and 64 MiB on disk. This is not a general image decoder or sanitizer.
    """
    try:
        if len(data) > 64 * 1024 * 1024 or not data.startswith(b'\x89PNG\r\n\x1a\n'):
            raise ValueError('expected a PNG no larger than 64 MiB')
        offset = 8
        header = None
        compressed = bytearray()
        ended_data = False
        saw_data = False
        ended = False
        while offset < len(data):
            if offset + 12 > len(data):
                raise ValueError('truncated chunk')
            length, kind = struct.unpack_from('>I4s', data, offset)
            end = offset + 12 + length
            if end > len(data):
                raise ValueError('truncated chunk data')
            payload = data[offset + 8:end - 4]
            checksum, = struct.unpack_from('>I', data, end - 4)
            if zlib.crc32(kind + payload) != checksum:
                raise ValueError('chunk checksum mismatch')
            if header is None and kind != b'IHDR':
                raise ValueError('IHDR must be first')
            if kind == b'IHDR':
                if header is not None or length != 13:
                    raise ValueError('invalid or duplicate IHDR')
                width, height, depth, colour, compression, filtering, interlace = struct.unpack(
                    '>IIBBBBB', payload)
                if (not width or not height or width * height > 32_000_000
                        or depth != 8 or colour not in (2, 6)
                        or compression or filtering or interlace):
                    raise ValueError('requires static non-interlaced 8-bit RGB/RGBA, <=32M pixels')
                header = (width, height, 3 if colour == 2 else 4)
            elif kind == b'IDAT':
                if ended_data:
                    raise ValueError('IDAT chunks must be contiguous')
                saw_data = True
                compressed.extend(payload)
            elif kind == b'IEND':
                if length or not saw_data or end != len(data):
                    raise ValueError('invalid IEND or trailing bytes')
                ended = True
                break
            else:
                if saw_data:
                    ended_data = True
                if kind in (b'acTL', b'fcTL', b'fdAT') or not (kind[0] & 32):
                    raise ValueError('animation and other critical chunks are unsupported')
            offset = end
        if not ended:
            raise ValueError('missing IEND')
        width, height, channels = header
        stride = 1 + width * channels
        expected = stride * height
        decoder = zlib.decompressobj()
        raw = decoder.decompress(compressed, expected + 1)
        if (len(raw) != expected or not decoder.eof or decoder.unused_data
                or decoder.unconsumed_tail):
            raise ValueError('invalid compressed scanlines')
        if any(raw[row * stride] > 4 for row in range(height)):
            raise ValueError('invalid scanline filter')
        return width, height
    except (ValueError, struct.error, zlib.error) as error:
        raise ValueError(f'{source}: unsuitable comic PNG: {error}') from error
