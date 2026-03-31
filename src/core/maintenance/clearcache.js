// #####################################################################
// CLEAR CACHE
// #####################################################################

async function clearData() {
    const fs = require('fs')
    const path = require('path')
    fs.rmSync(app.getPath('userData'), { recursive: true, force: true })
}
