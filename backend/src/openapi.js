/**
 * Hand-authored OpenAPI 3.1 description of the public NEXT Africa API.
 * Served at GET /api/openapi.json and rendered at GET /api/docs.
 */

const json = (schema) => ({ "application/json": { schema } });
const errorResponse = { description: "Error", content: json({ $ref: "#/components/schemas/Error" }) };
const auth = [{ bearerAuth: [] }];

const commitment = {
  type: "object",
  properties: {
    id: { type: "string", format: "uuid" },
    user_id: { type: "string", format: "uuid" },
    raw_input: { type: "string" },
    type: { type: "string", enum: ["task", "deadline", "meeting", "reminder"] },
    title: { type: "string" },
    description: { type: ["string", "null"] },
    due_date: { type: ["string", "null"], format: "date-time" },
    status: { type: "string", enum: ["open", "waiting", "done"] },
    linked_commitment_id: { type: ["string", "null"], format: "uuid" },
    created_at: { type: "string", format: "date-time" },
    updated_at: { type: "string", format: "date-time" },
  },
};

const captureResult = {
  type: "object",
  properties: {
    reply: { type: "string" },
    commitments: { type: "array", items: commitment },
    next_step_prompt: { type: "string" },
    transcript: { type: "string" },
    filename: { type: "string" },
    conflict: {
      type: "object",
      properties: {
        withCommitmentId: { type: "string", format: "uuid" },
        withTitle: { type: "string" },
        suggestion: { type: "string" },
      },
    },
  },
};

export const openapiSpec = {
  openapi: "3.1.0",
  info: {
    title: "NEXT Africa API",
    version: "0.1.0",
    description:
      "Personal execution copilot. Captures natural-language commitments, links them into projects, and surfaces nudges.",
    license: { name: "MIT" },
  },
  servers: [{ url: "http://localhost:3001", description: "Local development" }],
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Capture" },
    { name: "Commitments" },
    { name: "Dashboard" },
    { name: "Projects" },
    { name: "Nudges" },
    { name: "Insights" },
    { name: "Settings" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: { error: { type: "string" }, requestId: { type: "string" } },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          proactivity_level: { type: "string", enum: ["quiet", "balanced", "active"] },
        },
      },
      Commitment: commitment,
      CaptureResult: captureResult,
    },
  },
  paths: {
    "/api/health": {
      get: { tags: ["Health"], summary: "Liveness + database check", responses: { 200: { description: "Healthy" }, 503: errorResponse } },
    },
    "/api/live": {
      get: { tags: ["Health"], summary: "Liveness probe", responses: { 200: { description: "Alive" } } },
    },
    "/api/ready": {
      get: { tags: ["Health"], summary: "Readiness probe (checks database)", responses: { 200: { description: "Ready" }, 503: errorResponse } },
    },
    "/api/auth/signup": {
      post: {
        tags: ["Auth"],
        summary: "Create an account",
        requestBody: {
          required: true,
          content: json({
            type: "object",
            required: ["name", "email", "password"],
            properties: {
              name: { type: "string" },
              email: { type: "string", format: "email" },
              password: { type: "string", minLength: 8 },
            },
          }),
        },
        responses: {
          201: { description: "Account created", content: json({ type: "object", properties: { token: { type: "string" }, user: { $ref: "#/components/schemas/User" } } }) },
          400: errorResponse,
          409: errorResponse,
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Sign in",
        requestBody: { required: true, content: json({ type: "object", required: ["email", "password"], properties: { email: { type: "string" }, password: { type: "string" } } }) },
        responses: {
          200: { description: "Signed in", content: json({ type: "object", properties: { token: { type: "string" }, user: { $ref: "#/components/schemas/User" } } }) },
          401: errorResponse,
        },
      },
    },
    "/api/capture": {
      post: {
        tags: ["Capture"],
        summary: "Capture commitments from text",
        security: auth,
        requestBody: { required: true, content: json({ type: "object", required: ["text"], properties: { text: { type: "string" } } }) },
        responses: { 201: { description: "Captured", content: json(captureResult) }, 400: errorResponse, 503: errorResponse },
      },
    },
    "/api/capture/file": {
      post: {
        tags: ["Capture"],
        summary: "Capture commitments from a text file",
        security: auth,
        requestBody: { required: true, content: json({ type: "object", required: ["filename", "content_base64"], properties: { filename: { type: "string" }, content_base64: { type: "string" } } }) },
        responses: { 201: { description: "Captured", content: json(captureResult) }, 400: errorResponse, 413: errorResponse },
      },
    },
    "/api/capture/voice": {
      post: {
        tags: ["Capture"],
        summary: "Transcribe a voice note, then capture commitments",
        security: auth,
        requestBody: { required: true, content: json({ type: "object", required: ["audio_base64"], properties: { audio_base64: { type: "string" }, mime_type: { type: "string" } } }) },
        responses: { 201: { description: "Captured", content: json(captureResult) }, 400: errorResponse, 413: errorResponse },
      },
    },
    "/api/commitments": {
      get: {
        tags: ["Commitments"],
        summary: "List commitments (keyset paginated)",
        security: auth,
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["open", "waiting", "done"] } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
          { name: "cursor", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "Commitments", content: json({ type: "object", properties: { commitments: { type: "array", items: commitment }, nextCursor: { type: ["string", "null"] } } }) } },
      },
    },
    "/api/commitments/{id}/draft": {
      post: { tags: ["Commitments"], summary: "Prepare an unsent follow-up draft", security: auth, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { 200: { description: "Draft text and sent: false" }, 404: errorResponse, 503: errorResponse } },
    },
    "/api/notifications/config": { get: { security: auth, summary: "Browser push availability", responses: { 200: { description: "available and publicKey" } } } },
    "/api/notifications/subscribe": { post: { security: auth, summary: "Enable browser push", requestBody: { required: true, content: json({ type: "object", required: ["endpoint", "keys"], properties: { endpoint: { type: "string", format: "uri" }, keys: { type: "object", properties: { p256dh: { type: "string" }, auth: { type: "string" } } } } }) }, responses: { 200: { description: "Enabled" }, 400: errorResponse, 503: errorResponse } } },
    "/api/notifications/unsubscribe": { post: { security: auth, summary: "Disable browser push", requestBody: { required: true, content: json({ type: "object", required: ["endpoint"], properties: { endpoint: { type: "string" } } }) }, responses: { 200: { description: "Disabled" } } } },
    "/api/commitments/{id}": {
      get: { tags: ["Commitments"], security: auth, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }], responses: { 200: { description: "Owned commitment" }, 404: errorResponse } },
      patch: {
        tags: ["Commitments"],
        summary: "Edit a commitment or record its status",
        security: auth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, content: json({ type: "object", properties: { title: { type: "string", maxLength: 300 }, due_date: { type: ["string", "null"], format: "date-time" }, status: { type: "string", enum: ["open", "waiting", "done"] } } }) },
        responses: { 200: { description: "Updated", content: json({ type: "object", properties: { commitment } }) }, 400: errorResponse, 404: errorResponse },
      },
    },
    "/api/dashboard": {
      get: { tags: ["Dashboard"], summary: "Today / waiting-for / project buckets", security: auth, responses: { 200: { description: "Dashboard" } } },
    },
    "/api/projects": {
      get: { tags: ["Projects"], summary: "Commitment chains with progress", security: auth, responses: { 200: { description: "Projects", content: json({ type: "object", properties: { projects: { type: "array", items: { type: "object" } } } }) } } },
    },
    "/api/nudges": {
      get: { tags: ["Nudges"], summary: "Persisted + computed nudges", security: auth, responses: { 200: { description: "Nudges", content: json({ type: "object", properties: { nudges: { type: "array", items: { type: "object" } } } }) } } },
    },
    "/api/nudges/{id}/action": {
      post: {
        tags: ["Nudges"],
        summary: "Resolve or dismiss a nudge",
        security: auth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: json({ type: "object", required: ["action"], properties: { action: { type: "string", enum: ["resolved", "dismissed"] } } }) },
        responses: { 200: { description: "Updated" }, 400: errorResponse, 404: errorResponse },
      },
    },
    "/api/insights": {
      get: { tags: ["Insights"], summary: "Deterministic patterns + stats", security: auth, responses: { 200: { description: "Insights" } } },
    },
    "/api/settings": {
      get: { tags: ["Settings"], summary: "Read proactivity level", security: auth, responses: { 200: { description: "Settings" } } },
      patch: {
        tags: ["Settings"],
        summary: "Update proactivity level",
        security: auth,
        requestBody: { required: true, content: json({ type: "object", properties: { timezone: { type: "string" }, proactivity_level: { type: "string", enum: ["quiet", "balanced", "active"] } } }) },
        responses: { 200: { description: "Updated" }, 400: errorResponse },
      },
    },
  },
};

export function redocHtml(title = "NEXT Africa API") {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} — Reference</title>
    <style>body { margin: 0; padding: 0; }</style>
  </head>
  <body>
    <redoc spec-url="/api/openapi.json"></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </body>
</html>`;
}
