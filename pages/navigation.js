import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { getNavigation, updateNavigation, getCategories, uploadImage } from "@/lib/api";
import { Plus, Trash2, GripVertical, Upload, ChevronDown, ChevronRight } from "lucide-react";
import Head from "next/head";

const INPUT =
  "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

const MAX_NAV_LINKS = 4;
const MAX_DROPDOWN_ITEMS = 4;

const FIXED_LABELS = ["Products", "Accessories", "Combos"];

const DEFAULT_ITEMS = [
  { label: "Products", href: "/products", hasDropdown: true, dropdown: { title: "Products", layout: "row", items: [], featured: null } },
  { label: "Accessories", href: "/products", hasDropdown: true, dropdown: { title: "Accessories", layout: "row", items: [], featured: null } },
  { label: "Combos", href: "/products", hasDropdown: true, dropdown: { title: "Combos", layout: "row", items: [], featured: null } },
];

function hrefToCategoryId(href) {
  if (!href || typeof href !== "string") return "";
  try {
    const u = new URL(href, "http://x");
    return u.searchParams.get("categoryId") || u.searchParams.get("category") || "";
  } catch {
    return "";
  }
}

function categoryIdToHref(categoryId) {
  return categoryId ? `/products?categoryId=${categoryId}` : "/products";
}

export default function NavigationPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expandedDropdown, setExpandedDropdown] = useState(new Set());
  const fileInputRefs = useRef({});

  const toggleDropdown = (i) => {
    setExpandedDropdown((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [navRes, categoriesRes] = await Promise.all([
        getNavigation(),
        getCategories().catch(() => []),
      ]);
      const cats = Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes?.data ?? categoriesRes ?? []);
      const categoriesList = Array.isArray(cats) ? cats : [];
      setCategories(categoriesList);

      const raw = Array.isArray(navRes.items) ? navRes.items : [];
      const mapItem = (item, idx) => {
        const dropdownItems = (item.dropdown?.items || []).slice(0, MAX_DROPDOWN_ITEMS).map((di) => {
          const cid = hrefToCategoryId(di.href);
          const categoryName = di.categoryName ?? (cid ? (categoriesList.find((c) => String(c.id) === cid)?.name ?? "") : "");
          return { ...di, categoryName };
        });
        return {
          ...item,
          label: idx < FIXED_LABELS.length ? FIXED_LABELS[idx] : (item.label ?? ""),
          href: idx < FIXED_LABELS.length ? "/products" : (item.href || "/products"),
          hasDropdown: true,
          dropdown: {
            ...(item.dropdown || {}),
            title: idx < FIXED_LABELS.length ? FIXED_LABELS[idx] : (item.dropdown?.title ?? item.label ?? ""),
            layout: "row",
            items: dropdownItems,
          },
        };
      };
      const mapped =
        raw.length > 0
          ? raw.slice(0, MAX_NAV_LINKS).map(mapItem)
          : DEFAULT_ITEMS;
      const withDefaults = mapped.length < FIXED_LABELS.length
        ? [...mapped, ...DEFAULT_ITEMS.slice(mapped.length, FIXED_LABELS.length)]
        : mapped;
      setItems(withDefaults);
    } catch (e) {
      setError(e?.message || "Failed to load navigation");
      setItems(DEFAULT_ITEMS);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addItem = () =>
    setItems((s) =>
      s.length >= MAX_NAV_LINKS
        ? s
        : [
            ...s,
            {
              label: "",
              href: "/products",
              hasDropdown: true,
              dropdown: { title: "", layout: "row", items: [], featured: null },
            },
          ]
    );

  const removeItem = (i) => setItems((s) => s.filter((_, j) => j !== i));
  const updateItem = (i, field, value) =>
    setItems((s) => s.map((x, j) => (j === i ? { ...x, [field]: value } : x)));
  const updateItemDropdown = (i, field, value) =>
    setItems((s) =>
      s.map((x, j) =>
        j === i ? { ...x, dropdown: { ...(x.dropdown || {}), [field]: value } } : x
      )
    );

  const addDropdownItem = (navIndex) =>
    setItems((s) =>
      s.map((x, j) =>
        j === navIndex
          ? {
              ...x,
              dropdown: {
                ...(x.dropdown || {}),
                items:
                  (x.dropdown?.items || []).length >= MAX_DROPDOWN_ITEMS
                    ? x.dropdown.items
                    : [
                        ...(x.dropdown?.items || []),
                        {
                          name: "",
                          description: "",
                          href: "/products",
                          image: "",
                          icon: "",
                          categoryName: "",
                        },
                      ],
              },
            }
          : x
      )
    );

  const removeDropdownItem = (navIndex, itemIndex) =>
    setItems((s) =>
      s.map((x, j) =>
        j === navIndex
          ? {
              ...x,
              dropdown: {
                ...x.dropdown,
                items: (x.dropdown?.items || []).filter((_, k) => k !== itemIndex),
              },
            }
          : x
      )
    );

  const updateDropdownItem = (navIndex, itemIndex, field, value) =>
    setItems((s) =>
      s.map((x, j) =>
        j === navIndex
          ? {
              ...x,
              dropdown: {
                ...x.dropdown,
                items: (x.dropdown?.items || []).map((it, k) =>
                  k === itemIndex ? { ...it, [field]: value } : it
                ),
              },
            }
          : x
      )
    );

  const setDropdownItemCategory = (navIndex, itemIndex, categoryId, categoryName) => {
    updateDropdownItem(navIndex, itemIndex, "href", categoryIdToHref(categoryId));
    updateDropdownItem(navIndex, itemIndex, "categoryName", categoryName ?? "");
  };

  const handleImageUpload = async (navIndex, itemIndex, file) => {
    if (!file) return;
    try {
      const { url } = await uploadImage(file);
      if (url) updateDropdownItem(navIndex, itemIndex, "image", url);
    } catch (e) {
      alert(e?.message || "Upload failed");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = items.map((it, idx) => ({
        ...it,
        label: idx < FIXED_LABELS.length ? FIXED_LABELS[idx] : (it.label ?? ""),
        href: idx < FIXED_LABELS.length ? "/products" : (it.href || "/products"),
        dropdown: {
          ...(it.dropdown || {}),
          title: idx < FIXED_LABELS.length ? FIXED_LABELS[idx] : (it.label || (it.dropdown?.title ?? "")),
        },
      }));
      await updateNavigation({ items: payload });
      alert("Navigation saved.");
      fetchData();
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
          <title>Navigation — Hustle Admin</title>
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
        <title>Navigation (Navbar) — Hustle Admin</title>
      </Head>
      <Layout>
        <div className="space-y-6 fade-in max-w-3xl">
          <div>
            <h2 className="text-lg font-semibold text-[#1d1d1f] mb-0.5">
              Navbar links
            </h2>
            <p className="text-sm text-[#6e6e73]">
              Three fixed items: Products, Accessories, Combos (link /products). You can add one more with your own label. Click chevron to expand/collapse dropdown.
            </p>
          </div>

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
            <form onSubmit={handleSave} className="space-y-5">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-black/10 bg-white overflow-hidden shadow-sm"
                >
                  {/* Nav link row + collapse toggle */}
                  <div className="p-4 flex flex-wrap items-center gap-3 border-b border-black/5">
                    <GripVertical size={18} className="text-[#6e6e73] shrink-0" />
                    <button
                      type="button"
                      onClick={() => toggleDropdown(i)}
                      className="p-1.5 rounded-lg hover:bg-black/5 text-[#6e6e73] transition-colors shrink-0"
                      title={expandedDropdown.has(i) ? "Collapse dropdown" : "Expand dropdown"}
                    >
                      {expandedDropdown.has(i) ? (
                        <ChevronDown size={18} />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </button>
                    {i < FIXED_LABELS.length ? (
                      <span className="flex-1 min-w-[120px] px-4 py-2.5 rounded-xl bg-[#f0f0f0] text-[#1d1d1f] text-sm font-medium">
                        {FIXED_LABELS[i]}
                      </span>
                    ) : (
                      <input
                        className={`${INPUT} flex-1 min-w-[120px]`}
                        value={item.label ?? ""}
                        onChange={(e) => updateItem(i, "label", e.target.value)}
                        placeholder="Your label (e.g. Support)"
                      />
                    )}
                    {i < FIXED_LABELS.length ? (
                      <span className="flex-1 min-w-[120px] px-4 py-2.5 rounded-xl bg-[#f0f0f0] text-[#1d1d1f] text-sm">
                        /products
                      </span>
                    ) : (
                      <input
                        className={`${INPUT} flex-1 min-w-[120px]`}
                        value={item.href ?? ""}
                        onChange={(e) => updateItem(i, "href", e.target.value)}
                        placeholder="Link (default /products)"
                      />
                    )}
                    {i >= FIXED_LABELS.length && (
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove link"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  {/* Dropdown section — collapsible; label is used as title, no separate field */}
                  {expandedDropdown.has(i) && (
                  <div className="p-4 bg-[#fafafa] border-t border-black/5 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-[#6e6e73] uppercase tracking-wider">
                          Dropdown items (row tiles, max {MAX_DROPDOWN_ITEMS})
                        </span>
                        <button
                          type="button"
                          onClick={() => addDropdownItem(i)}
                          disabled={
                            (item.dropdown?.items || []).length >= MAX_DROPDOWN_ITEMS
                          }
                          className="text-sm font-medium text-[#1d1d1f] flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-black/5 disabled:opacity-50 disabled:pointer-events-none"
                        >
                          <Plus size={14} /> Add item
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(item.dropdown?.items || []).map((di, diIdx) => (
                          <div
                            key={diIdx}
                            className="flex flex-wrap gap-3 items-start p-3 rounded-xl bg-white border border-black/10"
                          >
                            <div className="flex-1 min-w-[100px] space-y-1">
                              <input
                                className={INPUT}
                                value={di.name ?? ""}
                                onChange={(e) =>
                                  updateDropdownItem(i, diIdx, "name", e.target.value)
                                }
                                placeholder="Name"
                              />
                            </div>
                            <div className="flex-1 min-w-[140px]">
                              <label className="block text-[10px] font-medium text-[#6e6e73] uppercase tracking-wider mb-1">
                                Category
                              </label>
                              <select
                                className={INPUT}
                                value={hrefToCategoryId(di.href) || ""}
                                onChange={(e) => {
                                  const categoryId = e.target.value;
                                  const cat = categories.find(
                                    (c) => String(c.id) === categoryId
                                  );
                                  setDropdownItemCategory(
                                    i,
                                    diIdx,
                                    categoryId,
                                    cat?.name ?? ""
                                  );
                                }}
                              >
                                <option value="">Products (all)</option>
                                {categories.map((c) => (
                                  <option key={c.id} value={String(c.id)}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-start gap-2">
                              <label className="block text-[10px] font-medium text-[#6e6e73] uppercase tracking-wider mb-1 w-full">
                                Image
                              </label>
                              <input
                                ref={(el) => {
                                  if (el)
                                    fileInputRefs.current[`${i}-${diIdx}`] = el;
                                }}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(i, diIdx, file);
                                  e.target.value = "";
                                }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  fileInputRefs.current[`${i}-${diIdx}`]?.click()
                                }
                                className="flex flex-col items-center justify-center w-20 h-20 rounded-xl border-2 border-dashed border-black/20 bg-[#f5f5f7] hover:bg-black/5 hover:border-black/30 transition-colors overflow-hidden shrink-0"
                              >
                                {di.image ? (
                                  <img
                                    src={di.image}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <>
                                    <Upload size={20} className="text-[#6e6e73] mb-0.5" />
                                    <span className="text-[10px] text-[#6e6e73]">
                                      Upload
                                    </span>
                                  </>
                                )}
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDropdownItem(i, diIdx)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg self-center"
                              title="Remove item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              ))}

              {items.length < MAX_NAV_LINKS && (
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed border-black/20 text-[#6e6e73] hover:bg-black/5 hover:border-black/30 text-sm font-medium transition-colors"
                >
                  <Plus size={18} /> Add nav link ({items.length}/{MAX_NAV_LINKS})
                </button>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#1d1d1f] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-black disabled:opacity-60 transition-colors"
                >
                  {saving ? "Saving..." : "Save Navigation"}
                </button>
              </div>
            </form>
          )}
        </div>
      </Layout>
    </>
  );
}
