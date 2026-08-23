import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';

async function startBot() {
    // Menyimpan sesi login di folder 'auth_info'
    const { state, saveCreds } = await useMultiFileAuthState('ndaabtz');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }), // Menyembunyikan log mentah yang terlalu banyak
        auth: state,
    });

    // Event listener untuk status koneksi
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            // Tampilkan QR Code di terminal
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Koneksi terputus. Mencoba menghubungkan kembali...', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('Bot WhatsApp Berhasil Terhubung!');
        }
    });

    // Menyimpan kredensial sesi setiap ada perubahan
    sock.ev.on('creds.update', saveCreds);

    // Event listener untuk pesan masuk
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        
        // Abaikan jika tidak ada pesan, pesan dari status, atau pesan dari bot sendiri
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        // Ambil teks dari pesan teks biasa atau pesan balasan
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        // Fitur auto-reply sederhana
        if (text.toLowerCase() === 'ping') {
            await sock.sendMessage(from, { text: 'Pong! 🏓' });
        } else if (text.toLowerCase() === 'halo') {
            await sock.sendMessage(from, { text: 'Halo! Ada yang bisa saya bantu?' });
        }
    });
}

startBot();
