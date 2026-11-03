# TEDDY – TED Üniversitesi AI Öğrenci Asistanı (Demo)

TEDDY, öğrencilerin kampüs ve ders sorularına tek yerden cevap veren bir asistandır. Takvim, kurallar, dersler, etkinlikler ve Moodle son tarihleri tek arayüzde toplanır. Ders Modu cevabı hemen vermez, ipuçlarıyla öğrencinin kendisinin çözmesine yardım eder.

Bu proje bir ders için hazırlanmış demodur. **Uygulamadaki kampüs verileri örnektir, gerçek TEDÜ bilgisi değildir.**

## Kurulum ve çalıştırma

Node.js 20 veya üzeri gerekir.

```bash
npm install
npm run dev
```

Uygulama http://127.0.0.1:5173 adresinde açılır. API sunucusu `127.0.0.1:3001` üzerinde çalışır.

Diğer komutlar:

```bash
npm run typecheck
npm run build
```

## Ayarlar (.env)

Hiçbir anahtar olmadan da uygulama demo modunda çalışır. Anahtar eklemek için:

```bash
cp server/.env.example server/.env
```

| Değişken | Açıklama |
|---|---|
| `MOODLE_URL` | Moodle adresi. `https` zorunludur (yalnızca bu makinedeki adresler hariç). |
| `MOODLE_TOKEN` | Kişisel Moodle web service token'ı. |
| `AI_PROVIDER` | `anthropic` veya `openai`. |
| `AI_API_KEY` | Boş bırakılırsa demo modu çalışır. |
| `AI_MODEL` | `anthropic` için isteğe bağlı (varsayılan `claude-opus-5-5`), `openai` için zorunlu. |
| `AI_BASE_URL` | İsteğe bağlı API adresi. Boşsa sağlayıcının varsayılanı kullanılır. |

Değişiklikten sonra sunucuyu yeniden başlatın.

Google Gemini, OpenAI uyumlu adresiyle kullanılır:

```text
AI_PROVIDER=openai
AI_MODEL=gemini-3.5-flash
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_FALLBACK_MODELS=gemini-3.1-flash-lite,gemini-3.5-flash-lite,gemini-3-flash-preview
```

Ücretsiz katmanda kota model başına ayrıdır ve düşüktür. `AI_FALLBACK_MODELS`, bir model dolunca veya yavaşlayınca sıradakini dener.

Bazı Gemini modelleri zaman aşımına uğrayabilir. Bu durumda uygulama sessizce demo cevabına döner ve sunucu logunda `Live AI failed` yazar.

### Moodle token'ı nereden alınır?

Moodle'da genellikle **Profil > Tercihler > Güvenlik anahtarları** sayfasından alınır. Sayfa yoksa kurumunuz web servislerini veya token oluşturmayı kapatmış olabilir. Bu durumda BT birimine danışın. Token'ın aşağıdaki 7 fonksiyona erişebilmesi gerekir:

- `core_webservice_get_site_info`
- `core_enrol_get_users_courses`
- `core_calendar_get_action_events_by_timesort`
- `mod_assign_get_assignments`
- `core_course_get_contents`
- `mod_forum_get_forums_by_courses`
- `mod_forum_get_forum_discussions`

Token kullanmadan önce okulun kurallarına uygun olduğunu kontrol edin.

## Demo modu ve canlı mod

| | Demo modu | Canlı mod |
|---|---|---|
| Koşul | `AI_API_KEY` boş | `AI_API_KEY` dolu |
| Sohbet | Anahtar kelime eşleştirme ve hazır cevaplar | Örnek veri ve Moodle verisiyle LLM |
| Ders Modu | Hazır ipuçları ve açıklamalar | LLM'in soruya özel hazırladığı plan |
| Hata durumu | Yok | Otomatik olarak demo moduna döner |

Moodle bağımsız çalışır. Token yoksa, geçersizse veya Moodle'a ulaşılamıyorsa uygulama örnek verilere döner ve arayüzde "Demo verisi kullanılıyor" etiketini gösterir. Bağlantı durumu ve "Verileri yenile" düğmesi Ayarlar ekranındadır. Moodle yanıtları 10 dakika önbellekte tutulur.

## Klasör yapısı

```text
client/                    React + Vite arayüzü
  public/brand/            Logo dosyaları
  src/
    components/            Tekrar kullanılan arayüz parçaları
    context/               Ayarlar ve profil durumu
    hooks/                 Sohbet, çalışma kayıtları, localStorage
    i18n/                  tr.json, en.json
    screens/               Ekranlar
    services/api.ts        Yalnızca kendi sunucumuza istek atar
    theme.css              Renkler ve fontlar
server/                    Express sunucusu
  .env.example
  src/
    data/                  Ders Modu soruları ve cevapları
    routes/                API uçları
    services/
      moodleService.ts     Salt okunur Moodle erişimi
      dataService.ts       Önce Moodle, olmazsa örnek veri
      ai/aiService.ts      Sağlayıcı seçimi
      ai/prompts.ts        Sistem talimatları
shared/                    İstemci ve sunucunun ortak kodu
  types.ts                 API tipleri
  data/                    Örnek kampüs verileri
```

Ders Modu cevapları, tarayıcı paketine girmesin diye `server/src/data/` içindedir.

## Örnek verileri güncelleme

- Kampüs verileri: `shared/data/` (`calendar`, `rules`, `courses`, `events`, `faq`, `assignments`, `departments`).
- Ders Modu soruları: `server/src/data/study-questions.json`.
- Her metin `tr` ve `en` alanları içerir.
- `offsetDays` bugünden kaç gün sonrası olduğunu belirtir, böylece demoda tarihler güncel kalır. Gerçek veriye geçerken sabit tarih kullanılmalıdır.
- `faq.json` içindeki `keywords` küçük harfle ve Türkçe karaktersiz yazılır (`devamsizlik`).
- Gerçek veriye geçince `_note` alanını kaldırın.

## Tema ve logo

- Renkler ve fontlar `client/src/theme.css` dosyasındadır. Renkler logodan alınmıştır.
- Logo `client/public/brand/tedu-logo.svg` veya `.png` olarak aranır, SVG önceliklidir. Dosya yoksa "TEDDY" metni gösterilir.
- Fontlar Google Fonts'tan yüklenir: başlıklar Source Serif 4, metinler Source Sans 3. İnternet yoksa sistem fontlarına dönülür.

## Erişilebilirlik

- WCAG AA renk kontrastı, açık, koyu ve yüksek kontrast temaları
- En az 16px yazı ve 3 yazı boyutu
- Tam klavye kullanımı, görünür odak çizgisi, "İçeriğe atla" bağlantısı
- Semantik HTML, ekran okuyucu duyuruları (`aria-live`), sayfa değişiminde odak yönetimi
- Bilgi yalnızca renkle verilmez, ikon ve yazı da kullanılır
- Yalnızca ikon içeren düğmelerde `aria-label` vardır. Yazılı düğmelerin erişilebilir adı kendi metnidir.
- `prefers-reduced-motion` ayarına uyulur

## Güvenlik notları

- **Token ve API anahtarınızı kimseyle paylaşmayın.** `.env` dosyası `.gitignore` içindedir, commit etmeyin.
- **Sunumdan sonra Moodle token'ınızı ve AI anahtarınızı yenileyin.** Ekran paylaşırken `.env` dosyasını açmayın.
- Anahtarlar yalnızca sunucuda durur, tarayıcıya, loglara ve hata mesajlarına gönderilmez.
- Sunucu yalnızca `127.0.0.1` adresini dinler, CORS yalnızca localhost'a izin verir.
- Moodle erişimi 7 okuma fonksiyonuyla sınırlıdır (`moodleService.ts` içindeki liste). Yazma, gönderme ve silme yoktur. Forumlardan yalnızca Duyurular (`news`) okunur, yazar adları alınmaz. Katılımcı listesi, not ve başka öğrencilerin verisi çekilmez.
- Uygulama tek kullanıcılıdır: Sunucu açıkken bu makineden uygulamayı açan herkes token sahibinin verisini görür. İnternete açmayın.
- Canlı modda öğrencinin sorusu, ders adları, son tarihler ve soruyla ilgili ders konuları ile duyurular seçilen AI sağlayıcısına gönderilir. Ad, Moodle kullanıcı numarası ve token gönderilmez.

## Bilinen sınırlar

- `mod_assign_get_assignments` teslim durumunu vermez, teslim edilmiş bir ödev son tarihine kadar listede görünebilir.
- Demo modu yalnızca tanımlı anahtar kelimeleri anlar.
- Ders Modu oturumları bellektedir, sunucu yeniden başlayınca silinir.
- Sohbet geçmişi ve çalışma kayıtları yalnızca o tarayıcıda durur.

## Gelecek geliştirmeler

- Öğrenci başına Moodle girişi (çok kullanıcılı yapı)
- Gerçek TEDÜ takvim, yönetmelik ve syllabus verileri
- Belgelerden arama ile daha isabetli kaynak gösterme
- Sohbette önceki mesajları bağlam olarak kullanma ve akışlı cevap
- Teslim durumuna göre ödev filtreleme
- 👍/👎 geri bildirimlerini toplayıp analiz etme
- Bildirim ve hatırlatmalar
- Otomatik testler
