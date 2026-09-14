# Sipariş → Planlama → PLM → SAS Onay Akışı

Buyer'dan gelen siparişin tedarik sorumlusu ve ekibine düşmesi, planlama ekranında iş emri olarak açılması, PLM'den kumaş kodlarının çekilmesi, kumaş sorumlusunda SAS (Satın Alma Sipariş Formu) başlatılması ve tutar limitine göre onaya gitmesi.

## Akış

```text
Buyer PO gönderir
   ↓ (bildirim: tedarik sorumlusu + ekibin tamamı)
Planlama uzmanı ekranı: PO "İş Emri" olarak açılır
   ↓
PLM'den model adı + PO koduna göre kumaş kodları otomatik çekilir
   ↓
Kesim takip uzmanı: her kumaş kalemi için pastal gramajı girer
   ↓ (miktar = gramaj × adet, otomatik)
Kumaş sorumlusu: SAS kalemlerine üretici + termin girer, onaylar
   ↓
Tutar limiti altı → Tedarik sorumlusu onayı ile biter
Tutar limiti üstü → Tedarik sorumlusu + Tedarik müdürü onayı
   ↓
SAS onaylandı
```

## Yapılacaklar

### 1. Ekip ve bildirim entegrasyonu
- Ekip rollerine "Kesim Takip" eklenir (şu an sadece Kumaş, Planlama, Fason var).
- Tedarik müdürü paneli: kendi tedarik sorumlularını listesine ekler/çıkarır.
- Sipariş bildirimi tedarik sorumlusu + tüm ekibine düşmeye devam eder (mevcut tetikleyici korunur, kesim takip rolü de kapsanır).

### 2. Planlama ekranı (iş emri)
- Planlama uzmanı için yeni sayfa: kendi ekibine gelen PO'lar liste halinde açılır.
- Her PO satırı açıldığında sipariş detayı, beden kırılımı, ülke dağılımı ve model görseli görünür.
- Planlama "İş Emrini Aç" der, kayıt SAS akışına girer.

### 3. PLM'den kumaş kodu çekme
- Model adı ve PO koduna göre PLM'den kumaş kodu listesi çekilir; her kod bir SAS kalemi olur.
- Bağlantı bilgileri sizden alınacak (adres + erişim anahtarı); anahtar güvenli olarak saklanır, sunucu tarafında kullanılır.
- Çekme başarısızsa kalemler elle eklenebilir; son çekim zamanı ve hata mesajı ekranda gösterilir.

### 4. Kesim takip: pastal gramajı
- Kesim takip uzmanı her kumaş kalemi için birim gramaj girer.
- Miktar otomatik hesaplanır: gramaj × sipariş adedi. Elle düzeltmeye kapalı, gramaj değişince yeniden hesaplanır.

### 5. Kumaş sorumlusu: SAS
- Kalem kalem kumaş listesi; her kalem için üretici ve termin tarihi zorunlu.
- Birim fiyat ve kalem tutarı girilir, SAS toplam tutarı hesaplanır.
- Tüm kalemler tamamlanınca "Onaya Gönder".

### 6. Onay akışı (tutar limitine göre)
- Ayarlanabilir bir onay limiti tanımlanır (tedarik müdürü belirler).
- Limit altı: tedarik sorumlusu onayı SAS'ı tamamlar.
- Limit üstü: tedarik sorumlusu onayından sonra tedarik müdürü onayına düşer.
- Her onay/ret kaydı, kim–ne zaman–not olarak tutulur; ret durumunda kumaş sorumlusuna geri döner.
- SAS PDF çıktısı (mevcut sipariş PDF'iyle aynı Türkçe karakter desteği ve dikey format).

### 7. Raporlar
- Tedarik sorumlusu ve ekibi: kendi ekibinin raporu (PO sayısı, açık/kapalı SAS, termin gecikmeleri, toplam tutar).
- Tedarik müdürü: atadığı her tedarik sorumlusunun ekibini tek tek ve tüm ekipleri toplu olarak görebilir.

## Teknik detaylar

- Yeni tablolar: `work_orders` (PO → iş emri), `sas_forms` (başlık, toplam tutar, durum, onay geçmişi), `sas_items` (kumaş kodu, gramaj, adet, miktar, üretici, termin, birim fiyat), `approval_settings` (tutar limiti), `manager_assignments` (müdür → tedarik sorumlusu).
- Tüm tablolarda RLS: kalem sahibi, ekip lideri, ekip üyesi ve bağlı müdür erişimi; ekip üyeliği `SECURITY DEFINER` fonksiyon üzerinden kontrol edilir (rekürsiyon önlenir). Her tabloya GRANT eklenir.
- Durum makinesi: `draft → plm_fetched → gramaj_pending → fabric_pending → sorumlu_approval → mudur_approval → approved | rejected`. Geçişler veritabanı tarafında doğrulanır.
- PLM çekimi bir edge function ile yapılır (`plm-fetch-fabrics`); PLM anahtarı secret olarak saklanır, istemciye hiç düşmez. Yanıt SAS kalemlerine map edilir ve `sas_items` içine yazılır.
- Miktar hesabı hem istemcide gösterilir hem de veritabanı tetikleyicisinde yeniden hesaplanır (tek doğruluk kaynağı).
- Onay yönlendirmesi SAS toplam tutarı ile `approval_settings.limit` karşılaştırılarak tetikleyicide belirlenir.
- Raporlar Supabase view'ları ile okunur; müdür raporu ekip bazında gruplanır.
- Yeni rotalar: `/planlama`, `/sas/:workOrderId`, `/onaylar`, `/mudur`, `/raporlar`. Her biri kullanıcı tipine göre korunur.

## Başlamadan önce gereken

PLM bağlantısı için: PLM adresi (API uç noktası), erişim anahtarı/kullanıcı bilgisi ve kumaş kodu sorgusunun hangi alanlarla yapıldığı (model adı, PO kodu). Bunları paylaştığınızda anahtarı güvenli kayıt formuyla isteyeceğim.

## Kapsam dışı

- Gerçek ERP/SAP entegrasyonu (ekran akışı ERP benzeri olacak, harici SAP bağlantısı yok).
- Fason ve sevkiyat sonrası adımlar.
