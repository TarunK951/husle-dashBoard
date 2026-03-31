/**
 * Client-side helpers for staff dashboardPermissions.
 * Values: 'read' (view only), 'write' (edit), legacy true → write.
 */

export function normalizePermLevel(raw) {
    if (raw === true || raw === "write" || raw === "full" || raw === "edit") return "write";
    if (raw === "read" || raw === "view") return "read";
    return "none";
}

export function getDashboardUser() {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem("hustle_admin_user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/** Admin always true; staff needs write for mutations */
export function canWriteSection(user, sectionKey) {
    if (!user || user.role === "admin") return true;
    if (user.role !== "staff") return false;
    return normalizePermLevel(user.dashboardPermissions?.[sectionKey]) === "write";
}

/** For showing a section in the sidebar */
export function canSeeSection(user, sectionKey) {
    if (!user || user.role === "admin") return true;
    if (user.role !== "staff") return false;
    return normalizePermLevel(user.dashboardPermissions?.[sectionKey]) !== "none";
}
