export class ApiRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function apiErrorResponse(
  status: number,
  message: string,
  requestId: string,
): Response {
  return Response.json({ error: message, requestId }, { status });
}

export async function parseJsonBodyWithLimit(
  req: Request,
  maxBytes: number,
): Promise<unknown> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiRequestError(415, "Content-Type must be application/json");
  }

  const contentLengthHeader = req.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number.parseInt(contentLengthHeader, 10);
    if (!Number.isNaN(contentLength) && contentLength > maxBytes) {
      throw new ApiRequestError(413, "Payload too large");
    }
  }

  const text = await req.text();
  const textSize = new TextEncoder().encode(text).byteLength;
  if (textSize > maxBytes) {
    throw new ApiRequestError(413, "Payload too large");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new ApiRequestError(400, "Malformed JSON body");
  }
}

export function requireObject(
  value: unknown,
  message: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ApiRequestError(400, message);
  }

  return value as Record<string, unknown>;
}

export function requireStringField(
  data: Record<string, unknown>,
  fieldName: string,
  minLength: number,
  maxLength: number,
): string {
  const value = data[fieldName];
  if (typeof value !== "string") {
    throw new ApiRequestError(400, `Field '${fieldName}' must be a string`);
  }

  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    throw new ApiRequestError(
      400,
      `Field '${fieldName}' must be at least ${minLength} character(s)`,
    );
  }

  if (trimmed.length > maxLength) {
    throw new ApiRequestError(
      413,
      `Field '${fieldName}' exceeds max length ${maxLength}`,
    );
  }

  return value;
}
