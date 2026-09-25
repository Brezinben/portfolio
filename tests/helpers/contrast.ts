// Le contraste d'un contour de focus contre le fond qu'il borde, pour chaque sélecteur. La
// fonction part dans la page par « page.evaluate » : elle ne lit rien hors d'elle-même.
// Un élément absent rend « NaN », et le test qui le compare à 3 tombe.
export const ringRatios = (selectors: string[]) => {
  const probe = document.createElement("i"),
    rgb = (color: string) => {
      probe.style.color = color;

      return (getComputedStyle(probe).color.match(/[\d.]+/gu) ?? []).slice(0, 3).map(Number);
    },
    luminance = (color: string) => {
      const [red = 0, green = 0, blue = 0] = rgb(color).map((channel) => {
        const unit = channel / 255;

        return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
      });

      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    },
    ratio = (one: string, two: string) => {
      const [light, dark] = [luminance(one), luminance(two)].toSorted((a, b) => {
        return b - a;
      });

      return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
    };

  // Les variables de thème vivent sur « .tm » dans la version terminal, sur la racine ailleurs.
  (document.querySelector(".tm") ?? document.body).append(probe);

  const panel = getComputedStyle(probe).getPropertyValue("--panel"),
    ground = getComputedStyle(probe).getPropertyValue("--bg");

  return selectors.map((selector) => {
    const node = document.querySelector<HTMLElement>(selector);

    if (!node) {
      return `${selector} NaN`;
    }

    node.focus();

    const ring = getComputedStyle(node).outlineColor;

    return `${selector} ${Math.min(ratio(ring, panel), ratio(ring, ground)).toFixed(2)}`;
  });
};
