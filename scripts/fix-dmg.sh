#!/bin/bash
# Fix DMG to hide .VolumeIcon.icns file
# This script unmounts and remounts the DMG, then hides the icon file

set -e

DMG_PATH="$1"

if [ -z "$DMG_PATH" ]; then
    echo "Usage: $0 <path-to-dmg>"
    exit 1
fi

if [ ! -f "$DMG_PATH" ]; then
    echo "Error: DMG file not found: $DMG_PATH"
    exit 1
fi

echo "Fixing DMG: $DMG_PATH"

# Create a temporary writable DMG
TEMP_DMG="/tmp/temp_rw_$(date +%s).dmg"
echo "Converting to writable DMG..."
hdiutil convert "$DMG_PATH" -format UDRW -o "$TEMP_DMG"

# Mount the writable DMG
echo "Mounting DMG..."
MOUNT_OUTPUT=$(hdiutil attach "$TEMP_DMG" -readwrite -noverify -noautoopen)
MOUNT_DIR=$(echo "$MOUNT_OUTPUT" | grep -E '/Volumes/' | awk '{for(i=3;i<=NF;i++) printf "%s ", $i; print ""}' | sed 's/ *$//')

if [ -z "$MOUNT_DIR" ]; then
    echo "Error: Could not determine mount directory"
    exit 1
fi

echo "Mounted at: $MOUNT_DIR"

# Hide the .VolumeIcon.icns file using chflags (survives hdiutil convert)
ICON_FILE="$MOUNT_DIR/.VolumeIcon.icns"
if [ -f "$ICON_FILE" ]; then
    echo "Hiding .VolumeIcon.icns..."
    # Use chflags hidden which persists through DMG conversion
    chflags hidden "$ICON_FILE"
    # Also use SetFile as backup
    SetFile -a V "$ICON_FILE" 2>/dev/null || true
    echo "Done hiding icon file"
else
    echo "Warning: .VolumeIcon.icns not found"
fi

# Also hide .fseventsd and .DS_Store if they exist
for HIDDEN_FILE in ".fseventsd" ".DS_Store" ".Trashes"; do
    if [ -e "$MOUNT_DIR/$HIDDEN_FILE" ]; then
        chflags hidden "$MOUNT_DIR/$HIDDEN_FILE" 2>/dev/null || true
    fi
done

# Unmount
echo "Unmounting..."
hdiutil detach "$MOUNT_DIR"

# Convert back to compressed format
echo "Converting back to compressed DMG..."
rm -f "$DMG_PATH"
hdiutil convert "$TEMP_DMG" -format UDZO -o "$DMG_PATH"

# Cleanup
rm -f "$TEMP_DMG"

echo "DMG fixed successfully: $DMG_PATH"
