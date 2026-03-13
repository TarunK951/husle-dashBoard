import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { getOrders, getOrder, updateOrderStatus, shipOrder } from "@/lib/api";
import { ChevronLeft, ChevronRight, Truck, X, Package } from "lucide-react";
import Head from "next/head";

const statusColors = {
    pending: "bg-amber-100 text-amber-700",
    processing: "bg-blue-100 text-blue-700",
    shipped: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
};

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount || 0);
}

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");
    const [detailOrder, setDetailOrder] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [updating, setUpdating] = useState(null);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const data = await getOrders({ page, limit: 10, status: statusFilter || undefined });
            setOrders(data.orders || data.data || []);
            if (data.totalPages) setTotalPages(data.totalPages);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [page, statusFilter]);

    const openDetail = async (order) => {
        setDetailOrder(null);
        setDetailLoading(true);
        try {
            const d = await getOrder(order.id);
            setDetailOrder(d);
        } catch (e) {
            console.error(e);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleStatusChange = async (orderId, newStatus) => {
        setUpdating(orderId);
        try {
            await updateOrderStatus(orderId, newStatus);
            fetchOrders();
            if (detailOrder?.id === orderId) setDetailOrder((o) => (o ? { ...o, status: newStatus } : o));
        } catch (e) {
            alert(e.message);
        } finally {
            setUpdating(null);
        }
    };

    const handleShip = async (orderId) => {
        setUpdating(orderId);
        try {
            await shipOrder(orderId);
            await handleStatusChange(orderId, "shipped");
        } catch (e) {
            alert(e.message);
        } finally {
            setUpdating(null);
        }
    };

    return (
        <>
            <Head><title>Orders — Hustle Admin</title></Head>
            <Layout>
                <div className="space-y-5 fade-in">
                    <div className="flex flex-wrap gap-3 items-center justify-between">
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="px-4 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]"
                        >
                            <option value="">All statuses</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="p-6 space-y-3">
                                {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="py-16 text-center text-[#6e6e73] text-sm">No orders found</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-black/5 bg-[#f5f5f7]/50">
                                            {["ORDER", "CUSTOMER", "AMOUNT", "STATUS", "DATE", "ACTIONS"].map((h) => (
                                                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#6e6e73]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map((order) => (
                                            <tr key={order.id} className="border-b border-black/5 hover:bg-[#f5f5f7]/50 transition-colors">
                                                <td className="px-5 py-3 font-mono text-xs text-[#6e6e73]">#{order.id}</td>
                                                <td className="px-5 py-3 font-medium text-[#1d1d1f]">
                                                    {order.user?.username || order.user?.email || "—"}
                                                </td>
                                                <td className="px-5 py-3 font-semibold text-[#1d1d1f]">
                                                    {formatCurrency(order.totalAmount ?? order.amount)}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[order.status] || "bg-gray-100 text-gray-600"}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-[#6e6e73] text-xs">
                                                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN") : "—"}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <button
                                                        onClick={() => openDetail(order)}
                                                        className="text-[#1d1d1f] font-medium text-xs hover:underline"
                                                    >
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-xl border border-black/10 hover:bg-[#1d1d1f] hover:text-white disabled:opacity-40 transition-all"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-sm text-[#6e6e73]">Page {page} of {totalPages}</span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 rounded-xl border border-black/10 hover:bg-[#1d1d1f] hover:text-white disabled:opacity-40 transition-all"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* Order detail modal */}
                    {(detailOrder !== null || detailLoading) && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => !detailLoading && setDetailOrder(null)}>
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto fade-in" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 sticky top-0 bg-white z-10 rounded-t-2xl">
                                    <h2 className="font-bold text-[#1d1d1f]">Order details</h2>
                                    <button onClick={() => setDetailOrder(null)} className="p-2 rounded-xl hover:bg-black/5 transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    {detailLoading ? (
                                        <div className="skeleton h-32 rounded-xl" />
                                    ) : detailOrder ? (
                                        <>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <span className="text-[#6e6e73]">Order ID</span>
                                                <span className="font-mono">#{detailOrder.id}</span>
                                                <span className="text-[#6e6e73]">Customer</span>
                                                <span>{detailOrder.user?.username || detailOrder.user?.email || "—"}</span>
                                                <span className="text-[#6e6e73]">Amount</span>
                                                <span className="font-semibold">{formatCurrency(detailOrder.totalAmount ?? detailOrder.amount)}</span>
                                                <span className="text-[#6e6e73]">Status</span>
                                                <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium w-fit ${statusColors[detailOrder.status] || "bg-gray-100 text-gray-600"}`}>
                                                    {detailOrder.status}
                                                </span>
                                                <span className="text-[#6e6e73]">Date</span>
                                                <span>{detailOrder.createdAt ? new Date(detailOrder.createdAt).toLocaleString("en-IN") : "—"}</span>
                                            </div>
                                            {detailOrder.shippingAddress && (
                                                <div>
                                                    <h3 className="text-xs font-semibold text-[#6e6e73] uppercase tracking-wider mb-1">Shipping address</h3>
                                                    <p className="text-sm text-[#1d1d1f]">
                                                        {[detailOrder.shippingAddress?.address, detailOrder.shippingAddress?.city, detailOrder.shippingAddress?.state, detailOrder.shippingAddress?.pincode].filter(Boolean).join(", ")}
                                                    </p>
                                                </div>
                                            )}
                                            {(detailOrder.items || detailOrder.orderItems || []).length > 0 && (
                                                <div>
                                                    <h3 className="text-xs font-semibold text-[#6e6e73] uppercase tracking-wider mb-2">Items</h3>
                                                    <ul className="space-y-1 text-sm">
                                                        {(detailOrder.items || detailOrder.orderItems || []).map((item, i) => (
                                                            <li key={i} className="flex items-center gap-2">
                                                                <Package size={14} className="text-[#6e6e73]" />
                                                                {item.product?.name || "Product"} × {item.quantity ?? 1}
                                                                {item.price != null && <span className="text-[#6e6e73] ml-auto">{formatCurrency(item.price * (item.quantity ?? 1))}</span>}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            <div className="flex flex-wrap gap-2 pt-4 border-t border-black/5">
                                                <select
                                                    value={detailOrder.status}
                                                    onChange={(e) => handleStatusChange(detailOrder.id, e.target.value)}
                                                    disabled={updating === detailOrder.id}
                                                    className="px-3 py-2 rounded-xl border border-black/10 bg-[#f5f5f7] text-sm"
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="processing">Processing</option>
                                                    <option value="shipped">Shipped</option>
                                                    <option value="delivered">Delivered</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                                {detailOrder.status !== "shipped" && detailOrder.status !== "delivered" && detailOrder.status !== "cancelled" && (
                                                    <button
                                                        onClick={() => handleShip(detailOrder.id)}
                                                        disabled={updating === detailOrder.id}
                                                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-100 text-purple-700 text-sm font-medium hover:bg-purple-200 disabled:opacity-50"
                                                    >
                                                        <Truck size={14} />
                                                        {updating === detailOrder.id ? "…" : "Mark shipped"}
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Layout>
        </>
    );
}
