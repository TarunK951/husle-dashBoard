/**
 * Homepage Essentials – Backend API (per backend-essentials-fields.md)
 *
 * GET  /api/admin/homepage/essentials – fetch essentials (for public homepage)
 * PUT  /api/admin/homepage/essentials – update essentials (admin; same body shape)
 *
 * Contract:
 * - Response: { sectionLabel?, sectionTitle?, sectionDescription?, categories: [{ id?, image, title }] }
 * - Per card only: image (required), title (required), id (optional). No extra fields.
 * - Min 1 item, max 8 items. Only one more item can be added (e.g. 7 → 8).
 */

const fs = require("fs");
const path = require("path");

const MIN_ITEMS = 1;
const MAX_ITEMS = 8;

const DATA_FILE = path.join(process.cwd(), "data", "homepage-essentials.json");

function getDefaultPayload() {
  return {
    sectionLabel: "Ecosystem",
    sectionTitle: "The Essentials",
    sectionDescription:
      "A curated selection of premium protection, power, and acoustic accessories.",
    categories: [
      { id: 1, image: "https://example.com/iphone-cases.jpg", title: "iPhone Cases" },
      { id: 2, image: "https://example.com/camera-lenses.jpg", title: "Camera Lenses" },
      { id: 3, image: "https://example.com/screen-protector.jpg", title: "Screen Protector" },
      { id: 4, image: "https://example.com/iphone-protection.jpg", title: "iPhone Protection" },
      { id: 5, image: "https://example.com/power-banks.jpg", title: "Power Banks" },
      { id: 6, image: "https://example.com/adaptors.jpg", title: "Apple Adaptors" },
      { id: 7, image: "https://example.com/airpods.jpg", title: "AirPods" },
      { id: 8, image: "https://example.com/bundle.jpg", title: "Starter Bundle" },
    ],
  };
}

function readStored() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.categories)) return data;
  } catch {
    // file missing or invalid – use default
  }
  return getDefaultPayload();
}

function writeStored(payload) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), "utf8");
}

/** Normalize one category: only id, image, title. */
function normalizeCategory(item, index) {
  const id = item?.id !== undefined && item?.id !== null ? item.id : index + 1;
  const image = typeof item?.image === "string" ? item.image.trim() : "";
  const title = typeof item?.title === "string" ? item.title.trim() : "";
  return { id, image, title };
}

/** Validate and normalize body. Returns { ok, payload, error }. */
function validatePutBody(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be an object" };
  }

  const categories = Array.isArray(body.categories) ? body.categories : [];
  if (categories.length < MIN_ITEMS) {
    return { ok: false, error: `At least ${MIN_ITEMS} category required` };
  }
  if (categories.length > MAX_ITEMS) {
    return {
      ok: false,
      error: `Maximum ${MAX_ITEMS} items allowed (add only one more).`,
    };
  }

  const normalized = categories.map((item, i) => normalizeCategory(item, i));
  const missing = normalized.findIndex((c) => !c.image || !c.title);
  if (missing !== -1) {
    return { ok: false, error: `Category ${missing + 1}: image and title are required` };
  }

  const payload = {
    sectionLabel:
      typeof body.sectionLabel === "string" ? body.sectionLabel : undefined,
    sectionTitle:
      typeof body.sectionTitle === "string" ? body.sectionTitle : undefined,
    sectionDescription:
      typeof body.sectionDescription === "string"
        ? body.sectionDescription
        : undefined,
    categories: normalized,
  };

  return { ok: true, payload };
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const data = readStored();
    return res.status(200).json(data);
  }

  if (req.method === "PUT") {
    let body;
    try {
      body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    } catch {
      return res.status(400).json({ message: "Invalid JSON body" });
    }

    const { ok, payload, error } = validatePutBody(body);
    if (!ok) {
      return res.status(400).json({ message: error });
    }

    writeStored(payload);
    return res.status(200).json(payload);
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ message: "Method not allowed" });
}
