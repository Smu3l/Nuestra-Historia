// Probe de verificación del fix del cuadro de diálogos (bug de concatenación).
//
// Bug original: showDialogue() solo resolvía por ID en Dialogues. Si le
// llegaba un array ya resuelto (p. ej. showDialogue(Dialogues[trigger.dialogue])
// o collectFragment), lo usaba como clave -> undefined -> y devolvía
// [array] = [[línea1, línea2, ...]]. El box veía UNA sola "línea" que era el
// array entero y la escribía carácter a carácter concatenando todas las
// frases sin espacio ni salto: "¿Qué pasó?María José: Samuel...".
//
// Este probe arranca el juego real (dist/index.html), reproduce los flujos
// afectados y comprueba que cada línea se muestra por separado, con el nombre
// en su propio campo. Además hace backup del save.json del jugador y lo
// restaura al salir para no tocar su progreso.
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'dialog-fix-out.txt');
const SHOTS = path.join(__dirname, 'dialog-fix-shots');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });
function log(l) { fs.appendFileSync(OUT, l + '\n'); console.log(l); }
const wait = ms => new Promise(r => setTimeout(r, ms));
const withT = (p, ms, label) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout ' + label)), ms))]);

let win;
async function js(code, label, timeout) {
  return withT(win.webContents.executeJavaScript(code, true), timeout || 10000, label);
}
async function shot(name) {
  try {
    fs.writeFileSync(path.join(SHOTS, name + '.png'), await win.webContents.capturePage().then(i => i.toPNG()));
  } catch (e) { log('  shot FAIL ' + name + ': ' + e.message); }
}

// Completar el tipeo de la línea actual para leer el texto final.
const READ_STATE = `(() => {
  const s = window.__game.scene.getScene('GameScene');
  const ds = s.dialogueSystem;
  let guard = 0;
  while (ds.typing && guard++ < 10) ds.advance();
  return { active: ds.isActive, name: ds.nameText.text, text: ds.dialogText.text, count: ds.currentDialogue.length, index: ds.currentIndex };
})()`;

let failures = 0;
function check(label, cond, detail) {
  if (cond) log('PASS  ' + label + (detail ? '  [' + detail + ']' : ''));
  else { failures++; log('FAIL  ' + label + (detail ? '  [' + detail + ']' : '')); }
}

async function boot(w, h) {
  win = new BrowserWindow({
    width: w, height: h, show: true, x: -4000, y: 0,
    frame: false,
    backgroundColor: '#0a0a1a',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  const index = path.join(__dirname, '..', 'dist', 'index.html');
  await withT(win.loadFile(index), 30000, 'load');
  let ok = false;
  for (let i = 0; i < 60; i++) {
    await wait(400);
    try {
      if (await js(`!!(window.__game && window.__game.scene.getScenes(true).some(s => s.scene.key === 'MenuScene'))`, 'poll')) { ok = true; break; }
    } catch (e) { /* retry */ }
  }
  log('boot=' + ok);
  return ok;
}

(async () => {
  fs.writeFileSync(OUT, '');
  await app.whenReady();

  // Backup del save del jugador: el trigger "first_visit" necesita un estado
  // limpio, y los tests escriben guardado. Se restaura al salir.
  const saveDir = path.join(app.getPath('userData'), 'saves');
  const savePath = path.join(saveDir, 'save.json');
  let saveBackup = null;
  if (fs.existsSync(savePath)) {
    saveBackup = fs.readFileSync(savePath);
    fs.unlinkSync(savePath);
    log('save backup OK (' + saveBackup.length + ' bytes), save.json temporalmente eliminado');
  } else {
    log('no habia save.json previo');
  }
  app.on('will-quit', () => {
    try {
      if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
      if (saveBackup) { fs.writeFileSync(savePath, saveBackup); log('save.json RESTAURADO'); }
      else if (fs.existsSync(savePath)) { fs.unlinkSync(savePath); log('save.json de prueba eliminado'); }
    } catch (e) { log('restore FAIL: ' + e.message); }
  });

  if (!(await boot(1280, 720))) { app.exit(1); return; }

  // ------------------------------------------------------------------
  // TEST 1: flujo real del trigger "casa_intro" (caja inicial del juego)
  // ------------------------------------------------------------------
  await js(`window.__game.scene.start('GameScene', { map: 'casa' }); 0`, 'start');
  await wait(1500); // trigger en +800ms y tipeo a 30ms/caracter

  let st = await js(READ_STATE, 't1-l1');
  log('T1 linea1 -> name=' + JSON.stringify(st.name) + ' text=' + JSON.stringify(st.text) + ' count=' + st.count);
  check('T1: dialogo activo tras el trigger', st.active === true);
  check('T1: nombre en campo propio', st.name === 'María José', st.name);
  check('T1: solo la PRIMERA frase visible', st.text === '¿Qué pasó?', st.text);
  check('T1: sin concatenacion de frases', !st.text.includes('María José:') && st.text.split('María José').length === 1, st.text);
  check('T1: 4 lineas encoladas (no 1)', st.count === 4, 'count=' + st.count);
  await shot('01-trigger-linea1');

  const expected = ['Samuel... ¿dónde estás?', 'Necesito encontrarlo.', 'Primero debo entender qué ocurrió.'];
  for (let i = 0; i < expected.length; i++) {
    await js(`(() => { const ds = window.__game.scene.getScene('GameScene').dialogueSystem; ds.advance(); return 1; })()`, 't1-next');
    st = await js(READ_STATE, 't1-l' + (i + 2));
    check('T1: linea ' + (i + 2) + ' secuencial y legible', st.text === expected[i], JSON.stringify(st.text));
  }
  await shot('02-trigger-linea4');

  // Tras la ultima linea, un avance mas cierra la caja.
  st = await js(`(() => { const ds = window.__game.scene.getScene('GameScene').dialogueSystem; ds.advance(); return { active: ds.isActive }; })()`, 't1-close');
  check('T1: la caja se cierra al terminar', st.active === false);

  // ------------------------------------------------------------------
  // TEST 2: regresión del caller antiguo (pasar el array resuelto)
  // ------------------------------------------------------------------
  await js(`window.__game.scene.getScene('GameScene').showDialogue(['María José: ¿Qué pasó?', 'María José: Samuel... ¿dónde estás?']); 0`, 't2');
  await wait(200);
  st = await js(READ_STATE, 't2-l1');
  log('T2 array -> name=' + JSON.stringify(st.name) + ' text=' + JSON.stringify(st.text) + ' count=' + st.count);
  check('T2: nombre en campo propio (antes se rompia)', st.name === 'María José', st.name);
  check('T2: solo la 1a frase del array', st.text === '¿Qué pasó?', st.text);
  check('T2: NO concatenado ("¿Qué pasó?María José:...")', !st.text.includes('María José:'), st.text);
  check('T2: 2 lineas (no 1)', st.count === 2, 'count=' + st.count);
  await shot('03-array-linea1');

  await js(`(() => { const ds = window.__game.scene.getScene('GameScene').dialogueSystem; ds.advance(); return 1; })()`, 't2-next');
  st = await js(READ_STATE, 't2-l2');
  check('T2: 2a frase en su propio turno', st.text === 'Samuel... ¿dónde estás?', JSON.stringify(st.text));
  await js(`(() => { const ds = window.__game.scene.getScene('GameScene').dialogueSystem; ds.advance(); return 1; })()`, 't2-close');

  // ------------------------------------------------------------------
  // TEST 3: ruta de fragmentos (tenia el mismo bug latente)
  // ------------------------------------------------------------------
  await js(`window.__game.scene.getScene('GameScene').collectFragment('fragment_distancia'); 0`, 't3');
  await wait(200);
  st = await js(READ_STATE, 't3-l1');
  log('T3 fragmento -> name=' + JSON.stringify(st.name) + ' text=' + JSON.stringify(st.text) + ' count=' + st.count);
  check('T3: 1a linea del fragmento sola', st.text === 'Fragmento de la Distancia obtenido.', st.text);
  check('T3: 3 lineas (no 1)', st.count === 3, 'count=' + st.count);
  await shot('04-fragmento-linea1');
  await js(`(() => { const ds = window.__game.scene.getScene('GameScene').dialogueSystem; ds.advance(); return 1; })()`, 't3-next');
  st = await js(READ_STATE, 't3-l2');
  // "Recuerdo:" se separa al campo de nombre; el texto queda con el resto.
  check('T3: 2a linea en su propio turno', st.text === '"La distancia no nos separó.', JSON.stringify(st.text));
  check('T3: nombre "Recuerdo" en campo propio', st.name === 'Recuerdo', st.name);

  log(failures === 0 ? 'RESULTADO: TODOS LOS TESTS PASARON' : 'RESULTADO: ' + failures + ' FALLOS');
  await wait(300);
  app.exit(failures === 0 ? 0 : 1);
})().catch(e => { log('ERROR FATAL: ' + e.message); app.exit(1); });
