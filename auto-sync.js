const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname);
const SYNC_INTERVAL = 30000; // 30 segundos
const LOG_FILE = path.join(PROJECT_DIR, 'sync-log.txt');

function log(msg) {
  const line = `[${new Date().toLocaleString('pt-BR')}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function hasChanges() {
  try {
    const status = execSync('git status --porcelain', { cwd: PROJECT_DIR, encoding: 'utf-8' });
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

function syncToGitHub() {
  if (!hasChanges()) {
    return;
  }

  try {
    log('Alteracoes detectadas, sincronizando...');

    // Adicionar tudo
    execSync('git add -A', { cwd: PROJECT_DIR });

    // Commit automatico
    const timestamp = new Date().toLocaleString('pt-BR');
    execSync(`git commit -m "auto-sync: atualizacao automatica ${timestamp}"`, { cwd: PROJECT_DIR });

    // Push para GitHub
    execSync('git push origin main', { cwd: PROJECT_DIR });

    log('Sincronizado com sucesso!');
  } catch (e) {
    log(`Erro ao sincronizar: ${e.message}`);
  }
}

// ========== START ==========
console.log('');
console.log('========================================');
console.log('  MAR100 - Auto Sync GitHub');
console.log('========================================');
console.log('');
console.log(`Monitorando: ${PROJECT_DIR}`);
console.log(`Intervalo: ${SYNC_INTERVAL / 1000}s`);
console.log('Pressione Ctrl+C para parar.');
console.log('');

// Sync inicial
syncToGitHub();

// Sync periodico
setInterval(syncToGitHub, SYNC_INTERVAL);

// Trap para Ctrl+C
process.on('SIGINT', () => {
  log('Auto-sync encerrado pelo usuario.');
  process.exit(0);
});
