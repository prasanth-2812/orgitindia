const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    const cleanedLines = lines.map(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            return `${key}=${value}`;
        }
        return line.trim();
    });
    fs.writeFileSync(envPath, cleanedLines.join('\n'));
    console.log('✅ Sanitized .env file');
} else {
    console.log('❌ .env file not found');
}
