// Consola de teletransporte para testear rapido.
//
//   1) Arranca el juego con el servidor de teleport:
//        npm run tp                 (o: npm run tp -- lago_celos)
//   2) Desde OTRA terminal le mandas ordenes con curl:
//        curl http://127.0.0.1:8787/tp/lago_celos
//        curl "http://127.0.0.1:8787/tp/casa?x=5&y=8"
//        curl http://127.0.0.1:8787/pos
//        curl http://127.0.0.1:8787/maps
//        curl http://127.0.0.1:8787/god
//        curl http://127.0.0.1:8787/silence
//        curl http://127.0.0.1:8787/quit
//
//   x/y son TILES del mapa (no pixeles). Sin x/y usa el spawn por defecto.
//   Atajos: sendero, pantano, valle, montanas, lago, reino, bd bt bdes bi bc bcol.

const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const { URL } = require('url');

const MAPS = [
  'casa',
  'sendero_distancia',
  'pantano_toxicidad',
  'valle_desinteres',
  'montanas_inseguridad',
  'lago_celos',
  'reino_recuerdos',
  'boss_distancia',
  'boss_toxicidad',
  'boss_desinteres',
  'boss_inseguridad',
  'boss_celos',
  'boss_coleccionista',
];

const ALIASES = {
  casa: 'casa',
  sendero: 'sendero_distancia',
  pantano: 'pantano_toxicidad',
  valle: 'valle_desinteres',
  montanas: 'montanas_inseguridad',
  lago: 'lago_celos',
  reino: 'reino_recuerdos',
  bd: 'boss_distancia',
  bt: 'boss_toxicidad',
  bdes: 'boss_desinteres',
  bi: 'boss_inseguridad',
  bc: 'boss_celos',
  bcol: 'boss_coleccionista',
  boss1: 'boss_distancia',
  boss2: 'boss_toxicidad',
  boss3: 'boss_desinteres',
  boss4: 'boss_inseguridad',
  boss5: 'boss_celos',
  boss6: 'boss_coleccionista',
};

const PORT = Number(process.env.TP_PORT || 8787);
const HOST = '127.0.0.1';

// Con "electron tools/teleport.cjs casa 10 10" -> process.argv = [exe, script, 'casa', '10', '10']
const ARGV = process.argv.slice(2).filter((a) => !a.startsWith('--'));

let win = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function resolveMap(tok) {
  if (!tok) return null;
  const k = String(tok).trim().toLowerCase();
  if (!k) return null;
  if (MAPS.includes(k)) return k;
  if (ALIASES[k]) return ALIASES[k];
  const hits = MAPS.filter((m) => m.includes(k) || k.includes(m));
  return hits.length === 1 ? hits[0] : null;
}

function js(code) {
  if (!win || win.isDestroyed()) return Promise.resolve(null);
  return win.webContents.executeJavaScript(code, true).catch((e) => ({ __err: String(e && e.message) }));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    center: true,
    resizable: true,
    backgroundColor: '#0a0a1a',
    title: 'Los Fragmentos - teleport',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  win.on('closed', () => {
    win = null;
    app.quit();
  });
}

async function waitForGame(timeout = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const ok = await js(`!!(window.__game && window.__game.scene && window.__game.scene.isActive('MenuScene'))`);
    if (ok === true) {
      await sleep(300);
      return true;
    }
    await sleep(300);
  }
  return false;
}

const TELEPORT_CODE = (payload) =>
  `(() => {
  const g = window.__game;
  ['PauseScene','MemoryScene','FinalScene','ConfigScene','IntroScene','MenuScene'].forEach((k) => {
    try { g.scene.stop(k); } catch (e) {}
  });
  g.scene.start('GameScene', ${JSON.stringify(payload)});
  return true;
})()`;

async function doTeleport(tok, x, y) {
  const mapId = resolveMap(tok);
  if (!mapId) return `mapa desconocido: "${tok}". Prueba /maps\n`;
  const payload = { map: mapId };
  const xi = x === undefined || x === null || x === '' ? NaN : Number(x);
  const yi = y === undefined || y === null || y === '' ? NaN : Number(y);
  if (Number.isFinite(xi)) payload.spawnX = xi;
  if (Number.isFinite(yi)) payload.spawnY = yi;
  const ok = await js(TELEPORT_CODE(payload));
  await sleep(150);
  if (ok !== true) return `!! fallo al teletransportar: ${JSON.stringify(ok)}\n`;
  let where = ' (llegada por defecto)';
  if (Number.isFinite(xi) || Number.isFinite(yi)) {
    where = ` (tile ${Number.isFinite(xi) ? xi : '?'},${Number.isFinite(yi) ? yi : '?'})`;
  }
  return `-> ${mapId}${where}\n` + (await statusText());
}

async function statusText() {
  const r = await js(`(() => {
    const g = window.__game;
    const active = g.scene.getScenes(true).map((s) => s.scene.key);
    let game = null;
    if (g.scene.isActive('GameScene')) {
      const s = g.scene.getScene('GameScene');
      game = {
        map: s.currentMapId || s.targetMap,
        tile: [Math.floor(s.player.x / 16), Math.floor(s.player.y / 16)],
        hp: s.player.hp,
        maxHP: s.player.maxHP,
      };
    }
    return { active, game };
  })()`);
  if (!r || r.__err) return 'sin respuesta: ' + JSON.stringify(r) + '\n';
  let out = 'escenas activas: ' + r.active.join(', ') + '\n';
  if (r.game) {
    out += `mapa: ${r.game.map}  tile: (${r.game.tile[0]}, ${r.game.tile[1]})  hp: ${r.game.hp}/${r.game.maxHP}\n`;
  }
  return out;
}

async function god() {
  const ok = await js(`(() => {
    const s = window.__game.scene.getScene('GameScene');
    if (!s || !s.player) return false;
    s.player.invincible = true;
    s.player.hp = s.player.maxHP;
    return true;
  })()`);
  return ok === true ? 'god: invencible + vida llena\n' : 'god: no hay GameScene activo\n';
}

async function silence() {
  const ok = await js(`(() => {
    if (!window.__silence) {
      window.__silence = setInterval(() => {
        const s = window.__game && window.__game.scene.getScene('GameScene');
        if (s && s.isDialogActive && s.dialogueSystem && s.dialogueSystem.hide) s.dialogueSystem.hide();
      }, 40);
    }
    return true;
  })()`);
  return ok === true ? 'dialogos silenciados (moverte libre)\n' : 'no se pudo silenciar\n';
}

async function statusTextForConsole() {
  return (await statusText()).trimEnd();
}

function mapsText() {
  return (
    'mapas:\n  ' +
    MAPS.join('\n  ') +
    '\natajos: sendero, pantano, valle, montanas, lago, reino, bd bt bdes bi bc bcol\n'
  );
}

function helpText() {
  return (
    [
      'Consola de teleport. Endpoints:',
      '  /tp/<mapa>?x=<tile>&y=<tile>   teletransporta',
      '  /maps                          lista de mapas',
      '  /pos                           mapa y tile actuales',
      '  /god                           invencible + vida llena',
      '  /silence                       ignora dialogos',
      '  /quit                          cierra el juego',
      '',
    ].join('\n') + '\n'
  );
}

function startServer() {
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, `http://${HOST}:${PORT}`);
    const seg = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const cmd = (seg[0] || '').toLowerCase();
    let out = '';

    try {
      if (!cmd) out = helpText();
      else if (cmd === 'maps' || cmd === 'list') out = mapsText();
      else if (cmd === 'pos' || cmd === 'status') out = await statusText();
      else if (cmd === 'god') out = await god();
      else if (cmd === 'silence') out = await silence();
      else if (cmd === 'quit' || cmd === 'close' || cmd === 'exit') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('cerrando el juego\n');
        setTimeout(() => app.quit(), 150);
        return;
      } else if (cmd === 'tp' || cmd === 'go' || cmd === 'teleport') {
        out = await doTeleport(seg[1], u.searchParams.get('x'), u.searchParams.get('y'));
      } else {
        out = await doTeleport(seg[0], seg[1] || u.searchParams.get('x'), seg[2] || u.searchParams.get('y'));
      }
    } catch (e) {
      out = 'ERROR: ' + (e && e.message) + '\n';
    }

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(out);
    console.log('[' + cmd + '] ' + out.split('\n').filter(Boolean).join(' | '));
  });

  server.on('error', (e) => {
    console.log('No se pudo abrir el puerto ' + PORT + ': ' + e.message);
    console.log('Prueba con otra:  $env:TP_PORT=9000; npm run tp');
  });

  server.listen(PORT, HOST, () => {
    console.log('');
    console.log('  Juego abierto. Manda ordenes desde OTRA terminal:');
    console.log('    curl http://' + HOST + ':' + PORT + '/tp/lago_celos');
    console.log('    curl "http://' + HOST + ':' + PORT + '/tp/casa?x=5&y=8"');
    console.log('    curl http://' + HOST + ':' + PORT + '/pos');
    console.log('    curl http://' + HOST + ':' + PORT + '/quit');
    console.log('');
  });
}

app.whenReady().then(async () => {
  createWindow();
  const ready = await waitForGame();
  if (!ready) {
    console.log('El juego no arranco a tiempo (revisa que exista dist/: npm run build)');
    return;
  }
  startServer();
  if (ARGV.length) {
    const r = await doTeleport(ARGV[0], ARGV[1], ARGV[2]);
    console.log(r.trimEnd());
  } else {
    console.log(await statusTextForConsole());
  }
});
