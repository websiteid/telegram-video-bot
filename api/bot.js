export default async function handler(req, res) {
  // Hanya menerima POST request (dari webhook Telegram)
  if (req.method !== 'POST') {
    return res.status(200).json({ status: "Bot is running. Menunggu webhook dari Telegram." });
  }

  const update = req.body;
  
  // Pastikan request memiliki data pesan yang valid
  if (!update || !update.message) {
    return res.status(200).json({ message: "Bukan pesan standar" });
  }
  
  const chatId = update.message.chat.id;
  const messageId = update.message.message_id;
  
  // Fungsi bantuan untuk mengirim pesan balasan ke Telegram
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
    // Mengekstrak ID File Video
    const video = update.message.video;
    const fileId = video.file_id;
    
    // Mengekstrak ID Thumbnail (jika tersedia)
    let thumbId = '';
    if (video.thumbnail && video.thumbnail.file_id) {
        thumbId = video.thumbnail.file_id;
    } else if (video.thumb && video.thumb.file_id) { 
        thumbId = video.thumb.file_id;
    }

    // URL Vercel Utama Kamu (Tanpa login/preview)
    const appUrl = 'https://telegram-video-bot-six.vercel.app';
    
    // Membuat link final untuk dikirim ke user
    const generatedLink = `${appUrl}/api/video?id=${fileId}${thumbId ? `&thumb=${thumbId}` : ''}`; 
    
    // Kirim status proses ke user
    await sendMessage("⏳ Sedang memproses video dan menyimpannya ke database...");
    
    const sheetApiUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    
    if (!sheetApiUrl) {
       await sendMessage("❌ Sistem belum dikonfigurasi sepenuhnya (Google Sheets URL hilang).");
       return res.status(200).send('OK');
    }

    try {
      // Mengirim POST request ke Apps Script
      const sheetResponse = await fetch(sheetApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: messageId,
          fileId: fileId,
          telegramUrl: generatedLink
        })
      });
      
      const result = await sheetResponse.json();
      
      if (result.status === 'success') {
         const replyText = `✅ **Video Berhasil Disimpan!**\n\n🔗 **Link Video Kamu (Tanpa Lag):**\n<a href="${generatedLink}">${generatedLink}</a>\n\n*(Data telah tercatat di Google Sheets)*`;
         await sendMessage(replyText);
      } else {
         await sendMessage(`⚠️ Gagal menyimpan ke database (${result.message}), tapi video diterima. Link: ${generatedLink}`);
      }
      
    } catch (error) {
      console.error("Error ke Google Sheets:", error);
      // Tetap berikan link meskipun gagal save ke database
      await sendMessage(`❌ Gagal kontak database. Tapi ini link videonya:\n${generatedLink}`);
    }
    
  } else {
    await sendMessage("Kirimkan saya sebuah video, dan saya akan mengubahnya menjadi link web yang cepat!");
  }
  
  // Wajib mengirim status 200 agar Telegram tidak melakukan loop/retries
  return res.status(200).send('OK');
}
