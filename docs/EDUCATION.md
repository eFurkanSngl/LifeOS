# Eğitim kayıtları

Görevler’de dört tür vardır: genel görev, canlı ders, sınav/akademik tarih ve PDF/ünite çalışması. Tür filtresi kayıtları ayırır; hızlı ekleme düğmeleri uygun alanları açar. Mevcut görevler genel türüyle okunmaya devam eder.

PDF takibi tamamlanan/toplam ünite sayısıdır. +/− düğmeleri sınırlarda durur; son ünite tamamlandığında görev tamamlanır, geri alınınca durum yeniden açılır. Düzenle formundan toplam ve tamamlanan sayı değiştirilebilir. Kaynak bağlantısı ayrı açılır. eKampüs’teki görüntüleme yüzdesi tamamlanan ünite sayısı olarak aktarılmaz.

Sınav tarihleri başlangıç ve dahil bitiş günüyle tüm gün kaydıdır; takvim her güne yerleştirir. Gerçek oturum saati bilinmiyorsa saat alanı kullanılmaz. Sınav giriş belgesi yayımlandığında kullanıcı kaydı düzenleyebilir. Tüm gün işareti kaldırılarak kesin saat eklenebilir.

Hatırlatıcılar ayrı sayfadan elle eklenir, düzenlenir ve ertelenir. Bir göreve bağlanabilir. Canlı ders ekleme formunda hatırlatıcı varsayılanı 30 dakikadır; tarih ve saat kullanıcı tarafından girilir. Yerel native kuyruk uygulama açıkken çalışır.

## Anadolu aktarımının sınırları

Kaynak, kullanıcının açık eKampüs oturumundaki ders materyalleri ve 2026–2027 akademik takvimidir. Beş dersin her birinde sekiz PDF ünitesi doğrulandı. Kullanıcı başlangıçta hiçbir üniteyi işaretlememeyi seçti; tüm sayaçlar 0/8 başlatılır.

Genel takvimde beş sınav aralığı ve dört sınav merkezi tercih son günü vardır. Bunlar ders bazındaki kişisel oturum saatleri değildir. Bahar ve yaz tarihleri kullanıcının ilgili döneme kayıtlı olduğunu göstermez. Hazırlık uyarıları başlangıç gününden önceki gün 18.00 Europe/Istanbul içindir; sınav saati anlamına gelmez.

Aktarım tek seferliktir. Kaynak değişiklikleri otomatik izlenmez. Yeni kayıtlar doğrulanmış uygulama servisiyle ve sabit kimliklerle eklenir; mevcut kayıtlar silinmez, aktarım tekrarlandığında yeni kayıtlar çoğaltılmaz. Aktarımdan önce özel yerel yedek alınır. Özel kaynak dökümleri/yedekler `.tools` altında tutulur ve Git’e eklenmez.

## Doğrulama

Otomatik testler eski kayıt uyumluluğunu, ünite sınırlarını, tamamlama/geri alma durumlarını, PDF sayacının yeniden yüklemede korunmasını, tür filtresini, sınavın iki güne yayılmasını ve bağımsız hatırlatıcı eklemeyi kapsar. Gerçek ders saatindeki Windows teslimi ayrı canlı kabul adımıdır.

## Kurulu veri kontrolü — 7 Kasım 2026

Son paket (`2501368`) mevcut kuruluma başarıyla uygulandı; güncellemeden önce özel JSON yedeği alındı. Güncelleme sonrası uygulama şemasıyla doğrulanan yerel kayıtlar: 5 canlı ders, her biri 0/8 olan 5 PDF, 9 tüm gün akademik tarih ve 9 bağımsız hazırlık hatırlatıcısı. Derslerin 5 alarmında da kaynak başlangıcına 30 dakika fark ve ses etkinliği korunuyor. Tarihi geçen alarmın `delivered` durumu yeniden `pending` yapılmadı. Hazırlık uyarılarında taskId bulunmuyor; kapatılmaları sınav görevini tamamlamaz.

Önceki kurulu eğitim paketinde PDF filtresi, beş sıfır sayaç ve temiz yeniden açılışta kayıtların korunması gözlendi. Son paketin ayrı Hatırlatıcılar sayfası tüm kayıtları listeler; dokuz hatırlatıcılı otomatik akış geçti. Son pakette bu ekranın native görsel doğrulaması henüz yapılmadı: Computer Use oturumu `CryptUnprotectData` hatasıyla başlatılamadı. Bu sınırlama native kabul adımını kapatmaz.
