const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const net = require('net');
const path = require('path');
const cors = require('cors');
const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 8080;
const WOKWI_TCP_PORT = process.env.WOKWI_TCP_PORT || 4000;
const WOKWI_HOST = process.env.WOKWI_HOST || '127.0.0.1';
app.use(cors());
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.post('/api/log', (req, res) => {
  const { waktu, sudut, gerakan } = req.body;
  console.log(`[API LOG] ${waktu}: Gerakan="${gerakan}", Sudut=${sudut}°`);
  res.status(200).json({ success: true, message: 'Log saved successfully' });
});
let wokwiSocket = null;
let isConnectedToWokwi = false;
let reconnectTimeout = null;
function connectToWokwi() {
  if (wokwiSocket) {
    wokwiSocket.destroy();
  }

  console.log(`Connecting to Wokwi simulator at tcp://${WOKWI_HOST}:${WOKWI_TCP_PORT}...`);
  io.emit('wokwi-status', { status: 'connecting', message: 'Connecting to Wokwi...' });

  wokwiSocket = new net.Socket();

  wokwiSocket.connect(WOKWI_TCP_PORT, WOKWI_HOST, () => {
    console.log('Successfully connected to Wokwi simulator!');
    isConnectedToWokwi = true;
    io.emit('wokwi-status', { status: 'connected', message: 'Connected to Wokwi Simulator' });
  });

  let lineBuffer = '';

  wokwiSocket.on('data', (data) => {
    lineBuffer += data.toString();
    const lines = lineBuffer.split(/\r?\n/);
    lineBuffer = lines.pop();

    for (let line of lines) {
      const cleanLine = line.replace(/[^\x20-\x7E]/g, '').trim();
      if (!cleanLine) continue;

      console.log(`[Arduino Serial] ${cleanLine}`);
      io.emit('raw-log', cleanLine);
      if (cleanLine.startsWith('{') && cleanLine.endsWith('}')) {
        try {
          const jsonData = JSON.parse(cleanLine);
          if (jsonData.hasOwnProperty('sudut') && jsonData.hasOwnProperty('gerakan')) {
            io.emit('sensor-data', jsonData);
          }
        } catch (e) {
          console.error(`[JSON Parse Error] Failed to parse: ${cleanLine}`);
        }
      }
    }
  });

  wokwiSocket.on('close', () => {
    if (isConnectedToWokwi) {
      console.log('Connection to Wokwi simulator closed.');
      isConnectedToWokwi = false;
    }
    io.emit('wokwi-status', { status: 'disconnected', message: 'Disconnected from Wokwi Simulator' });
    scheduleReconnect();
  });

  wokwiSocket.on('error', (err) => {
    console.error(`Wokwi Socket Error: ${err.message}`);
    io.emit('wokwi-status', { status: 'disconnected', message: `Connection error: ${err.message}` });
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  if (reconnectTimeout) return;

  if (wokwiSocket) {
    wokwiSocket.destroy();
    wokwiSocket = null;
  }

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connectToWokwi();
  }, 3000);
}
io.on('connection', (socket) => {
  console.log('New client connected to dashboard');
  socket.emit('wokwi-status', {
    status: isConnectedToWokwi ? 'connected' : 'disconnected',
    message: isConnectedToWokwi ? 'Connected to Wokwi Simulator' : 'Disconnected from Wokwi Simulator (Check Wokwi running status)'
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected from dashboard');
  });
});
server.listen(PORT, () => {
  console.log(`didie tah : http://localhost:${PORT}`);
  connectToWokwi();
});
