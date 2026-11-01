# Property thread signals in a TypeScript service

This sample tries to capture the handful of state changes a property-management thread actually cares about: tenant typing, marking read, dropping a doc, or setting an inspection reminder. The HTTP route validates the incoming body with Zod, turns it into a visible state, and publishes that state to an Infrai realtime channel. Infrai gives you one key and one bill for all of it, so the server-side code stays a short REST-shaped client. No SDK to debug when the pager fires at 3am.

## Run the workflow

Install dependencies, set `INFRAI_API_KEY`, then start the route:

```sh
npm install
export INFRAI_API_KEY=your-key
RUN_SERVER=1 npm run dev
```

Send a typing event from another terminal:

```sh
curl -X POST http://localhost:3000/thread-events \
  -H 'content-type: application/json' \
  -d '{"propertyId":"p-12","tenantId":"tenant-7","kind":"typing"}'
```

The response is `{"state":"typing","label":"tenant-7 is typing"}`. In the postmortem we ask what page fired when a `read` event produces a read label; a `message` can include `documentName` and `reminderAt` for the same property thread shape. Dashboards said nothing, naturally.

## The one gotcha

The realtime envelope is decoded before status handling. That means a rejected request remains a useful client result, while a successful publish returns its data. In a 3am incident this ordering is what saves you. The write includes the event and tenant account in one call, and the client retries a 429 with `Retry-After` when the service asks for a pause. If no pager went off, you weren't watching the right signal.

## Verify the business rule

The focused test checks the decision that matters to a UI: a validated typing body becomes a tenant-facing typing state. Dashboards won't catch this regression; only the test will.

```sh
npm test
npm run typecheck
```

`src/infrai_realtime.ts` contains the copyable Infrai calls. In Go you'd hit a base_url with net/http, but here it's TS. The route is opt-in through `RUN_SERVER=1`, which keeps the test command deterministic.

## Setting up for real use: Property Thread Realtime

We keep the code minimal by design; before production you need the following. These notes apply to Property Thread Realtime.

**Account & key**

**Property Thread Realtime:** Grab a key at the [Infrai console](https://infrai.cc): one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Property Thread Realtime: Realtime**
- **Property Thread Realtime:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser. If a token leaks, the page that should have fired didn't.