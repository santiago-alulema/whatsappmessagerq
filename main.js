const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const puppeteer = require('puppeteer-core');
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './sessions',
    clientId: "cliente-one"
  }),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

(async () => {
  const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.goto('https://example.com');
  console.log(await page.title());
  await browser.close();
})();

let qrCodeData = null;
let isReady = false;

app.use(bodyParser.json());

// Evento cuando se recibe el código QR
client.on('qr', async (qr) => {
  qrCodeData = await qrcode.toDataURL(qr); // Genera el QR en base64
  console.log('QR generado, accede a http://localhost:3000 para verlo');
});

// Evento cuando el cliente está listo
client.on('ready', () => {
  console.log('¡El bot está listo para usarse!');
  isReady = true; // Cambia el estado a "listo"
});

client.initialize();

// Ruta para servir el archivo HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Ruta para obtener el código QR en JSON
app.get('/qr', (req, res) => {
  res.json({ qrCodeData });
});

// Ruta para verificar si el bot está listo
app.get('/status', (req, res) => {
  res.json({ ready: isReady });
});

// Ruta para enviar el mensaje a múltiples números
app.post('/send-bulk-messages', async (req, res) => {
  const { messages } = req.body;

  try {
    for (const data of messages) {
      if (!String(data.phone).trim().length) {
        console.warn(`El número está vacío.`);
        return;
      } else {
        var number_details = await client.getNumberId(`593${data.phone}@c.us`);
        if (!number_details) {
           console.warn(`El número ${data.phone} no está registrado en WhatsApp.`);
           continue;
        }else{
          const personalizedMessage = data.message.replace('[name]', data.name || '');
          await client.sendMessage(`593${data.phone}@c.us`, personalizedMessage);
          const randomDelay = Math.floor(Math.random() * (15000 - 2000 + 1)) + 2000;
          await new Promise(resolve => setTimeout(resolve, randomDelay));
        }
        
      }
    }

    res.json({ message: 'Mensajes enviados exitosamente' });
  } catch (error) {
    console.error('Error al enviar mensajes:', error);
    // res.status(500).json({ message: 'Error al enviar mensajes' });
  }
});

// Inicia el servidor
app.listen(3000, () => {
  console.log('Servidor web iniciado en http://localhost:3000');
});
