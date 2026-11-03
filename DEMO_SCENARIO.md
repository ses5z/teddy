# TEDDY Sunum Senaryosu

Tahmini süre: 8-10 dakika.

## Sunumdan önce

1. `server/.env` içinde Moodle token'ının dolu olduğunu kontrol edin. Dosyayı ekranda açmayın.
2. `npm run dev` ile uygulamayı başlatın.
3. Ayarlar'da "Moodle bağlantısı: Bağlı" yazısını görün ve "Verileri yenile"ye basın.
4. "Verilerimi sıfırla" ile temiz başlayın.
5. Moodle'da önümüzdeki 7 günde ödev olduğunu kontrol edin. Yoksa 3. adımda "ödev görünmüyor" cevabı gelir.

Moodle çalışmazsa sunuma aynen devam edin. Uygulama örnek veriye döner, adımlardaki "Moodle" etiketleri "Örnek veri" olarak görünür.

## Akış

### 1. Karşılama

- Logoyu ve "Merhaba, ben TEDDY" ekranını gösterin.
- Dili bir kez English yapıp Türkçeye dönün.
- 3 adımlı tanıtımı geçin.
- **Söyleyin:** "Bilgi dağınık, öğrenciler aynı soruları WhatsApp'ta soruyor. TEDDY hepsini tek yerde topluyor."

### 2. Moodle'dan gelen derslerim

- Giriş ekranında isim ve derslerin Moodle'dan geldiğini gösterin, "Onayla ve başla"ya basın.
- Ana ekrandan **Derslerim**'i açın, "Moodle'dan" etiketini gösterin.
- **Söyleyin:** "Şifre istemiyoruz. Token yalnızca sunucuda duruyor ve yalnızca okuma yapıyor."

### 3. "Bu hafta hangi ödevlerim var?"

- Ana ekrana dönüp "Yaklaşanlar" kutusunu gösterin.
- Örnek soru düğmesine tıklayın, "yazıyor" göstergesini gösterin.

### 4. Kaynaklı cevap

- Cevabın altındaki "Kaynak: Moodle" etiketini gösterin ve 👍 verin.
- "Devamsızlık sınırı kaç?" diye sorun, "Örnek veri" etiketini ve kaynak linkini gösterin.
- "Pizza tarifi verir misin?" diye sorun.
- **Söyleyin:** "TEDDY bilmediğinde uydurmuyor, ilgili birime yönlendiriyor."

### 5. Ders modu ipucu akışı (en önemli adım)

- **Ders Modu**'nu açın ve bir ders seçin.
- Örnek listesinden bir soru seçin. ECON 101'de esneklik sorusu iyi çalışır.
- İlk ipucunu gösterin, "Bir ipucu daha"ya basın.
- "Tam açıklamayı göster"e basın, onay sorusunu gösterin, "Evet, bir ipucu ver"i seçin.
- Son ipucundan sonra açıklamayı açın, ardından benzer soruyu gösterin.
- **Söyleyin:** "Hazır AI araçları cevabı direkt veriyor. TEDDY'de cevap, öğrenci isteyene kadar tarayıcıya bile gelmiyor."

Moodle dersiniz örnek sorularla eşleşmiyorsa demo modunda yalnızca genel ipuçları gelir. Bu adımı canlı AI ile veya elle girişteki örnek derslerle yapın.

### 6. Panel

- **Panel**'i açın: geri sayımlar, ders istatistiği, zorlanılan konu ve "Bugün 20 dk..." önerisi.
- **Söyleyin:** "5. adımda kullandığımız ipucu sayısı burada görünüyor."

### 7. Erişilebilirlik ayarları

- **Ayarlar**'da yazı boyutunu "Çok büyük" yapın, koyu temayı ve yüksek kontrastı açın.
- Klavyeyle Tab'a basarak odak çizgisini gösterin.
- Moodle bağlantı durumunu gösterin.
- Ayarları sıfırlayıp normale dönün.

## Olası sorular

- **"Bu bilgiler gerçek mi?"** Moodle verisi gerçektir. Kampüs bilgileri örnektir ve etiketlenmiştir.
- **"Veriler nereye gidiyor?"** Demo modunda hiçbir yere. Canlı modda soru, ders adları ve son tarihler AI sağlayıcısına gider. Ad ve token gönderilmez.
- **"Öğrenci cevabı yine de görebilir mi?"** Evet, onay sonrası açıklamayı açabilir. Amaç yasaklamak değil, önce denemeye yönlendirmektir. Kaç ipucu kullandığı kaydedilir.

## Sunumdan sonra

Moodle token'ınızı ve AI anahtarınızı yenileyin.
