import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import {
  getHomepageOffers,
  updateHomepageOffers,
  uploadImage,
} from "@/lib/api";
import { Plus, Trash2, Upload } from "lucide-react";
import Head from "next/head";

const INPUT =
  "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

function offersEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function HomepageOffersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [flashSale, setFlashSale] = useState({
    badge: "",
    title: "",
    subtitle: "",
    discount: "",
    offerLabel: "",
    timerValue: "",
    buttonText: "",
    link: "",
    imageUrl: "",
  });
  const [savedFlashSale, setSavedFlashSale] = useState(null);
  const [secondaryOffers, setSecondaryOffers] = useState([]);
  const [savedSecondaryOffers, setSavedSecondaryOffers] = useState([]);
  const [flashSaleUploading, setFlashSaleUploading] = useState(false);
  const flashSaleFileRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getHomepageOffers();
      const fs = {
        badge: d.flashSale?.badge ?? "",
        title: d.flashSale?.title ?? "",
        subtitle: d.flashSale?.subtitle ?? "",
        discount: d.flashSale?.discount ?? "",
        offerLabel: d.flashSale?.offerLabel ?? "",
        timerValue: d.flashSale?.timerValue ?? "",
        buttonText: d.flashSale?.buttonText ?? "",
        link: d.flashSale?.link ?? "",
        imageUrl: d.flashSale?.imageUrl ?? "",
      };
      setFlashSale(fs);
      setSavedFlashSale(fs);
      const sec = d.secondaryOffers || [];
      setSecondaryOffers(sec);
      setSavedSecondaryOffers(sec);
    } catch (e) {
      setError(e?.message || "Failed to load offers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isDirty =
    savedFlashSale === null
      ? false
      : !offersEqual(flashSale, savedFlashSale) ||
        !offersEqual(secondaryOffers, savedSecondaryOffers);

  const addSecondary = () =>
    setSecondaryOffers((s) => [
      ...s,
      {
        id: "",
        type: "",
        title: "",
        description: "",
        cta: "",
        link: "",
        theme: "",
      },
    ]);
  const removeSecondary = (i) =>
    setSecondaryOffers((s) => s.filter((_, j) => j !== i));
  const updateSecondary = (i, field, value) =>
    setSecondaryOffers((s) =>
      s.map((x, j) => (j === i ? { ...x, [field]: value } : x)),
    );

  const triggerFlashSaleUpload = () => flashSaleFileRef.current?.click();
  const handleFlashSaleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setFlashSaleUploading(true);
    try {
      const data = await uploadImage(file);
      setFlashSale((f) => ({
        ...f,
        imageUrl: data.url || data.secure_url || data.fileUrl || "",
      }));
    } catch (err) {
      alert(err.message || "Upload failed");
    } finally {
      setFlashSaleUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateHomepageOffers({
        flashSale: {
          badge: flashSale.badge || undefined,
          title: flashSale.title || undefined,
          subtitle: flashSale.subtitle || undefined,
          discount: flashSale.discount || undefined,
          offerLabel: flashSale.offerLabel || undefined,
          timerValue: flashSale.timerValue || undefined,
          buttonText: flashSale.buttonText || undefined,
          link: flashSale.link || undefined,
          imageUrl: flashSale.imageUrl || undefined,
        },
        secondaryOffers: secondaryOffers.map((x) => ({
          id: x.id,
          type: x.type || undefined,
          title: x.title || undefined,
          description: x.description || undefined,
          cta: x.cta || undefined,
          link: x.link || undefined,
          theme: x.theme || undefined,
        })),
      });
      setSavedFlashSale(flashSale);
      setSavedSecondaryOffers(secondaryOffers);
      alert("Offers saved.");
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Offers — Hustle Admin</title>
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
        <title>Offers — Hustle Admin</title>
      </Head>
      <Layout>
        <div className="space-y-6 fade-in max-w-2xl">
          <p className="text-sm text-[#6e6e73]">
            Flash sale block and secondary promo cards on the homepage.
          </p>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
              <p className="text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => fetchData()}
                className="text-sm font-medium text-red-700 hover:underline">
                Retry
              </button>
            </div>
          )}
          {!error && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl border border-black/10 bg-white space-y-3">
                <h3 className="font-semibold text-[#1d1d1f]">
                  Flash sale (main card)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#6e6e73] mb-1">
                      Badge
                    </label>
                    <input
                      className={INPUT}
                      value={flashSale.badge}
                      onChange={(e) =>
                        setFlashSale((f) => ({ ...f, badge: e.target.value }))
                      }
                      placeholder="Live Drop"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#6e6e73] mb-1">
                      Title
                    </label>
                    <input
                      className={INPUT}
                      value={flashSale.title}
                      onChange={(e) =>
                        setFlashSale((f) => ({ ...f, title: e.target.value }))
                      }
                      placeholder="Titanium Series 26"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-[#6e6e73] mb-1">
                      Subtitle
                    </label>
                    <input
                      className={INPUT}
                      value={flashSale.subtitle}
                      onChange={(e) =>
                        setFlashSale((f) => ({
                          ...f,
                          subtitle: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#6e6e73] mb-1">
                      Discount
                    </label>
                    <input
                      className={INPUT}
                      value={flashSale.discount}
                      onChange={(e) =>
                        setFlashSale((f) => ({
                          ...f,
                          discount: e.target.value,
                        }))
                      }
                      placeholder="40% OFF"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#6e6e73] mb-1">
                      Offer label
                    </label>
                    <input
                      className={INPUT}
                      value={flashSale.offerLabel}
                      onChange={(e) =>
                        setFlashSale((f) => ({
                          ...f,
                          offerLabel: e.target.value,
                        }))
                      }
                      placeholder="Launch Price"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#6e6e73] mb-1">
                      Timer (HH:MM:SS)
                    </label>
                    <input
                      className={INPUT}
                      value={flashSale.timerValue}
                      onChange={(e) =>
                        setFlashSale((f) => ({
                          ...f,
                          timerValue: e.target.value,
                        }))
                      }
                      placeholder="09:45:00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#6e6e73] mb-1">
                      Button text
                    </label>
                    <input
                      className={INPUT}
                      value={flashSale.buttonText}
                      onChange={(e) =>
                        setFlashSale((f) => ({
                          ...f,
                          buttonText: e.target.value,
                        }))
                      }
                      placeholder="Get the deal"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#6e6e73] mb-1">
                      Link
                    </label>
                    <input
                      className={INPUT}
                      value={flashSale.link}
                      onChange={(e) =>
                        setFlashSale((f) => ({ ...f, link: e.target.value }))
                      }
                      placeholder="/products?category=Cases"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-[#6e6e73] mb-1">
                      Image
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={flashSaleFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFlashSaleFile}
                      />
                      {flashSale.imageUrl ? (
                        <img
                          src={flashSale.imageUrl}
                          alt=""
                          className="w-14 h-14 object-cover rounded-lg border border-black/10 shrink-0"
                        />
                      ) : null}
                      <input
                        className={INPUT}
                        value={flashSale.imageUrl}
                        onChange={(e) =>
                          setFlashSale((f) => ({
                            ...f,
                            imageUrl: e.target.value,
                          }))
                        }
                        placeholder="Image URL or upload"
                      />
                      <button
                        type="button"
                        onClick={triggerFlashSaleUpload}
                        disabled={flashSaleUploading}
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-sm font-medium hover:bg-black/5 disabled:opacity-50 shrink-0">
                        {flashSaleUploading ? (
                          <span className="inline-block w-4 h-4 border-2 border-[#1d1d1f] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Upload size={16} />
                        )}
                        {flashSaleUploading ? "Uploading..." : "Upload"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#1d1d1f]">
                    Secondary offers
                  </h3>
                  <button
                    type="button"
                    onClick={addSecondary}
                    className="flex items-center gap-1.5 text-sm font-medium text-[#1d1d1f] hover:underline">
                    <Plus size={16} /> Add
                  </button>
                </div>
                {secondaryOffers.length > 0 && (
                  <div className="mb-3 space-y-2">
                    <p className="text-xs font-medium text-[#6e6e73]">
                      Saved offers (list)
                    </p>
                    {secondaryOffers.map((o, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl border border-black/5 bg-[#f5f5f7]/50 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#1d1d1f] text-sm truncate">
                            {o.title || "Untitled"}
                          </p>
                          <p className="text-xs text-[#6e6e73] truncate">
                            {o.type || "—"} · {o.description || "—"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-3">
                  {secondaryOffers.map((o, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-black/10 bg-white grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        className={INPUT}
                        placeholder="Type (e.g. bundle)"
                        value={o.type}
                        onChange={(e) =>
                          updateSecondary(i, "type", e.target.value)
                        }
                      />
                      <input
                        className={INPUT}
                        placeholder="Title"
                        value={o.title}
                        onChange={(e) =>
                          updateSecondary(i, "title", e.target.value)
                        }
                      />
                      <input
                        className={`${INPUT} sm:col-span-2`}
                        placeholder="Description"
                        value={o.description}
                        onChange={(e) =>
                          updateSecondary(i, "description", e.target.value)
                        }
                      />
                      <input
                        className={INPUT}
                        placeholder="CTA"
                        value={o.cta}
                        onChange={(e) =>
                          updateSecondary(i, "cta", e.target.value)
                        }
                      />
                      <input
                        className={INPUT}
                        placeholder="Link"
                        value={o.link}
                        onChange={(e) =>
                          updateSecondary(i, "link", e.target.value)
                        }
                      />
                      <input
                        className={INPUT}
                        placeholder="Theme (optional)"
                        value={o.theme}
                        onChange={(e) =>
                          updateSecondary(i, "theme", e.target.value)
                        }
                      />
                      <button
                        type="button"
                        onClick={() => removeSecondary(i)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 sm:col-span-2">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !isDirty}
                className="bg-[#1d1d1f] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? "Saving..." : "Save offers"}
              </button>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}
