# Kesim Takip Ekranı ve Yeni SAS Sırası

Kumaş sorumlusu önce kumaş bilgilerini girer, sonra dosya kesim takip uzmanına düşer, planlamacı arada maliyeti açtığını işaretler, en sonunda tedarik sorumlusuna onaya gider. Tüm ekip aynı takip tablosundan "kimde ne bekliyor"u görür.

## Yeni akış

```text
İş emri açılır (kumaş kalemleri PLM'den veya elle)
   ↓
KUMAŞ SORUMLUSU: kumaş cinsi/kompozisyon, en (cm), m2 gramaj,
                 boyahane, kumaş fiyatı, boya fiyatı, üretici, termin
   ↓ "Kesim Takibe Gönder"
KESİM TAKİP UZMANI (özel ekran): pastal gramajı → miktar otomatik
   ↓ "Tedarik Sorumlusuna Gönder"
TEDARİK SORUMLUSU onayı → (tutar limit üstüyse) TEDARİK MÜDÜRÜ onayı
```

Planlamacı bu sırada bağımsız olarak "Maliyeti açtım" kutusunu işaretler; işaret tüm ekipte ve tedarik sorumlusunun ekranında görünür.

Üretim modellerine aktarılan maliyetler için dosya tekrar kesim takibe düşer: kumaşçı en ve m2 gramajı yeniler, kesim takip pastal hesabını yeniden yapıp tekrar yollar. Her tur takip tablosunda görünür.

## Yapılacaklar

### 1. Kumaş sorumlusu adımı (ilk adım)
- SAS kalem tablosuna yeni alanlar: kumaş cinsi/kompozisyon, en (cm), m2 gramaj, boyahane, boya fiyatı.
- Kalem tutarı = miktar × (kumaş fiyatı + boya fiyatı).
- Tüm kalemlerde en, m2 gramaj, üretici, termin ve fiyat dolunca "Kesim Takibe Gönder" aktif olur.

### 2. Kesim takip uzmanına özel ekran (`/kesim-takip`)
- Sadece kendisine düşmüş dosyalar listelenir: PO, model, adet, kumaş kalem sayısı, bekleme süresi.
- Dosya açılınca sade bir pastal ekranı: her kumaş kalemi için kumaşçının girdiği en/m2 gramaj okunur şekilde görünür, kesim takip pastal gramajını girer, miktar (gramaj × adet) anında hesaplanır.
- Hepsi dolunca "Tedarik Sorumlusuna Gönder".
- Maliyet revizyonu için "Kumaşçıya Geri Gönder" butonu (not ile).

### 3. Planlamacı "maliyeti açıldı" işareti
- Planlama ekranındaki iş emri satırında tek tık kutu: "Maliyeti açtım".
- Kim ve ne zaman işaretledi bilgisi saklanır, rozet olarak her ekranda görünür.

### 4. Ekip takip tablosu ("kimde ne bekliyor")
- Tüm ekip rollerinde ve müdürde görünen ortak tablo: PO / model / şu anki adım / bekleyen kişi (kumaşçı, kesim takip, sorumlu, müdür) / kaç gündür bekliyor / maliyet açıldı mı / toplam tutar.
- Adıma göre renkli rozet ve filtre; satıra tıklayınca dosya detayına gider.

### 5. Üretim modeline aktarılan maliyet turu
- Kesim takip ekranında "Yeni tur başlat": dosya kumaşçıya döner, kumaşçı en/m2 gramajı günceller, tekrar kesim takibe gelir.
- Tur geçmişi (kim, ne zaman, not) dosya altında listelenir.

## Teknik detaylar

- `sas_items`'e yeni kolonlar: `composition`, `width_cm`, `gsm_m2`, `dyehouse`, `dye_price`; `line_total` hesabı `quantity * (coalesce(unit_price,0) + coalesce(dye_price,0))` olarak güncellenir.
- `sas_forms`'a `cost_opened_by`, `cost_opened_at` kolonları (planlamacı işareti) ve `revision` sayacı.
- Durum makinesi yeni sırayla: `draft → fabric_pending → gramaj_pending → sorumlu_approval → mudur_approval → approved | rejected`; geri gönderme `gramaj_pending → fabric_pending`. `src/lib/sas.ts` içindeki `SAS_STATUS` etiketleri ve `SasDetail.tsx` buton koşulları buna göre değişir.
- Yeni sayfa `src/pages/KesimTakip.tsx` + rota `/kesim-takip`; `kesim_takip` kullanıcı tipi giriş sonrası buraya yönlenir.
- Yeni bileşen `src/components/TeamPipeline.tsx`; `TeamWorkspace`, `TedarikDashboard` ve `MudurDashboard` içine sekme olarak eklenir; erişilebilir lider id'leri `getAccessibleLeaderIds` ile bulunur.
- RLS: yeni kolonlar mevcut `can_access_sas` politikalarıyla korunur; ek politika gerekmez. Migration'da yeni kolonlar ve `sas_approvals`'a `revision` notu eklenir.
