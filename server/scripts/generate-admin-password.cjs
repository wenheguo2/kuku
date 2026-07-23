const { randomBytes, scryptSync } = require('crypto');

const password = process.env.KUKU_ADMIN_PASSWORD;
if (!password || password.length < 12) {
  console.error('请先设置至少 12 位的 KUKU_ADMIN_PASSWORD 环境变量。');
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64);
console.log(`ADMIN_PASSWORD_SCRYPT=scrypt$${salt.toString('hex')}$${hash.toString('hex')}`);
