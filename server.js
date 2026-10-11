const express = require('express');
const mineflayer = require('mineflayer');
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Rejection:', reason);
});

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2 Java Accounts Configuration
const botsConfig = [
  { id: 1, username: 'java.bot1@outlook.com', folder: './java-profiles/bot1' },
  { id: 2, username: 'java.bot2@outlook.com', folder: './java-profiles/bot2' }
];

// Ensure profile directories exist for token caching
botsConfig.forEach(cfg => {
  if (!fs.existsSync(cfg.folder)) {
    fs.mkdirSync(cfg.folder, { recursive: true });
  }
});

const activeBots = {};          // Stores active mineflayer instances
const botSpawned = {};          // Tracks if the bot successfully spawned
const botEnabled = {};          // Tracks if a bot is authorized to run
const botLoginData = {};        // Stores Microsoft device auth codes per bot
const botTargets = {};          // Stores individual host/port per bot for universal server connection

// ==========================================
// HTML DASHBOARD INTERFACE (Figma-Style)
// ==========================================
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Universal Java Multi-Bot Command Center</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap');

        body {
          margin: 0;
          padding: 30px;
          font-family: 'Poppins', sans-serif;
          color: #fff;
          text-align: center;
          min-height: 100vh;
          overflow-x: hidden;
          background-color: #080c14;
        }

        .mesh-bg {
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          z-index: -1; background-color: #080c14; overflow: hidden;
        }

        .blob {
          position: absolute; filter: blur(90px); opacity: 0.6;
          animation: floatBlob 14s ease-in-out infinite alternate;
        }
        .blob-1 { width: 550px; height: 550px; background: #38bdf8; top: -15%; left: -10%; }
        .blob-2 { width: 600px; height: 600px; background: #10b981; bottom: -20%; right: -10%; animation-delay: -4s; }

        @keyframes floatBlob {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(90px, 70px) scale(1.2); }
          100% { transform: translate(-70px, -50px) scale(0.85); }
        }

        h1 { color: #f8fafc; font-weight: 800; font-size: 2.6rem; margin-bottom: 5px; text-shadow: 0 0 25px rgba(56, 189, 248, 0.5); }
        p.subtitle { color: #94a3b8; font-size: 1.05rem; margin-bottom: 30px; }

        .global-btns { margin: 20px 0 35px 0; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; max-width: 900px; margin: 0 auto; }

        .card {
          background: rgba(30, 41, 59, 0.6); backdrop-filter: blur(16px);
          padding: 22px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1);
          text-align: left; box-shadow: 0 12px 30px rgba(0,0,0,0.4);
          display: flex; flex-direction: column; justify-content: space-between;
          transition: transform 0.25s ease, border-color 0.25s ease;
        }
        .card:hover { transform: translateY(-5px); border-color: rgba(56, 189, 248, 0.5); }
        .card h3 { margin-top: 0; margin-bottom: 6px; color: #f8fafc; font-size: 1.2rem; }
        .card p { margin: 6px 0 10px 0; font-size: 0.85rem; color: #94a3b8; word-break: break-all; }

        .target-inputs {
          background: rgba(15, 23, 42, 0.7); padding: 10px; border-radius: 8px; margin-bottom: 12px;
          display: flex; gap: 8px; justify-content: space-between; border: 1px solid rgba(255,255,255,0.08);
        }
        .target-inputs input {
          background: #0f172a; border: 1px solid #475569; color: #38bdf8;
          padding: 6px 10px; border-radius: 6px; font-weight: 600; width: 100%; text-align: center; outline: none; font-size: 0.8rem;
        }

        .login-box {
          background: rgba(15, 23, 42, 0.85); padding: 12px; margin: 10px 0;
          border-radius: 10px; border: 1px solid #38bdf8; font-size: 0.78rem;
        }
        .login-row { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; gap: 6px; }
        .login-box a { color: #38bdf8; font-weight: bold; text-decoration: underline; }
        .login-code { color: #f43f5e; font-size: 0.95rem; font-weight: bold; background: #1e293b; padding: 2px 6px; border-radius: 4px; }

        .btn-copy {
          background: #38bdf8; color: #080c14; padding: 4px 8px; font-size: 0.7rem;
          border-radius: 4px; font-weight: bold; cursor: pointer; border: none; white-space: nowrap;
        }
        .btn-copy:hover { background: #0ea5e9; }

        button { padding: 10px 16px; cursor: pointer; border: none; border-radius: 10px; font-weight: 600; font-size: 0.85rem; }
        .btn-connect { background: #22c55e; color: white; flex: 1; }
        .btn-connect:hover { background: #16a34a; }
        .btn-disconnect { background: #ef4444; color: white; flex: 1; }
        .btn-disconnect:hover { background: #dc2626; }
        .btn-row { display: flex; gap: 10px; margin-top: auto; }

        .btn-global-connect { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 12px 24px; border-radius: 10px; font-weight: 600; margin-right: 10px; }
        .btn-global-disconnect { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 12px 24px; border-radius: 10px; font-weight: 600; }

        .status-online { color: #4ade80; font-weight: bold; }
        .status-offline { color: #f87171; font-weight: bold; }
        .status-awaiting { color: #fbbf24; font-weight: bold; }
        .status-connecting { color: #38bdf8; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="mesh-bg">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
      </div>

      <h1>☕ Universal Java Multi-Bot Center</h1>
      <p class="subtitle">Connect Each Account to Different Servers (2 Java Accounts)</p>

      <div class="global-btns">
        <button class="btn-global-connect" onclick="controlAll('connect')">Connect All Java Bots</button>
        <button class="btn-global-disconnect" onclick="controlAll('disconnect')">Disconnect All Bots</button>
      </div>

      <div class="grid" id="botGrid"></div>

      <script>
        const bots = ${JSON.stringify(botsConfig)};

        async function fetchStatus() {
          try {
            const res = await fetch('/status');
            const data = await res.json();
            const grid = document.getElementById('botGrid');
            grid.innerHTML = '';

            bots.forEach(bot => {
              const info = data[bot.id] || { status: 'Offline', host: 'localhost', port: 25565, verification_uri: null, user_code: null };
              let statusClass = 'status-offline';
              if (info.status === 'Online') statusClass = 'status-online';
              else if (info.status === 'Awaiting Login') statusClass = 'status-awaiting';
              else if (info.status === 'Connecting...') statusClass = 'status-connecting';

              let loginHtml = '';
              if (info.user_code && info.verification_uri) {
                loginHtml = \`
                  <div class="login-box">
                    🔑 <b>Microsoft Auth:</b>
                    <div class="login-row">
                      🔗 <a href="\${info.verification_uri}" target="_blank">Open Link</a>
                      <button class="btn-copy" onclick="copyText('\${info.verification_uri}', this)">Copy Link</button>
                    </div>
                    <div class="login-row">
                      <span>Code: <span class="login-code">\${info.user_code}</span></span>
                      <button class="btn-copy" onclick="copyText('\${info.user_code}', this)">Copy Code</button>
                    </div>
                  </div>
                \`;
              }

              grid.innerHTML += \`
                <div class="card">
                  <div>
                    <h3>Java Bot \${bot.id}</h3>
                    <p>\${bot.username} <br>Status: <span class="\${statusClass}">\${info.status}</span></p>
                    <div class="target-inputs">
                      <div>IP: <input type="text" id="ip-\${bot.id}" value="\${info.host}"></div>
                      <div>Port: <input type="text" id="port-\${bot.id}" value="\${info.port}"></div>
                    </div>
                    \${loginHtml}
                  </div>
                  <div class="btn-row">
                    <button class="btn-connect" onclick="botAction(\${bot.id}, 'connect')">Connect</button>
                    <button class="btn-disconnect" onclick="botAction(\${bot.id}, 'disconnect')">Disconnect</button>
                  </div>
                </div>
              \`;
            });
          } catch(e) {}
        }

        function copyText(text, btn) {
          navigator.clipboard.writeText(text).then(() => {
            const orig = btn.innerText;
            btn.innerText = 'Copied!';
            setTimeout(() => btn.innerText = orig, 2000);
          });
        }

        async function botAction(id, action) {
          const host = document.getElementById('ip-' + id).value;
          const port = document.getElementById('port-' + id).value;
          await fetch('/bot/' + id + '/' + action, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host, port })
          });
          fetchStatus();
        }

        async function controlAll(action) {
          bots.forEach(bot => {
            botAction(bot.id, action);
          });
        }

        fetchStatus();
        setInterval(fetchStatus, 3000);
      </script>
    </body>
    </html>
  `);
});

app.get('/status', (req, res) => {
  const status = {};
  botsConfig.forEach(bot => {
    let stat = 'Offline';
    if (botSpawned[bot.id]) {
      stat = 'Online';
    } else if (botLoginData[bot.id]) {
      stat = 'Awaiting Login';
    } else if (activeBots[bot.id]) {
      stat = 'Connecting...';
    }

    status[bot.id] = {
      status: stat,
      host: botTargets[bot.id]?.host || 'localhost',
      port: botTargets[bot.id]?.port || 25565,
      verification_uri: botLoginData[bot.id]?.verification_uri || null,
      user_code: botLoginData[bot.id]?.user_code || null
    };
  });
  res.json(status);
});

function cleanupBot(id) {
  if (activeBots[id]) {
    try {
      activeBots[id].removeAllListeners();
      activeBots[id].quit();
    } catch (e) {}
    delete activeBots[id];
  }
  botSpawned[id] = false;
  delete botLoginData[id];
}

function startBot(botInfo, host, port) {
  const id = botInfo.id;
  cleanupBot(id);

  const targetHost = host || 'localhost';
  const targetPort = parseInt(port) || 25565;

  botTargets[id] = { host: targetHost, port: targetPort };
  botEnabled[id] = true;
  botSpawned[id] = false;
  botLoginData[id] = null;

  console.log(`🚀 Connecting Java Bot ${id} (${botInfo.username}) to ${targetHost}:${targetPort}...`);

  try {
    const bot = mineflayer.createBot({
      host: targetHost,
      port: targetPort,
      username: botInfo.username,
      auth: 'microsoft',
      profilesFolder: botInfo.folder
    });

    activeBots[id] = bot;

    // Mineflayer event for Microsoft device login code
    bot.on('microsftAuthCode', (data) => {
      botLoginData[id] = data;
      console.log(`\n=== MICROSOFT LOGIN FOR JAVA BOT ${id} ===`);
      console.log(`🔗 Link: ${data.verification_uri}`);
      console.log(`🔢 Code: ${data.user_code}`);
      console.log('===========================================\n');
    });

    bot.once('spawn', () => {
      console.log(`✅ Java Bot ${id} successfully spawned into ${targetHost}:${targetPort}!`);
      botSpawned[id] = true;
      botLoginData[id] = null;
    });

    bot.on('error', (err) => {
      console.error(`⚠️ Java Bot ${id} error:`, err.message);
    });

    bot.on('end', () => {
      console.log(`🔌 Java Bot ${id} disconnected.`);
      cleanupBot(id);
    });

  } catch (e) {
    console.error(`❌ Failed to start Java Bot ${id}:`, e.message);
    cleanupBot(id);
  }
}

// Background Auto-Reconnect Loop
async function runAutoConnectLoop() {
  while (true) {
    for (let i = 0; i < botsConfig.length; i++) {
      const botInfo = botsConfig[i];
      const id = botInfo.id;
      if (botEnabled[id] && !botSpawned[id] && !activeBots[id] && !botLoginData[id]) {
        const target = botTargets[id] || { host: 'localhost', port: 25565 };
        startBot(botInfo, target.host, target.port);
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

app.post('/bot/:id/:action', (req, res) => {
  const id = parseInt(req.params.id);
  const action = req.params.action;
  const { host, port } = req.body;
  const botInfo = botsConfig.find(b => b.id === id);

  if (!botInfo) return res.status(404).json({ error: 'Bot not found' });

  if (action === 'connect') {
    startBot(botInfo, host, port);
  } else if (action === 'disconnect') {
    botEnabled[id] = false;
    cleanupBot(id);
  }
  res.json({ success: true });
});

app.post('/bots/:action', (req, res) => {
  const action = req.params.action;
  const { host, port } = req.body;

  if (action === 'connect') {
    botsConfig.forEach(b => { startBot(b, host, port); });
  } else if (action === 'disconnect') {
    botsConfig.forEach(b => { botEnabled[b.id] = false; cleanupBot(b.id); });
  }
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Universal Java Dashboard running on port ${PORT}`);
  runAutoConnectLoop();
});

// ==========================================
// DISCORD MASTER CONTROLLER
// ==========================================
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

discordClient.on('ready', () => {
  console.log(`🤖 Discord Controller logged in as ${discordClient.user.tag}`);
});

discordClient.on('messageCreate', (message) => {
  if (message.author.bot || !message.content.startsWith('!cmd')) return;

  const args = message.content.split(' ');
  if (args.length < 3) {
    return message.reply('❌ Invalid format. Use: `!cmd <1|2|all> <command>`');
  }

  const targetId = args[1].toLowerCase();
  let contentText = args.slice(2).join(' ').trim();

  // Handle '!cmd welcome' -> speaks "welcome" in normal chat
  if (contentText.toLowerCase() === 'welcome') {
    if (targetId === 'all') {
      let count = 0;
      for (const [id, bot] of Object.entries(activeBots)) {
        if (botSpawned[id]) {
          bot.chat('welcome');
          count++;
        }
      }
      return message.reply(`✅ Broadcasted "welcome" to ${count} active Java bots.`);
    }

    const botId = parseInt(targetId);
    const targetBot = activeBots[botId];
    if (targetBot && botSpawned[botId]) {
      targetBot.chat('welcome');
      return message.reply(`✅ Java Bot ${botId} said "welcome".`);
    } else {
      return message.reply(`❌ Java Bot ${botId} is not online.`);
    }
  }

  // Handle standard Java commands (automatically prepends '/' if missing)
  if (!contentText.startsWith('/')) {
    contentText = `/${contentText}`;
  }

  if (targetId === 'all') {
    let count = 0;
    for (const [id, bot] of Object.entries(activeBots)) {
      if (botSpawned[id]) {
        bot.chat(contentText);
        count++;
      }
    }
    return message.reply(`✅ Executed \`${contentText}\` on ${count} Java bots.`);
  }

  const botId = parseInt(targetId);
  const targetBot = activeBots[botId];

  if (targetBot && botSpawned[botId]) {
    targetBot.chat(contentText);
    message.reply(`✅ Executed \`${contentText}\` on Java Bot ${botId}.`);
  } else {
    message.reply(`❌ Java Bot ${botId} is either offline or hasn't fully spawned.`);
  }
});

discordClient.login(process.env.DISCORD_TOKEN);