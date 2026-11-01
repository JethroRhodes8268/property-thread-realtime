import { createServer } from "node:http";
import { z } from "zod";
import { InfraiRealtime } from "./infrai_realtime.js";

export const threadBody = z.object({
  propertyId: z.string().min(1), tenantId: z.string().min(1), kind: z.enum(["message", "typing", "read"]),
  documentName: z.string().optional(), reminderAt: z.string().datetime().optional()
});

export function decideThreadState(input: z.infer<typeof threadBody>) {
  if (input.kind === "typing") return { state: "typing", label: `${input.tenantId} is typing` };
  if (input.kind === "read") return { state: "read", label: `${input.tenantId} read the thread` };
  return { state: "message", label: input.documentName ? `Document shared: ${input.documentName}` : "Maintenance request received" };
}

const realtime = new InfraiRealtime();
const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/thread-events") { response.writeHead(404).end(); return; }
  let raw = "";
  for await (const chunk of request) raw += chunk;
  const parsed = threadBody.safeParse(JSON.parse(raw));
  if (!parsed.success) { response.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: parsed.error.flatten() })); return; }
  const state = decideThreadState(parsed.data);
  await realtime.publish(`property:${parsed.data.propertyId}`, parsed.data.kind, state, parsed.data.tenantId);
  response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(state));
});

if (process.env.RUN_SERVER === "1") server.listen(Number(process.env.PORT ?? 3000), () => console.log("thread-events listening"));
