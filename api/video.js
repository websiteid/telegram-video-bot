export default async function handler(req, res) {
  // Hanya menerima GET request (saat orang membuka link di browser)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Mengambil parameter 'id' dari URL (misalnya ?id=BAAC...)
  const fileId = req.query.id;
  const thumbId = req.query.thumb; // Mengambil parameter thumbnail

  if (!fileId) {
    return res.status(400).send('File ID tidak ditemukan di URL.');
  }

  // Mengambil token bot dari Environment Variables
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return res.status(500).send('Sistem belum dikonfigurasi (Token Bot hilang).');
  }

  try {
    // 1. Tanya Telegram di mana lokasi file dengan file_id ini berada
    const getFileUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
    const fileResponse = await fetch(getFileUrl);
    const fileData = await fileResponse.json();

    if (!fileData.ok) {
      console.error("Gagal mendapatkan file dari Telegram:", fileData);
      return res.status(404).send('Video tidak ditemukan atau sudah kadaluarsa di server Telegram.');
    }

    // path file dari server Telegram
    const filePath = fileData.result.file_path;

    // 2. Buat URL langsung (direct link) ke file tersebut
    const videoDirectUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

    // 3. (BARU) Jika ada thumbId, ambil URL gambarnya dari Telegram
    let posterUrl = '';
    if (thumbId) {
       try {
           const getThumbUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${thumbId}`;
           const thumbRes = await fetch(getThumbUrl);
           const thumbData = await thumbRes.json();
           if (thumbData.ok) {
               posterUrl = `https://api.telegram.org/file/bot${token}/${thumbData.result.file_path}`;
           }
       } catch (err) {
           console.log("Gagal mengambil thumbnail:", err);
       }
    }

    // 4. Kita kembalikan halaman HTML dengan tampilan Fullscreen dan Poster
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <title>Pemutar Video</title>
          <style>
              /* Mengubah tampilan agar memenuhi seluruh layar tanpa margin */
              html, body {
                  margin: 0;
                  padding: 0;
                  width: 100%;
                  height: 100%;
                  background-color: #000; /* Warna hitam legam lebih cocok untuk video full */
                  overflow: hidden; /* Mencegah scroll */
                  display: flex;
                  justify-content: center;
                  align-items: center;
              }
              
              /* Membuat video selebar dan setinggi layar, menjaga rasio aspek */
              video {
                  width: 100vw;
                  height: 100vh;
                  object-fit: contain; /* memastikan video tidak terpotong, tapi memenuhi maksimal ruang */
                  outline: none; /* Hilangkan garis biru saat diklik */
              }
          </style>
      </head>
      <body>
          <!-- Memutar video dengan atribut preload dan poster -->
          <!-- controlsList="nodownload" (opsional) mencegah tombol download default browser -->
          <video 
            controls 
            preload="metadata" 
            ${posterUrl ? `poster="${posterUrl}"` : ''} 
            playsinline
          >
              <source src="${videoDirectUrl}" type="video/mp4">
              Browser kamu tidak mendukung pemutar video HTML5.
          </video>
      </body>
      </html>
    `;

    // Set Header agar browser tahu ini adalah halaman HTML
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(htmlContent);

  } catch (error) {
    console.error("Terjadi kesalahan:", error);
    return res.status(500).send('Terjadi kesalahan internal saat mencoba memuat video.');
  }
}
