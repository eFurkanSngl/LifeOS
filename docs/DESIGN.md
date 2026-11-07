# LifeOS çalışma alanı

Kullanıcının istediği açık/koyu tema ve daha kolay günlük kullanım için düzen yenilendi. Tema seçimi üst çubuktadır; cihazda saklanır ve Sistem seçeneği Windows tercihine uyar.

## Görsel kararlar

Koyu temada grafit `#121724`, katmanlar `#20283a` ve indigo `#7482f5`; açık temada bulut `#f2f4fa`, beyaz `#ffffff` ve indigo `#4b5dcc`. Öğrenme alanı turkuaz, odak alanı kehribar kullanır. Windows'un Segoe UI Variable ailesi metin ile sayıların okunmasını sağlar; uzak font bağımlılığı yoktur.

Tek ana sayfa yerine işlevlerin aynı ağırlıkta kutulanması azaltıldı: hızlı işlemler tek satır, günlük durum dar bir şerit, öğrenme özeti geniş bir panel, günün akışı ve odak ayrı alanlardır. Boş proje paneli günlük ekranı gereksiz uzatmaz. Gerçek kayıt yoksa ilerleme veya çalışma üretilmez.

```text
Gezinme | Arama                           Tema / Hızlı ekle
        | Bugünün çalışma alanı              | Yardımcı panel
        | Hızlı işlemler                     | son sohbetler
        | Günlük durum                       | not yakalama
        | Öğrenme: üniteler + sıradaki ders   |
        | Günün akışı           Odak         |
```

Sohbetler gezinmede doğrudan görünür. Kaynak sekmeleri, arama, kırkar kayıt yükleme ve Codex devam komutunu kopyalama vardır. Başlıklar tam saklanır; uzun başlıklar ekranda sınırlanır. Tam mesajlar kaynak uygulamadadır. Otomatik geçmiş eşitlemesi veya çalışan Codex masaüstü deep-link iddiası yoktur.

Klavye odağı korunur, dar ekranda bölümler tek sütuna iner. Kısa pencerelerde gezinme kaydırılabilir; Ayarlar pencere dışında kalmaz. Ekran görüntülerindeki örnek kayıtlar sentetik test verisidir; kişisel sohbetler Git'e eklenmez.
