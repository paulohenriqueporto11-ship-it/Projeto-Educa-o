// --- MATEMÁTICA ---
import { questoes as mat_geo } from './banco_questoes/MAT/geo.js';
import { questoes as mat_alg } from './banco_questoes/MAT/alg.js';
import { questoes as mat_est } from './banco_questoes/MAT/est.js';
import { questoes as mat_fin } from './banco_questoes/MAT/fin.js';

// --- NATUREZA ---
import { questoes as nat_bio } from './banco_questoes/NAT/bio.js';
import { questoes as nat_fis } from './banco_questoes/NAT/fis.js';
import { questoes as nat_qui } from './banco_questoes/NAT/qui.js';

// --- HUMANAS ---
import { questoes as hum_his } from './banco_questoes/HUM/his.js';
import { questoes as hum_geog } from './banco_questoes/HUM/geog.js';
import { questoes as hum_fil } from './banco_questoes/HUM/fil.js';
import { questoes as hum_soc } from './banco_questoes/HUM/soc.js';

// --- LINGUAGENS ---
import { questoes as lin_gra } from './banco_questoes/LIN/gra.js';
import { questoes as lin_lit } from './banco_questoes/LIN/lit.js';
import { questoes as lin_art } from './banco_questoes/LIN/art.js';
import { questoes as lin_ing } from './banco_questoes/LIN/ing.js';
import { questoes as lin_esp } from './banco_questoes/LIN/esp.js';

// Junta tudo em uma única lista
export const database = [
    ...mat_geo, ...mat_alg, ...mat_est, ...mat_fin,
    ...nat_bio, ...nat_fis, ...nat_qui,
    ...hum_his, ...hum_geog, ...hum_fil, ...hum_soc,
    ...lin_gra, ...lin_lit, ...lin_art, ...lin_ing, ...lin_esp
];

console.log(`Banco de dados carregado: ${database.length} questões.`);
