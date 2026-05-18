export default async function handler(req, res) {
  // Hanya menerima GET request karena ini diakses via browser
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { id, thumb } = req.query;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  // Jika tidak ada ID video, tampilkan pesan error
  if (!id) {
    return res.status(400).send("ID File Video tidak ditemukan pada URL.");
  }

  // Memastikan token bot sudah diatur di Vercel Environment Variables
  if (!botToken) {
    return res.status(500).send("Token Bot Telegram belum dikonfigurasi di Vercel.");
  }

  try {
    // 1. Ambil informasi lokasi file video asli langsung dari Telegram
    const videoFileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${id}`);
    const videoFileData = await videoFileRes.json();

    if (!videoFileData.ok) {
      console.error("Gagal mendapat video:", videoFileData);
      return res.status(404).send("Video tidak ditemukan atau sudah kadaluarsa di Telegram.");
    }

    // Ini adalah link "Direct Stream" langsung ke server Telegram (Anti-Lag)
    const directVideoUrl = `https://api.telegram.org/file/bot${botToken}/${videoFileData.result.file_path}`;

    // 2. Ambil URL thumbnail/poster jika parameter thumb tersedia
    let posterUrl = "";
    if (thumb) {
      try {
        const thumbFileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${thumb}`);
        const thumbFileData = await thumbFileRes.json();
        if (thumbFileData.ok) {
          posterUrl = `https://api.telegram.org/file/bot${botToken}/${thumbFileData.result.file_path}`;
        }
      } catch (thumbErr) {
        console.error("Gagal mengambil thumbnail:", thumbErr);
        // Tetap lanjut meskipun gagal ambil thumbnail
      }
    }

    // 3. Tampilkan HTML super ringan yang langsung memutar dari link direct Telegram
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>Video Player</title>
        <style>
          /* Reset margin dan buat tampilan hitam penuh (Fullscreen) */
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body, html { 
            width: 100%; 
            height: 100%; 
            background-color: #000; /* Latar belakang hitam pekat */
            overflow: hidden; /* Hilangkan scrollbar */
            display: flex; 
            justify-content: center; 
            align-items: center; 
          }
          
          /* Atur agar video pas di layar tanpa merusak rasio */
          video { 
            width: 100vw; 
            height: 100vh; 
            object-fit: contain; 
            background: #000;
            outline: none;
          }
        </style>
      </head>
      <body>
        <!-- preload="auto" memaksa browser memuat video sebelum di-play agar tidak lag -->
        <video 
          controls 
          preload="auto" 
          playsinline 
          ${posterUrl ? `poster="${posterUrl}"` : ''}
        >
          <source src="${directVideoUrl}" type="video/mp4">
          Browser kamu tidak mendukung pemutar video HTML5.
        </video>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(htmlContent);

  } catch (error) {
    console.error("Kesalahan Server:", error);
    return res.status(500).send("Terjadi kesalahan sistem saat memuat video.");
  }
}
