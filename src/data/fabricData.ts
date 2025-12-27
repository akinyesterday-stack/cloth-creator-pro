export interface FabricOrder {
  id: string;
  modelAdi: string;
  siparisNo: string;
  siparisTermin: string;
  sezon: string;
  kalite: string;
  kisim: string;
  renk: string;
  kumasKodu: string;
  siparisMiktari: number;
  gramaj: number | null;
  ppDurumlari: string;
  ihtiyac: number;
  kumasci: string;
  fiyat: number | null;
  sapSiparisKodu: string;
  siparisOlsTarihi: string;
  sasTermin: string;
  kalanSure: string;
  labOk: string;
  cadOk: string;
  varyantOk: string;
  kumasTest: string;
  aciklamalar: string;
}

export interface FabricSpec {
  en: number; // Width in CM
  gramaj: number; // Weight in GR
}

// Fabric specifications from user's data
export const fabricSpecs: Record<string, FabricSpec> = {
  "40/1 İNTERLOK": { en: 160, gramaj: 210 },
  "40/1 İNTERLOK DÜZ BOYA": { en: 160, gramaj: 210 },
  "40/1 İNTERLOK METRAJ BASKILI": { en: 160, gramaj: 210 },
  "40/1 İNTERLOK KASAR": { en: 160, gramaj: 210 },
  "30/1 SÜPREM": { en: 185, gramaj: 150 },
  "30/1 SÜPREM DÜZ BOYA": { en: 185, gramaj: 150 },
  "30/1 SÜPREM METRAJ BASKILI": { en: 185, gramaj: 150 },
  "30/1 LYC SÜPREM": { en: 185, gramaj: 210 },
  "30/1 LYC SÜPREM DÜZ BOYA": { en: 185, gramaj: 210 },
  "30/1 LYC SÜPREM KASAR FDU": { en: 185, gramaj: 210 },
  "30/1 RİBANA": { en: 175, gramaj: 210 },
  "30/1 RİBANA DÜZ BOYA": { en: 175, gramaj: 210 },
  "30/1 LYC RİBANA": { en: 175, gramaj: 250 },
  "30/1 LYC RİBANA DÜZ BOYA": { en: 175, gramaj: 250 },
  "30/1 LYC RİBANA KASAR": { en: 175, gramaj: 250 },
  "30/1 RİBANA AĞ BİYE KASAR RENK": { en: 175, gramaj: 210 },
  "30/1 4*2 LYC KAŞKORSE METRAJ BASKILI": { en: 110, gramaj: 330 },
  "30/1 4*2 LYC KAŞKORSE DÜZ BOYA": { en: 110, gramaj: 330 },
  "30/1 İNTERLOK": { en: 175, gramaj: 240 },
  "24/1 LYC KAŞKORSE 2*2": { en: 110, gramaj: 330 },
  "24/1 2*2 LYC KAŞKORSE DÜZ BOYA": { en: 110, gramaj: 330 },
  "36/1 LYC SÜPREM": { en: 180, gramaj: 170 },
  "36/1 LYC SÜPREM DÜZ BOYA": { en: 180, gramaj: 170 },
  "36/1 LYC SÜPREM METRAJ BASKILI": { en: 180, gramaj: 170 },
  "36/1 RİBANA": { en: 160, gramaj: 180 },
  "36/1 RİBANA DÜZ BOYA": { en: 160, gramaj: 180 },
  "36/1 RİBANA KASAR": { en: 160, gramaj: 180 },
  "36/1 RİBANA METRAJ BASKILI": { en: 160, gramaj: 180 },
  "36/1 LYC RİBANA": { en: 155, gramaj: 220 },
  "36/1 LYC RİBANA DÜZ BOYA": { en: 155, gramaj: 220 },
  "36/1 LYC RİBANA KASAR": { en: 155, gramaj: 220 },
  "40/1 LYC KAŞKORSE": { en: 110, gramaj: 200 },
  "40/1 LYC KAŞKORSE DÜZ BOYA": { en: 110, gramaj: 200 },
  "40/1 LYC KAŞKORSE METRAJ BASKILI": { en: 110, gramaj: 200 },
  "26/1 SÜPREM": { en: 185, gramaj: 165 },
  "TÜP RİBANA": { en: 70, gramaj: 210 },
  "KADİFE DÜZ BOYA": { en: 185, gramaj: 250 },
  "JAKARLI KADİFE - MORI MODEL KALİTESİ": { en: 185, gramaj: 250 },
  "JAKARLI KAPİTONE DÜZ BOYA": { en: 150, gramaj: 335 },
  "PELÜŞ DÜZ BOYA -WELLSOFT": { en: 175, gramaj: 260 },
  "PELUŞ DÜZ BOYA - ULTRASOFT KALİTE": { en: 170, gramaj: 300 },
  "PELUŞ METRAJ BASKILI - WELLSOFT": { en: 175, gramaj: 260 },
  "YUMUŞAK TÜL - ÇİFT KATLI": { en: 145, gramaj: 50 },
  "İKİ İPLİK": { en: 190, gramaj: 220 },
  "POLAR": { en: 180, gramaj: 220 },
  "ALTUN KALİTE 5*2 40/1 LYC KAŞKORSE": { en: 135, gramaj: 200 },
};

export interface FabricTypeWithSpec {
  name: string;
  en: number;
  gramaj: number;
}

export const fabricTypesWithSpecs: FabricTypeWithSpec[] = [
  { name: "26/1 SÜPREM", en: 185, gramaj: 165 },
  { name: "30/1 SÜPREM DÜZ BOYA", en: 185, gramaj: 150 },
  { name: "30/1 SÜPREM METRAJ BASKILI", en: 185, gramaj: 150 },
  { name: "30/1 LYC SÜPREM DÜZ BOYA", en: 185, gramaj: 210 },
  { name: "30/1 LYC SÜPREM KASAR FDU", en: 185, gramaj: 210 },
  { name: "30/1 RİBANA DÜZ BOYA", en: 175, gramaj: 210 },
  { name: "30/1 LYC RİBANA DÜZ BOYA", en: 175, gramaj: 250 },
  { name: "30/1 LYC RİBANA KASAR", en: 175, gramaj: 250 },
  { name: "30/1 RİBANA AĞ BİYE KASAR RENK", en: 175, gramaj: 210 },
  { name: "30/1 4*2 LYC KAŞKORSE METRAJ BASKILI", en: 110, gramaj: 330 },
  { name: "30/1 4*2 LYC KAŞKORSE DÜZ BOYA", en: 110, gramaj: 330 },
  { name: "30/1 İNTERLOK", en: 175, gramaj: 240 },
  { name: "36/1 LYC SÜPREM DÜZ BOYA", en: 180, gramaj: 170 },
  { name: "36/1 LYC SÜPREM METRAJ BASKILI", en: 180, gramaj: 170 },
  { name: "36/1 RİBANA DÜZ BOYA", en: 160, gramaj: 180 },
  { name: "36/1 RİBANA KASAR", en: 160, gramaj: 180 },
  { name: "36/1 RİBANA METRAJ BASKILI", en: 160, gramaj: 180 },
  { name: "36/1 LYC RİBANA DÜZ BOYA", en: 155, gramaj: 220 },
  { name: "36/1 LYC RİBANA KASAR", en: 155, gramaj: 220 },
  { name: "40/1 İNTERLOK DÜZ BOYA", en: 160, gramaj: 210 },
  { name: "40/1 İNTERLOK METRAJ BASKILI", en: 160, gramaj: 210 },
  { name: "40/1 İNTERLOK KASAR", en: 160, gramaj: 210 },
  { name: "40/1 LYC KAŞKORSE DÜZ BOYA", en: 110, gramaj: 200 },
  { name: "40/1 LYC KAŞKORSE METRAJ BASKILI", en: 110, gramaj: 200 },
  { name: "24/1 2*2 LYC KAŞKORSE DÜZ BOYA", en: 110, gramaj: 330 },
  { name: "TÜP RİBANA", en: 70, gramaj: 210 },
  { name: "KADİFE DÜZ BOYA", en: 185, gramaj: 250 },
  { name: "JAKARLI KADİFE - MORI MODEL KALİTESİ", en: 185, gramaj: 250 },
  { name: "JAKARLI KAPİTONE DÜZ BOYA", en: 150, gramaj: 335 },
  { name: "PELÜŞ DÜZ BOYA -WELLSOFT", en: 175, gramaj: 260 },
  { name: "PELUŞ DÜZ BOYA - ULTRASOFT KALİTE", en: 170, gramaj: 300 },
  { name: "PELUŞ METRAJ BASKILI - WELLSOFT", en: 175, gramaj: 260 },
  { name: "YUMUŞAK TÜL - ÇİFT KATLI", en: 145, gramaj: 50 },
  { name: "İKİ İPLİK", en: 190, gramaj: 220 },
  { name: "POLAR", en: 180, gramaj: 220 },
  { name: "ALTUN KALİTE 5*2 40/1 LYC KAŞKORSE", en: 135, gramaj: 200 },
];

export const usageAreas = [
  "ANA BEDEN",
  "ANA BEDEN + AĞ BİYE",
  "ANA BEDEN + AĞ BİYE + YAKA BİYE",
  "ANA BEDEN + YAKA BİYE",
  "ANA BEDEN + FIRFIR",
  "ANA BEDEN + YAKA +FIRFIR",
  "ANA BEDEN + FIRFIR + YAKA BİYE",
  "BODY - ANA BEDEN",
  "BODY - ANA BEDEN + AĞ BİYE",
  "BODY - ANA BEDEN + BİYE",
  "BODY - YAKA BİYE",
  "BODY - AĞ BİYE",
  "PNT - ANA BEDEN",
  "PNT - ANA BEDEN + PAÇA UCU",
  "PNT - ANA BEDEN + BEL",
  "PNT - ANA BEDEN + BEL + PAÇA",
  "ŞORT - ANA BEDEN",
  "ŞORT - ANA BEDEN + FIRFIR",
  "TULUM - ANA BEDEN",
  "TULUM - ANA BEDEN + YAKA",
  "TULUM - BİYE",
  "TULUM - AĞ BİYE",
  "HIRKA - ANA BEDEN",
  "HIRKA - BİYE",
  "HIRKA - KOL + KAPŞON + 3D KULAK",
  "HIRKA - KOL UCU + ETEK UCU",
  "BERE - ANA BEDEN",
  "BERE - ANA BEDEN + 3D KULAK",
  "SAÇ BANDI - ANA BEDEN",
  "TAYT - ANA BEDEN",
  "MENDİL - ANA BEDEN",
  "APLİKE",
  "PAÇA UCU",
  "YAKA + KOL",
  "KAPŞON ASTAR + BİYE",
  "SALOPET ANA BEDEN",
  "SALOPET AĞ BİYE",
];

export const suppliers = [
  "TÜBAŞ",
  "BOYBO",
  "UNİVERSAL",
  "MAY TEKS",
  "ÖZCANLAR",
  "ÖZEN MENSUCAT",
  "NEVVAN",
];

export function getDefaultGramaj(fabricType: string): FabricSpec | null {
  return fabricSpecs[fabricType] || null;
}

export const sampleOrders: FabricOrder[] = [
  {
    id: "1",
    modelAdi: "LOSKA",
    siparisNo: "801993",
    siparisTermin: "15.04.2022",
    sezon: "S2",
    kalite: "40/1 LYC KAŞKORSE DÜZ BOYA",
    kisim: "ANA BEDEN + AĞ BİYE + YAKA BİYE",
    renk: "FFM DULL GREEN - 15-5812 TCX",
    kumasKodu: "1030145094",
    siparisMiktari: 3850,
    gramaj: 69,
    ppDurumlari: "PP İŞLEMDE",
    ihtiyac: 266,
    kumasci: "TÜBAŞ",
    fiyat: 156,
    sapSiparisKodu: "4500631052",
    siparisOlsTarihi: "18.01.2022",
    sasTermin: "28.02.2022",
    kalanSure: "1396,00",
    labOk: "OK",
    cadOk: "",
    varyantOk: "",
    kumasTest: "",
    aciklamalar: "RENK OK LEKEDEN DOLAYI TAMİR",
  },
  {
    id: "2",
    modelAdi: "LORES",
    siparisNo: "801995",
    siparisTermin: "18.04.2022",
    sezon: "S2",
    kalite: "36/1 LYC SÜPREM METRAJ BASKILI",
    kisim: "BODY - ANA BEDEN",
    renk: "LFH LIGHT GREEN",
    kumasKodu: "1030145118",
    siparisMiktari: 9053,
    gramaj: 53,
    ppDurumlari: "PP YAPILACAK",
    ihtiyac: 480,
    kumasci: "TÜBAŞ",
    fiyat: 168,
    sapSiparisKodu: "4500631074",
    siparisOlsTarihi: "18.01.2022",
    sasTermin: "24.02.2022",
    kalanSure: "1400,00",
    labOk: "",
    cadOk: "OK",
    varyantOk: "23.02 VARYANT ONAYDA",
    kumasTest: "03.03 TESTE VERİLDİ.",
    aciklamalar: "",
  },
  {
    id: "3",
    modelAdi: "ALZAR",
    siparisNo: "802023",
    siparisTermin: "15.04.2022",
    sezon: "S2",
    kalite: "36/1 RİBANA DÜZ BOYA",
    kisim: "BODY - ANA BEDEN + AĞ BİYE",
    renk: "FXT PASTEL GREEN 13-6110 TCX",
    kumasKodu: "1030145168",
    siparisMiktari: 2944,
    gramaj: 66,
    ppDurumlari: "OK",
    ihtiyac: 194,
    kumasci: "TÜBAŞ",
    fiyat: 138,
    sapSiparisKodu: "4500631295",
    siparisOlsTarihi: "18.01.2022",
    sasTermin: "14.02.2022",
    kalanSure: "1410,00",
    labOk: "OK",
    cadOk: "",
    varyantOk: "",
    kumasTest: "09.02 verildi.",
    aciklamalar: "HAZIR",
  },
  {
    id: "4",
    modelAdi: "HOTEP",
    siparisNo: "802482",
    siparisTermin: "13.05.2022",
    sezon: "S2",
    kalite: "36/1 RİBANA METRAJ BASKILI",
    kisim: "ŞORT - ANA BEDEN + FIRFIR",
    renk: "LU9 LIGHT YELLOW PRINTED",
    kumasKodu: "1030145173",
    siparisMiktari: 3500,
    gramaj: 58,
    ppDurumlari: "PP YAPILACAK",
    ihtiyac: 203,
    kumasci: "TÜBAŞ",
    fiyat: 161.5,
    sapSiparisKodu: "4500631282",
    siparisOlsTarihi: "18.01.2022",
    sasTermin: "23.02.2022",
    kalanSure: "1401,00",
    labOk: "OK",
    cadOk: "OK",
    varyantOk: "09.02.2022 ONAY VERİLDİ.",
    kumasTest: "01.03 teste verildi.",
    aciklamalar: "",
  },
  {
    id: "5",
    modelAdi: "BEGOR",
    siparisNo: "811340",
    siparisTermin: "03.06.2022",
    sezon: "W2",
    kalite: "30/1 4*2 LYC KAŞKORSE METRAJ BASKILI",
    kisim: "BODY - ANA BEDEN + AĞ BİYE + FIRFIR",
    renk: "LRF LIGHT GREEN PRINTED",
    kumasKodu: "1030137194",
    siparisMiktari: 6160,
    gramaj: 111,
    ppDurumlari: "",
    ihtiyac: 684,
    kumasci: "TÜBAŞ",
    fiyat: 161,
    sapSiparisKodu: "4500640803",
    siparisOlsTarihi: "11.02.2022",
    sasTermin: "18.03.2022",
    kalanSure: "1378,00",
    labOk: "OK",
    cadOk: "OK",
    varyantOk: "22.03 OK",
    kumasTest: "",
    aciklamalar: "30.03 ÇARŞAMBA DEPO SEVK",
  },
];
