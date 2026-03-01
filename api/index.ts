// ESM-compatible entry for Vercel Node runtime
import { app } from "../src/api/app";

type VercelRequestLike = {
  url?: string;
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  on: (event: "data" | "end" | "error", cb: (chunk?: any) => void) => void;
};

type VercelResponseLike = {
  statusCode: number;
  setHeader: (key: string, value: string) => void;
  end: (body?: Uint8Array | string) => void;
};

async function readBody(req: VercelRequestLike): Promise<Uint8Array | undefined> {
  return await new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on("data", (chunk?: any) => {
      if (!chunk) return;
      const arr = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
      chunks.push(arr);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve(undefined);
      const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.byteLength;
      }
      resolve(merged);
    });
    req.on("error", reject);
  });
}

export default async function handler(req: any, res: any) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const body = await readBody(req);

  const request = new Request(url.toString(), {
    method: req.method,
    headers: req.headers as HeadersInit,
    body: body ? (body as BodyInit) : undefined,
  });

  const response = await app.handle(request);

  res.statusCode = response.status;
  response.headers.forEach((value: string, key: string) => {
    res.setHeader(key, value);
  });

  const arrayBuffer = await response.arrayBuffer();
  res.end(Buffer.from(arrayBuffer));
}
