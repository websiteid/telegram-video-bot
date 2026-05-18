// API ini dirancang untuk dijalankan sebagai Serverless Function di Vercel.
// Di Vercel, pastikan untuk men-setting Environment Variables:
// 1. TELEGRAM_BOT_TOKEN
// 2. GOOGLE_APPS_SCRIPT_URL (URL dari langkah 1)
// 3. VERCEL_URL (URL domain vercel kamu, opsional, jika ingin membuat link custom)

export default async function handler(req, res) {
  // Telegram akan mengirim update ke sini melalui POST request
  if (req.method === 'POST') {
    
    const update = req.body;
    
    // Pastikan request memiliki data pesan
    if (!update || !update.message) {
      return res.status(200).json({ message: "Bukan pesan standar" });
    }
    
    const chatId = update.message.chat.id;
    const messageId = update.message.message_id;
    
    const sendMessage = async (text) => {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: text,
            reply_to_message_id: messageId,
            parse_mode: "HTML"
          })
        });
      } catch (error) {
        console.error("Gagal mengirim pesan balasan:", error);
      }
    };
    
    if (update.message.video) {
      // User mengirimkan video
      const video = update.message.video;
      const fileId = video.file_id;
      
      // Ambil ID thumbnail jika tersedia dari Telegram
      let thumbId = '';
      if (video.thumbnail && video.thumbnail.file_id) {
          thumbId = video.thumbnail.file_id;
      } else if (video.thumb && video.thumb.file_id) { // Untuk kompatibilitas versi API lama
          thumbId = video.thumb.file_id;
      }

      // KITA UBAH BAGIAN INI: Masukkan link UTAMA Vercel kamu secara langsung di sini
      const appUrl = 'https://telegram-video-bot-six.vercel.app';
      
      // Tambahkan param &thumb= ke URL agar halaman video bisa menampilkannya
      const generatedLink = `${appUrl}/api/video?id=${fileId}${thumbId ? `&thumb=${thumbId}` : ''}`; 
      
      await sendMessage("⏳ Sedang memproses video dan menyimpannya ke database...");
      
      const sheetApiUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
      
      if (!sheetApiUrl) {
         await sendMessage("❌ Sistem belum dikonfigurasi sepenuhnya (Google Sheets URL hilang).");
         return res.status(200).send('OK');
      }

      try {
        const sheetResponse = await fetch(sheetApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoId: messageId,
            fileId: fileId,
            telegramUrl: generatedLink
          })
        });
        
        const result = await sheetResponse.json();
        
        if (result.status === 'success') {
           const replyText = `✅ **Video Berhasil Disimpan!**\n\n` + 
                             `🔗 **Link Video Kamu:**\n<a href="${generatedLink}">${generatedLink}</a>\n\n` +
                             `*(Data telah tercatat di Google Sheets)*`;
           await sendMessage(replyText);
        } else {
           await sendMessage("⚠️ Gagal menyimpan ke database, tapi video diterima.");
        }
        
      } catch (error) {
        console.error("Error ke Google Sheets:", error);
        await sendMessage("❌ Terjadi kesalahan saat menghubungi database.");
      }
      
    } else {
      // Jika bukan video, suruh kirim video
      await sendMessage("Kirimkan saya sebuah video, dan saya akan membuatkan linknya untukmu!");
    }
    
    // Telegram mengharapkan status 200 OK agar tidak mengirim ulang webhook
    return res.status(200).send('OK');
    
  } else {
    // Jika ada yang mengakses via browser biasa
    res.status(200).json({ status: "Bot is running. Menunggu webhook dari Telegram." });
  }
}
