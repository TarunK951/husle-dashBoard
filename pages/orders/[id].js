import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "@/components/Layout";
import { getOrder, trackAdminOrder } from "@/lib/api";
import {
    ChevronLeft, Package, MapPin, CreditCard, Banknote,
    Truck, CheckCircle2, Clock, ExternalLink, RefreshCw,
    AlertCircle, User,
} from "lucide-react";

const STATUS_STYLES = {
    pending:    "bg-amber-50 text-amber-700 border-amber-200",
    paid:       "bg-sky-50 text-sky-700 border-sky-200",
    processing: "bg-blue-50 text-blue-700 border-blue-200",
    shipped:    "bg-purple-50 text-purple-700 border-purple-200",
    delivered:  "bg-green-50 text-green-700 border-green-200",
    cancelled:  "bg-red-50 text-red-700 border-red-200",
};

function formatCurrency(v) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v || 0);
}

function formatDateTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Card({ title, icon: Icon, children, className = "" }) {
    return (
        <div className={`bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden ${className}`}>
            {title && (
                <div className="px-6 py-4 border-b border-black/5 flex items-center gap-2">
                    {Icon && <Icon size={16} className="text-[#6e6e73]" />}
                    <h2 className="font-semibold text-[#1d1d1f] text-sm">{title}</h2>
                </div>
            )}
            <div className="px-6 py-5">{children}</div>
        </div>
    );
}

function Row({ label, value }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2 border-b border-black/[0.04] last:border-0">
            <span className="text-xs font-medium text-[#6e6e73] whitespace-nowrap">{label}</span>
            <span className="text-sm font-medium text-[#1d1d1f] text-right">{value ?? "—"}</span>
        </div>
    );
}

export default function OrderDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const [order, setOrder] = useState(null);
    const [tracking, setTracking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [trackLoading, setTrackLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        getOrder(id)
            .then(setOrder)
            .catch((e) => setError(e?.message || "Failed to load order"))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (!order?.awbCode && !order?.shipmentId) return;
        fetchTracking();
    }, [order?.id]);

    const fetchTracking = async () => {
        if (!id) return;
        setTrackLoading(true);
        try {
            const data = await trackAdminOrder(id);
            setTracking(data);
        } catch (_) {}
        finally { setTrackLoading(false); }
    };

    if (loading) {
        return (
            <Layout>
                <div className="space-y-4 fade-in">
                    <div className="skeleton h-8 w-40 rounded-xl" />
                    {[1,2,3].map(i => <div key={i} className="skeleton h-40 rounded-2xl" />)}
                </div>
            </Layout>
        );
    }

    if (error || !order) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <AlertCircle size={40} className="text-red-400" />
                    <p className="text-[#1d1d1f] font-semibold">{error || "Order not found"}</p>
                    <button onClick={() => router.push("/orders")} className="text-sm text-[#6e6e73] hover:text-[#1d1d1f] underline">
                        Back to orders
                    </button>
                </div>
            </Layout>
        );
    }

    const addr = order.shippingAddress || {};
    // items may come as a parsed array or (rarely) a JSON string
    const rawItems = order.items;
    const items = Array.isArray(rawItems)
        ? rawItems
        : typeof rawItems === "string"
        ? (() => { try { return JSON.parse(rawItems); } catch { return []; } })()
        : [];

    const isCOD = !order.paymentId;

    // Payment status — separate from order status
    const paymentStatus = (() => {
        if (order.refundStatus === "processed") return { label: "Refunded", style: "bg-orange-50 text-orange-700 border-orange-200" };
        if (order.refundStatus === "initiated") return { label: "Refund Initiated", style: "bg-orange-50 text-orange-700 border-orange-200" };
        if (isCOD) {
            return order.status === "delivered"
                ? { label: "COD — Collected", style: "bg-green-50 text-green-700 border-green-200" }
                : { label: "COD — Pending", style: "bg-amber-50 text-amber-700 border-amber-200" };
        }
        return order.paymentId
            ? { label: "Paid Online", style: "bg-green-50 text-green-700 border-green-200" }
            : { label: "Unpaid", style: "bg-red-50 text-red-700 border-red-200" };
    })();

    // Order fulfilment status — strip "paid" (payment concept) from fulfilment display
    const fulfilmentStatus = order.status === "paid" ? "processing" : order.status;

    return (
        <>
            <Head><title>Order #{order.id} — Hustle Admin</title></Head>
            <Layout>
                <div className="max-w-4xl mx-auto space-y-5 fade-in">

                    {/* Back */}
                    <button
                        onClick={() => router.push("/orders")}
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
                    >
                        <ChevronLeft size={16} /> All orders
                    </button>

                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-[#1d1d1f] tracking-tight">Order #{order.id}</h1>
                            <p className="text-sm text-[#6e6e73] mt-1">{formatDateTime(order.createdAt)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Order fulfilment status */}
                            <div className="flex flex-col items-end gap-0.5">
                                <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wide">Order</span>
                                <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-semibold border ${STATUS_STYLES[fulfilmentStatus] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                                    {fulfilmentStatus}
                                </span>
                            </div>
                            {/* Payment status */}
                            <div className="flex flex-col items-end gap-0.5">
                                <span className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wide">Payment</span>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border ${paymentStatus.style}`}>
                                    {isCOD ? <Banknote size={14} /> : <CreditCard size={14} />}
                                    {paymentStatus.label}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                        {/* Left column — order + customer */}
                        <div className="lg:col-span-1 space-y-5">

                            {/* Order info */}
                            <Card title="Order info" icon={Package}>
                                <Row label="Order ID" value={`#${order.id}`} />
                                <Row label="Order status" value={
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold border ${STATUS_STYLES[fulfilmentStatus] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                                        {fulfilmentStatus}
                                    </span>
                                } />
                                <Row label="Payment status" value={
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold border ${paymentStatus.style}`}>
                                        {paymentStatus.label}
                                    </span>
                                } />
                                {order.awbCode && <Row label="AWB / Waybill" value={<span className="font-mono text-xs">{order.awbCode}</span>} />}
                                <Row label="Placed on" value={formatDateTime(order.createdAt)} />
                            </Card>

                            {/* Customer */}
                            <Card title="Customer" icon={User}>
                                <Row label="Username" value={order.user?.username || "—"} />
                                <Row label="Email" value={order.user?.email || "—"} />
                            </Card>

                            {/* Shipping address */}
                            <Card title="Shipping address" icon={MapPin}>
                                {addr.fullName && <p className="font-semibold text-[#1d1d1f] text-sm mb-1">{addr.fullName}</p>}
                                {addr.phone && <p className="text-sm text-[#6e6e73] mb-2">{addr.phone}</p>}
                                <p className="text-sm text-[#1d1d1f] leading-relaxed">
                                    {[addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.postalCode, addr.country].filter(Boolean).join(", ")}
                                </p>
                            </Card>
                        </div>

                        {/* Right column — items + tracking */}
                        <div className="lg:col-span-2 space-y-5">

                            {/* Package Details */}
                            <Card title={`Package Details (${items.length} ${items.length === 1 ? "item" : "items"})`} icon={Package}>
                                {items.length === 0 ? (
                                    <p className="text-sm text-[#6e6e73]">No items found</p>
                                ) : (
                                    <div className="space-y-0 -mx-6 -mt-5">
                                        {/* Table header */}
                                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-6 py-2.5 bg-[#f5f5f7] border-b border-black/[0.06] text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">
                                            <span>Product</span>
                                            <span className="text-right">Unit Price</span>
                                            <span className="text-center">Qty</span>
                                            <span className="text-right">Total</span>
                                        </div>
                                        {/* Item rows */}
                                        {items.map((item, i) => {
                                            const salePrice = parseFloat(item.price) || 0;
                                            const mrp = parseFloat(item.originalPrice ?? item.mrp ?? 0) || 0;
                                            const hasMrp = mrp > salePrice;
                                            const qty = item.quantity ?? 1;
                                            const discountPct = hasMrp ? Math.round(((mrp - salePrice) / mrp) * 100) : 0;
                                            const lineTotal = salePrice * qty;
                                            return (
                                                <div key={i} className={`grid grid-cols-[1fr_auto_auto_auto] gap-3 px-6 py-4 items-start ${i < items.length - 1 ? "border-b border-black/[0.04]" : ""}`}>
                                                    {/* Product info */}
                                                    <div className="flex gap-3 items-start min-w-0">
                                                        <div className="w-12 h-12 rounded-xl bg-[#f5f5f7] border border-black/[0.06] flex items-center justify-center shrink-0 overflow-hidden">
                                                            {item.image ? (
                                                                <img src={item.image} alt={item.name || "Product"} className="w-full h-full object-cover rounded-xl"
                                                                    onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                                                            ) : null}
                                                            <div style={{ display: item.image ? "none" : "flex" }} className="w-full h-full items-center justify-center">
                                                                <Package size={18} className="text-[#86868b]" />
                                                            </div>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-[#1d1d1f] text-sm leading-snug">{item.name || `Product #${item.productId}`}</p>
                                                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                                {item.modelName && (
                                                                    <span className="text-[11px] font-medium text-[#1d1d1f] bg-[#f5f5f7] px-2 py-0.5 rounded-lg border border-black/[0.06]">
                                                                        📱 {item.modelName}
                                                                    </span>
                                                                )}
                                                                {item.colorName && (
                                                                    <span className="text-[11px] font-medium text-[#1d1d1f] bg-[#f5f5f7] px-2 py-0.5 rounded-lg border border-black/[0.06]">
                                                                        🎨 {item.colorName}
                                                                    </span>
                                                                )}
                                                                {item.screenGuardType && (
                                                                    <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                                                                        🛡 {item.screenGuardType}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Unit price */}
                                                    <div className="text-right shrink-0">
                                                        <p className="text-sm font-semibold text-[#1d1d1f]">{formatCurrency(salePrice)}</p>
                                                        {hasMrp && (
                                                            <>
                                                                <p className="text-[11px] text-[#86868b] line-through mt-0.5">{formatCurrency(mrp)}</p>
                                                                <span className="inline-block mt-0.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-md">
                                                                    {discountPct}% off
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                    {/* Qty */}
                                                    <div className="text-center shrink-0">
                                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#f5f5f7] border border-black/[0.06] text-sm font-semibold text-[#1d1d1f]">{qty}</span>
                                                    </div>
                                                    {/* Line total */}
                                                    <div className="text-right shrink-0">
                                                        <p className="text-sm font-bold text-[#1d1d1f]">{formatCurrency(lineTotal)}</p>
                                                        {hasMrp && (
                                                            <p className="text-[11px] text-green-600 font-medium mt-0.5">
                                                                Save {formatCurrency((mrp - salePrice) * qty)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>

                            {/* Payment Details */}
                            <Card title="Payment Details" icon={CreditCard}>
                                {(() => {
                                    const subTotal = items.reduce((sum, i) => sum + (parseFloat(i.price) || 0) * (i.quantity ?? 1), 0);
                                    const shipping = parseFloat(order.shippingCharge) || 0;
                                    const discount = parseFloat(order.discountAmount) || 0;
                                    const total = parseFloat(order.totalAmount) || 0;
                                    const itemCount = items.reduce((sum, i) => sum + (i.quantity ?? 1), 0);
                                    return (
                                        <div className="space-y-0 -mx-6 -mt-5">
                                            <div className="px-6 py-3.5 flex items-center justify-between border-b border-black/[0.04]">
                                                <div>
                                                    <p className="text-sm font-medium text-[#1d1d1f]">Sub Total</p>
                                                    <p className="text-[11px] text-[#86868b] mt-0.5">{items.length} item{items.length !== 1 ? "s" : ""} × {itemCount} nos</p>
                                                </div>
                                                <p className="text-sm font-semibold text-[#1d1d1f]">{formatCurrency(subTotal)}</p>
                                            </div>
                                            {shipping > 0 && (
                                                <div className="px-6 py-3.5 flex items-center justify-between border-b border-black/[0.04]">
                                                    <p className="text-sm font-medium text-[#1d1d1f]">Shipping Charge</p>
                                                    <p className="text-sm font-semibold text-[#1d1d1f]">+{formatCurrency(shipping)}</p>
                                                </div>
                                            )}
                                            {shipping === 0 && (
                                                <div className="px-6 py-3.5 flex items-center justify-between border-b border-black/[0.04]">
                                                    <p className="text-sm font-medium text-[#1d1d1f]">Shipping</p>
                                                    <p className="text-sm font-semibold text-green-600">Free</p>
                                                </div>
                                            )}
                                            {discount > 0 && (
                                                <div className="px-6 py-3.5 flex items-center justify-between border-b border-black/[0.04]">
                                                    <div>
                                                        <p className="text-sm font-medium text-[#1d1d1f]">Discount</p>
                                                        {order.offerCode && (
                                                            <span className="inline-block mt-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md">
                                                                {order.offerCode}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-semibold text-green-600">-{formatCurrency(discount)}</p>
                                                </div>
                                            )}
                                            <div className="px-6 py-4 flex items-center justify-between bg-[#f5f5f7] rounded-b-2xl">
                                                <div>
                                                    <p className="text-sm font-bold text-[#1d1d1f]">Total Amount {isCOD ? "(COD)" : "Paid"}</p>
                                                    {!isCOD && order.paymentId && (
                                                        <p className="text-[11px] font-mono text-[#86868b] mt-0.5">{order.paymentId}</p>
                                                    )}
                                                </div>
                                                <p className="text-lg font-bold text-[#1d1d1f]">{formatCurrency(total)}</p>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </Card>

                            {/* Delhivery Tracking */}
                            <Card title="Shipment tracking" icon={Truck}>
                                {!order.awbCode && !order.shipmentId ? (
                                    <div className="flex items-center gap-2 text-sm text-[#86868b]">
                                        <AlertCircle size={16} />
                                        No waybill assigned yet. Delhivery shipment may still be processing.
                                    </div>
                                ) : trackLoading ? (
                                    <div className="space-y-3">
                                        {[1,2,3].map(i => <div key={i} className="skeleton h-10 rounded-xl" />)}
                                    </div>
                                ) : tracking ? (
                                    <>
                                        {/* Status summary */}
                                        <div className="flex items-start gap-4 p-4 rounded-xl bg-[#f5f5f7] border border-black/[0.04] mb-5">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                tracking.status === "Delivered" ? "bg-green-100" :
                                                ["Dispatched","In Transit"].includes(tracking.status) ? "bg-blue-100" :
                                                "bg-gray-100"
                                            }`}>
                                                {tracking.status === "Delivered"
                                                    ? <CheckCircle2 size={20} className="text-green-600" />
                                                    : <Truck size={20} className="text-blue-600" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-[#1d1d1f]">{tracking.status}</p>
                                                {tracking.statusInstructions && (
                                                    <p className="text-sm text-[#6e6e73]">{tracking.statusInstructions}</p>
                                                )}
                                                {tracking.statusLocation && (
                                                    <p className="text-xs text-[#86868b] mt-0.5 flex items-center gap-1">
                                                        <MapPin size={11} /> {tracking.statusLocation}
                                                    </p>
                                                )}
                                                {tracking.expectedDelivery && tracking.status !== "Delivered" && (
                                                    <p className="text-xs text-[#6e6e73] mt-1.5 flex items-center gap-1">
                                                        <Clock size={11} />
                                                        Expected by {new Date(tracking.expectedDelivery).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
                                                    </p>
                                                )}
                                                {tracking.deliveredDate && tracking.status === "Delivered" && (
                                                    <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1 font-medium">
                                                        <CheckCircle2 size={11} />
                                                        Delivered on {new Date(tracking.deliveredDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                <button onClick={fetchTracking} disabled={trackLoading}
                                                    className="flex items-center gap-1 text-xs text-[#007aff] hover:opacity-70 transition-opacity">
                                                    <RefreshCw size={11} className={trackLoading ? "animate-spin" : ""} /> Refresh
                                                </button>
                                                {tracking.trackingUrl && (
                                                    <a href={tracking.trackingUrl} target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-xs text-[#007aff] hover:opacity-70 transition-opacity">
                                                        Track <ExternalLink size={10} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-xs font-semibold text-[#6e6e73] uppercase tracking-wider">Scan history</p>
                                            <p className="text-xs font-mono text-[#86868b]">AWB: {tracking.waybill}</p>
                                        </div>

                                        {/* Timeline */}
                                        {tracking.scans?.length > 0 ? (
                                            <div className="relative">
                                                <div className="absolute left-[11px] top-5 bottom-5 w-px bg-[#e8e8ed]" />
                                                <ul className="space-y-0">
                                                    {tracking.scans.map((scan, i) => (
                                                        <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
                                                            <div className={`relative z-10 w-6 h-6 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${
                                                                i === 0 ? "bg-[#1d1d1f]" : "bg-white border border-[#e8e8ed]"
                                                            }`}>
                                                                {i === 0
                                                                    ? <div className="w-2 h-2 rounded-full bg-white" />
                                                                    : <div className="w-1.5 h-1.5 rounded-full bg-[#c7c7cc]" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-semibold ${i === 0 ? "text-[#1d1d1f]" : "text-[#6e6e73]"}`}>
                                                                    {scan.status}
                                                                </p>
                                                                <p className="text-xs text-[#86868b] mt-0.5">{scan.instructions}</p>
                                                                {scan.location && (
                                                                    <p className="text-xs text-[#86868b] flex items-center gap-1 mt-0.5">
                                                                        <MapPin size={10} /> {scan.location}
                                                                    </p>
                                                                )}
                                                                <p className="text-[11px] text-[#c7c7cc] mt-1">{formatDateTime(scan.dateTime)}</p>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-[#86868b]">No scan history yet.</p>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex items-center gap-2 text-sm text-[#86868b]">
                                        <AlertCircle size={16} /> Could not fetch tracking info.
                                        <button onClick={fetchTracking} className="text-[#007aff] text-xs underline">Retry</button>
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                </div>
            </Layout>
        </>
    );
}
