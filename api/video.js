const axios = require('axios');

module.exports = async (req, res) => {
    // Mengambil ID file dari query string (?id=FILE_ID)
    const fileId = req.query.id;

    if (!fileId) {
        return res.status(400).json({ error: 'Missing "id" parameter dalam query URL.' });
    }

    // Mengambil API Key dari Environment Variables (Sangat direkomendasikan jika file besar)
    const apiKey = process.env.GOOGLE_API_KEY;
    
    // URL Google Drive API untuk mendownload file mentah (alt=media)
    let driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    if (apiKey) {
        driveUrl += `&key=${apiKey}`;
    }

    try {
        // Melakukan request ke Google Drive dengan responseType 'stream'
        const response = await axios({
            method: 'GET',
            url: driveUrl,
            responseType: 'stream',
            headers: {
                // Teruskan header Range jika browser memintanya (penting untuk seeking/scrubbing video)
                ...(req.headers.range && { Range: req.headers.range })
            }
        });

        // Meneruskan headers penting dari Google Drive ke Browser agar terbaca sebagai Video Stream
        res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');
        
        if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
        }
        if (response.headers['content-range']) {
            res.setHeader('Content-Range', response.headers['content-range']);
        }
        if (response.headers['accept-ranges']) {
            res.setHeader('Accept-Ranges', response.headers['accept-ranges']);
        }

        // Set status code sesuai response dari Google Drive (misal 206 Partial Content untuk streaming)
        res.status(response.status);

        // Alirkan (pipe) data video langsung ke browser tanpa menyimpannya di memory server Vercel
        response.data.pipe(res);

    } catch (error) {
        console.error('Error streaming dari Google Drive:', error.message);
        
        if (error.response) {
            return res.status(error.response.status).json({ 
                error: 'Gagal mengambil file dari Google Drive.', 
                details: error.response.statusText 
            });
        }
        
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
};
