// #####################################################################
// BOOKMARKS
// #####################################################################

// Bookmarks
function getBookmarksPath() {
    
    const userPath = path.join(app.getPath('userData'), 'bookmarks.json');
    
    if (!fs.existsSync(userPath)) {
        fs.writeFileSync(userPath, JSON.stringify({
        }, null, 2));
    }
    
    return userPath;
}

function getFilePath(file) {
    
    const userPath = path.join(app.getPath('userData'), file);
    
    let data = `{}`;
    
    if(file == 'surfvalues.json') {
        
        data = `{
          "vaultStatus": "first-run",
          "sessionPWM": "inactive",
          "bookmark": ""
        }`;
        
    }
    
    if (!fs.existsSync(userPath)) {
        fs.writeFileSync(userPath, data);
    }
    
    return userPath;
}