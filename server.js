const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const buildStatic = require('./buildStatic');

// .env dosyası varsa yükle (ADMIN_USER, ADMIN_PASSWORD gibi gizli ayarlar burada durur, repoya girmez)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envPath);
}

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, 'public');
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
    console.warn('UYARI: ADMIN_PASSWORD tanımlı değil, yönetim paneli girişi kapalı. .env dosyasını kontrol edin.');
}

app.use(express.json());

// Log incoming requests (Disabled for production performance)
app.use((req, res, next) => {
    // console.log(`[REQ] ${req.method} ${req.url}`);
    next();
});

// Basic Auth Middleware
const auth = (req, res, next) => {
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
    if (ADMIN_PASSWORD && login === ADMIN_USER && password === ADMIN_PASSWORD) {
        return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="Login Required"');
    res.status(401).send({"message": "Lütfen giriş yapın."});
};

// Eski panel adresi ve sonunda / olan adres /admin adresine yönlendirilir
app.get(/^\/admin(\.html|\/)$/, (req, res) => {
    res.redirect(301, '/admin');
});

// Protect admin panel
app.get('/admin', auth, (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'admin.html'));
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'anasayfa.html'));
});

// Temiz adresler: /menuler gibi adresler sayfayı açar,
// eski .html adresleri ile sonunda / olanlar kalıcı olarak temiz adrese yönlendirilir
app.get(/^\/(anasayfa|hizmetlerimiz|menuler|iletisim)(\.html|\/)?$/, (req, res) => {
    const page = req.params[0];
    if (page !== 'anasayfa' && !req.params[1]) {
        return res.sendFile(path.join(PUBLIC_DIR, page + '.html'));
    }
    const query = req.originalUrl.slice(req.path.length);
    res.redirect(301, (page === 'anasayfa' ? '/' : '/' + page) + query);
});

// Yalnızca public klasörü dışarıya açıktır. server.js, data.json ve .env gibi dosyalar açılmaz.
app.use(express.static(PUBLIC_DIR, { index: false }));

// GET /api/data
app.get('/api/data', (req, res) => {
    const dataPath = path.join(__dirname, 'data.json');
    if (fs.existsSync(dataPath)) {
        res.json(JSON.parse(fs.readFileSync(dataPath, 'utf8')));
    } else {
        res.json({});
    }
});

// POST /api/data
app.post('/api/data', auth, (req, res) => {
    const dataPath = path.join(__dirname, 'data.json');
    let existingData = {};
    if (fs.existsSync(dataPath)) {
        existingData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }
    
    existingData = { ...existingData, ...req.body };
    fs.writeFileSync(dataPath, JSON.stringify(existingData, null, 4), 'utf8');
    
    // HTML dosyalarını doğrudan güncelle
    try {
        buildStatic();
    } catch(err) {
        console.error("HTML güncellenirken hata oluştu:", err);
    }

    res.json({ status: "success" });
});

// Setup multer for upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync(ASSETS_DIR)) {
            fs.mkdirSync(ASSETS_DIR, { recursive: true });
        }
        cb(null, ASSETS_DIR);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + Math.round(Math.random() * 1E9);
        cb(null, 'upload_' + uniqueSuffix + ext);
    }
});
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error("Sadece resim yükleyebilirsiniz."));
        }
    }
});

// POST /api/upload
app.post('/api/upload', auth, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Dosya seçilmedi" });
    }

    res.json({ status: "success", path: `assets/${req.file.filename}` });
});

// POST /api/delete-image
app.post('/api/delete-image', auth, (req, res) => {
    try {
        const { imagePath } = req.body || {};
        if (!imagePath || typeof imagePath !== 'string') {
            return res.json({ status: "skipped", message: "Görsel yolu belirtilmedi" });
        }

        const filename = path.basename(imagePath);
        // Güvenlik: Yalnızca panelden yüklenen 'upload_' ile başlayan resimlerin silinmesine izin ver
        // Böylece sistemin sabit logoları veya görselleri kazara silinmez!
        if (!filename.startsWith('upload_')) {
            return res.json({ status: "skipped", message: "Varsayılan sistem görseli silinmedi" });
        }

        const imageFile = path.join(ASSETS_DIR, filename);

        let deleted = false;
        if (fs.existsSync(imageFile) && fs.statSync(imageFile).isFile()) {
            try {
                fs.unlinkSync(imageFile);
                deleted = true;
            } catch (e) {
                console.error("Görsel silinirken hata oluştu:", imageFile, e);
            }
        }

        res.json({ status: "success", deleted, filename });
    } catch (err) {
        console.error("Görsel silme API hatası:", err);
        res.status(500).json({ error: err.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    if (err) {
        res.status(400).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
