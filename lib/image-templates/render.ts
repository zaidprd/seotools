import { DEFAULT_IMAGE_ACCENT } from "./presets";
import { escapeXml, normalizeText, wrapTitle } from "./text";
import {
  IMAGE_TEMPLATE_HEIGHT,
  IMAGE_TEMPLATE_IDS,
  IMAGE_TEMPLATE_WIDTH,
  type ImageTemplateId,
  type ImageTemplateInput,
  type RenderedImageTemplate,
} from "./types";

const FONT = "Segoe UI,Arial,sans-serif";

function safeColor(value: string, fallback: string): string {
  return /^#[0-9a-f]{3,8}$/i.test(value) ? value : fallback;
}

function titleMarkup(
  title: string,
  x: number,
  y: number,
  options: { size?: number; lineHeight?: number; fill?: string; maxCharacters?: number; maxLines?: number; width?: number } = {},
): string {
  const { size = 58, lineHeight = 66, fill = "#f8fafc", maxCharacters = 25, maxLines = 3, width = 800 } = options;
  const lines = wrapTitle(title, maxCharacters, maxLines);
  const longestLine = Math.max(...lines.map(line => line.length), 1);
  const fittedSize = Math.max(38, Math.min(size, Math.floor(width / (longestLine * 0.56))));
  const fittedLineHeight = Math.min(lineHeight, Math.round(fittedSize * 1.13));
  return lines.map((line, index) =>
    `<text x="${x}" y="${y + index * fittedLineHeight}" fill="${fill}" font-family="${FONT}" font-size="${fittedSize}" font-weight="800" letter-spacing="-1.6">${escapeXml(line)}</text>`,
  ).join("");
}


function renderBody(input: ImageTemplateInput): string {
  const requestedPalette = input.accent ?? DEFAULT_IMAGE_ACCENT;
  const palette = {
    primary: safeColor(requestedPalette.primary, DEFAULT_IMAGE_ACCENT.primary),
    secondary: safeColor(requestedPalette.secondary, DEFAULT_IMAGE_ACCENT.secondary),
  };

  const title = normalizeText(input.title, "Buat sesuatu yang layak ditemukan");

  switch (input.presetId) {
    case "faceless-editorial":
      return `<defs><filter id="edShadow"><feDropShadow dx="0" dy="14" stdDeviation="12" flood-color="#0c1830" flood-opacity=".2"/></filter><pattern id="edDots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="2" fill="#13213c" opacity=".16"/></pattern></defs>
        <rect width="1200" height="630" fill="#fffaf2"/><rect width="1200" height="630" fill="url(#edDots)"/><path d="M0 0h1200v62H0z" fill="#101d38"/><circle cx="46" cy="31" r="7" fill="#ff6b35"/><circle cx="70" cy="31" r="7" fill="#ffd166"/>
        <path d="M760 62h440v568H664c98-99 83-206 54-302-27-90-27-180 42-266z" fill="#ff6b35"/><circle cx="1082" cy="500" r="150" fill="${palette.primary}" opacity=".35"/>
        <g filter="url(#edShadow)"><rect x="716" y="118" width="372" height="236" rx="18" fill="#fff" stroke="#13213c" stroke-width="4"/><rect x="716" y="118" width="372" height="42" rx="18" fill="#13213c"/><path d="M716 143h372" stroke="#13213c" stroke-width="34"/><circle cx="743" cy="139" r="6" fill="#ff6b35"/><circle cx="764" cy="139" r="6" fill="#ffd166"/><rect x="753" y="195" width="178" height="14" rx="7" fill="#dce3ed"/><rect x="753" y="228" width="278" height="12" rx="6" fill="#edf0f5"/><rect x="753" y="258" width="222" height="12" rx="6" fill="#edf0f5"/><rect x="753" y="296" width="98" height="28" rx="7" fill="${palette.primary}"/></g>
        <g transform="rotate(-8 1002 405)" filter="url(#edShadow)"><rect x="878" y="358" width="230" height="136" rx="14" fill="#ffd166" stroke="#13213c" stroke-width="4"/><path d="M891 375l102 76 102-76" fill="none" stroke="#13213c" stroke-width="4"/></g><path d="M827 397l42 15-21 9-9 22z" fill="#fff" stroke="#13213c" stroke-width="4"/>
        ${titleMarkup(title, 74, 184, { size: 61, lineHeight: 68, fill: "#101d38", maxCharacters: 22, width: 590 })}<rect x="74" y="511" width="130" height="8" rx="4" fill="${palette.primary}"/>`;

    case "data-dashboard":
      return `<defs><filter id="dashShadow"><feDropShadow dx="0" dy="8" stdDeviation="18" flood-color="#314158" flood-opacity=".13"/></filter><linearGradient id="dashLine" x1="0" x2="1"><stop stop-color="${palette.primary}"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs>
        <rect width="1200" height="630" fill="#f3f5f8"/><rect x="46" y="38" width="1108" height="554" rx="22" fill="#fff" filter="url(#dashShadow)"/><rect x="46" y="38" width="222" height="554" rx="22" fill="#182235"/><path d="M268 38v554" stroke="#e5e9ef"/>
        <rect x="82" y="78" width="42" height="42" rx="10" fill="${palette.primary}"/><path d="M94 106l8-14 9 9 7-13" fill="none" stroke="#fff" stroke-width="4"/><rect x="82" y="164" width="150" height="38" rx="9" fill="#26334a"/><rect x="98" y="178" width="18" height="10" rx="3" fill="#a3e635"/><rect x="128" y="177" width="72" height="12" rx="6" fill="#6d7890"/><g fill="#3f4b61"><rect x="98" y="236" width="102" height="10" rx="5"/><rect x="98" y="282" width="76" height="10" rx="5"/><rect x="98" y="328" width="118" height="10" rx="5"/></g>
        ${titleMarkup(title, 310, 116, { size: 43, lineHeight: 49, fill: "#182235", maxCharacters: 33, maxLines: 2, width: 780 })}
        <g transform="translate(310 254)"><rect width="800" height="288" rx="16" fill="#fbfcfe" stroke="#e3e7ed"/><g fill="none" stroke="#e8ebf0"><path d="M62 70v165h690"/><path d="M62 111h690M62 153h690M62 194h690" stroke-dasharray="5 7"/></g><g><rect x="100" y="172" width="34" height="63" rx="5" fill="#d8b4fe"/><rect x="148" y="132" width="34" height="103" rx="5" fill="${palette.primary}" opacity=".75"/><rect x="246" y="154" width="34" height="81" rx="5" fill="#bef264"/><rect x="294" y="105" width="34" height="130" rx="5" fill="#d8b4fe"/><rect x="392" y="126" width="34" height="109" rx="5" fill="${palette.secondary}"/><rect x="440" y="82" width="34" height="153" rx="5" fill="#bef264"/></g><path d="M80 187C160 170 194 105 266 140s122 29 178-25 117-35 151-10 82-30 139-45" fill="none" stroke="url(#dashLine)" stroke-width="7" stroke-linecap="round"/><g fill="#fff" stroke="${palette.primary}" stroke-width="4"><circle cx="266" cy="140" r="7"/><circle cx="444" cy="115" r="7"/><circle cx="595" cy="105" r="7"/></g><rect x="596" y="36" width="142" height="52" rx="9" fill="#182235"/><rect x="623" y="59" width="88" height="7" rx="3.5" fill="#fff" opacity=".85"/></g>`;

    case "technical-blueprint":
      return `<defs><pattern id="techGrid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#ffec70" stroke-opacity=".19" stroke-width="1"/></pattern><pattern id="techFine" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M8 0H0V8" fill="none" stroke="#fff" stroke-opacity=".07"/></pattern></defs>
        <rect width="1200" height="630" fill="#e94f1d"/><rect width="1200" height="630" fill="url(#techGrid)"/><rect width="1200" height="630" fill="url(#techFine)"/><path d="M38 74h8m16 0h8m16 0h8m16 0h8m16 0h8m16 0h8m16 0h8m16 0h8m16 0h8m16 0h8m16 0h8m16 0h8m16 0h8m16 0h8m16 0h8m16 0h8" stroke="#fff7ba" stroke-width="4"/>
        <g transform="translate(875 310)" fill="none" stroke="#ffed74"><circle r="135" stroke-width="28" stroke-dasharray="44 18"/><circle r="82" stroke-width="5"/><circle r="31" stroke-width="15"/><path d="M-190 0h110M80 0h215M0-190v108M0 82v226" stroke-width="4"/><circle cx="220" cy="0" r="10" fill="#ffed74"/><circle cy="238" r="10" fill="#ffed74"/></g>
        <g fill="none" stroke="#ffed74" stroke-width="4"><path d="M730 120h86v54h-40v50M1048 146h80v132h-74M714 490h96v-60h54"/><circle cx="730" cy="120" r="8" fill="#ffed74"/><circle cx="1128" cy="278" r="8" fill="#ffed74"/><path d="M82 475h482v82H82zM99 493h112v46H99zM232 493h315"/><path d="M232 516h254" stroke-dasharray="10 10"/></g>
        ${titleMarkup(title, 72, 184, { size: 59, lineHeight: 66, fill: "#fff", maxCharacters: 21, width: 600 })}`;

    case "tutorial-cards":
      return `<defs><filter id="cardShadow"><feDropShadow dx="8" dy="10" stdDeviation="0" flood-color="#17214a" flood-opacity="1"/></filter><pattern id="tutDots" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="2" fill="#17214a" opacity=".12"/></pattern></defs>
        <rect width="1200" height="630" fill="#ffd83d"/><rect width="1200" height="630" fill="url(#tutDots)"/><path d="M0 0h510l-94 630H0z" fill="#e72b78"/>${titleMarkup(title, 64, 142, { size: 55, lineHeight: 62, fill: "#fff", maxCharacters: 19, width: 395 })}<rect x="64" y="492" width="254" height="12" rx="6" fill="#17214a"/>
        <g filter="url(#cardShadow)"><rect x="520" y="82" width="256" height="190" rx="14" fill="#fff" stroke="#17214a" stroke-width="4"/><circle cx="558" cy="119" r="23" fill="#e72b78"/><text x="558" y="127" text-anchor="middle" fill="#fff" font-family="${FONT}" font-size="22" font-weight="900">1</text><rect x="600" y="104" width="136" height="15" rx="7" fill="#17214a"/><rect x="552" y="157" width="184" height="11" rx="5" fill="#d9ddea"/><rect x="552" y="184" width="140" height="11" rx="5" fill="#d9ddea"/><rect x="552" y="218" width="42" height="30" rx="6" fill="#ffd83d"/><path d="M563 233l8 8 15-18" fill="none" stroke="#17214a" stroke-width="5"/></g>
        <path d="M790 181h72l-20-20m20 20-20 20" fill="none" stroke="#17214a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
        <g filter="url(#cardShadow)"><rect x="882" y="82" width="256" height="190" rx="14" fill="#fff" stroke="#17214a" stroke-width="4"/><circle cx="920" cy="119" r="23" fill="${palette.primary}"/><text x="920" y="127" text-anchor="middle" fill="#17214a" font-family="${FONT}" font-size="22" font-weight="900">2</text><rect x="962" y="104" width="136" height="15" rx="7" fill="#17214a"/><rect x="914" y="153" width="190" height="72" rx="7" fill="#f1f3f8"/><path d="M940 203l34-31 28 20 40-37 37 48" fill="none" stroke="#e72b78" stroke-width="6"/></g>
        <g filter="url(#cardShadow)"><rect x="700" y="351" width="306" height="192" rx="14" fill="#fff" stroke="#17214a" stroke-width="4"/><circle cx="740" cy="390" r="23" fill="#17214a"/><text x="740" y="398" text-anchor="middle" fill="#ffd83d" font-family="${FONT}" font-size="22" font-weight="900">3</text><rect x="782" y="376" width="177" height="15" rx="7" fill="#17214a"/><g fill="none" stroke="#e72b78" stroke-width="4"><rect x="733" y="433" width="20" height="20" rx="3"/><path d="M738 442l6 6 12-17"/><rect x="733" y="473" width="20" height="20" rx="3"/></g><rect x="774" y="438" width="174" height="10" rx="5" fill="#d9ddea"/><rect x="774" y="478" width="130" height="10" rx="5" fill="#d9ddea"/></g>`;

    case "islamic-geometric":
      return `<defs><pattern id="islamicGrid" width="96" height="96" patternUnits="userSpaceOnUse"><path d="M48 4l13 31 31 13-31 13-13 31-13-31L4 48l31-13z" fill="none" stroke="#d7bd78" stroke-opacity=".18"/><circle cx="48" cy="48" r="25" fill="none" stroke="#d7bd78" stroke-opacity=".1"/></pattern><linearGradient id="green" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0b493d"/><stop offset="1" stop-color="#062c28"/></linearGradient></defs>
        <rect width="1200" height="630" fill="url(#green)"/><rect width="1200" height="630" fill="url(#islamicGrid)"/><path d="M0 565h1200v65H0z" fill="#d7bd78"/><path d="M0 583h1200" stroke="#fff4d3" stroke-width="3" opacity=".65"/>
        <path d="M825 630V265c0-139 90-213 187-213s187 74 187 213v365z" fill="#f8f0d9"/><path d="M868 630V276c0-103 64-169 144-169s144 66 144 169v354" fill="none" stroke="#d7bd78" stroke-width="8"/><path d="M1012 115l17 40 40 17-40 17-17 40-17-40-40-17 40-17z" fill="#d7bd78"/><g fill="none" stroke="#0b493d" stroke-width="4" opacity=".8"><path d="M912 370l50-50 50 50 50-50 50 50-50 50 50 50-50 50-50-50-50 50-50-50 50-50z"/><circle cx="1012" cy="420" r="72"/></g>
        <path d="M78 126h126" stroke="#d7bd78" stroke-width="5"/>${titleMarkup(title, 78, 195, { size: 61, lineHeight: 68, fill: "#fff8e7", maxCharacters: 22, width: 650 })}`;

    case "minimal-object":
      return `<defs><filter id="objShadow"><feDropShadow dx="0" dy="24" stdDeviation="18" flood-color="#5f4c35" flood-opacity=".18"/></filter><linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#faf7ef"/><stop offset="1" stop-color="#ebe2d4"/></linearGradient></defs>
        <rect width="1200" height="630" fill="#ded3c3"/><path d="M0 0h1200v630H0z" fill="#fff" opacity=".2"/><circle cx="1060" cy="60" r="235" fill="${palette.primary}" opacity=".12"/>
        <g transform="translate(690 74) rotate(3 220 220)" filter="url(#objShadow)"><rect x="0" y="0" width="420" height="474" rx="13" fill="url(#paper)"/><path d="M48 71h162" stroke="#1e2b32" stroke-width="15"/><path d="M48 111h278M48 139h238M48 167h292" stroke="#b8afa2" stroke-width="8"/><rect x="48" y="225" width="142" height="154" rx="5" fill="${palette.primary}" opacity=".82"/><path d="M221 245h142M221 274h110M221 303h134M221 348h89" stroke="#9f978b" stroke-width="8"/></g>
        <g filter="url(#objShadow)"><path d="M548 384h315l-31 126H517z" fill="#28343a"/><rect x="568" y="208" width="275" height="184" rx="10" fill="#192329"/><rect x="584" y="224" width="243" height="151" fill="#c6d0cc"/><path d="M659 510h42" stroke="#fff" stroke-opacity=".35" stroke-width="6"/></g><g transform="rotate(-20 955 499)" filter="url(#objShadow)"><rect x="806" y="486" width="300" height="25" rx="12" fill="#a47943"/><path d="M1082 486l45 13-45 12z" fill="#263238"/></g><rect x="1000" y="414" width="84" height="84" rx="8" fill="#b8a78f" transform="rotate(12 1042 456)" filter="url(#objShadow)"/>
        ${titleMarkup(title, 70, 157, { size: 58, lineHeight: 65, fill: "#1e2b32", maxCharacters: 20, width: 500 })}<path d="M70 469h330" stroke="#a99a86" stroke-width="2"/>`;
  }
}

export function isImageTemplateId(value: string): value is ImageTemplateId {
  return (IMAGE_TEMPLATE_IDS as readonly string[]).includes(value);
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function renderImageTemplate(input: ImageTemplateInput): RenderedImageTemplate {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${IMAGE_TEMPLATE_WIDTH}" height="${IMAGE_TEMPLATE_HEIGHT}" viewBox="0 0 ${IMAGE_TEMPLATE_WIDTH} ${IMAGE_TEMPLATE_HEIGHT}" role="img" aria-label="${escapeXml(normalizeText(input.title, "Pratinjau gambar"))}">${renderBody(input)}</svg>`;
  return {
    presetId: input.presetId,
    width: IMAGE_TEMPLATE_WIDTH,
    height: IMAGE_TEMPLATE_HEIGHT,
    svg,
    dataUrl: svgToDataUrl(svg),
  };
}
