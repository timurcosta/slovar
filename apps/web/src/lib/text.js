// Текст: склонение числительных.

export const plural = (n, f) => {
  const a = Math.abs(n) % 100,
    b = a % 10;
  return f[a > 10 && a < 20 ? 2 : b === 1 ? 0 : b >= 2 && b <= 4 ? 1 : 2];
};
