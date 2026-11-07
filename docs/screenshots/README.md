# Görsel envanteri

README görselleri yalnızca izole Playwright tarayıcısındaki kurgu kayıtlarla üretilir. Native SQLite, gerçek Supabase hesabı, kişisel sohbet listesi veya kullanıcı masaüstü yakalanmaz. Gerçek kayıtları bulanıklaştırmak yerine baştan yer tutucu veri oluşturulur.

| Dosya                                              | İçerik                                                              | Kaynak               |
| -------------------------------------------------- | ------------------------------------------------------------------- | -------------------- |
| overview-demo.png                                  | Örnek gün, ders, PDF ilerlemesi, odak                               | presentation.spec.ts |
| notes-demo.png / notes-dark-demo.png               | Proje Atlas ve kurgu notlar, çalışma masası                         | presentation.spec.ts |
| tasks-demo.png                                     | Kurgu görev/ders/sınav/PDF                                          | presentation.spec.ts |
| calendar.png                                       | Kurgu takvim, 2030 tarihleri; eski kişisel takvim görselinin yerine | presentation.spec.ts |
| conversations-demo.png                             | Yer tutucu sohbet URL ve Codex UUID’leri                            | presentation.spec.ts |
| dashboard.png / mobile.png                         | Boş durum / mobil düzen                                             | workspace.spec.ts    |
| workspace-light-demo.png / workspace-dark-demo.png | Kurgu öğrenme kayıtlarıyla tema kontrolü                            | workspace.spec.ts    |
| chat-history-demo.png                              | Sentetik büyük sohbet listesi                                       | workspace.spec.ts    |

Ana sunum görselleri 1360 × 1000 pikselde alınır; GitHub’da resme tıklayarak tam boy görüntülenir. Metinler görüntüye sonradan yazılmaz; çalışan arayüzün kendisidir. Örnek ilerleme ve tarihlerin gerçek kullanıcı aktivitesi olduğu iddia edilmez. Görseller Windows native kabul kanıtı değildir.

Yeniden üretim: önce `pnpm --filter @lifeos/web build`, ardından `pnpm exec playwright test tests/e2e/presentation.spec.ts`. Testin kurgu veri tanımı kaynak kodda incelemeye açıktır; kullanıcı hesabı gerekmez.
