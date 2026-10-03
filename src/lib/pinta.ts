export const COSTO_PREMIUM = 30;

export type Nube = { id: number; nombre: string; premium: boolean; color?: string; img?: string; texto: string };
const PASTEL = ["#F9C4E8", "#A5C0F7", "#94E3B5", "#FBA36E", "#C38AF5", "#FBDC7E", "#D9D9D9", "#5ED6D2", "#F98B7F", "#FFFFFF"];
export const NUBES: Nube[] = [
  ...PASTEL.map((color, i) => ({ id: i + 1, nombre: `Pastel ${i + 1}`, premium: false, color, texto: "#1a1a2e" })),
  ...Array.from({ length: 10 }, (_, i) => ({ id: i + 11, nombre: `Brillo ${i + 1}`, premium: true, img: `/nubes/n${i + 11}.jpg`, texto: [11, 12, 13, 14, 17, 18].includes(i + 11) ? "#1a1a2e" : "#ffffff" })),
];
export const nubeStyle = (id: number | null | undefined): { backgroundColor?: string | undefined; backgroundImage?: string; color: string } | null => {
  const n = NUBES.find((x) => x.id === id);
  if (!n) return null;
  return n.img ? { backgroundImage: `url(${n.img})`, color: n.texto } : { backgroundColor: n.color, color: n.texto };
};

export type Fondo = { id: number; premium: boolean; src: string };
export const FONDOS: Fondo[] = Array.from({ length: 24 }, (_, i) => ({ id: i + 1, premium: i >= 12, src: `/fondos/f${i + 1}.jpg` }));

export const EFECTOS = [
  "Neon Glow", "Gold 3D", "Wavy", "Rainbow", "Fire", "Ice", "Outline", "Shadow", "Glitch", "Retro 80s",
  "Graffiti", "Chrome", "Comic", "Liquid", "Pixel 8-bit", "Electric", "Hologram", "Typewriter", "Bubble", "Gradient",
].map((nombre, i) => ({ id: i + 1, nombre, clase: `fx-${i + 1}` }));

export const COLORES_GLOW = [
  { nombre: "Oro", c: "#FFD700" }, { nombre: "Plata", c: "#E8E8F0" }, { nombre: "Cobre", c: "#E08D5B" },
  { nombre: "Morado diamante", c: "#C77DFF" }, { nombre: "Esmeralda", c: "#2EE59D" }, { nombre: "Rubí", c: "#FF2E63" },
  { nombre: "Zafiro", c: "#3D8BFF" }, { nombre: "Turquesa", c: "#2DE2E6" }, { nombre: "Rosa neón", c: "#FF4FD8" },
  { nombre: "Lima", c: "#B6FF3B" }, { nombre: "Naranja fuego", c: "#FF7A1A" }, { nombre: "Hielo", c: "#9BE7FF" },
  { nombre: "Lavanda", c: "#B79CFF" }, { nombre: "Champán", c: "#F7E7B4" }, { nombre: "Coral", c: "#FF8A7A" },
  { nombre: "Ámbar", c: "#FFB000" }, { nombre: "Menta", c: "#7CFFCB" }, { nombre: "Magenta", c: "#FF00C8" },
  { nombre: "Cian eléctrico", c: "#00F0FF" }, { nombre: "Perla", c: "#FFF6E9" },
];
/** Color guardado como "#hex" o "glow:#hex" */
export const colorStyle = (v: string | null | undefined) => {
  if (!v) return {};
  if (v.startsWith("glow:")) {
    const c = v.slice(5);
    return { color: c, textShadow: `0 0 4px ${c}, 0 0 10px ${c}, 0 0 18px ${c}` };
  }
  return { color: v };
};
