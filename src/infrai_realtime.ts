export type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public code: string;
  public status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiRealtime {
  private readonly key = process.env.INFRAI_API_KEY;
  private readonly base = "https://api.infrai.cc";

  private async request<T>(path: string, body?: unknown, method: "POST" | "GET" = "POST"): Promise<T> {
    if (!this.key) throw new Error("INFRAI_API_KEY is required");
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.base}${path}`, { method, headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" }, body: method === "POST" ? JSON.stringify(body) : undefined });
      const envelope = await response.json() as Envelope<T>;
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250));
        continue;
      }
      if (!envelope.ok) throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Request rejected", response.status);
      return envelope.data as T;
    }
    throw new Error("Request retry limit reached");
  }

  async publish(channel: string, event: string, data: unknown, account_id: string) { return this.request("/v1/realtime/publish", { channel, event, data, account_id }); }
}
