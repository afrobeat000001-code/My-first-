const {
‎    default: makeWASocket,
‎    useMultiFileAuthState,
‎    Browsers,
‎    downloadContentFromMessage
‎} = require("@whiskeysockets/baileys");
‎const fs = require("fs-extra");
‎const QR = require("qrcode-terminal");
‎
‎// =============== FOLDER SETUP ===============
‎if (!fs.existsSync("./media")) fs.mkdirSync("./media");
‎if (!fs.existsSync("./logs")) fs.mkdirSync("./logs");
‎
‎// =============== START BOT ==================
‎async function startBot() {
‎    const { state, saveCreds } = await useMultiFileAuthState("auth");
‎
‎    const sock = makeWASocket({
‎        printQRInTerminal: true,
‎        browser: Browsers.macOS("Safari"),
‎        auth: state
‎    });
‎
‎    sock.ev.on("creds.update", saveCreds);
‎
‎    // =============== NEW MESSAGE LISTENER ===============
‎    sock.ev.on("messages.upsert", async ({ messages }) => {
‎        const msg = messages[0];
‎        if (!msg.message) return;
‎
‎        const from = msg.key.remoteJid;
‎
‎        // text
‎        if (msg.message.conversation) {
‎            const text = msg.message.conversation.toLowerCase();
‎
‎            // ====== MENU COMMAND ======
‎            if (text === "menu") {
‎                await sock.sendMessage(from, {
‎                    text: "*BOT MENU*\n\n1. Anti-Delete ON\n2. Save View-Once\n3. Auto Save Media\n\nSend any message."
‎                });
‎            }
‎        }
‎
‎        // =============== VIEW ONCE SAVER ===============
‎        if (msg.message.viewOnceMessageV2) {
‎            const media = msg.message.viewOnceMessageV2.message;
‎            const type = Object.keys(media)[0];
‎            const stream = await downloadContentFromMessage(media[type], type);
‎
‎            let buffer = Buffer.from([]);
‎            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
‎
‎            const filePath = `./media/viewonce-${Date.now()}.jpg`;
‎            fs.writeFileSync(filePath, buffer);
‎
‎            await sock.sendMessage(from, {
‎                text: "📥 *View-Once Saved*\nCheck media folder."
‎            });
‎        }
‎
‎        // =============== MEDIA AUTO SAVE ===============
‎        if (msg.message.imageMessage || msg.message.videoMessage) {
‎            const type = msg.message.imageMessage ? "image" : "video";
‎            const media = msg.message[type + "Message"];
‎            const stream = await downloadContentFromMessage(media, type);
‎
‎            let buffer = Buffer.from([]);
‎            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
‎
‎            const ext = type === "image" ? "jpg" : "mp4";
‎            const filePath = `./media/${Date.now()}.${ext}`;
‎            fs.writeFileSync(filePath, buffer);
‎
‎            console.log(`Saved ${type} → ${filePath}`);
‎        }
‎    });
‎
‎    // =============== ANTI-DELETE ===============
‎    sock.ev.on("messages.update", async (updates) => {
‎        for (const update of updates) {
‎            if (update.update && update.update.message == null) {
‎                const jid = update.key.remoteJid;
‎                const id = update.key.id;
‎
‎                await sock.sendMessage(jid, {
‎                    text: "❗ *A message was deleted*\nBut I saw it 👀.\n\nAnti-delete is enabled."
‎                });
‎
‎                fs.appendFileSync("./logs/deleted.txt",
‎                    `[${new Date().toISOString()}] Deleted message ID: ${id}\n`);
‎            }
‎        }
‎    });
‎}
‎
