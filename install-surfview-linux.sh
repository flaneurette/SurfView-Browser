#!/bin/bash
 
# Resolve the directory this script lives in, regardless of where it's run from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_PATH="$SCRIPT_DIR"

APPIMAGE=$(find "$REPO_PATH/dist" -iname "SurfView-*.AppImage" 2>/dev/null | head -n1)
ICON_PATH=$(find "$REPO_PATH/assets" -iname "ico.*" 2>/dev/null | head -n1)

if [ -z "$APPIMAGE" ]; then
    echo "ERROR: Could not find SurfView AppImage in $REPO_PATH/dist"
    exit 1
fi

chmod +x "$APPIMAGE"

if [ -z "$ICON_PATH" ] || [ ! -f "$ICON_PATH" ]; then
    echo "WARNING: Icon not found in $REPO_PATH/assets"
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
