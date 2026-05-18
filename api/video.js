export default async function handler(req, res) {
  // Hanya menerima GET request (saat orang membuka link di browser)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Mengambil parameter 'id' dari URL (misalnya ?id=BAAC...)
  const fileId = req.query.id;

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
    // Catatan: Link ini sifatnya SEMENTARA (hanya bertahan sekitar 1 jam menurut aturan Telegram)
    const videoDirectUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

    // 3. Kita kembalikan halaman HTML sederhana yang memiliki pemutar video (video player)
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Pemutar Video</title>
          <style>
              body {
                  margin: 0;
                  padding: 0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  background-color: #111; /* Warna latar belakang gelap */
                  font-family: sans-serif;
                  color: white;
              }
              video {
                  max-width: 100%;
                  max-height: 100vh;
                  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
              }
              .container {
                  text-align: center;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <!-- Memutar video langsung dari server Telegram -->
              <video controls autoplay>
                  <source src="${videoDirectUrl}" type="video/mp4">
                  Browser kamu tidak mendukung pemutar video HTML5.
              </video>
              <br>
              <p style="opacity: 0.5; font-size: 12px; margin-top: 10px;">
                  Link video ini bersifat sementara dan mungkin kedaluwarsa.
              </p>
          </div>
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
