import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getDashboardUser, canWriteSection } from "@/lib/permissions";
import { getCoupons, createCoupon, updateCoupon, deleteCoupon, getCategories } from "@/lib/api";
import { Plus, Trash2, X, RefreshCw, Zap, Calendar, Info, Tag, CheckCircle2, Pencil, Pause, Play } from "lucide-react";
import Head from "next/head";

const INPUT = "w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#f5f5f7] text-[#1d1d1f] placeholder-[#6e6e73] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] text-sm transition-all";

function couponToForm(o) {
    return {
        id: o.id,
        code: o.code || "",
        description: o.description || "",
        discountType: o.discountType || "percentage",
        discountValue: o.discountValue != null ? String(o.discountValue) : "",
        minOrderValue: o.minOrderValue != null ? String(o.minOrderValue) : "0",
        usageLimit: o.usageLimit != null && o.usageLimit !== "" ? String(o.usageLimit) : "",
        startDate: o.startDate ? new Date(o.startDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        expiryDate: o.expiryDate ? new Date(o.expiryDate).toISOString().split("T")[0] : "",
        isActive: o.isActive !== false,
        categoryIds: Array.isArray(o.categories) ? o.categories.map((c) => c.id) : [],
    };
}

function emptyForm() {
    return {
        id: null,
        code: "",
        description: "",
        discountType: "percentage",
        discountValue: "",
        minOrderValue: "0",
        usageLimit: "",
        startDate: new Date().toISOString().split("T")[0],
        expiryDate: "",
        isActive: true,
        categoryIds: [],
    };
}

export default function CouponsPage() {
    const [coupons, setCoupons] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(() => emptyForm());
    const [dashUser, setDashUser] = useState(null);

    useEffect(() => {
        setDashUser(getDashboardUser());
        fetchCategories();
    }, []);

    const canWriteCoupons = canWriteSection(dashUser, "coupons") || canWriteSection(dashUser, "offers");

    const fetchCoupons = () => {
        setLoading(true);
        setError(null);
        getCoupons()
            .then((d) => {
                setCoupons(Array.isArray(d) ? d : []);
            })
            .catch((e) => setError(e?.message || "Failed to load coupons"))
            .finally(() => setLoading(false));
    };

    const fetchCategories = () => {
        getCategories()
            .then((d) => setCategories(Array.isArray(d) ? d : []))
            .catch(() => {});
    };

    useEffect(() => { fetchCoupons(); }, []);

    const buildPayload = () => ({
        code: form.code.trim(),
        description: form.description,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        minOrderValue: parseFloat(form.minOrderValue || 0),
        usageLimit: form.usageLimit ? parseInt(form.usageLimit, 10) : null,
        startDate: form.startDate || null,
        expiryDate: form.expiryDate || null,
        isActive: form.isActive,
        categoryIds: form.categoryIds.map((id) => parseInt(id, 10)),
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canWriteCoupons) return;
        if (!form.code?.trim()) return;
        setSaving(true);
        try {
            const payload = buildPayload();
            if (form.id) {
                await updateCoupon(form.id, payload);
            } else {
                await createCoupon(payload);
            }
            setShowModal(false);
            setForm(emptyForm());
            fetchCoupons();
        } catch (err) {
            setError(err?.message || (form.id ? "Failed to update coupon" : "Failed to create coupon"));
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (o) => {
        if (!canWriteCoupons) return;
        try {
            await updateCoupon(o.id, { isActive: !o.isActive });
            fetchCoupons();
        } catch (err) {
            alert(err?.message || "Failed to update coupon");
        }
    };

    const handleDelete = async (id) => {
        if (!canWriteCoupons) return;
        if (!confirm("Delete this coupon? It will no longer be valid for customers.")) return;
        try {
            await deleteCoupon(id);
            fetchCoupons();
        } catch (e) {
            alert(e?.message || "Failed to delete coupon");
        }
    };

    return (
        <>
            <Head><title>Promo Coupons — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-5 fade-in max-w-5xl">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-[#1d1d1f]">Promo Coupons</h1>
                            <div className="px-2.5 py-1 rounded-full bg-indigo-100 border border-indigo-200 text-[10px] font-bold text-indigo-700 uppercase tracking-tight">Cart Discounts</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={fetchCoupons} disabled={loading} className="p-2 rounded-lg text-[#6e6e73] hover:bg-black/5" title="Refresh"><RefreshCw size={18} className={loading ? "animate-spin" : ""} /></button>
                            {canWriteCoupons && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setForm(emptyForm());
                                        setError(null);
                                        setShowModal(true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1d1d1f] text-white text-sm font-semibold hover:bg-black transition-all"
                                >
                                    <Plus size={18} /> New coupon
                                </button>
                            )}
                        </div>
                    </div>

                    <p className="text-sm text-[#86868b] max-w-2xl">
                        Manage discount codes that customers can apply at checkout. These are based on cart totals and can be restricted to specific categories.
                    </p>

                    {error && (
                        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between border border-red-100">
                            <span>{error}</span>
                            <button type="button" onClick={() => setError(null)} className="p-1 text-red-500"><X size={16} /></button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loading ? (
                            [...Array(3)].map((_, i) => <div key={i} className="h-48 rounded-2xl bg-black/5 animate-pulse" />)
                        ) : coupons.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-black/10">
                                <Zap size={40} className="mx-auto text-black/10 mb-4" />
                                <p className="text-[#6e6e73] font-medium mb-3">No coupons yet.</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setForm(emptyForm());
                                        setShowModal(true);
                                    }}
                                    className="text-sm font-bold text-[#1d1d1f] hover:underline"
                                >
                                    Create your first coupon
                                </button>
                            </div>
                        ) : (
                            coupons.map((o) => (
                                <div key={o.id} className="group relative bg-white rounded-3xl border border-black/[0.06] p-5 shadow-sm hover:shadow-md transition-all flex flex-col">
                                    <div className="flex justify-between items-start mb-4 gap-2">
                                        <div className="bg-[#1d1d1f] text-white px-3 py-1 rounded-xl font-black text-sm tracking-wider uppercase">
                                            {o.code}
                                        </div>
                                        {canWriteCoupons && (
                                            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    title="Edit coupon"
                                                    onClick={() => {
                                                        setForm(couponToForm(o));
                                                        setError(null);
                                                        setShowModal(true);
                                                    }}
                                                    className="p-2 rounded-full hover:bg-black/5 text-[#1d1d1f]"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    title="Delete coupon"
                                                    onClick={() => handleDelete(o.id)}
                                                    className="p-2 rounded-full hover:bg-red-50 text-red-400"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex-1">
                                        <h3 className="text-[17px] font-bold text-[#1d1d1f] mb-1">
                                            {o.discountType === 'percentage' ? `${o.discountValue}% OFF` : `₹${o.discountValue} OFF`}
                                        </h3>
                                        <p className="text-[13px] text-[#86868b] line-clamp-2 mb-4 leading-snug">
                                            {o.description || "No description provided."}
                                        </p>

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-[12px] text-[#6e6e73]">
                                                <Calendar size={14} className="shrink-0" />
                                                <span>{o.startDate ? new Date(o.startDate).toLocaleDateString() : 'Immediate'} — {o.expiryDate ? new Date(o.expiryDate).toLocaleDateString() : 'Never'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[12px] text-[#6e6e73]">
                                                <Info size={14} className="shrink-0" />
                                                <span>Min order: ₹{o.minOrderValue}</span>
                                            </div>
                                            {o.usageLimit && (
                                                <div className="flex items-center gap-2 text-[12px] text-[#6e6e73]">
                                                    <Tag size={14} className="shrink-0" />
                                                    <span>Usage: {o.usageCount} / {o.usageLimit}</span>
                                                </div>
                                            )}
                                            {o.categories?.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {o.categories.map(c => (
                                                        <span key={c.id} className="px-1.5 py-0.5 rounded bg-zinc-100 text-[10px] font-bold text-zinc-600 uppercase">
                                                            {c.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-5 pt-4 border-t border-black/[0.04] flex flex-col gap-3">
                                        <div className={`flex items-center gap-1.5 text-[11px] font-bold ${o.isActive ? "text-green-600" : "text-amber-700"}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${o.isActive ? "bg-green-500" : "bg-amber-500"}`} />
                                            {o.isActive ? "Running — customers can apply this code" : "Paused — not valid at checkout"}
                                        </div>
                                        {canWriteCoupons && (
                                            <button
                                                type="button"
                                                onClick={() => handleToggleActive(o)}
                                                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide border transition-colors ${
                                                    o.isActive
                                                        ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                                        : "border-green-200 bg-green-50 text-green-800 hover:bg-green-100"
                                                }`}
                                            >
                                                {o.isActive ? (
                                                    <>
                                                        <Pause size={14} strokeWidth={2.5} /> Pause promo
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play size={14} strokeWidth={2.5} /> Resume promo
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Add Coupon Modal */}
                {showModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                        onClick={() => {
                            setShowModal(false);
                            setForm(emptyForm());
                        }}
                    >
                        <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto fade-in shadow-black/20" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between px-8 py-6 border-b border-black/[0.05] sticky top-0 bg-white z-10">
                                <div>
                                    <h2 className="text-xl font-bold text-[#1d1d1f]">{form.id ? "Edit coupon" : "Create new coupon"}</h2>
                                    <p className="text-xs text-[#86868b] font-medium mt-0.5">
                                        {form.id
                                            ? "Update rules, dates, or turn the promo on from here."
                                            : "Configure discounts and validation rules"}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setForm(emptyForm());
                                    }}
                                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 text-[#86868b]"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="block text-[13px] font-bold text-[#1d1d1f] ml-1">Coupon code</label>
                                        <input className={INPUT} required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. SUMMER20" />
                                        {form.id != null && (
                                            <p className="text-[10px] text-[#86868b] mt-1">Changing the code updates what customers type at checkout.</p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[13px] font-bold text-[#1d1d1f] ml-1">Description</label>
                                        <input className={INPUT} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Show this to customers..." />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-[13px] font-bold text-[#1d1d1f] ml-1">Discount type</label>
                                        <select className={INPUT} value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
                                            <option value="percentage">Percentage (%)</option>
                                            <option value="fixed">Fixed Amount (₹)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[13px] font-bold text-[#1d1d1f] ml-1">Value ({form.discountType === 'percentage' ? '%' : '₹'})</label>
                                        <input type="number" step="any" className={INPUT} required value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} placeholder="e.g. 10" />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-[13px] font-bold text-[#1d1d1f] ml-1">Min. order value (₹)</label>
                                        <input type="number" className={INPUT} value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })} placeholder="Qualifying subtotal threshold" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[13px] font-bold text-[#1d1d1f] ml-1">Usage limit (total)</label>
                                        <input type="number" className={INPUT} value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="Optional limit" />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-[13px] font-bold text-[#1d1d1f] ml-1">Start date</label>
                                        <input type="date" className={INPUT} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[13px] font-bold text-[#1d1d1f] ml-1">Expiry date</label>
                                        <input type="date" className={INPUT} value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-[13px] font-bold text-[#1d1d1f] ml-1">Restrict to specific categories (Optional)</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {categories.map(c => (
                                            <div 
                                                key={c.id} 
                                                onClick={() => {
                                                    const current = [...form.categoryIds];
                                                    const idx = current.indexOf(c.id);
                                                    if (idx > -1) current.splice(idx, 1);
                                                    else current.push(c.id);
                                                    setForm({ ...form, categoryIds: current });
                                                }}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                                                    form.categoryIds.includes(c.id) 
                                                    ? "bg-[#1d1d1f] text-white border-black" 
                                                    : "bg-[#f5f5f7] text-[#6e6e73] border-transparent hover:border-black/10"
                                                }`}
                                            >
                                                {form.categoryIds.includes(c.id) && <CheckCircle2 size={12} />}
                                                {c.name}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-[#86868b] font-medium ml-1 italic">If none selected, coupon applies to all items.</p>
                                </div>

                                <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[#f5f5f7] px-4 py-3">
                                    <input
                                        type="checkbox"
                                        id="coupon-active"
                                        checked={form.isActive}
                                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                        className="h-4 w-4 rounded border-black/20"
                                    />
                                    <label htmlFor="coupon-active" className="text-sm font-semibold text-[#1d1d1f] cursor-pointer">
                                        Promo is running (valid at checkout when dates and limits allow)
                                    </label>
                                </div>

                                {form.id != null && (
                                    <p className="text-[11px] text-[#86868b]">
                                        Tip: you can also use <strong>Pause promo</strong> / <strong>Resume promo</strong> on the card without opening this form.
                                    </p>
                                )}

                                <div className="flex gap-4 pt-4 border-t border-black/[0.05]">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false);
                                            setForm(emptyForm());
                                        }}
                                        className="flex-1 py-4 rounded-2xl border border-black/10 text-sm font-bold hover:bg-black/5 transition-colors"
                                    >
                                        Discard changes
                                    </button>
                                    <button type="submit" disabled={saving} className="flex-1 py-4 rounded-2xl bg-[#1d1d1f] text-white text-sm font-bold hover:bg-black transition-all disabled:opacity-50">
                                        {saving ? (form.id ? "Saving…" : "Creating coupon…") : form.id ? "Save changes" : "Create coupon"}
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
