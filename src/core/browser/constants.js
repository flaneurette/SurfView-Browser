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
    protocol,
    webContents,
    Menu, 
    MenuItem,
    screen,
    globalShortcut
} = require('electron');

const path = require('path');
const {spawn} = require('child_process');
const fs = require('fs');

const puppeteer = require('puppeteer');
