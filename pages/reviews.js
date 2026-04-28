import { useState, useEffect, useMemo, useCallback } from "react";
import Head from "next/head";
import Layout from "@/components/Layout";
import { getDashboardUser, canWriteSection } from "@/lib/permissions";
import { getAdminReviews, patchReviewsVisibility, deleteAdminReview } from "@/lib/api";
import {
    Star,
    ChevronLeft,
    ChevronRight,
    Save,
    Eye,
    EyeOff,
    Trash2,
    ImageIcon,
    ChevronDown,
    ChevronUp,
    X,
    User,
} from "lucide-react";

function StarRating({ rating }) {
    return (
        <span className="inline-flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
                <Star
                    key={i}
                    size={14}
                    className={i <= rating ? "fill-amber-400 text-amber-400" : "fill-zinc-100 text-zinc-200"}
                />
            ))}
        </span>
    );
}

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
    const [expandedId, setExpandedId] = useState(null);
    const [lightboxImg, setLightboxImg] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

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

    const handleDelete = async (id) => {
        if (!canWriteReviews) return;
        if (!window.confirm("Delete this review permanently? This cannot be undone.")) return;
        setDeletingId(id);
        setError(null);
        try {
            await deleteAdminReview(id);
            setReviews((prev) => prev.filter((r) => r.id !== id));
            setTotal((prev) => Math.max(0, prev - 1));
            if (expandedId === id) setExpandedId(null);
        } catch (e) {
            setError(e?.message || "Failed to delete review");
        } finally {
            setDeletingId(null);
        }
    };

    const toggleExpand = (id) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    const pendingCount = useMemo(
        () => reviews.filter((r) => !r.showOnStorefront).length,
        [reviews]
    );

    return (
        <>
            <Head>
                <title>Product reviews — Hustle Admin</title>
            </Head>
            <Layout>
                <div className="space-y-5 fade-in">
                    {/* Header */}
                    <div className="flex flex-wrap gap-3 items-start justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-[#1d1d1f]">Product reviews</h1>
                            <p className="text-sm text-[#6e6e73] mt-1 max-w-xl">
                                Manage customer reviews. Toggle <strong>Show on site</strong> to approve reviews for the
                                storefront, expand a row to see full details and images, or delete inappropriate reviews.
                            </p>
                        </div>
                        {!loading && pendingCount > 0 && (
                            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-sm font-medium text-amber-800">
                                <EyeOff size={16} />
                                {pendingCount} pending approval
                            </div>
                        )}
                    </div>

                    {/* View-only banner */}
                    {dashUser?.role === "staff" && !canWriteReviews && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            <strong className="font-semibold">View only.</strong> You can browse reviews but cannot change
                            visibility or delete reviews.
                        </div>
                    )}

                    {/* Filters */}
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
                                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
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

                    {/* Bulk actions */}
                    <div className="flex flex-wrap gap-2 items-center">
                        <button
                            type="button"
                            onClick={selectAllOnPage}
                            disabled={!canWriteReviews || loading || reviews.length === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/10 bg-white text-sm font-medium text-[#1d1d1f] disabled:opacity-40"
                        >
                            <Eye size={16} /> Approve all
                        </button>
                        <button
                            type="button"
                            onClick={clearAllOnPage}
                            disabled={!canWriteReviews || loading || reviews.length === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/10 bg-white text-sm font-medium text-[#1d1d1f] disabled:opacity-40"
                        >
                            <EyeOff size={16} /> Hide all
                        </button>
                        <button
                            type="button"
                            onClick={savePageVisibility}
                            disabled={!canWriteReviews || saving || loading || reviews.length === 0}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40"
                        >
                            <Save size={16} /> {saving ? "Saving…" : "Save changes"}
                        </button>
                        {!loading && (
                            <span className="text-xs text-[#6e6e73] ml-1">
                                {total} review{total !== 1 ? "s" : ""} total
                            </span>
                        )}
                    </div>

                    {/* Notifications */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">{error}</div>
                    )}
                    {saveOk && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-800">
                            {saveOk}
                        </div>
                    )}

                    {/* Reviews table */}
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
                                                    onChange={(e) =>
                                                        e.target.checked ? selectAllOnPage() : clearAllOnPage()
                                                    }
                                                    title="Select or unselect all on this page"
                                                />
                                            </th>
                                            <th className="text-left px-3 py-3 text-xs font-semibold text-[#6e6e73]">
                                                Rating
                                            </th>
                                            <th className="text-left px-3 py-3 text-xs font-semibold text-[#6e6e73]">
                                                Product
                                            </th>
                                            <th className="text-left px-3 py-3 text-xs font-semibold text-[#6e6e73]">
                                                Customer
                                            </th>
                                            <th className="text-left px-3 py-3 text-xs font-semibold text-[#6e6e73]">
                                                Comment
                                            </th>
                                            <th className="text-left px-3 py-3 text-xs font-semibold text-[#6e6e73]">
                                                Images
                                            </th>
                                            <th className="text-left px-3 py-3 text-xs font-semibold text-[#6e6e73]">
                                                Date
                                            </th>
                                            <th className="text-center px-3 py-3 text-xs font-semibold text-[#6e6e73] w-20">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reviews.map((r) => {
                                            const isExpanded = expandedId === r.id;
                                            const hasImages =
                                                Array.isArray(r.images) && r.images.length > 0;
                                            return (
                                                <>
                                                    <tr
                                                        key={r.id}
                                                        className={`border-b border-black/5 hover:bg-[#f5f5f7]/40 cursor-pointer transition-colors ${
                                                            !r.showOnStorefront
                                                                ? "bg-amber-50/40"
                                                                : ""
                                                        }`}
                                                        onClick={() => toggleExpand(r.id)}
                                                    >
                                                        <td
                                                            className="px-4 py-3 align-top"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="rounded border-black/20 accent-emerald-600"
                                                                checked={!!r.showOnStorefront}
                                                                disabled={!canWriteReviews}
                                                                onChange={() => toggleOne(r.id)}
                                                                aria-label={`Show review ${r.id} on site`}
                                                            />
                                                        </td>
                                                        <td className="px-3 py-3 align-top whitespace-nowrap">
                                                            <StarRating rating={r.rating} />
                                                        </td>
                                                        <td className="px-3 py-3 align-top">
                                                            <p className="font-medium text-[#1d1d1f] line-clamp-1">
                                                                {r.product?.name || "—"}
                                                            </p>
                                                            <p className="text-[11px] text-[#86868b] font-mono mt-0.5">
                                                                #{r.productId}
                                                                {r.product?.slug
                                                                    ? ` · ${r.product.slug}`
                                                                    : ""}
                                                            </p>
                                                        </td>
                                                        <td className="px-3 py-3 align-top">
                                                            <span className="inline-flex items-center gap-1.5 text-[#1d1d1f]">
                                                                <User
                                                                    size={14}
                                                                    className="text-[#86868b] shrink-0"
                                                                />
                                                                {r.user?.username || "Anonymous User"}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-3 align-top text-[#6e6e73] max-w-xs">
                                                            <p className="line-clamp-2">
                                                                {r.comment || "—"}
                                                            </p>
                                                        </td>
                                                        <td className="px-3 py-3 align-top whitespace-nowrap">
                                                            {hasImages ? (
                                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                                                                    <ImageIcon size={14} />
                                                                    {r.images.length}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-[#c7c7cc]">
                                                                    —
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-3 align-top text-xs text-[#86868b] whitespace-nowrap">
                                                            {r.createdAt
                                                                ? new Date(
                                                                      r.createdAt
                                                                  ).toLocaleDateString("en-IN", {
                                                                      day: "numeric",
                                                                      month: "short",
                                                                      year: "numeric",
                                                                  })
                                                                : "—"}
                                                        </td>
                                                        <td className="px-3 py-3 align-top text-center">
                                                            <span className="inline-flex items-center gap-1">
                                                                {isExpanded ? (
                                                                    <ChevronUp
                                                                        size={16}
                                                                        className="text-[#6e6e73]"
                                                                    />
                                                                ) : (
                                                                    <ChevronDown
                                                                        size={16}
                                                                        className="text-[#6e6e73]"
                                                                    />
                                                                )}
                                                            </span>
                                                        </td>
                                                    </tr>

                                                    {/* Expanded detail row */}
                                                    {isExpanded && (
                                                        <tr
                                                            key={`${r.id}-detail`}
                                                            className="border-b border-black/5 bg-[#f9f9fb]"
                                                        >
                                                            <td colSpan={8} className="px-6 py-5">
                                                                <div className="flex flex-col gap-4 max-w-3xl">
                                                                    {/* Full comment */}
                                                                    <div>
                                                                        <p className="text-xs font-semibold text-[#6e6e73] mb-1">
                                                                            Full comment
                                                                        </p>
                                                                        <p className="text-sm text-[#1d1d1f] whitespace-pre-wrap leading-relaxed">
                                                                            {r.comment || "No comment provided."}
                                                                        </p>
                                                                    </div>

                                                                    {/* Review details grid */}
                                                                    <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                                                                        <div>
                                                                            <span className="text-[#86868b] text-xs">Rating</span>
                                                                            <div className="mt-0.5">
                                                                                <StarRating rating={r.rating} />
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-[#86868b] text-xs">Customer</span>
                                                                            <p className="mt-0.5 font-medium text-[#1d1d1f]">
                                                                                {r.user?.username || "Anonymous User"}
                                                                                {r.user?.id && (
                                                                                    <span className="text-[11px] text-[#86868b] font-mono ml-1.5">
                                                                                        ID: {r.user.id}
                                                                                    </span>
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-[#86868b] text-xs">Status</span>
                                                                            <p className="mt-0.5">
                                                                                {r.showOnStorefront ? (
                                                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                                                        <Eye size={12} /> Visible
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                                                                        <EyeOff size={12} /> Hidden
                                                                                    </span>
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-[#86868b] text-xs">Review ID</span>
                                                                            <p className="mt-0.5 font-mono text-xs text-[#1d1d1f]">
                                                                                #{r.id}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    {/* Images */}
                                                                    {hasImages && (
                                                                        <div>
                                                                            <p className="text-xs font-semibold text-[#6e6e73] mb-2">
                                                                                Customer photos ({r.images.length})
                                                                            </p>
                                                                            <div className="flex flex-wrap gap-3">
                                                                                {r.images.map(
                                                                                    (src, idx) => (
                                                                                        <button
                                                                                            key={idx}
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                setLightboxImg(src)
                                                                                            }
                                                                                            className="w-20 h-20 rounded-xl overflow-hidden border border-black/10 hover:ring-2 hover:ring-blue-400 transition-all bg-zinc-50 shrink-0"
                                                                                        >
                                                                                            <img
                                                                                                src={src}
                                                                                                alt={`Review photo ${idx + 1}`}
                                                                                                className="w-full h-full object-cover"
                                                                                            />
                                                                                        </button>
                                                                                    )
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Actions */}
                                                                    <div className="flex items-center gap-2 pt-2 border-t border-black/5">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleOne(r.id)}
                                                                            disabled={!canWriteReviews}
                                                                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 ${
                                                                                r.showOnStorefront
                                                                                    ? "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                                                                                    : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                                                                            }`}
                                                                        >
                                                                            {r.showOnStorefront ? (
                                                                                <>
                                                                                    <EyeOff size={15} /> Hide from site
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Eye size={15} /> Approve & show
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDelete(r.id)}
                                                                            disabled={
                                                                                !canWriteReviews ||
                                                                                deletingId === r.id
                                                                            }
                                                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-40"
                                                                        >
                                                                            <Trash2 size={15} />
                                                                            {deletingId === r.id
                                                                                ? "Deleting…"
                                                                                : "Delete"}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
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

                {/* Lightbox */}
                {lightboxImg && (
                    <div
                        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setLightboxImg(null)}
                    >
                        <div
                            className="relative max-w-3xl max-h-[85vh] m-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                onClick={() => setLightboxImg(null)}
                                className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-zinc-100"
                            >
                                <X size={18} className="text-[#1d1d1f]" />
                            </button>
                            <img
                                src={lightboxImg}
                                alt="Review photo full"
                                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
                            />
                        </div>
                    </div>
                )}
            </Layout>
        </>
    );
}
