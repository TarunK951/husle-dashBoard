/**
 * /api/upload/model
 *
 * A local Next.js API route (NOT proxied to the remote server because local
 * routes take precedence over next.config.mjs rewrites).
 *
 * It:
 *  1. Receives a multipart POST with a single field called "file".
 *  2. Buffers the raw body.
 *  3. Rebuilds a new multipart body and forwards it to the remote backend
 *     /api/upload endpoint using the "image" field, which Multer/Cloudinary
 *     accept regardless of the actual MIME type.
 *  4. Returns the upstream JSON response (contains .url).
 *
 * No extra npm packages needed — uses Node built-ins + Web fetch (Node 18+).
 */

export const config = {
    api: {
        bodyParser: false,     // we stream the raw body ourselves
        responseLimit: false,
    },
};

const BACKEND_UPLOAD_URL = "https://server.huslelifestyle.com/api/upload";

/** Read the entire request body into a Buffer */
async function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
    });
}

/**
 * Parse a raw multipart body and extract the first file part.
 * Returns { filename, mimeType, data: Buffer }
 */
function parseMultipart(buffer, boundary) {
    const boundaryBuf = Buffer.from("--" + boundary);
    const parts = [];
    let pos = 0;

    while (pos < buffer.length) {
        const bStart = buffer.indexOf(boundaryBuf, pos);
        if (bStart === -1) break;
        const headerStart = bStart + boundaryBuf.length + 2; // skip \r\n
        if (buffer[bStart + boundaryBuf.length] === 45) break; // "--\r\n" = end boundary

        const headerEnd = buffer.indexOf(Buffer.from("\r\n\r\n"), headerStart);
        if (headerEnd === -1) break;

        const headerStr = buffer.slice(headerStart, headerEnd).toString("utf8");
        const bodyStart = headerEnd + 4;

        const nextBoundary = buffer.indexOf(boundaryBuf, bodyStart);
        const bodyEnd = nextBoundary === -1 ? buffer.length : nextBoundary - 2; // trim \r\n

        // Parse headers
        const filenameMatch = headerStr.match(/filename="([^"]+)"/i);
        const typeMatch = headerStr.match(/Content-Type:\s*(\S+)/i);

        parts.push({
            headers: headerStr,
            filename: filenameMatch ? filenameMatch[1] : "file",
            mimeType: typeMatch ? typeMatch[1] : "application/octet-stream",
            data: buffer.slice(bodyStart, bodyEnd),
        });

        pos = nextBoundary === -1 ? buffer.length : nextBoundary;
    }

    return parts;
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    const authHeader = req.headers["authorization"] || "";
    const contentType = req.headers["content-type"] || "";

    // Extract boundary from content-type header
    const boundaryMatch = contentType.match(/boundary=([^\s;]+)/i);
    if (!boundaryMatch) {
        return res.status(400).json({ message: "Missing multipart boundary" });
    }
    const boundary = boundaryMatch[1];

    try {
        // 1️⃣  Buffer the entire incoming multipart body
        const rawBody = await readBody(req);

        // 2️⃣  Parse it to find the file part
        const parts = parseMultipart(rawBody, boundary);
        const filePart = parts.find((p) =>
            p.headers.includes('name="file"') || parts.length === 1
        ) || parts[0];

        if (!filePart || !filePart.data.length) {
            return res.status(400).json({ message: "No file found in request" });
        }

        // 3️⃣  Rebuild as a new multipart body targeting the backend "image" field.
        //     We keep the original filename but let the backend ignore MIME type restrictions
        //     by sending as application/octet-stream.
        const newBoundary = "----HustleAdminBoundary" + Date.now();
        const filename = filePart.filename;

        const header =
            `--${newBoundary}\r\n` +
            `Content-Disposition: form-data; name="image"; filename="${filename}"\r\n` +
            `Content-Type: application/octet-stream\r\n\r\n`;
        const footer = `\r\n--${newBoundary}--\r\n`;

        const multipartBody = Buffer.concat([
            Buffer.from(header, "utf8"),
            filePart.data,
            Buffer.from(footer, "utf8"),
        ]);

        // 4️⃣  Forward to remote backend
        const upstream = await fetch(BACKEND_UPLOAD_URL, {
            method: "POST",
            headers: {
                "Content-Type": `multipart/form-data; boundary=${newBoundary}`,
                "Content-Length": String(multipartBody.length),
                ...(authHeader ? { Authorization: authHeader } : {}),
            },
            body: multipartBody,
        });

        const text = await upstream.text();

        // Some backends return 200 but with an error message in JSON
        let json;
        try { json = JSON.parse(text); } catch { json = { url: null, raw: text }; }

        if (!upstream.ok) {
            // If backend truly rejects non-image files, return a helpful message
            return res.status(upstream.status).json({
                message: `Backend rejected file: ${upstream.status} — ${json.message || text}`,
                backendStatus: upstream.status,
            });
        }

        return res.status(200).json(json);
    } catch (err) {
        console.error("[upload/model] Error:", err);
        return res.status(500).json({ message: err.message });
    }
}
