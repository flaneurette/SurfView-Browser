// #####################################################################
// BOOKMARKS
// #####################################################################

// Bookmarks
function getBookmarksPath() {
    const userPath = path.join(app.getPath('userData'), 'bookmarks.json');
    if (!fs.existsSync(userPath)) {
        const defaultPath = path.join(__dirname, 'data/bookmarks.json');
        if (fs.existsSync(defaultPath)) {
            fs.copyFileSync(defaultPath, userPath);
        } else {
            fs.writeFileSync(userPath, JSON.stringify({
                url: []
            }, null, 2));
        }
    }
    return userPath;
}
