// Даты в виде ключей «ГГГГ-ММ-ДД» по местному времени.

const pad = (n) => String(n).padStart(2, "0");
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => dayKey(new Date());
export const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
};
