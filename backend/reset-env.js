const fs = require('fs');
const content = `PORT=3000
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=orgit
DB_USER=postgres
DB_PASSWORD=2812
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=24h
OTP_EXPIRE=5
OTP_LENGTH=6
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://192.168.1.85:3000,http://192.168.1.85:3001
API_URL=http://localhost:3000
SOCKET_URL=http://localhost:3000
FILES_DIR=./uploads`;

fs.writeFileSync('.env', content);
console.log('✅ .env file has been reset and cleaned');
