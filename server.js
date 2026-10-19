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

// Protect admin.html
app.get('/admin.html', auth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'anasayfa.html'));
});

// Debug endpoint to check server directory structure
app.get('/api/debug-files', (req, res) => {
    try {
        const rootFiles = fs.readdirSync(__dirname);
        let assetsFiles = [];
        const assetsPath = path.join(__dirname, 'assets');
        if (fs.existsSync(assetsPath)) {
            assetsFiles = fs.readdirSync(assetsPath);
        }
        res.json({
            dirname: __dirname,
            cwd: process.cwd(),
            rootFiles,
            assetsExists: fs.existsSync(assetsPath),
            assetsFiles
        });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// Explicit asset delivery handler
app.get('/assets/*path', (req, res, next) => {
    // In Express 5, req.params.path is an array of segments
    let assetPathStr = req.params.path || req.params[0] || '';
    if (Array.isArray(assetPathStr)) {
        assetPathStr = assetPathStr.join('/');
    }
    const filename = path.basename(assetPathStr);
    const candidates = [
        path.join(__dirname, 'assets', assetPathStr),
        path.join(process.cwd(), 'assets', assetPathStr),
        path.join(__dirname, 'public', 'assets', assetPathStr),
        path.join(__dirname, assetPathStr),
        path.join(process.cwd(), assetPathStr),
        // Fallbacks just in case
        path.join(__dirname, 'assets', filename),
        path.join(__dirname, 'public', 'assets', filename)
    ];
    for (const p of candidates) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
            return res.sendFile(p);
        }
    }
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use(express.static(__dirname));

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
        const assetsDir = path.join(__dirname, 'assets');
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir);
        }
        cb(null, assetsDir);
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

    // Express 5 ve sunucu ortamları (cPanel / Passenger / Nginx) için hem assets hem public/assets klasörüne kopyala
    try {
        const publicAssetsDir = path.join(__dirname, 'public', 'assets');
        if (!fs.existsSync(publicAssetsDir)) {
            fs.mkdirSync(publicAssetsDir, { recursive: true });
        }
        fs.copyFileSync(req.file.path, path.join(publicAssetsDir, req.file.filename));
    } catch(e) {
        console.error("public/assets klasörüne kopyalama:", e.message);
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

        const candidatePaths = [
            path.join(__dirname, 'assets', filename),
            path.join(process.cwd(), 'assets', filename),
            path.join(__dirname, 'public', 'assets', filename)
        ];

        let deleted = false;
        for (const p of candidatePaths) {
            if (fs.existsSync(p) && fs.statSync(p).isFile()) {
                try {
                    fs.unlinkSync(p);
                    deleted = true;
                } catch (e) {
                    console.error("Görsel silinirken hata oluştu:", p, e);
                }
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
