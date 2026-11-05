import { invoke, isTauri } from "@tauri-apps/api/core";
export const nativeAuthStorage = {
  getItem: () => invoke<string | null>("auth_storage_get"),
  setItem: (key: string, value: string) => {
    void key;
    return invoke<void>("auth_storage_set", { value });
  },
  removeItem: () => invoke<void>("auth_storage_remove"),
};
export function openLink(
  e: React.MouseEvent<HTMLAnchorElement>,
  url: string,
  onError: (message: string) => void,
) {
  if (!isTauri()) return;
  e.preventDefault();
  void invoke("open_external", { url }).catch((error) =>
    onError(String(error)),
  );
}
