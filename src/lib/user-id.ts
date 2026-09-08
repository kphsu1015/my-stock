/**
 * 匿名使用者識別碼：存在 localStorage，用來區分不同瀏覽器的追蹤清單。
 * （與其他專案一致：不做登入，userId 放 localStorage）
 */
const KEY = "my-stock:userId";

export function getUserId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `u_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}
