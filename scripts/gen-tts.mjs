// 烤曉臻(zh-TW-HsiaoChenNeural)語音三句 → voice/*.mp3(逐句落盤,重跑到「新產 0」即完成)
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require2 = createRequire("C:/Users/agape250/AppData/Local/Temp/claude/C--Users-agape250-Downloads-0721---0721--/27311019-9255-4b25-b9d1-1b523af380a2/scratchpad/node_modules/");
const { MsEdgeTTS, OUTPUT_FORMAT } = require2('msedge-tts');

const OUT = path.resolve(import.meta.dirname, '..', 'voice');
fs.mkdirSync(OUT, { recursive: true });
const LINES = [
  [
    "intro",
    "我要將糧食從天降給你們。百姓可以出去,每天收每天的分。"
  ],
  [
    "bless",
    "到第六天,他們要把所收進來的預備好了,比每天所收的多一倍。"
  ],
  [
    "win",
    "及至用俄梅珥量一量,多收的也沒有餘,少收的也沒有缺;各人按著自己的飯量收取。出埃及記十六章十八節。"
  ]
];
let made = 0;
for (const [name, text] of LINES) {
  const file = path.join(OUT, name + '.mp3');
  if (fs.existsSync(file) && fs.statSync(file).size > 2000) continue;
  const tts = new MsEdgeTTS();
  await tts.setMetadata('zh-TW-HsiaoChenNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = await tts.toStream(text);
  const chunks = [];
  await new Promise((res, rej) => {
    audioStream.on('data', c => chunks.push(c));
    audioStream.on('end', res);
    audioStream.on('error', rej);
  });
  fs.writeFileSync(file, Buffer.concat(chunks));
  made++;
  console.log('baked', name, fs.statSync(file).size, 'bytes');
}
console.log('done, new files:', made);
