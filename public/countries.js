/* Tek ülke konfigürasyonu: { code, name, flag }. Sunucu ve istemci aynı listeyi kullanır (saf veri, DOM yok).
   flag: 'legacy' => game.js içindeki ayrıntılı çizim; aksi halde 192x128 tuvalde çizilen operasyon listesi. */

const H = (cols, ws) => ['h', cols, ws];
const V = (cols, ws) => ['v', cols, ws];
const alt = (a, b, n) => Array.from({ length: n }, (_, i) => (i % 2 ? b : a));
const zig = (col, x0, x1, n) => {
  const pts = [x0, 0];
  const step = 128 / n;
  for (let i = 0; i < n; i++) { pts.push(x1, i * step + step / 2); pts.push(x0, (i + 1) * step); }
  return ['poly', col, pts];
};

export const COUNTRIES = [
  // Avrupa
  { code: 'TR', name: 'Turkey', flag: 'legacy' },
  { code: 'DE', name: 'Germany', flag: 'legacy' },
  { code: 'FR', name: 'France', flag: 'legacy' },
  { code: 'GB', name: 'UK', flag: 'legacy' },
  { code: 'IT', name: 'Italy', flag: 'legacy' },
  { code: 'ES', name: 'Spain', flag: 'legacy' },
  { code: 'NL', name: 'Netherlands', flag: 'legacy' },
  { code: 'NO', name: 'Norway', flag: 'legacy' },
  { code: 'PT', name: 'Portugal', flag: [V(['#006600', '#ff0000'], [2, 3]), ['disc', '#ffd400', 77, 64, 21], ['disc', '#ff0000', 77, 64, 14], ['disc', '#fff', 77, 64, 8]] },
  { code: 'GR', name: 'Greece', flag: [H(alt('#0d5eaf', '#fff', 9)), ['rect', '#0d5eaf', 0, 0, 71, 71], ['rect', '#fff', 0, 29, 71, 13], ['rect', '#fff', 29, 0, 13, 71]] },
  { code: 'PL', name: 'Poland', flag: [H(['#fff', '#dc143c'])] },
  { code: 'SE', name: 'Sweden', flag: [['rect', '#006aa7', 0, 0, 192, 128], ['rect', '#fecc00', 56, 0, 24, 128], ['rect', '#fecc00', 0, 52, 192, 24]] },
  { code: 'FI', name: 'Finland', flag: [['rect', '#fff', 0, 0, 192, 128], ['rect', '#003580', 54, 0, 26, 128], ['rect', '#003580', 0, 51, 192, 26]] },
  { code: 'DK', name: 'Denmark', flag: [['rect', '#c60c30', 0, 0, 192, 128], ['rect', '#fff', 56, 0, 20, 128], ['rect', '#fff', 0, 54, 192, 20]] },
  { code: 'BE', name: 'Belgium', flag: [V(['#000', '#fae042', '#ed2939'])] },
  { code: 'CH', name: 'Switzerland', flag: [['rect', '#d52b1e', 0, 0, 192, 128], ['rect', '#fff', 84, 26, 24, 76], ['rect', '#fff', 58, 52, 76, 24]] },
  { code: 'AT', name: 'Austria', flag: [H(['#ed2939', '#fff', '#ed2939'])] },
  { code: 'UA', name: 'Ukraine', flag: [H(['#0057b7', '#ffd700'])] },
  { code: 'RO', name: 'Romania', flag: [V(['#002b7f', '#fcd116', '#ce1126'])] },
  { code: 'CZ', name: 'Czechia', flag: [H(['#fff', '#d7141a']), ['poly', '#11457e', [0, 0, 96, 64, 0, 128]]] },
  { code: 'RU', name: 'Russia', flag: [H(['#fff', '#0039a6', '#d52b1e'])] },
  { code: 'IE', name: 'Ireland', flag: [V(['#169b62', '#fff', '#ff883e'])] },
  { code: 'HU', name: 'Hungary', flag: [H(['#cd2a3e', '#fff', '#436f4d'])] },
  // Amerika
  { code: 'US', name: 'USA', flag: 'legacy' },
  { code: 'BR', name: 'Brazil', flag: 'legacy' },
  { code: 'AR', name: 'Argentina', flag: 'legacy' },
  { code: 'CA', name: 'Canada', flag: [['rect', '#fff', 0, 0, 192, 128], ['rect', '#d52b1e', 0, 0, 48, 128], ['rect', '#d52b1e', 144, 0, 48, 128], ['star', '#d52b1e', 96, 66, 30, 0.55], ['rect', '#d52b1e', 93, 80, 6, 26]] },
  { code: 'MX', name: 'Mexico', flag: [V(['#006847', '#fff', '#ce1126']), ['disc', '#8c6d2f', 96, 64, 15], ['disc', '#6b9b37', 96, 66, 9]] },
  { code: 'CO', name: 'Colombia', flag: [H(['#fcd116', '#003893', '#ce1126'], [2, 1, 1])] },
  { code: 'CL', name: 'Chile', flag: [H(['#fff', '#d52b1e']), ['rect', '#0039a6', 0, 0, 64, 64], ['star', '#fff', 32, 33, 17]] },
  { code: 'PE', name: 'Peru', flag: [V(['#d91023', '#fff', '#d91023'])] },
  { code: 'UY', name: 'Uruguay', flag: [H(alt('#fff', '#0038a8', 9)), ['rect', '#fff', 0, 0, 72, 71], ['disc', '#fcd116', 36, 36, 16], ['disc', '#e8a900', 36, 36, 9]] },
  { code: 'VE', name: 'Venezuela', flag: [H(['#ffcc00', '#00247d', '#cf142b']), ['ring', '#fff', 96, 112, 54, 8, 5, Math.PI * 1.15, Math.PI * 1.85]] },
  // Asya & Okyanusya
  { code: 'JP', name: 'Japan', flag: 'legacy' },
  { code: 'KR', name: 'S. Korea', flag: 'legacy' },
  { code: 'CN', name: 'China', flag: 'legacy' },
  { code: 'PK', name: 'Pakistan', flag: 'legacy' },
  { code: 'IN', name: 'India', flag: [H(['#ff9933', '#fff', '#138808']), ['circ', '#000080', 96, 64, 17, 3], ['disc', '#000080', 96, 64, 4]] },
  { code: 'ID', name: 'Indonesia', flag: [H(['#e70011', '#fff'])] },
  { code: 'VN', name: 'Vietnam', flag: [['rect', '#da251d', 0, 0, 192, 128], ['star', '#ffff00', 96, 66, 38]] },
  { code: 'TH', name: 'Thailand', flag: [H(['#a51931', '#f4f5f8', '#2d2a4a', '#f4f5f8', '#a51931'], [1, 1, 2, 1, 1])] },
  { code: 'PH', name: 'Philippines', flag: [H(['#0038a8', '#ce1126']), ['poly', '#fff', [0, 0, 0, 128, 104, 64]], ['disc', '#fcd116', 30, 64, 12]] },
  { code: 'MY', name: 'Malaysia', flag: [H(alt('#cc0001', '#fff', 14)), ['rect', '#010066', 0, 0, 96, 64], ['disc', '#fc0', 40, 32, 18], ['disc', '#010066', 46, 32, 15], ['star', '#fc0', 70, 32, 13]] },
  { code: 'SA', name: 'Saudi Arabia', flag: [['rect', '#006c35', 0, 0, 192, 128], ['rect', '#fff', 40, 84, 112, 7], ['rect', '#fff', 52, 46, 88, 7], ['rect', '#fff', 60, 58, 72, 5]] },
  { code: 'AE', name: 'UAE', flag: [H(['#00732f', '#fff', '#000']), ['rect', '#ff0000', 0, 0, 48, 128]] },
  { code: 'QA', name: 'Qatar', flag: [['rect', '#8a1538', 0, 0, 192, 128], ['rect', '#fff', 0, 0, 56, 128], zig('#8a1538', 56, 86, 9)] },
  { code: 'AU', name: 'Australia', flag: [['rect', '#00008b', 0, 0, 192, 128], ['union', 0, 0, 96, 64], ['star', '#fff', 48, 100, 17], ['star', '#fff', 140, 28, 9], ['star', '#fff', 162, 62, 9], ['star', '#fff', 120, 66, 9], ['star', '#fff', 140, 100, 9]] },
  { code: 'NZ', name: 'New Zealand', flag: [['rect', '#00247d', 0, 0, 192, 128], ['union', 0, 0, 96, 64], ['star', '#cc142b', 140, 28, 10], ['star', '#cc142b', 162, 60, 10], ['star', '#cc142b', 120, 62, 10], ['star', '#cc142b', 140, 100, 10]] },
  { code: 'KZ', name: 'Kazakhstan', flag: [['rect', '#00afca', 0, 0, 192, 128], ['disc', '#fec50c', 100, 52, 24], ['disc', '#00afca', 100, 52, 17], ['rect', '#fec50c', 14, 20, 8, 88]] },
  { code: 'UZ', name: 'Uzbekistan', flag: [H(['#0099b5', '#ce1126', '#fff', '#ce1126', '#1eb53a'], [10, 1, 10, 1, 10]), ['disc', '#fff', 30, 24, 15], ['disc', '#0099b5', 36, 24, 12], ['star', '#fff', 62, 14, 6], ['star', '#fff', 78, 22, 6], ['star', '#fff', 62, 30, 6]] },
  { code: 'AZ', name: 'Azerbaijan', flag: [H(['#00b5e2', '#ef3340', '#509e2f']), ['disc', '#fff', 90, 64, 20], ['disc', '#ef3340', 97, 64, 16], ['star', '#fff', 116, 64, 8]] },
  { code: 'BD', name: 'Bangladesh', flag: [['rect', '#006a4e', 0, 0, 192, 128], ['disc', '#f42a41', 84, 64, 36]] },
  { code: 'IR', name: 'Iran', flag: [H(['#239f40', '#fff', '#da0000']), ['disc', '#da0000', 96, 64, 11]] },
  { code: 'SG', name: 'Singapore', flag: [H(['#ed2939', '#fff']), ['disc', '#fff', 38, 32, 19], ['disc', '#ed2939', 44, 32, 16], ['star', '#fff', 66, 18, 6], ['star', '#fff', 80, 28, 6], ['star', '#fff', 74, 44, 6], ['star', '#fff', 58, 44, 6], ['star', '#fff', 52, 28, 6]] },
  // Afrika
  { code: 'ZA', name: 'South Africa', flag: 'legacy' },
  { code: 'EG', name: 'Egypt', flag: [H(['#ce1126', '#fff', '#000']), ['disc', '#c09300', 96, 64, 10]] },
  { code: 'NG', name: 'Nigeria', flag: [V(['#008751', '#fff', '#008751'])] },
  { code: 'MA', name: 'Morocco', flag: [['rect', '#c1272d', 0, 0, 192, 128], ['starline', '#006233', 96, 66, 30, 4]] },
  { code: 'DZ', name: 'Algeria', flag: [V(['#006233', '#fff']), ['disc', '#d21034', 96, 64, 28], ['disc', '#fff', 104, 64, 23], ['star', '#d21034', 112, 64, 11]] },
  { code: 'TN', name: 'Tunisia', flag: [['rect', '#e70013', 0, 0, 192, 128], ['disc', '#fff', 96, 64, 36], ['disc', '#e70013', 96, 64, 27], ['disc', '#fff', 104, 64, 21], ['star', '#e70013', 108, 64, 11]] },
  { code: 'GH', name: 'Ghana', flag: [H(['#ce1126', '#fcd116', '#006b3f']), ['star', '#000', 96, 66, 24]] },
  { code: 'KE', name: 'Kenya', flag: [H(['#000', '#fff', '#bb0000', '#fff', '#006600'], [10, 1, 10, 1, 10]), ['disc', '#bb0000', 96, 64, 18], ['disc', '#fff', 96, 64, 6]] },
  { code: 'SN', name: 'Senegal', flag: [V(['#00853f', '#fdef42', '#e31b23']), ['star', '#00853f', 96, 66, 20]] },
  { code: 'CI', name: 'Ivory Coast', flag: [V(['#f77f00', '#fff', '#009e60'])] }
];

export const COUNTRY_BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));
