# Windows canlı kabul listesi

Web ve iki istemci testi ertelendi. Yeni native pakette aşağıdaki testleri sırayla uygula. Test kayıtlarını `[Test]` ile adlandır; gerçek derslerin saatini değiştirme. Otomatik testler bu kutuları kapatmaz.

## 1. Hatırlatıcılar

- [ ] Rahatsız etmeyin kapalı: Ayarlar testinde banner ve ses var.
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
- [ ] 60–120 MiB hedefi sağlanmadan performans tamamlandı sayılmaz; ölçüm için PERFORMANCE.md kullan.

## 5. Özellikler ve dersler

- [ ] Başka uygulamada Ctrl+Shift+A hızlı formu açıyor; dolu taslağı değiştirmiyor.
- [ ] Dolu formda Escape/Vazgeç/pencere kapatma uyarıyor; Düzenlemeye devam et taslağı koruyor.
- [ ] Markdown önizleme, hafta içi/haftalık hedefler ve özel odak süreleri çalışıyor.
- [ ] Sağ panel kenarı fare/klavyeyle değişiyor, yeniden açınca genişlik korunuyor.
- [ ] Takvim gün görünümünde 15 dakikalık sürükleme ve Alt+yön tuşlarıyla taşıma çalışıyor.
- [ ] Anadolu dersleri: 7 Kasım 13:00, 11 Kasım 20:00, 12 Kasım 20:00, 13 Kasım 18:00 ve 19:00, Europe/Istanbul. Uyarılar 30 dakika önce ve sesli.

Yalnızca geçmeyen adımı, beklenen/gerçek davranışı ve gizli bilgi içermeyen görüntüyü bildir. Geçmeyen madde açık kalır.
