/** Chuẩn hóa chuỗi để so khớp intent (không phụ thuộc dấu). */
export function normalizeVi(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}
