export function getAmzDate(now: Date = new Date()): string {
  return now.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

export function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index++) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

export function foldBase64(value: string): string {
  return value.match(/.{1,76}/g)?.join("\r\n") ?? "";
}

export async function sha256Hex(message: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(message),
  );
  return toHex(new Uint8Array(hash));
}

export async function createSesAuthorization(args: {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  method: "POST" | "GET";
  host: string;
  path: string;
  amzDate: string;
  contentType: string;
  bodyStr: string;
}): Promise<string> {
  const dateStamp = args.amzDate.slice(0, 8);
  const canonicalHeaders =
    `content-type:${args.contentType}\n` +
    `host:${args.host}\n` +
    `x-amz-date:${args.amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";
  const payloadHash = await sha256Hex(args.bodyStr);
  const canonicalRequest = [
    args.method,
    args.path,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${args.region}/ses/aws4_request`;
  const stringToSign = [
    algorithm,
    args.amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = await getSignatureKey(
    args.secretAccessKey,
    dateStamp,
    args.region,
    "ses",
  );
  const signature = await hmacHex(stringToSign, signingKey);

  return `${algorithm} Credential=${args.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

async function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string,
): Promise<Uint8Array> {
  const dateKey = await hmacBytes(dateStamp, new TextEncoder().encode(`AWS4${key}`));
  const regionKey = await hmacBytes(regionName, dateKey);
  const serviceKey = await hmacBytes(serviceName, regionKey);
  return hmacBytes("aws4_request", serviceKey);
}

async function hmacBytes(message: string, key: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(message),
  );
  return new Uint8Array(signature);
}

async function hmacHex(message: string, key: Uint8Array): Promise<string> {
  return toHex(await hmacBytes(message, key));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
