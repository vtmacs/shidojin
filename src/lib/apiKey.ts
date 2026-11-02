// Claude API のキーは、この端末のブラウザの中だけに保存する。
// サイト（GitHub Pages）には載せないので、他の人がサイトを開いてもキーは見えない。

const STORAGE_KEY = "linkside.anthropicApiKey";

export function loadApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveApiKey(key: string): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, key.trim());
    return true;
  } catch {
    return false;
  }
}

export function clearApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 保存できない環境では何もしない
  }
}
