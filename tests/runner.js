const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const testDir = __dirname;
const files = fs.readdirSync(testDir).filter(f => f.endsWith('.test.js'));

console.log(`Running ${files.length} test files...`);

(async () => {
    for (const file of files) {
        console.log(`\n--- Running ${file} ---`);
        await new Promise((resolve, reject) => {
            const p = spawn('node', [path.join(testDir, file)], { stdio: 'inherit' });
            p.on('close', code => {
                if (code === 0) resolve();
                else reject(new Error(`Test ${file} failed with code ${code}`));
            });
        });
    }
    console.log('\n✅ All tests passed.');
})().catch(err => {
    console.error('\n❌ Test failure:', err);
    process.exit(1);
});
