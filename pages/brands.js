import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getBrands, createBrand, deleteBrand } from "@/lib/api";
import { Plus, Trash2, X, Tag } from "lucide-react";
import Head from "next/head";

const INPUT =
  "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", image: "" });

  const fetchBrands = () => {
    setLoading(true);
    setError(null);
    getBrands()
      .then((d) => {
        const list = Array.isArray(d) ? d : (d?.data ?? d?.brands ?? []);
        setBrands(Array.isArray(list) ? list : []);
      })
      .catch((e) => setError(e?.message || "Failed to load brands"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      await createBrand({
        name: form.name.trim(),
        ...(form.description?.trim() ? { description: form.description.trim() } : {}),
        ...(form.image?.trim() ? { image: form.image.trim() } : {}),
      });
      setShowModal(false);
      setForm({ name: "", description: "", image: "" });
      fetchBrands();
    } catch (e) {
      setError(e?.message || "Failed to create brand");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this brand? Products using it may be affected.")) return;
    try {
      await deleteBrand(id);
      fetchBrands();
    } catch (e) {
      alert(e?.message || "Failed to delete brand");
    }
  };

  return (
    <>
      <Head>
        <title>Brands — Hustle Admin</title>
      </Head>
      <Layout>
        <div className="space-y-5 fade-in">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <p className="text-sm text-[#6e6e73]">
              {brands.length} brand{brands.length === 1 ? "" : "s"}
            </p>
            <button
              onClick={() => {
                setShowModal(true);
                setError(null);
              }}
              className="flex items-center gap-2 bg-[#1d1d1f] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors"
            >
              <Plus size={16} /> Add Brand
            </button>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="skeleton h-14 rounded-xl" />
                ))}
              </div>
            ) : brands.length === 0 ? (
              <div className="py-16 text-center text-[#6e6e73] text-sm">
                No brands yet. Add one to use with products.
              </div>
            ) : (
              <div className="divide-y divide-black/5">
                {brands.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between px-5 py-4 hover:bg-[#f5f5f7]/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] flex items-center justify-center shrink-0">
                        {b.image ? (
                          <img
                            src={b.image}
                            alt=""
                            className="w-10 h-10 object-cover rounded-xl"
                          />
                        ) : (
                          <Tag size={18} className="text-[#6e6e73]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[#1d1d1f] text-sm truncate">
                          {b.name}
                        </p>
                        {b.description && (
                          <p className="text-xs text-[#6e6e73] truncate mt-0.5">
                            {b.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors shrink-0"
                      title="Delete brand"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
                <h2 className="font-bold text-[#1d1d1f]">Add Brand</h2>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl hover:bg-black/5"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                    Name *
                  </label>
                  <input
                    className={INPUT}
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Nike, Apple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                    Description
                  </label>
                  <textarea
                    className={INPUT}
                    rows={2}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Optional short description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">
                    Image URL
                  </label>
                  <input
                    className={INPUT}
                    type="url"
                    value={form.image}
                    onChange={(e) => setForm({ ...form, image: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-black/10 text-sm font-medium hover:bg-[#f5f5f7] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-[#1d1d1f] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition-colors disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Create Brand"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Layout>
    </>
  );
}
