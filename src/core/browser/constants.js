// #####################################################################
// CONSTANTS
// #####################################################################

const {
    app,
    BrowserWindow,
    WebContentsView,
    ipcMain,
    shell,
    session,
    dialog,
    net,
    webContents,
    Menu, 
    MenuItem,
    globalShortcut
} = require('electron');

const path = require('path');
const {spawn} = require('child_process');
const fs = require('fs');

const puppeteer = require('puppeteer');
