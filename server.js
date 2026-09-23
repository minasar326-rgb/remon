const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; " +
        "script-src 'self' https: 'unsafe-inline' 'unsafe-eval' blob:; " +
        "style-src 'self' https: 'unsafe-inline'; " +
        "img-src 'self' https: data: blob:; " +
        "font-src 'self' https: data:; " +
        "connect-src 'self' https: wss:; " +
        "media-src 'self' https: data: blob:;"
    );
    next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
    if (!req.path.includes('.')) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.status(404).send('الصفحة غير موجودة');
    }
});

app.listen(PORT, () => {
    console.log('========================================================');
    console.log('🚀 خادم نظام الحضور الذكي - كنيسة أبي سيفين يعمل بنجاح!');
    console.log('🌐 الرابط المحلي: http://localhost:' + PORT);
    console.log('🔒 ترويسات الأمان المشددة (CSP, X-Frame-Options) مفعلة.');
    console.log('========================================================');
});
