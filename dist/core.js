export const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const circlesOverlap = (a, b) => distance(a, b) < a.radius + b.radius;
export const normalize = (vector) => {
    const length = Math.hypot(vector.x, vector.y);
    return length === 0 ? { x: 0, y: 0 } : { x: vector.x / length, y: vector.y / length };
};
export const formatTime = (seconds) => {
    const safeSeconds = Math.max(0, Math.ceil(seconds));
    return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
};
export const formatScore = (score) => String(Math.max(0, Math.round(score))).padStart(4, "0");
export const streakMultiplier = (deliveriesWithoutDamage) => clamp(1 + Math.floor(deliveriesWithoutDamage / 2), 1, 5);
export const generatePartyCode = (random = Math.random) => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 4 }, () => alphabet[Math.floor(random() * alphabet.length)] ?? "A").join("");
};
export const deliveryScore = (cargo, streak) => Math.max(0, cargo) * 100 * streakMultiplier(streak);
