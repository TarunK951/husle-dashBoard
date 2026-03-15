import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { getEssentials, updateEssentials, uploadImage } from "@/lib/api";
import { Plus, Trash2, Upload } from "lucide-react";
import Head from "next/head";

const INPUT =
  "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

const MAX_ITEMS = 8;

function normalizeItem(x) {
  return {
    id: x?.id ?? "",
    image: x?.image ?? x?.src ?? "",
    title: x?.title ?? "",
  };
}

export default function EssentialsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sectionLabel, setSectionLabel] = useState("");
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionDescription, setSectionDescription] = useState("");
  const [categories, setCategories] = useState([]);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const fileInputRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getEssentials();
      setSectionLabel(d.sectionLabel ?? "");
      setSectionTitle(d.sectionTitle ?? "");
      setSectionDescription(d.sectionDescription ?? "");
      const raw = Array.isArray(d.categories) ? d.categories : [];
      setCategories(raw.map(normalizeItem));
    } catch (e) {
      setError(e?.message || "Failed to load essentials");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addItem = () =>
    setCategories((c) =>
      c.length >= MAX_ITEMS ? c : [...c, { id: "", image: "", title: "" }]
    );
  const removeItem = (i) =>
    setCategories((c) => (c.length <= 1 ? c : c.filter((_, j) => j !== i)));
  const updateItem = (i, field, value) =>
    setCategories((c) =>
      c.map((x, j) => (j === i ? { ...x, [field]: value } : x))
    );

  const triggerUpload = (i) => {
    setUploadingIndex(i);
    fileInputRef.current?.click();
  };
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || uploadingIndex == null) return;
    const idx = uploadingIndex;
    e.target.value = "";
    try {
      const data = await uploadImage(file);
      updateItem(idx, "image", data.url || data.secure_url || data.fileUrl || "");
    } catch (err) {
      alert(err?.message || "Upload failed");
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (categories.length === 0) {
      alert("Add at least one card.");
      return;
    }
    setSaving(true);
    try {
      await updateEssentials({
        sectionLabel: sectionLabel || undefined,
        sectionTitle: sectionTitle || undefined,
        sectionDescription: sectionDescription || undefined,
        categories: categories.slice(0, MAX_ITEMS).map((x) => ({
          id: x.id || undefined,
          image: x.image || "",
          title: x.title || "",
        })),
      });
      alert("The Essentials saved.");
      fetchData();
    } catch (e) {
      alert(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>The Essentials — Hustle Admin</title>
        </Head>
        <Layout>
          <div className="skeleton h-64 rounded-2xl" />
        </Layout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>The Essentials — Hustle Admin</title>
      </Head>
      <Layout>
        <div className="space-y-6 fade-in max-w-2xl">
          <p className="text-sm text-[#6e6e73]">
            Gallery section: optional section label, title, description; up to {MAX_ITEMS} cards. Each card has <strong>image</strong> and <strong>title</strong> only. You can add only one more item (max {MAX_ITEMS}).
          </p>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
              <p className="text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => fetchData()}
                className="text-sm font-medium text-red-700 hover:underline"
              >
                Retry
              </button>
            </div>
          )}
          {!error && (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Section header */}
              <div className="rounded-2xl border border-black/10 bg-white p-5 space-y-4">
                <h2 className="text-sm font-semibold text-[#1d1d1f]">
                  Section header (optional)
                </h2>
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1">
                    Section label
                  </label>
                  <input
                    className={INPUT}
                    value={sectionLabel}
                    onChange={(e) => setSectionLabel(e.target.value)}
                    placeholder="e.g. Ecosystem"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1">
                    Section title
                  </label>
                  <input
                    className={INPUT}
                    value={sectionTitle}
                    onChange={(e) => setSectionTitle(e.target.value)}
                    placeholder="e.g. The Essentials"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1">
                    Section description
                  </label>
                  <textarea
                    className={INPUT}
                    rows={2}
                    value={sectionDescription}
                    onChange={(e) => setSectionDescription(e.target.value)}
                    placeholder="e.g. A curated selection of premium protection..."
                  />
                </div>
              </div>

              {/* Cards (image + title only) */}
              <div className="rounded-2xl border border-black/10 bg-white p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#1d1d1f]">
                    Cards (image + title only, max {MAX_ITEMS})
                  </h2>
                  <button
                    type="button"
                    onClick={addItem}
                    disabled={categories.length >= MAX_ITEMS}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/10 bg-[#f5f5f7] text-sm font-medium text-[#1d1d1f] hover:bg-black/5 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <Plus size={16} /> Add card
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="space-y-3">
                  {categories.map((cat, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-black/10 bg-[#fafafa] space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-[#6e6e73]">
                          Card {i + 1}
                        </span>
                        {categories.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(i)}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 shrink-0"
                            title="Remove card"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#6e6e73] mb-1">
                          Title *
                        </label>
                        <input
                          className={INPUT}
                          placeholder="e.g. iPhone Cases"
                          value={cat.title}
                          onChange={(e) => updateItem(i, "title", e.target.value)}
                        />
                      </div>
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="flex-1 min-w-[180px]">
                          <label className="block text-xs font-medium text-[#6e6e73] mb-1">
                            Image URL *
                          </label>
                          <input
                            className={INPUT}
                            placeholder="https://... or upload below"
                            value={cat.image}
                            onChange={(e) => updateItem(i, "image", e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => triggerUpload(i)}
                          disabled={uploadingIndex !== null}
                          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-black/10 bg-white text-sm font-medium text-[#1d1d1f] hover:bg-black/5 disabled:opacity-50 shrink-0"
                        >
                          {uploadingIndex === i ? (
                            <span className="inline-block w-4 h-4 border-2 border-[#1d1d1f] border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Upload size={16} />
                          )}
                          {uploadingIndex === i ? "Uploading…" : "Upload"}
                        </button>
                      </div>
                      {cat.image && (
                        <div className="pt-1">
                          <img
                            src={cat.image}
                            alt=""
                            className="w-20 h-20 object-cover rounded-lg border border-black/10"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {categories.length >= MAX_ITEMS && (
                  <p className="text-xs text-[#6e6e73]">
                    Maximum {MAX_ITEMS} cards. Remove one to add a different card.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={saving || categories.length === 0}
                className="bg-[#1d1d1f] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : "Save Essentials"}
              </button>
            </form>
          )}
        </div>
      </Layout>
    </>
  );
}
