export type Rol = "admin" | "antrenor" | "veli" | "ogrenci";

export type Mevki = "Kaleci" | "Defans" | "Orta Saha" | "Forvet";
export type Ayak = "Sağ" | "Sol";

export type OgrenciPerformans = {
  hiz: number;
  sut: number;
  pas: number;
  dripling: number;
  dayaniklilik: number;
  oyunZekasi: number;
  disiplin: number;
};

export type OgrenciSaglik = {
  sakatlikGecmisi?: string | null;
  aktifSakatlik?: string | null;
  alerjiler?: string | null;
  saglikNotlari?: string | null;
  antrenmanKisitlamalari?: string | null;
};

export type OdemeDurumu = "ödendi" | "ödenmedi" | "gecikmiş" | "kısmi";
export type YoklamaDurumu = "geldi" | "gelmedi" | "izinli";

