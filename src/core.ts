export interface Vector {
  x: number;
  y: number;
}

export interface Circle extends Vector {
  radius: number;
}

export const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export const distance = (a: Vector, b: Vector): number => Math.hypot(a.x - b.x, a.y - b.y);

export const circlesOverlap = (a: Circle, b: Circle): boolean => distance(a, b) < a.radius + b.radius;

export const normalize = (vector: Vector): Vector => {
  const length = Math.hypot(vector.x, vector.y);
  return length === 0 ? { x: 0, y: 0 } : { x: vector.x / length, y: vector.y / length };
};

export const formatTime = (seconds: number): string => {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
};

export const formatScore = (score: number): string => String(Math.max(0, Math.round(score))).padStart(4, "0");

export const streakMultiplier = (deliveriesWithoutDamage: number): number =>
  clamp(1 + Math.floor(deliveriesWithoutDamage / 2), 1, 5);

export const generatePartyCode = (random: () => number = Math.random): string => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => alphabet[Math.floor(random() * alphabet.length)] ?? "A").join("");
};

export const deliveryScore = (cargo: number, streak: number): number =>
  Math.max(0, cargo) * 100 * streakMultiplier(streak);
