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

export const fabricTypes = [
  "30/1 SÜPREM METRAJ BASKILI",
  "30/1 LYC SÜPREM KASAR FDU",
  "30/1 LYC SÜPREM DÜZ BOYA",
  "30/1 RİBANA DÜZ BOYA",
  "30/1 LYC RİBANA DÜZ BOYA",
  "30/1 LYC RİBANA KASAR",
  "30/1 RİBANA AĞ BİYE KASAR RENK",
  "30/1 4*2 LYC KAŞKORSE METRAJ BASKILI",
  "30/1 4*2 LYC KAŞKORSE DÜZ BOYA",
  "30/1 SÜPREM DÜZ BOYA",
  "30/1 İNTERLOK",
  "36/1 LYC SÜPREM METRAJ BASKILI",
  "36/1 LYC RİBANA KASAR",
  "36/1 RİBANA KASAR",
  "36/1 RİBANA DÜZ BOYA",
  "36/1 LYC RİBANA DÜZ BOYA",
  "36/1 RİBANA METRAJ BASKILI",
  "36/1 LYC SÜPREM DÜZ BOYA",
  "40/1 LYC KAŞKORSE DÜZ BOYA",
  "40/1 LYC KAŞKORSE METRAJ BASKILI",
  "40/1 İNTERLOK DÜZ BOYA",
  "40/1 İNTERLOK METRAJ BASKI",
  "40/1 İNTERLOK KASAR",
  "40/1 İNTERLOK METRAJ BASKILI",
  "24/1 2*2 LYC KAŞKORSE DÜZ BOYA",
  "KADİFE DÜZ BOYA",
  "JAKARLI KADİFE - MORI MODEL KALİTESİ",
  "JAKARLI KAPİTONE DÜZ BOYA",
  "PELÜŞ DÜZ BOYA -WELLSOFT",
  "PELUŞ DÜZ BOYA - ULTRASOFT KALİTE",
  "PELUŞ METRAJ BASKILI - WELLSOFT",
  "YUMUŞAK TÜL - ÇİFT KATLI",
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
];

export const dyeTypes = [
  "DÜZ BOYA",
  "KASAR",
  "METRAJ BASKILI",
  "KASAR RENK",
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

export const fabricPrices: Record<string, Record<string, number>> = {
  "30/1 RİBANA DÜZ BOYA": {
    "ANA BEDEN": 138,
    "BODY - ANA BEDEN + AĞ BİYE": 138,
    "BODY - AĞ BİYE": 138,
    "PNT - ANA BEDEN": 138,
    "TULUM - BİYE": 135,
    "HIRKA - BİYE": 137.5,
    "BİYE": 129.5,
    "default": 137,
  },
  "30/1 LYC RİBANA DÜZ BOYA": {
    "BODY - YAKA BİYE": 148.5,
    "PAÇA UCU": 148.5,
    "default": 140.5,
  },
  "36/1 RİBANA DÜZ BOYA": {
    "BODY - ANA BEDEN + AĞ BİYE": 138,
    "PNT - ANA BEDEN": 138,
    "BERE - ANA BEDEN": 138,
    "BODY - AĞ BİYE": 138,
    "default": 139,
  },
  "36/1 LYC RİBANA DÜZ BOYA": {
    "BODY - YAKA BİYE": 149.5,
    "default": 149.5,
  },
  "36/1 RİBANA METRAJ BASKILI": {
    "ŞORT - ANA BEDEN": 161.5,
    "SAÇ BANDI - ANA BEDEN": 161.5,
    "PNT - ANA BEDEN": 189.5,
    "default": 189.5,
  },
  "36/1 LYC SÜPREM DÜZ BOYA": {
    "BODY - ANA BEDEN + FIRFIR + YAKA BİYE": 141.5,
    "BODY - ANA BEDEN + YAKA +FIRFIR": 141.5,
    "PNT - ANA BEDEN": 149,
    "SAÇ BANDI - ANA BEDEN": 149,
    "default": 149,
  },
  "36/1 LYC SÜPREM METRAJ BASKILI": {
    "BODY - ANA BEDEN": 168,
    "default": 168,
  },
  "40/1 LYC KAŞKORSE DÜZ BOYA": {
    "ANA BEDEN + AĞ BİYE + YAKA BİYE": 156,
    "PNT - ANA BEDEN": 184,
    "default": 156,
  },
  "40/1 LYC KAŞKORSE METRAJ BASKILI": {
    "BODY - ANA BEDEN": 176,
    "ŞORT - ANA BEDEN": 176,
    "default": 176,
  },
  "40/1 İNTERLOK DÜZ BOYA": {
    "BODY - ANA BEDEN + BİYE": 145,
    "BODY - ANA BEDEN + AĞ BİYE": 145,
    "TULUM - BİYE": 145,
    "AĞ BİYE": 148,
    "PNT - ANA BEDEN": 159,
    "default": 148,
  },
  "40/1 İNTERLOK METRAJ BASKILI": {
    "TULUM - ANA BEDEN": 166,
    "BERE - ANA BEDEN": 166,
    "PNT - ANA BEDEN": 166,
    "BODY - ANA BEDEN": 169,
    "SAÇ BANDI - ANA BEDEN": 169,
    "default": 169,
  },
  "KADİFE DÜZ BOYA": {
    "ANA BEDEN": 138,
    "APLİKE": 138,
    "PNT- ANA BEDEN": 138,
    "TULUM - ANA BEDEN": 148.35,
    "default": 148.35,
  },
  "JAKARLI KADİFE - MORI MODEL KALİTESİ": {
    "ANA BEDEN + FIRFIR": 173,
    "PNT-ANA BEDEN": 173,
    "default": 173,
  },
  "JAKARLI KAPİTONE DÜZ BOYA": {
    "HIRKA - ANA BEDEN": 142.7,
    "PNT - ANA BEDEN": 142.7,
    "default": 162.4,
  },
  "PELÜŞ DÜZ BOYA -WELLSOFT": {
    "HIRKA - KOL + KAPŞON + 3D KULAK": 88.75,
    "PNT - ANA BEDEN": 88.75,
    "default": 88.75,
  },
  "PELUŞ DÜZ BOYA - ULTRASOFT KALİTE": {
    "HIRKA - ANA BEDEN + 3D KULAK": 95.55,
    "PNT - ANA BEDEN + BEL-": 95.55,
    "default": 95.55,
  },
  "PELUŞ METRAJ BASKILI - WELLSOFT": {
    "HIRKA - ANA BEDEN": 112.5,
    "PNT - ANA BEDEN": 112.5,
    "default": 111,
  },
  "24/1 2*2 LYC KAŞKORSE DÜZ BOYA": {
    "HIRKA - KOL UCU + ETEK UCU": 144,
    "PAÇA UCU": 144,
    "default": 144,
  },
  "30/1 4*2 LYC KAŞKORSE METRAJ BASKILI": {
    "BODY - ANA BEDEN + AĞ BİYE + FIRFIR": 161,
    "TAYT - ANA BEDEN": 161,
    "default": 186,
  },
  "30/1 4*2 LYC KAŞKORSE DÜZ BOYA": {
    "BODY - YAKA + AĞ BİYE": 170,
    "PNT - ANA BEDEN": 170,
    "default": 174.5,
  },
  "30/1 SÜPREM DÜZ BOYA": {
    "HIRKA - KAPŞON ASTAR + BİYE +FERMUAR + GARAJ PAT BİYE": 128.5,
    "BODY - APLİKE -": 127,
    "default": 127,
  },
  "30/1 LYC SÜPREM DÜZ BOYA": {
    "HIRKA - PEMBE BİYE - FIRFIR": 137.5,
    "default": 136.5,
  },
};

export function calculatePrice(fabricType: string, usageArea: string): number {
  const fabricPriceMap = fabricPrices[fabricType];
  if (!fabricPriceMap) return 0;
  
  return fabricPriceMap[usageArea] || fabricPriceMap["default"] || 0;
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
