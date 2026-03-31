// #####################################################################
// TOR
// #####################################################################

async function proxyManagement() {
    
    await SurfBrowserView.webContents.session.setProxy({
        proxyRules: torEnabled && torReady 
            ? torAddress+':'+torPort 
            : 'direct://'
    }); 
    
    await session.defaultSession.setProxy({
        proxyRules: torEnabled && torReady 
            ? torAddress+':'+torPort 
            : 'direct://'
    }); 
}

function startTor() {

    try { 
    
        return new Promise((resolve, reject) => {
            // Ensure data directory exists
            if (!fs.existsSync(torDataDir)) {
                fs.mkdirSync(torDataDir, {
                    recursive: true
                });
            }

            torProcess = spawn(torPath, torArgs);

            const timeout = setTimeout(() => {
                reject(new Error('Tor failed to bootstrap within 60 seconds'));
            }, 60000);

            const onData = (data) => {
                const line = data.toString();
                if(devdebug) console.log('[Tor]:', line.trim());
                if (line.includes('Bootstrapped 100%')) {
                    clearTimeout(timeout);
                    torReady = true;
                    resolve();
                }
            };

            // Tor may log to stdout or stderr depending on build
            torProcess.stdout.on('data', onData);
            torProcess.stderr.on('data', onData);

            torProcess.on('error', (err) => {
                clearTimeout(timeout);
                if(devdebug) console.error('[Tor] Failed to start:', err.message);
                reject(err);
            });

            torProcess.on('exit', (code) => {
                if(devdebug) console.log('[Tor] Exited with code', code);
                torReady = false;
                torProcess = null;
            });
        });
    
    } catch(e) {}
}

function stopTor() {
    if (torProcess) {
        try {
            torProcess.kill();
        } catch (_) {}
        torProcess = null;
        torReady = false;
    }
}
