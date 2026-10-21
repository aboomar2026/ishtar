/** Static brand integrity check. Runs without npm dependencies or database access. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const load = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, pass: Boolean(condition), detail });
}
const profile = load('src/config/brands/ishtar.ts');
const registry = load('src/config/brands/index.ts');
const types = load('src/config/brands/types.ts');
const layout = load('src/app/layout.tsx');
const logo = load('src/components/BrandLogo.tsx');
const css = load('src/app/globals.css');
const brandDir = path.join(root, 'public/brand/ishtar');

check('Brand profile registered', /ishtar:\s*ishtarBrand/.test(registry));
check('Brand key type', /['"]ishtar['"]/.test(types));
check('Brand environment alias', /ishtar:\s*['"]ishtar['"]/.test(registry));
check('RTL layout', /dir=['"]rtl['"]/.test(layout));
check('Dynamic document brand', /data-brand=\{activeBrandKey\}/.test(layout));
check('Dynamic favicon metadata', /brand\.assets\.favicon32/.test(layout));
check('Dynamic theme color', /brand\.colors\.primary/.test(layout));
check('Header logo', /variant === ['"]header['"]/.test(logo) && /ishtar-horizontal-brand\.svg/.test(logo));
check('Footer logo', /ishtar-horizontal-reverse\.svg/.test(logo) && /ishtarFullOnDark/.test(css));
check('Print logo', /variant === ['"]print['"]/.test(logo) && /ishtar-arabic-wordmark-burgundy\.svg/.test(logo));
for (const color of ['#522B3A', '#C79A83', '#FBF5ED', '#D9B5B4', '#2D2428']) {
  check(`Approved color ${color}`, profile.includes(color));
}
const refs = [...new Set([...profile.matchAll(/['"](\/brand\/ishtar\/[^'"\s]+)['"]/g)].map(x => x[1]))];
for (const ref of refs) {
  check(`Existing asset ${ref}`, fs.existsSync(path.join(root, 'public', ref.slice(1))));
}
for (const ref of [...new Set([...logo.matchAll(/['"](\/brand\/ishtar\/[^'"\s]+)['"]/g)].map(x => x[1]))]) {
  check(`Existing logo component asset ${ref}`, fs.existsSync(path.join(root, 'public', ref.slice(1))));
}
check('No inherited demo phone', !/\+?970[\d\s-]{7,}/.test(profile));
check('Brand kit assets available', fs.existsSync(brandDir) && fs.readdirSync(brandDir).length >= 10);
for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name}${item.detail ? ': ' + item.detail : ''}`);
const passed = checks.filter(x => x.pass).length;
console.log(`\nStatic brand checks: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exitCode = 1;
