// File: project/backend/server.js (Versi Final Lengkap & Diperbaiki)

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import axios from 'axios';
import crypto from 'crypto';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;

let pool;

async function initialize() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
    });
    const connection = await pool.getConnection();
    console.log('✅ Berhasil terhubung ke database MySQL.');
    await createTables(connection);
    await createDefaultAdmin(connection);
    await createDefaultHeroContent(connection);
    connection.release();
    console.log('✅ Inisialisasi database selesai.');
  } catch (err) {
    console.error("❌ KRITIS: Gagal menginisialisasi database:", err.message);
    process.exit(1);
  }
}

async function createTables(connection) {
  console.log('🔄 Memeriksa dan membuat tabel...');
  await connection.query(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255) NOT NULL UNIQUE, passwordHash VARCHAR(255) NOT NULL, role VARCHAR(50) DEFAULT 'admin')`);
  
  await connection.query(`
    CREATE TABLE IF NOT EXISTS packages (
      id INT AUTO_INCREMENT PRIMARY KEY, 
      name VARCHAR(255) NOT NULL, 
      price DECIMAL(10, 2) NOT NULL, 
      description TEXT, 
      features JSON, 
      popular BOOLEAN DEFAULT false,
      discord_role_id VARCHAR(255),
      payment_link TEXT
    )
  `);

  await connection.query(`CREATE TABLE IF NOT EXISTS features (id INT AUTO_INCREMENT PRIMARY KEY, icon VARCHAR(50) NOT NULL, title VARCHAR(255) NOT NULL, description TEXT NOT NULL)`);
  await connection.query(`CREATE TABLE IF NOT EXISTS testimonials (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, role VARCHAR(100), content TEXT NOT NULL, rating INT DEFAULT 5)`);
  await connection.query(`CREATE TABLE IF NOT EXISTS faqs (id INT AUTO_INCREMENT PRIMARY KEY, question TEXT NOT NULL, answer TEXT NOT NULL)`);
  
  // PERUBAHAN: Menambahkan kolom 'discord_invite_link'
  await connection.query(`
    CREATE TABLE IF NOT EXISTS hero_content (
      id INT PRIMARY KEY DEFAULT 1, 
      title VARCHAR(255), 
      subtitle VARCHAR(255), 
      description TEXT, 
      whatsappNumber VARCHAR(50),
      discord_invite_link VARCHAR(255) 
    )
  `);
  
  await connection.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id VARCHAR(255) NOT NULL UNIQUE,
      payment_id VARCHAR(255),
      discord_id VARCHAR(255),
      wallet_address VARCHAR(255),
      product_id INT,
      status VARCHAR(50) NOT NULL,
      start_date DATETIME NOT NULL,
      end_date DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES packages(id) ON DELETE SET NULL
    )
  `);

  console.log('✅ Semua tabel telah diperiksa dan siap.');
}

async function createDefaultAdmin(connection) {
    const [rows] = await connection.query('SELECT * FROM users WHERE username = ?', ['admin']);
    if (rows.length === 0) {
      console.log('🔧 Membuat akun admin default...');
      const password = 'Admin123!';
      const hashedPassword = await bcrypt.hash(password, 12);
      await connection.query('INSERT INTO users (username, passwordHash, role) VALUES (?, ?, ?)', ['admin', hashedPassword, 'admin']);
      console.log('✅ Akun admin default dibuat. Username: admin, Password: Admin123!');
    }
}
  
async function createDefaultHeroContent(connection) {
    const [rows] = await connection.query('SELECT * FROM hero_content WHERE id = 1');
    if (rows.length === 0) {
      console.log('🔧 Membuat konten hero default...');
      await connection.query(
        `INSERT INTO hero_content (id, title, subtitle, description, whatsappNumber, discord_invite_link) VALUES (1, 'Master the Art of Cryptocurrency Trading', 'TRADING CRYPTO ACADEMY', 'The best trading education platform with experienced mentors.', '6281234567890', 'https://discord.gg/your-invite-code')`
      );
    }
}

const safeQuery = async (res, query, params = []) => {
  try {
    const [results] = await pool.query(query, params);
    return results;
  } catch (error) {
    console.error("❌ GALAT DATABASE:", error);
    if(res) res.status(500).json({ message: "Galat saat query database", error: error.message });
    return null;
  }
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- ENDPOINT WEBHOOK NOWPAYMENTS ---
app.post('/api/nowpayments-webhook', async (req, res) => {
    const { body } = req;
    console.log('🔔 Webhook diterima:', body);
  
    const { payment_id, payment_status, purchase_id, order_description, order_id, pay_address } = body;
    const discord_id = order_description; // Mengambil ID Discord dari deskripsi order
  
    if (payment_status === 'finished' && discord_id) {
        console.log(`Pembayaran selesai untuk order ${order_id}, Discord ID: ${discord_id}`);
        const [packages] = await safeQuery(res, 'SELECT discord_role_id FROM packages WHERE id = ?', [purchase_id]);
        
        if (packages && packages.length > 0 && packages[0].discord_role_id) {
            const roleId = packages[0].discord_role_id;
            const guildId = process.env.DISCORD_GUILD_ID;
            const botToken = process.env.DISCORD_BOT_TOKEN;
  
            // PERBAIKAN: Logika API Discord yang disempurnakan
            try {
                const discordApiUrl = `https://discord.com/api/v10/guilds/${guildId}/members/${discord_id}/roles/${roleId}`;
                await axios.put(discordApiUrl, {}, { 
                    headers: { 'Authorization': `Bot ${botToken}` } 
                });
                console.log(`✅ SUKSES: Role ${roleId} diberikan kepada pengguna ${discord_id}.`);
            } catch (apiError) {
                const errorData = apiError.response ? JSON.stringify(apiError.response.data) : apiError.message;
                console.error(`❌ GAGAL memberikan role Discord ke ID ${discord_id}: ${errorData}`);
            }

            const durationDays = 30;
            const startDate = new Date();
            const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
            const subQuery = `
              INSERT INTO subscriptions (order_id, payment_id, discord_id, wallet_address, product_id, status, start_date, end_date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE status = VALUES(status), payment_id = VALUES(payment_id), discord_id = VALUES(discord_id);
            `;
            await safeQuery(null, subQuery, [order_id, payment_id, discord_id, pay_address, purchase_id, 'active', startDate, endDate]);
        }
    }
  
    res.status(200).send('Webhook diproses');
});
  
// --- ENDPOINT OTENTIKASI DAN GET PUBLIK ---
app.post('/api/login', async (req, res) => { /* ... (Tidak ada perubahan) ... */ });
app.get('/api/hero', async (req, res) => { /* ... (Tidak ada perubahan, otomatis mengambil kolom baru) ... */ });
app.get('/api/features', async (req, res) => { /* ... (Tidak ada perubahan) ... */ });
app.get('/api/packages', async (req, res) => { /* ... (Tidak ada perubahan) ... */ });
app.get('/api/testimonials', async (req, res) => { /* ... (Tidak ada perubahan) ... */ });
app.get('/api/faqs', async (req, res) => { /* ... (Tidak ada perubahan) ... */ });

// --- ENDPOINT ADMIN ---
app.put('/api/hero', authenticateToken, async (req, res) => {
    // PERUBAHAN: Endpoint ini sekarang bisa update semua field termasuk link invite
    const { title, subtitle, description, whatsappNumber, discord_invite_link } = req.body;
    await safeQuery(res, 'UPDATE hero_content SET title=?, subtitle=?, description=?, whatsappNumber=?, discord_invite_link=? WHERE id = 1', [title, subtitle, description, whatsappNumber, discord_invite_link]);
    res.json({ success: true });
});

app.post('/api/packages', authenticateToken, async (req, res) => { /* ... (Tidak ada perubahan) ... */ });
app.put('/api/packages/:id', authenticateToken, async (req, res) => { /* ... (Tidak ada perubahan) ... */ });
app.delete('/api/packages/:id', authenticateToken, async (req, res) => { /* ... (Tidak ada perubahan) ... */ });

// ... (Endpoint lainnya untuk features, testimonials, faqs tidak berubah) ...

// --- MENJALANKAN SERVER ---
app.listen(PORT, () => {
  initialize();
  console.log(`🚀 Server backend berjalan di http://localhost:${PORT}`);
});