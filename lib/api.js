/**
 * Dashboard API client. All requests go directly to the backend (no localhost proxy).
 * Set NEXT_PUBLIC_API_URL in .env.local to override (e.g. for a different backend).
 * Aligned with hustle routes.md:
 * §1 Auth, §2 Products, §3 Categories, §4 Cart, §5 Wishlist, §6 Reviews, §7 Orders,
 * §8 Admin (FAQ, orders, etc.), §9 Upload, §10 Offers (+ content endpoints for homepage/pages).
 */
const getApiBase = () => (process.env.NEXT_PUBLIC_API_URL || "https://server.huslelifestyle.com/api").replace(/\/$/, "");
const BASE_URL = getApiBase();

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
        const err = new Error("Unauthorized");
        err.status = 401;
        throw err;
    }

    // Handle empty body responses (e.g. 204 No Content from DELETE)
    const text = await res.text();
    let data = {};
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            // Backend may return HTML (e.g. 502) or plain text
            if (!res.ok) {
                const err = new Error(`${res.status} ${res.statusText}: ${text.slice(0, 100)}`);
                err.status = res.status;
                throw err;
            }
            throw new Error("Invalid JSON response");
        }
    }
    if (!res.ok) {
        const message = data.message || data.error || data.msg || data.err || (data.errors && String(data.errors)) || `${res.status} ${res.statusText}`;
        const err = new Error(message);
        err.status = res.status;
        throw err;
    }
    return data;
}

// Auth — /api/auth
export const register = (username, email, password) =>
    request("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
    });
export const login = (email, password) =>
    request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });

// Upload — do not set Content-Type so browser sets multipart/form-data with boundary
function handleUploadResponse(res) {
    if (res.status === 401) {
        if (typeof window !== "undefined") {
            localStorage.removeItem("hustle_admin_token");
            localStorage.removeItem("hustle_admin_user");
            window.location.href = "/login";
        }
        throw new Error("Unauthorized");
    }
    return res.text().then((text) => {
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch { /* ignore */ }
        if (!res.ok) {
            const msg = data.message || data.error || data.msg || (data.errors && String(data.errors)) || `Upload failed (${res.status})`;
            const err = new Error(msg);
            err.status = res.status;
            throw err;
        }
        return data;
    });
}

export const uploadImage = async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });
    const data = await handleUploadResponse(res);
    const url = data.url || data.secure_url || data.fileUrl || "";
    return { url, ...data };
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
    const data = await handleUploadResponse(res);
    const urls = Array.isArray(data.urls) ? data.urls : (data.images || (data.url ? [data.url] : []));
    return { urls, ...data };
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
        const err = new Error(
            data.message || `Upload failed (HTTP ${res.status})`
        );
        err.status = res.status;
        throw err;
    }

    // Normalise: backend may return { url } or { secure_url } or { fileUrl }
    return {
        url: data.url || data.secure_url || data.fileUrl || "",
        ...data,
    };
};

// Products — /api/products (hustle routes: GET / GET /shop GET /:id POST PUT /:id DELETE /:id)
// Query: page, limit, search, categoryId, minPrice, maxPrice. Create/Update body: name, description, price, slashedPrice, categoryId, shippingInfo, returnInfo, tags, images, variants[]
export const getProducts = (params = {}) => {
    const { page, limit, search, categoryId, minPrice, maxPrice } = params;
    const q = new URLSearchParams();
    if (page != null) q.set("page", String(page));
    if (limit != null) q.set("limit", String(limit));
    if (search != null && search !== "") q.set("search", search);
    if (categoryId != null && categoryId !== "") q.set("categoryId", String(categoryId));
    if (minPrice != null && minPrice !== "") q.set("minPrice", String(minPrice));
    if (maxPrice != null && maxPrice !== "") q.set("maxPrice", String(maxPrice));
    const query = q.toString();
    return request(`/products${query ? "?" + query : ""}`);
};
export const getShopProducts = () => request("/products/shop");
export const getProduct = (id) => request(`/products/${id}`);
export const createProduct = (body) =>
    request("/products", { method: "POST", body: JSON.stringify(body) });
export const updateProduct = (id, body) =>
    request(`/products/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const deleteProduct = (id) =>
    request(`/products/${id}`, { method: "DELETE" });

// Categories — /api/categories (hustle routes: GET / POST / DELETE /:id). Body: name, description?, image?, parentId?
export const getCategories = () => request("/categories");
export const createCategory = (body) =>
    request("/categories", { method: "POST", body: JSON.stringify(body) });
export const deleteCategory = (id) =>
    request(`/categories/${id}`, { method: "DELETE" });

// Cart — /api/cart (hustle routes §4). add: productId, variantId?, quantity
export const getCart = () => request("/cart");
export const addToCart = (body) =>
    request("/cart/add", { method: "POST", body: JSON.stringify(body) });
export const removeFromCart = (id) =>
    request(`/cart/remove/${id}`, { method: "DELETE" });

// Wishlist — /api/wishlist (hustle routes §5). add: productId
export const getWishlist = () => request("/wishlist");
export const addToWishlist = (productId) =>
    request("/wishlist/add", { method: "POST", body: JSON.stringify({ productId }) });
export const removeFromWishlist = (id) =>
    request(`/wishlist/${id}`, { method: "DELETE" });

// Reviews — /api/reviews (hustle routes §6). POST: productId, rating, comment, images?
export const getReviews = (productId) =>
    request(`/reviews/${productId}`);
export const createReview = (body) =>
    request("/reviews", { method: "POST", body: JSON.stringify(body) });

// Orders — /api/orders (hustle routes §7)
export const createOrder = (body) =>
    request("/orders/create-order", { method: "POST", body: JSON.stringify(body) });
export const verifyPayment = (body) =>
    request("/orders/verify-payment", { method: "POST", body: JSON.stringify(body) });
export const getMyOrders = () => request("/orders/mine");
export const getOrder = (id) => request(`/orders/${id}`);
export const getOrderTrack = (id) => request(`/orders/track/${id}`);
export const recordOfflineOrder = (body) =>
    request("/orders/offline", { method: "POST", body: JSON.stringify(body) });

// Admin orders — /api/admin/orders and /api/orders/ship (see hustle routes)
export const getOrders = (params = {}) => {
    const { status, page, limit } = params;
    const q = new URLSearchParams();
    if (status != null && status !== "") q.set("status", status);
    if (page != null) q.set("page", String(page));
    if (limit != null) q.set("limit", String(limit));
    const query = q.toString();
    return request(`/admin/orders${query ? "?" + query : ""}`);
};
export const updateOrderStatus = (id, status) =>
    request(`/admin/orders/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
    });
export const shipOrder = (orderId) =>
    request("/orders/ship", { method: "POST", body: JSON.stringify({ orderId }) });

// Admin — /api/admin (hustle routes §8). FAQ: question, answer, category?
export const getFaqs = () => request("/admin/faq");
export const createFaq = (body) =>
    request("/admin/faq", { method: "POST", body: JSON.stringify(body) });
export const deleteFaq = (id) =>
    request(`/admin/faq/${id}`, { method: "DELETE" });

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

// Support page — Section 11: GET/PUT /admin/support
export const getSupportPage = () => request("/admin/support");
export const updateSupportPage = (body) =>
    request("/admin/support", { method: "PUT", body: JSON.stringify(body) });

export const getNavigation = () => request("/admin/navigation");
export const updateNavigation = (body) =>
    request("/admin/navigation", { method: "PUT", body: JSON.stringify(body) });

export const getSearchConfig = () => request("/admin/search-config");
export const updateSearchConfig = (body) =>
    request("/admin/search-config", { method: "PUT", body: JSON.stringify(body) });
