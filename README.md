# Kalendar Bali API

A modular Elysia (Bun) API for:
- Indonesian national holidays
- Balinese calendar (rahinan)
- Otonan
- Odalan
- Dewasa Ayu
- Major temple ceremonies

The project ships with pure TypeScript engines and REST endpoints. Swagger UI is included.

## Quick Start

```bash
bun install
bun run dev
```

Server runs on `http://localhost:3000`.

## API Overview

Base path: `/api`

### Libur Nasional
- `GET /api/libur-nasional?year=2026`
- `GET /api/libur-nasional/per-kategori?year=2026`
- `GET /api/libur-nasional/check?date=2026-03-19`
- `GET /api/libur-nasional/next?from=2026-03-01`
- `GET /api/libur-nasional/workdays?start=2026-03-01&end=2026-03-31`

### Rahinan Bali
- `GET /api/rahinan?date=2026-03-19`
- `GET /api/rahinan/range?start=2026-03-01&end=2026-03-31`

### Otonan
- `GET /api/otonan?birth=2004-07-05&count=6`
- `GET /api/otonan/next?birth=2004-07-05`
- `GET /api/otonan/check?birth=2004-07-05&date=2026-05-11`
- `GET /api/otonan/year?birth=2004-07-05&year=2026`

### Dewasa Ayu
- `GET /api/dewasa-ayu?date=2026-03-19&konteks=umum`
- `GET /api/dewasa-ayu/best?start=2026-03-01&end=2026-03-31&konteks=pernikahan&topN=5`
- `GET /api/dewasa-ayu/next?from=2026-03-01&days=30&konteks=ngaben&topN=3`

### Odalan
- `GET /api/odalan/presets`
- `GET /api/odalan?id=pura_besakih_purnama_kadasa&count=5`
- `GET /api/odalan?sistem=wuku&noWuku=13&noSaptawara=3&noPancawara=4&count=5`
- `GET /api/odalan?sistem=sasih&noSasih=10&isPurnama=true&count=3`
- `GET /api/odalan/check?date=2026-04-12&id=pura_besakih_purnama_kadasa`
- `GET /api/odalan/banyak?from=2026-01-01&count=3`

### Upacara Besar
- `GET /api/upacara-besar/ringkasan?from=2026-01-01`
- `GET /api/upacara-besar?start=2026&end=2100&jenis=bhatara|panca|eka`
- `GET /api/upacara-besar/cek?tahunSaka=1946`

### Calendar (Month)
- `GET /api/calendar?year=2026&month=3`

## Rate Limiting

Default: `120 requests / 60 seconds` per IP.
Headers:
- `x-ratelimit-limit`
- `x-ratelimit-remaining`
- `x-ratelimit-reset`

## Notes

- Odalan and Upacara Besar are calculated by standard calendar rules. Real schedules are decided by local temple authorities.
- Islamic holidays use a tabular Hijri calendar with optional `adjustmentIslam`.

## License

MIT
