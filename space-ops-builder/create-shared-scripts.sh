#!/bin/bash
# Creates shared-scripts.js from the raw extraction with fixes

INPUT="shared-scripts-raw.js"
OUTPUT="shared-scripts.js"

{
# Header
cat << 'HEADER'
/**
 * Space-Ops 3030 — Shared Application Scripts
 * Extracted from v14.76 for use in Node Builder previews.
 * Works with both real Firebase and mock-firebase.js
 * 
 * NOTE: This file is auto-generated. To regenerate:
 *   1. Extract lines 2380-7469 from space-ops-3030-v14.76.html into shared-scripts-raw.js
 *   2. Run: bash create-shared-scripts.sh
 */

// Wrap everything in a try-catch so DOM errors in partial previews don't crash the script
try {
HEADER

# Process the raw file with fixes:
# 1. Remove the original Firebase config declaration (lines 1-10) — mock-firebase.js or CDN handles this
# 2. Fix the temporal dead zone issue: change "let gameData = gameDataHardcoded" to "let gameData = null"  
# 3. Skip the CSV fetch that won't work in preview (lines 17-24)
# 4. After gameDataHardcoded closes (line 358), add "gameData = gameDataHardcoded;"

# Use awk for the processing
awk '
NR >= 1 && NR <= 10 { next }  # Skip Firebase config (handled by mock or CDN)
NR == 14 { print "        let gameData = null; // Will be set after gameDataHardcoded is declared"; next }
NR >= 16 && NR <= 24 { next }  # Skip CSV fetch on load (not needed in preview)
NR == 358 { print $0; print ""; print "        // Set gameData from hardcoded (moved here to avoid temporal dead zone)"; print "        gameData = gameDataHardcoded;"; next }
{ print }
' "$INPUT"

# Footer
cat << 'FOOTER'

} catch(e) {
    console.warn('[SharedScripts] Init error (expected in partial node preview):', e.message);
}
FOOTER

} > "$OUTPUT"

echo "Created $OUTPUT ($(wc -l < "$OUTPUT") lines)"
