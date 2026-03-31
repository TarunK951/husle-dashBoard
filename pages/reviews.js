import { useState, useEffect, useMemo, useCallback } from "react";
import Head from "next/head";
import Layout from "@/components/Layout";
import { getDashboardUser, canWriteSection } from "@/lib/permissions";
import { getAdminReviews, patchReviewsVisibility } from "@/lib/api";
import { Star, ChevronLeft, ChevronRight, Save, Eye, EyeOff } from "lucide-react";

export default function AdminReviewsPage() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [saveOk, setSaveOk] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [productIdFilter, setProductIdFilter] = useState("");
    const [search, setSearch] = useState("");
    const [appliedProductId, setAppliedProductId] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [dashUser, setDashUser] = useState(null);

    useEffect(() => {
        setDashUser(getDashboardUser());
    }, []);

    const canWriteReviews = canWriteSection(dashUser, "reviews");

    const fetchReviews = useCallback(async () => {
        setLoading(true);
        setError(null);
        setSaveOk(null);
        try {
            const data = await getAdminReviews({
                page,
                limit: 15,
                productId: appliedProductId || undefined,
                search: appliedSearch || undefined,
            });
            const list = data.reviews || [];
            setReviews(list.map((r) => ({ ...r, showOnStorefront: r.showOnStorefront !== false })));
            setTotal(data.total ?? list.length);
            setTotalPages(data.totalPages ?? 1);
        } catch (e) {
            setError(e?.message || "Failed to load reviews");
            setReviews([]);
        } finally {
            setLoading(false);
        }
    }, [page, appliedProductId, appliedSearch]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const applyFilters = () => {
        setPage(1);
        setAppliedProductId(productIdFilter.trim());
        setAppliedSearch(search.trim());
    };

    const allVisibleOnPage = useMemo(
        () => reviews.length > 0 && reviews.every((r) => r.showOnStorefront),
        [reviews]
    );

    const selectAllOnPage = () => {
        if (!canWriteReviews) return;
        setReviews((prev) => prev.map((r) => ({ ...r, showOnStorefront: true })));
    };

    const clearAllOnPage = () => {
        if (!canWriteReviews) return;
        setReviews((prev) => prev.map((r) => ({ ...r, showOnStorefront: false })));
    };

    const toggleOne = (id) => {
        if (!canWriteReviews) return;
        setReviews((prev) =>
            prev.map((r) => (r.id === id ? { ...r, showOnStorefront: !r.showOnStorefront } : r))
        );
    };

    const savePageVisibility = async () => {
        if (!canWriteReviews || reviews.length === 0) return;
        setSaving(true);
        setError(null);
        setSaveOk(null);
        try {
            const updates = reviews.map((r) => ({ id: r.id, showOnStorefront: !!r.showOnStorefront }));
            await patchReviewsVisibility(updates);
            setSaveOk("Saved visibility for this page.");
        } catch (e) {
            setError(e?.message || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Head>
                <title>Product reviews — Hustle Admin</title>
            </Head>
            <Layout>
                <div className="space-y-5 fade-in">
                    <div className="flex flex-wrap gap-3 items-start justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-[#1d1d1f]">Product reviews</h1>
                            <p className="text-sm text-[#6e6e73] mt-1 max-w-xl">
                                Only reviews with <strong>Show on site</strong> checked appear on the storefront and in
                                product ratings. Select all on this page to highlight positives, uncheck any row to hide
                                it, then save.
                            </p>
                        </div>
                    </div>

                    {dashUser?.role === "staff" && !canWriteReviews && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            <strong className="font-semibold">View only.</strong> You can browse reviews but cannot change
                            visibility on the storefront.
                        </div>
                    )}

                    <div className="flex flex-wrap gap-3 items-end">
                        <div>
                            <label className="block text-xs font-semibold text-[#6e6e73] mb-1">Product ID</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="e.g. 12"
                                value={productIdFilter}
                                onChange={(e) => setProductIdFilter(e.target.value)}
                                className="px-4 py-2.5 rounded-xl border border-black/10 bg-white text-sm w-36"
                            />
                        </div>
                        <div className="min-w-[200px] flex-1 max-w-md">
                            <label className="block text-xs font-semibold text-[#6e6e73] mb-1">Search comment</label>
                            <input
                                type="search"
                                placeholder="Keyword in review text…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-white text-sm"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={applyFilters}
                            className="px-5 py-2.5 rounded-xl bg-[#1d1d1f] text-white text-sm font-semibold hover:opacity-90"
                        >
                            Apply filters
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                        <button
                            type="button"
                            onClick={selectAllOnPage}
                            disabled={!canWriteReviews || loading || reviews.length === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/10 bg-white text-sm font-medium text-[#1d1d1f] disabled:opacity-40"
                        >
                            <Eye size={16} /> Select all on page
                        </button>
                        <button
                            type="button"
                            onClick={clearAllOnPage}
                            disabled={!canWriteReviews || loading || reviews.length === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/10 bg-white text-sm font-medium text-[#1d1d1f] disabled:opacity-40"
                        >
                            <EyeOff size={16} /> Unselect all on page
                        </button>
                        <button
                            type="button"
                            onClick={savePageVisibility}
                            disabled={!canWriteReviews || saving || loading || reviews.length === 0}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40"
                        >
                            <Save size={16} /> Save this page
                        </button>
                        {!loading && (
                            <span className="text-xs text-[#6e6e73] ml-1">
                                {total} review{total !== 1 ? "s" : ""} total
                            </span>
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">{error}</div>
                    )}
                    {saveOk && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-800">
                            {saveOk}
                        </div>
                    )}

                    <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="p-6 space-y-3">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="skeleton h-14 rounded-xl" />
                                ))}
                            </div>
                        ) : reviews.length === 0 ? (
                            <div className="py-20 text-center">
                                <Star size={36} className="mx-auto text-[#c7c7cc] mb-3" />
                                <p className="text-[#6e6e73] text-sm font-medium">No reviews match your filters.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-black/5 bg-[#f5f5f7]/60">
                                            <th className="text-left px-4 py-3 w-12">
                                                <span className="sr-only">Show on site</span>
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-black/20"
                                                    checked={allVisibleOnPage}
                                                    disabled={!canWriteReviews}
                                                    onChange={(e) => (e.target.checked ? selectAllOnPage() : clearAllOnPage())}
                                                    title="Select or unselect all on this page"
                                                />
                                            </th>
                                            <th className="text-left px-3 py-3 text-xs font-semibold text-[#6e6e73]">Rating</th>
                                            <th className="text-left px-3 py-3 text-xs font-semibold text-[#6e6e73]">Product</th>
                                            <th className="text-left px-3 py-3 text-xs font-semibold text-[#6e6e73]">Customer</th>
                                            <th className="text-left px-3 py-3 text-xs font-semibold text-[#6e6e73]">Comment</th>
                                            <th className="text-left px-3 py-3 text-xs font-semibold text-[#6e6e73]">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reviews.map((r) => (
                                            <tr key={r.id} className="border-b border-black/5 hover:bg-[#f5f5f7]/40">
                                                <td className="px-4 py-3 align-top">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-black/20"
                                                        checked={!!r.showOnStorefront}
                                                        disabled={!canWriteReviews}
                                                        onChange={() => toggleOne(r.id)}
                                                        aria-label={`Show review ${r.id} on site`}
                                                    />
                                                </td>
                                                <td className="px-3 py-3 align-top whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-0.5 text-amber-600 font-semibold">
                                                        <Star size={14} className="fill-amber-400 text-amber-400" />
                                                        {r.rating}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 align-top">
                                                    <p className="font-medium text-[#1d1d1f] line-clamp-2">{r.product?.name || "—"}</p>
                                                    <p className="text-[11px] text-[#86868b] font-mono mt-0.5">
                                                        #{r.productId}
                                                        {r.product?.slug ? ` · ${r.product.slug}` : ""}
                                                    </p>
                                                </td>
                                                <td className="px-3 py-3 align-top text-[#1d1d1f]">
                                                    {r.user?.username || "—"}
                                                </td>
                                                <td className="px-3 py-3 align-top text-[#6e6e73] max-w-md">
                                                    <p className="line-clamp-3">{r.comment || "—"}</p>
                                                </td>
                                                <td className="px-3 py-3 align-top text-xs text-[#86868b] whitespace-nowrap">
                                                    {r.createdAt
                                                        ? new Date(r.createdAt).toLocaleDateString("en-IN", {
                                                              day: "numeric",
                                                              month: "short",
                                                              year: "numeric",
                                                          })
                                                        : "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {!loading && totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-black/5 bg-[#fafafa]">
                                <button
                                    type="button"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className="inline-flex items-center gap-1 text-sm font-medium text-[#1d1d1f] disabled:opacity-30"
                                >
                                    <ChevronLeft size={18} /> Previous
                                </button>
                                <span className="text-xs text-[#6e6e73]">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    type="button"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => p + 1)}
                                    className="inline-flex items-center gap-1 text-sm font-medium text-[#1d1d1f] disabled:opacity-30"
                                >
                                    Next <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </Layout>
        </>
    );
}
