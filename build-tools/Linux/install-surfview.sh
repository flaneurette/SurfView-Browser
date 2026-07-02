#!/bin/bash

APPIMAGE=$(find ~/Desktop/Git/SurfView-Browser/dist -iname "SurfView-*.AppImage" 2>/dev/null | head -n1)
ICON_PATH=~/Desktop/Git/SurfView-Browser/assets/ico.png

if [ -z "$APPIMAGE" ]; then
    echo "ERROR: Could not find SurfView AppImage."
    exit 1
fi

if [ ! -f "$ICON_PATH" ]; then
    echo "WARNING: Icon not found at $ICON_PATH"
    ICON_PATH=""
fi

mkdir -p ~/.local/share/applications

cat > ~/.local/share/applications/surfview.desktop << EOF
[Desktop Entry]
Name=SurfView
Exec=$APPIMAGE --no-sandbox
Icon=$ICON_PATH
Type=Application
Categories=Network;WebBrowser;
Terminal=false
EOF

chmod +x ~/.local/share/applications/surfview.desktop
update-desktop-database ~/.local/share/applications
gtk-update-icon-cache ~/.local/share/icons/hicolor 2>/dev/null
echo "SurfView installed! Using AppImage: $APPIMAGE"

gtk-launch surfview
