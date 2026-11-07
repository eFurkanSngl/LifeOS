# Sonraki entegrasyonlar — tasarım kararı, 7 Kasım 2026

Bu belge planı anlatır; aşağıdaki özellikler mevcut sürümde uygulanmış veya canlı doğrulanmış değildir. Kullanıcı arkadaşlarıyla paylaşım, Spotify kontrolü, nota görsel ve olası ses kaydı fikirlerini istedi. Önce okunabilir sunum ve mevcut masaüstü teslimi tamamlanır.

## Spotify: iki farklı yol

|                | Windows yerel medya paneli                                                                | Spotify Web API                                                                   |
| -------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| İlk kullanım   | Bilgisayarda Spotify açılır; LifeOS parça bilgisi ve sunulan medya kontrollerini gösterir | Kullanıcı OAuth ile Spotify hesabını yetkilendirir                                |
| İlk kapsam     | Başlık, sanatçı, oynat/duraklat, önceki/sonraki                                           | Cihaz/oynatma durumu ve kapsamlarla izin verilen uzaktan kontrol                  |
| Kimlik bilgisi | Spotify geliştirici secret/token toplamaz                                                 | Public desktop client için PKCE; token koruması ve revoke/disconnect gerekir      |
| Sınır          | Spotify’ın Windows’a açtığı oturum ve desteklediği kontrollerle sınırlı                   | Premium, geliştirici erişimi, kullanıcı/kota koşulları ve aktif cihaz gerekir     |
| Dağıtım        | Her kullanıcının kendi bilgisayarındaki Spotify hedeflenir                                | Geliştirme modu genel dağıtım izni değildir; güncel şartlar ayrıca kontrol edilir |

İlk öneri Windows yoludur: arayüzde küçük bir panel; kullanıcı açmadan tarama yapılmaz, kapalı/minimize uygulamada sürekli polling çalışmaz. Yalnızca Spotify olarak tanınan oturum hedeflenir; başka uygulamanın müziğini yanlışlıkla durduracak genel medya tuşu gönderilmez. İzin yoksa veya oturum bulunamazsa açıklama gösterilir. Album art ve müzik dosyaları indirilmez, kaydedilmez veya buluta gönderilmez. İlk komut ancak kullanıcının açık düğme eyleminden sonra gönderilir.

Resmî Windows [GlobalSystemMediaTransportControlsSessionManager](https://learn.microsoft.com/en-us/uwp/api/windows.media.control.globalsystemmediatransportcontrolssessionmanager?view=winrt-26100), sistem medya oturumlarını okuma ve kontrol etme API’sidir. Paketleme/izin ve gerçek Spotify davranışı native test gerektirir. Bu nedenle bir API dokümanı veya frontend mock testi entegrasyonun çalıştığını kanıtlamaz.

Spotify’ın [oynatma API’si](https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback) Premium gerektirir. [Kota modları](https://developer.spotify.com/documentation/web-api/concepts/quota-modes) ve [23 Temmuz 2026 güncellemesi](https://developer.spotify.com/blog/2026-07-23-web-api-quota-updates) dağıtım tasarımından önce okunmalıdır; bu güncelleme geliştirme uygulamalarının kotalarını geliştirici hesabı başına birleştirir. Hesap/uygulama oluşturulmadı ve token istenmedi.

Yerel panel, Spotify müziğini LifeOS içinde yeniden yayınlayan bir oynatıcı değildir. Spotify uygulaması oynatmayı yürütür; LifeOS yalnızca kontrol yüzeyi olur. Telefon ve diğer cihaz kontrolü farklı bir kapsamdır.

## Görsel ekleri

Mevcut not gövdesi sınırlı bir metindir. SQLite/cloud zarflarına base64 görsel sıkıştırmak dosya boyutunu, JSON yedeklerini ve eşitleme maliyetini büyütür; mevcut limitlerle uyumlu değildir.

Önerilen ayrı aşama:

1. PNG/JPEG/WebP dosyası veya `Ctrl+V` ile nota görsel; MIME, gerçek imza, boyut ve piksel limitleri doğrulanır. SVG/HTML yürütülmez ve keyfi dosya yolları açılmaz.
2. Native app-data altında ayrı ek deposu; UUID/content hash, nota bağlanan manifest, atomik yazma ve sürümlü migration. Eski metin notları ve kayıt ID’leri korunur.
3. Küçük önizleme, tam boy açma ve nota bağlı açıklama. Kaynak dosya adı yerine uygulamanın ürettiği dosya adı kullanılır.
4. JSON yedeğinden farklı, manifest + dosyaları içeren doğrulanmış medya paketi. Eksik/bozuk dosya, tekrar içe aktarma, silme tombstone’u ve çökme kurtarma testleri gerekir.
5. Bulut dosyaları ayrı karardır: özel bucket, kullanıcıya bağlı Storage RLS ve süreli erişim. Kimsenin görseli sessizce yüklenmez. Yerel-only ilk kapsam açıkça belirtilir.

## Ses kaydı

Görsel ek deposunun üzerine kurulması önerilir. Kullanıcı **Kaydı başlat** düğmesine basar; mikrofon iznini kendisi verir. Kayıt sırasında açık süre/gösterge, durdur, dinle ve nota kaydet düğmeleri olur. Mikrofon reddi, cihaz kopması, uzun/sıfır kayıt ve uygulama kapanışı güvenli ele alınır. Arka planda gizli kayıt veya otomatik açılış yapılmaz.

İlk sürüm ses eki saklar; konuşmayı metne çevirme taahhüdü yoktur. Ücretli AI hizmeti eklenmez. Ses dosyaları yedek ve isteğe bağlı bulut kapsamı netleşmeden teslim edilmiş sayılmaz.

## Kabul sınırı

Spotify için gerçek native komut/state testi; görsel/ses için kayıt, yeniden açma, yedek/geri yükleme ve kullanıcıya ait dosya izolasyonu ayrı doğrulanmalıdır. Bu fikirler için çalışmayan düğmeler veya gerçek veri gibi görünen sahte oynatma durumu eklenmedi.
