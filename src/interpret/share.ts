// Le partage : les cibles declarees par le contenu, et le durcissement de leurs URL.

// La cible de partage declaree dans le contenu.
export interface ShareTarget {
  id: string;
  kind: string;
  label: string;
  url: string;
}

export interface Share {
  targets?: ShareTarget[];
  text?: string;
  title?: string;
  url?: string;
}

// Les jetons sont substitues dans les URL de partage declarees par content.json : une
// nouvelle cible s'ajoute sans toucher au code.
export const fillTokens = (template: string, share: Share): string =>
  template
    .replaceAll("{url}", encodeURIComponent(share.url ?? ""))
    .replaceAll("{title}", encodeURIComponent(share.title ?? ""))
    .replaceAll("{text}", encodeURIComponent(share.text ?? ""));

const SAFE_SCHEMES = new Set(["https:", "http:", "mailto:"]);

// Une cible déclarée dans le contenu ne doit pas pouvoir exécuter de script. Sans ce
// contrôle, une URL en javascript: passée à open() s'exécute dans notre origine.
export const isSafeUrl = (candidate: string): boolean => {
  try {
    return SAFE_SCHEMES.has(new URL(candidate, "https://portfolio.invalid/").protocol);
  } catch {
    return false;
  }
};

export const shareTarget = (id: string, share: Share) => {
  const target = (share.targets ?? []).find((entry) => entry.id === id);

  if (!target) {
    return undefined;
  }

  const url = fillTokens(target.url ?? "", share);

  if (!isSafeUrl(url)) {
    return undefined;
  }

  return { id: target.id, kind: target.kind, label: target.label, url };
};
