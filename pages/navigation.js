import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getNavigation, updateNavigation } from "@/lib/api";
import { Plus, Trash2, GripVertical } from "lucide-react";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

export default function NavigationPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [items, setItems] = useState([]);
    const [expandedIndex, setExpandedIndex] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const d = await getNavigation();
            setItems(Array.isArray(d.items) ? d.items : []);
        } catch (e) {
            setError(e?.message || "Failed to load navigation");
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const addItem = () => setItems((s) => [...s, { label: "", href: "", hasDropdown: false, dropdown: { title: "", layout: "row", items: [], featured: null } }]);
    const removeItem = (i) => setItems((s) => s.filter((_, j) => j !== i));
    const updateItem = (i, field, value) => setItems((s) => s.map((x, j) => (j === i ? { ...x, [field]: value } : x)));
    const updateItemDropdown = (i, field, value) => setItems((s) => s.map((x, j) => (j === i ? { ...x, dropdown: { ...(x.dropdown || {}), [field]: value } } : x)));

    const addDropdownItem = (navIndex) => setItems((s) => s.map((x, j) => (j === navIndex ? { ...x, dropdown: { ...(x.dropdown || {}), items: [...(x.dropdown?.items || []), { name: "", description: "", href: "", image: "", icon: "" }] } } : x)));
    const removeDropdownItem = (navIndex, itemIndex) => setItems((s) => s.map((x, j) => (j === navIndex ? { ...x, dropdown: { ...x.dropdown, items: (x.dropdown?.items || []).filter((_, k) => k !== itemIndex) } } : x)));
    const updateDropdownItem = (navIndex, itemIndex, field, value) => setItems((s) => s.map((x, j) => (j === navIndex ? { ...x, dropdown: { ...x.dropdown, items: (x.dropdown?.items || []).map((it, k) => (k === itemIndex ? { ...it, [field]: value } : it)) } } : x)));

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateNavigation({ items });
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
                <Head><title>Navigation — Hustle Admin</title></Head>
                <Layout><div className="skeleton h-64 rounded-2xl" /></Layout>
            </>
        );
    }

    return (
        <>
            <Head><title>Navigation (Navbar) — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-6 fade-in max-w-3xl">
                    <p className="text-sm text-[#6e6e73]">Main nav links (Products, Bundle, Accessories, Support) and dropdowns. Order here = order in the navbar.</p>
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
                            <p className="text-sm text-red-700">{error}</p>
                            <button type="button" onClick={() => fetchData()} className="text-sm font-medium text-red-700 hover:underline">Retry</button>
                        </div>
                    )}
                    {!error && (
                    <form onSubmit={handleSave} className="space-y-4">
                        {items.map((item, i) => (
                            <div key={i} className="border border-black/10 rounded-xl p-4 bg-white space-y-3">
                                <div className="flex items-center gap-2">
                                    <GripVertical size={16} className="text-[#6e6e73]" />
                                    <input className={INPUT} value={item.label ?? ""} onChange={(e) => updateItem(i, "label", e.target.value)} placeholder="Label (e.g. Products)" />
                                    <input className={INPUT} value={item.href ?? ""} onChange={(e) => updateItem(i, "href", e.target.value)} placeholder="Link (e.g. /products)" />
                                    <label className="flex items-center gap-1.5 whitespace-nowrap text-sm">
                                        <input type="checkbox" checked={!!item.hasDropdown} onChange={(e) => updateItem(i, "hasDropdown", e.target.checked)} className="rounded" />
                                        Dropdown
                                    </label>
                                    <button type="button" onClick={() => removeItem(i)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                </div>
                                {item.hasDropdown && (
                                    <div className="pl-6 border-l-2 border-black/10 space-y-3">
                                        <div className="flex gap-2">
                                            <input className={INPUT} value={item.dropdown?.title ?? ""} onChange={(e) => updateItemDropdown(i, "title", e.target.value)} placeholder="Dropdown title" />
                                            <select className={INPUT} value={item.dropdown?.layout ?? "row"} onChange={(e) => updateItemDropdown(i, "layout", e.target.value)}>
                                                <option value="row">Row (image tiles)</option>
                                                <option value="list">List (icons)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <span className="text-xs font-medium text-[#6e6e73]">Dropdown items</span>
                                            {(item.dropdown?.items || []).map((di, diIdx) => (
                                                <div key={diIdx} className="flex flex-wrap gap-2 items-start p-2 rounded-lg bg-[#f5f5f7]">
                                                    <input className="flex-1 min-w-[100px]" value={di.name ?? ""} onChange={(e) => updateDropdownItem(i, diIdx, "name", e.target.value)} placeholder="Name" />
                                                    <input className="flex-1 min-w-[100px]" value={di.href ?? ""} onChange={(e) => updateDropdownItem(i, diIdx, "href", e.target.value)} placeholder="Link" />
                                                    {item.dropdown?.layout === "row" && (
                                                        <input className="flex-1 min-w-[120px]" value={di.image ?? ""} onChange={(e) => updateDropdownItem(i, diIdx, "image", e.target.value)} placeholder="Image URL" />
                                                    )}
                                                    {item.dropdown?.layout === "list" && (
                                                        <input className="w-24" value={di.icon ?? ""} onChange={(e) => updateDropdownItem(i, diIdx, "icon", e.target.value)} placeholder="Icon" />
                                                    )}
                                                    <button type="button" onClick={() => removeDropdownItem(i, diIdx)} className="text-red-600"><Trash2 size={14} /></button>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => addDropdownItem(i)} className="text-sm text-[#1d1d1f] font-medium flex items-center gap-1"><Plus size={14} /> Add item</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={addItem} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-black/20 text-[#6e6e73] hover:bg-black/5 text-sm">
                            <Plus size={16} /> Add nav link
                        </button>
                        <div className="pt-4">
                            <button type="submit" disabled={saving} className="bg-[#1d1d1f] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-black disabled:opacity-60">
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
