"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.credentialLink = credentialLink;
exports.rememberCredential = rememberCredential;
exports.observeCredential = observeCredential;
exports.takeCredential = takeCredential;
function credentialLink(path, host) {
    try {
        const relative = path.startsWith("/") && !path.startsWith("//");
        const url = new URL(path, "https://local.invalid");
        if (!relative && (url.protocol !== "https:" || url.host !== host || url.username || url.password))
            return null;
        const route = url.pathname.replace(/\/$/, "");
        if (route !== "/ativar" && route !== "/recuperar")
            return null;
        const candidates = new URLSearchParams(url.hash.slice(1)).getAll("token");
        const token = candidates.length === 1 && /^[A-Za-z0-9_-]{20,256}$/.test(candidates[0]) ? candidates[0] : null;
        return { route, token };
    }
    catch {
        return null;
    }
}
const pending = new Map();
const listeners = new Map();
function rememberCredential(route, token) { pending.set(route, token); listeners.get(route)?.(); }
function observeCredential(route, listener) {
    listeners.set(route, listener);
    return () => { if (listeners.get(route) === listener)
        listeners.delete(route); };
}
function takeCredential(route) { const token = pending.get(route) ?? null; pending.delete(route); return token; }
