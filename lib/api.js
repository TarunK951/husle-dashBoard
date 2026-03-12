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

    // Handle empty body responses (e.g. 204 No Content from DELETE)
    const text = await res.text();
    let data = {};
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            // Backend may return HTML (e.g. 502) or plain text
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 100)}`);
            throw new Error("Invalid JSON response");
        }
    }
    if (!res.ok) {
        const message = data.message || data.error || data.msg || data.err || (data.errors && String(data.errors)) || `${res.status} ${res.statusText}`;
        throw new Error(message);
    }
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

/**
 * upload3DModel — sends any 3D file (GLB, GLTF, OBJ, FBX, STL, DAE, USDZ, PLY…)
 * through our local Next.js proxy at /api/upload/model which forwards it to the
 * backend while spoofing the MIME type so the backend's Multer/Cloudinary instance
 * accepts it regardless of file extension.
 */
export const upload3DModel = async (file) => {
    const token = getToken();
    const formData = new FormData();
    // Append with the field name "file" — our local proxy reads this field
    formData.append("file", file, file.name);

    // Hit our LOCAL Next.js API route (not the rewritten /api proxy)
    // Next.js local routes always take priority over rewrites.
    const res = await fetch("/api/upload/model", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = {}; }

    if (!res.ok) {
        throw new Error(
            data.message || `Upload failed (HTTP ${res.status})`
        );
    }

    // Normalise: backend may return { url } or { secure_url } or { fileUrl }
    return {
        url: data.url || data.secure_url || data.fileUrl || "",
        ...data,
    };
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

// Homepage & page content
export const getHero = () => request("/admin/homepage/hero");
export const updateHero = (body) =>
    request("/admin/homepage/hero", { method: "PUT", body: JSON.stringify(body) });

export const getEssentials = () => request("/admin/homepage/essentials");
export const updateEssentials = (body) =>
    request("/admin/homepage/essentials", { method: "PUT", body: JSON.stringify(body) });

export const getHomepageContent = () => request("/admin/homepage/content");
export const updateHomepageContent = (body) =>
    request("/admin/homepage/content", { method: "PUT", body: JSON.stringify(body) });

export const getHomepageOffers = () => request("/admin/homepage/offers");
export const updateHomepageOffers = (body) =>
    request("/admin/homepage/offers", { method: "PUT", body: JSON.stringify(body) });

export const getDesignInspiration = () => request("/admin/homepage/design-inspiration");
export const updateDesignInspiration = (body) =>
    request("/admin/homepage/design-inspiration", { method: "PUT", body: JSON.stringify(body) });

export const getUnboxing = () => request("/admin/homepage/unboxing");
export const updateUnboxing = (body) =>
    request("/admin/homepage/unboxing", { method: "PUT", body: JSON.stringify(body) });

export const getTestimonials = () => request("/admin/homepage/testimonials");
export const updateTestimonials = (body) =>
    request("/admin/homepage/testimonials", { method: "PUT", body: JSON.stringify(body) });

export const getBlogPosts = () => request("/admin/blog");
export const createBlogPost = (body) =>
    request("/admin/blog", { method: "POST", body: JSON.stringify(body) });
export const updateBlogPost = (id, body) =>
    request(`/admin/blog/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const deleteBlogPost = (id) =>
    request(`/admin/blog/${id}`, { method: "DELETE" });

export const getAboutPage = () => request("/admin/page/about");
export const updateAboutPage = (body) =>
    request("/admin/page/about", { method: "PUT", body: JSON.stringify(body) });

// Users
export const getUsers = () => request("/admin/users");
export const getUser = (id) => request(`/admin/users/${id}`);
export const getUserAnalytics = (id) =>
    request(`/admin/users/${id}/analytics`);
