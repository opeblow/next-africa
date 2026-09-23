import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, "An email address is required")
  .max(200)
  .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "A valid email address is required");

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email,
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").max(200),
  password: z.string().min(1, "Password is required").max(200),
});

export const captureTextSchema = z.object({
  text: z.string().trim().min(1, "text is required").max(20_000),
});

export const captureFileSchema = z.object({
  filename: z.string().trim().min(1, "filename is required").max(300),
  content_base64: z.string().min(1, "content_base64 is required"),
});

export const captureVoiceSchema = z.object({
  audio_base64: z.string().min(1, "audio_base64 is required"),
  mime_type: z.string().max(120).optional(),
});

export const commitmentStatusSchema = z.object({
  status: z.enum(["open", "waiting", "done"], { message: "status must be open, waiting, or done" }),
});

export const settingsSchema = z.object({
  proactivity_level: z.enum(["quiet", "balanced", "active"], {
    message: "proactivity_level must be quiet, balanced, or active",
  }),
});

export const nudgeActionSchema = z.object({
  action: z.enum(["resolved", "dismissed"], { message: "action must be resolved or dismissed" }),
});

/** Express middleware factory: validates and replaces `req.body`, or returns 400. */
export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      return res.status(400).json({ error: issues[0]?.message || "Invalid request body", issues });
    }
    req.body = parsed.data;
    return next();
  };
}
