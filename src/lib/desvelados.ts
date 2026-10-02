export const AVATARES = Array.from({ length: 20 }, (_, i) => `/avatares/a${i + 1}.jpg`);

export type Marco = { id: number; src: string; vip: boolean };
export const MARCOS: Marco[] = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, src: `/marcos/m${i + 1}.png`, vip: i >= 15 }));
export const COSTO_MARCO_VIP = 50;

/** 2 Bs = 1 monedita */
export const monedasPorBs = (bs: number) => Math.floor(bs / 2);

export const BINANCE_ID = "User-5f631629";
export const PRECIO_SALA_USD = 3;
