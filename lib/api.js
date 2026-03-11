const BASE_URL = "/api";

function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("hustle_admin_token");
}

async function request(endpoint, options = {}) {
    const token = getToken();
    const { method = "GET", body, headers: extraHeaders, ...rest } = options;
    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extraHeaders,
    };

    const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...rest,
        method,
        headers,
        ...(body !== undefined ? { body } : {}),
    });

    if (res.status === 401) {
        localStorage.removeItem("hustle_admin_token");
        localStorage.removeItem("hustle_admin_user");
        window.location.href = "/login";
        throw new Error("Unauthorized");
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Something went wrong");
    return data;
}

// Auth
export const login = (email, password) =>
    request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });

// Upload
export const uploadImage = async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
};

export const uploadMultipleImages = async (files) => {
    const token = getToken();
    const formData = new FormData();
    files.forEach((f) => formData.append("images", f));
    const res = await fetch(`${BASE_URL}/upload/multiple`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
};

// Stats
export const getStats = () => request("/admin/stats");

// Products
export const getProducts = (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/products${q ? "?" + q : ""}`);
};
export const getProduct = (id) => request(`/products/${id}`);
export const createProduct = (body) =>
    request("/products", { method: "POST", body: JSON.stringify(body) });
export const updateProduct = (id, body) =>
    request(`/products/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const deleteProduct = (id) =>
    request(`/products/${id}`, { method: "DELETE" });

// Categories
export const getCategories = () => request("/categories");
export const createCategory = (body) =>
    request("/categories", { method: "POST", body: JSON.stringify(body) });
export const deleteCategory = (id) =>
    request(`/categories/${id}`, { method: "DELETE" });

// Orders
export const getOrders = (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/admin/orders${q ? "?" + q : ""}`);
};
export const updateOrderStatus = (id, status) =>
    request(`/admin/orders/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
    });
export const shipOrder = (orderId) =>
    request("/orders/ship", { method: "POST", body: JSON.stringify({ orderId }) });

// Banners
export const getBanners = (type = "main") =>
    request(`/admin/banner?type=${type}`);
export const createBanner = (body) =>
    request("/admin/banner", { method: "POST", body: JSON.stringify(body) });
export const deleteBanner = (id) =>
    request(`/admin/banner/${id}`, { method: "DELETE" });

// FAQs
export const getFaqs = () => request("/admin/faq");
export const createFaq = (body) =>
    request("/admin/faq", { method: "POST", body: JSON.stringify(body) });
export const deleteFaq = (id) =>
    request(`/admin/faq/${id}`, { method: "DELETE" });

// Offers
export const getOffers = () => request("/offers");
export const createOffer = (body) =>
    request("/offers", { method: "POST", body: JSON.stringify(body) });
export const deleteOffer = (id) =>
    request(`/offers/${id}`, { method: "DELETE" });

// Users
export const getUsers = () => request("/admin/users");
export const getUser = (id) => request(`/admin/users/${id}`);
export const getUserAnalytics = (id) =>
    request(`/admin/users/${id}/analytics`);
