// #####################################################################
// INCLUDE.JS
// #####################################################################

const fs = require('fs');
const path = require('path');
const activeWatchers = new Map(); // Maps file paths to their watcher references
let backup = true;
  
function js(files, out, options = {}) {
    
    let { watch = false, debug = false, backup = false} = options;

    if (debug) {
        console.log('Merging files:', files);
        console.log('Output file:', out);
    }

    try {
        let jsfile = '';
        jsfile += `(function() {\n`;

        files.forEach(file => {
            try {
                const filePath = path.join(__dirname, file);
                if (!fs.existsSync(filePath)) {
                    if (debug) {
                        console.log(`File to include not found: ${filePath}`);
                    }
                    return; // Skip the file if it's not found
                }

                const content = fs.readFileSync(filePath, 'utf8');

                if (debug) {
                    console.log(`Processing file: ${file}`);
                }

                jsfile += `// ===== START OF ${file} =====\n\n`;
                jsfile += content + '\n\n';
                jsfile += `// ===== END OF ${file} =====\n\n`;
            } catch (err) {
                console.log(`Error processing file ${file}:`, err);
                throw err; // Re-throw to stop the process
            }
        });

        jsfile += `\n})();\n`;

        // Create the output directory if it doesn't exist
        
        const outDir = path.dirname(out);
        
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }

        try {
            fs.writeFileSync(out, jsfile);
        } catch(e) {}

        if (debug) {
            console.log('Successfully merged files to:', out);
        }

        // Create backup if enabled
        if (backup) {
            
            const backupDir = path.join(__dirname, 'backup');
            
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(backupDir, `backup.app.js.${timestamp}`);

            try {
                fs.writeFileSync(backupFile, jsfile);
            } catch(e) {}

            if (debug) {
                console.log('Created backup file:', backupFile);
            }
        }

        // Watch for changes if enabled

        if (watch) {
            files.forEach(file => {
                const filePath = path.join(__dirname, file);

                // Remove old watcher (if it exists)
                if (activeWatchers.has(filePath)) {
                    fs.unwatchFile(filePath, activeWatchers.get(filePath));
                }

                // Add new watcher
                const watcher = (curr, prev) => {
                    if (debug) {
                        console.log(`File ${file} changed, re-merging...`);
                    }
                    backup = false; // Disable backup during re-merging
                    js(files, out, options);
                };   

                fs.watchFile(filePath, watcher);
                activeWatchers.set(filePath, watcher); // Store the watcher for cleanup
            });
        }

        return out;
    } catch (err) {
        console.log('Error in js function:', err);
        throw err;
    }
}

module.exports = {
    js
};