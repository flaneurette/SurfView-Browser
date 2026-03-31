// #####################################################################
// PRIVACY
// #####################################################################

function injectPrivacyScript1(page,msg) {
    if(devdebug) console.log(msg);
    if(privacyEnabled === true) {
        return page.evaluateOnNewDocument(privacyScript);
        } else {
        return page.evaluateOnNewDocument(dummyScript);
    }
}

function injectPrivacyScript(contents,msg) {
    if(devdebug) console.log(msg);
    if(privacyEnabled === true) {
        //return contents.executeJavaScript(privacyScript);
        } else {
        //return contents.executeJavaScript(dummyScript);
    }
}