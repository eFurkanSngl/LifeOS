# Windows canlı kabul listesi

Web ve iki istemci testi ertelendi. Yeni native pakette aşağıdaki testleri sırayla uygula. Test kayıtlarını `[Test]` ile adlandır; gerçek derslerin saatini değiştirme. Otomatik testler bu kutuları kapatmaz.

## 1. Hatırlatıcılar

- [x] Rahatsız etmeyin kapalı: Ayarlar testinde banner ve ses var (kullanıcı doğruladı).
- [ ] İki dakika ileriye sesli test hatırlatıcısı kur, küçült: tek banner ve tek geçmiş kaydı var.
- [ ] Ayrı testlerde banner düğmeleri Ertele, Yeniden planla, Tamamla çalışıyor. Banner kaybolduktan sonraki Bildirim Merkezi eylemleri garanti edilmiyor.
- [ ] Uygulama içi ertele/yeniden planla: yeni saatte tek uyarı var.
- [ ] Kapatınca tepsiye küçült seçeneğiyle kapat, uyarıyı bekle, tepsiden aç. Sonra kendi tercihine geri getir.
- [ ] Uyarıdan önce tamamen kapat, saati geçince aç: kaçırılan uyarı geliyor, bir sonraki yeniden açmada yinelenmiyor.
- [ ] Uyku/uyanma sonrası kaçırılan uyarı; sessiz saatler; bir tekrar kaydını tamamlayınca yalnızca onun alarmının kapanması.

## 2. Çevrimdışı kayıt ve oturum

- [ ] İnterneti kendin kapat; görev/not ekle ve uygulamayı yeniden aç: yerel kayıtlar duruyor.
- [ ] İnterneti aç, Şimdi eşitle: kayıp veya yinelenme yok.
- [ ] Çıkış ve yeniden giriş yerel verileri koruyor. Uzun kullanımda oturum yenileniyor. Parola/token görüntüsü paylaşma.

## 3. Yedek ve güncelleme

- [ ] JSON yedeğini özel yerde sakla. Aynı yedeği geri yükleyince mevcut kayıtlar atlanıyor, sonraki düzenlemeler ezilmiyor.
- [ ] Ayrı boş test profilinde görev/proje/not/hatırlatıcı bağlantıları geri geliyor. Normal profilini silme.
- [ ] Installer güncellemesi sonrası dersler, notlar, oturum ve geçmiş duruyor.

## 4. Performans

- [ ] Açılış, beş dakika boşta ve takvim/not kullanımında takılma yok.
- [ ] LifeOS ve ilişkili WebView süreçlerini birlikte ölç. Paylaşılan çalışma kümesi özel bellek değildir.
- [x] Bellek ve CPU ölçümü kaydedildi; PERFORMANCE.md metrikleri ve sınırlarını açıklar. İlk şartnamedeki 60-120 MB değeri garanti edilen kabul koşulu değil, ulaşılmak istenen bir hedeftir. Hedef henüz sağlanmadı.

## 5. Özellikler ve dersler

- [x] Başka uygulamada Ctrl+Shift+A hızlı formu açıyor (Windows Ayarlar üzerinden gözlendi); dolu taslağı koruma otomatik testte geçti.
- [x] Dolu formda Escape/Vazgeç otomatik testi ve gerçek pencere X düğmesi testi geçti; Düzenlemeye devam et taslağı korudu.
- [ ] Markdown önizleme, hafta içi/haftalık hedefler ve özel odak süreleri çalışıyor.
- [ ] Sağ panel kenarı fare/klavyeyle değişiyor, yeniden açınca genişlik korunuyor.
- [ ] Takvim gün görünümünde 15 dakikalık sürükleme ve Alt+yön tuşlarıyla taşıma çalışıyor.
- [ ] Anadolu dersleri: 7 Kasım 13:00, 11 Kasım 20:00, 12 Kasım 20:00, 13 Kasım 18:00 ve 19:00, Europe/Istanbul. Uyarılar 30 dakika önce ve sesli.
- [ ] Gerçek PDF sayaçları başlangıçta 0/8. Kendi çalışmanı tamamladığında +/− veya Düzenle ile güncelle; yeniden açınca sayı korunmalı.
- [ ] Sınav / PDF / Canlı ders filtresi ve ayrı Hatırlatıcılar sayfası. Sınav aralıkları saat uydurmadan ilgili günlerde; hazırlık uyarıları bir gün önce 18.00.

Yalnızca geçmeyen adımı, beklenen/gerçek davranışı ve gizli bilgi içermeyen görüntüyü bildir. Geçmeyen madde açık kalır.

## 7 Kasım güncel kurulum kontrolü

`38ba8c1` kuruldu; 71 birim testi, 21 tarayıcı akışı ve Windows native kontrol/test/paket işi geçti. Açık tema tercihi güncelleme/yeniden açılışta korundu; açık ve koyu görünüm gerçek pencerede görüldü. 1.501 kayıt korundu.

- [x] Tamamen kapalıyken zamanı geçen uyarı açılışta tek gönderim kaydı üretti; sonraki açılış yinelemedi.
- [x] Sessiz saatlerde pending kaldı; eski sessiz saat tercihi geri yüklenince tek gönderim işlendi.
- [x] Tepside gizli pencereyle zamanlı uyarı tek kez işlendi; önceki tepsi tercihi geri yüklendi.
- [x] Dolu yedek ayrı SQLite profilinde geri yüklendi; ikinci aktarım tüm kayıtları atladı, yeni düzenleme ve yeniden açılış korundu. Canlı profil değiştirilmedi.
- [x] Installer güncellemesi ders, PDF, sohbet kayıtlarını ve bulut oturumunu korudu; kullanıcı kayıtlarının eşitleme kuyruğu boş.

Bu üç uyarının sonucu Windows'a gönderimdir; yeni banner/ses onayı yerine geçmez. Yukarıdaki birleşik maddelerde henüz gözlenmeyen adımlar açık kalır. Uyku/uyanma, çökme, toast düğmeleri, oturum süresi dolması ve fiziksel ağ kesintisi testleri ayrıca yapılabilir; bunlar yapılmış gibi raporlanmadı.

## Yeni not çalışma alanı — 7 Kasım

- [x] `e45e978` kuruldu; önce/sonra 1.501 kayıt içeriği ve tombstone birebir korundu.
- [x] Gerçek Windows penceresinde Çalışma masası ve Kartlar arasında geçiş, iki mevcut notun görüntülenmesi ve sağ paneli daraltma gözlendi. Gerçek notların metni değiştirilmedi.
- [x] Tarayıcı testinde notlar arasında geçişte yerel taslak, görünüm tercihinin yeniden yüklenmesi ve azaltılmış hareket tercihi geçti.

Spotify, görsel ekleri ve ses kaydı bu pakette yoktur; sonraki aşama planı INTEGRATIONS_NEXT.md dosyasındadır.
