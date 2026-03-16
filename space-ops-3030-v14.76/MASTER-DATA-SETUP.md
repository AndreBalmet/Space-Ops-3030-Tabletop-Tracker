# Space Ops 3030 - Master Data System Setup

## 🎯 What This Does (Simple Explanation)

**Before:** Game data (factions, models, weapons) was locked inside the HTML file. To update it, you had to edit code and re-release the file.

**Now:** Game data lives in a Google Sheet that you can edit like Excel. When players load the tool, it automatically downloads the latest data from your Sheet.

**Benefits:**
- ✅ Edit game data in Google Sheets (no coding required)
- ✅ Updates happen instantly for all players
- ✅ Collaborate with your team on balancing
- ✅ No need to re-release the HTML file
- ✅ Works offline (uses last downloaded version)

---

## 📋 Step 1: Create Your Google Sheet

1. **Go to Google Sheets:** https://sheets.google.com
2. **Create a new spreadsheet**
3. **Name it:** "Space Ops 3030 - Master Data"
4. **Import the CSV files** (included in this zip):
   - Create 5 tabs (sheets) with these EXACT names:
     - `FACTIONS`
     - `MODELS`
     - `WEAPONS`
     - `SPECIAL_ACTIONS`
     - `STARTER_SQUADS`
   
5. **Import each CSV into its tab:**
   - Click on a tab
   - File → Import → Upload → Select the matching CSV
   - Import location: "Replace current sheet"
   - Click "Import data"
   - Repeat for all 5 tabs

---

## 📤 Step 2: Publish Each Tab as CSV

For EACH of the 5 tabs, do this:

1. **Click on the tab** (e.g., FACTIONS)
2. **File → Share → Publish to web**
3. **Choose:**
   - "Link" (first dropdown)
   - Select the current tab (e.g., "FACTIONS")
   - Choose format: **"Comma-separated values (.csv)"**
4. **Click "Publish"**
5. **Copy the URL** - it will look like:
   ```
   https://docs.google.com/spreadsheets/d/e/2PACX-1vS.../pub?gid=0&single=true&output=csv
   ```
6. **Save this URL somewhere** - you'll need it in Step 3

**Repeat for all 5 tabs!** You'll have 5 different URLs.

---

## 🔧 Step 3: Add URLs to the HTML File

1. **Open `space-ops-3030-v14.76.html` in a text editor**
2. **Search for:** `YOUR_FACTIONS_CSV_URL_HERE`
3. **You'll find 5 lines like this:**
   ```javascript
   const CSV_URLS = {
       factions: 'YOUR_FACTIONS_CSV_URL_HERE',
       models: 'YOUR_MODELS_CSV_URL_HERE',
       weapons: 'YOUR_WEAPONS_CSV_URL_HERE',
       specialActions: 'YOUR_SPECIAL_ACTIONS_CSV_URL_HERE',
       starterSquads: 'YOUR_STARTER_SQUADS_CSV_URL_HERE'
   };
   ```

4. **Replace each `YOUR_..._HERE` with the actual URL** from Step 2:
   ```javascript
   const CSV_URLS = {
       factions: 'https://docs.google.com/spreadsheets/d/e/2PACX.../FACTIONS...csv',
       models: 'https://docs.google.com/spreadsheets/d/e/2PACX.../MODELS...csv',
       weapons: 'https://docs.google.com/spreadsheets/d/e/2PACX.../WEAPONS...csv',
       specialActions: 'https://docs.google.com/spreadsheets/d/e/2PACX.../ACTIONS...csv',
       starterSquads: 'https://docs.google.com/spreadsheets/d/e/2PACX.../SQUADS...csv'
   };
   ```

5. **Save the HTML file**

---

## ✅ Step 4: Test It

1. **Open the HTML file in a browser**
2. **Press F12** to open Developer Console
3. **Look for these messages:**
   ```
   🔄 Fetching game data from Google Sheets...
   ✅ Successfully loaded game data from Google Sheets!
      - 3 factions
      - 5 models
      - 5 weapons
      - 5 special actions
      - 3 starter squads
   ✅ Using live data from Google Sheets
   ```

4. **If you see errors:**
   - Check that URLs are correct
   - Make sure you published as CSV (not web page)
   - Make sure URLs don't have extra quotes or spaces

---

## 🔄 How to Update Game Data

**This is the easy part!**

1. **Open your Google Sheet**
2. **Edit any data you want:**
   - Add a new faction
   - Change a model's stats
   - Add a new weapon
   - Update lore text
3. **Save** (Google Sheets saves automatically)
4. **Done!**

**Players will get the updates:**
- Next time they load the page
- Or when they refresh their browser

**No need to:**
- ❌ Edit the HTML file
- ❌ Re-release anything
- ❌ Tell anyone to download a new version

---

## 🛠️ How to Add New Data

### Add a New Faction:
1. Open FACTIONS tab
2. Add a new row:
   ```
   Name         | LoreShort              | LoreFull           | PrimaryColor | AccentColor
   New Faction  | Short description here | Full lore here...  | #FF5733      | #C70039
   ```

### Add a New Model:
1. Open MODELS tab
2. Add a new row with all required fields
3. Make sure Faction name matches exactly

### Add a New Weapon:
1. Open WEAPONS tab
2. Add a new row
3. Assign to a Faction (or use "Universal" for all factions)

---

## 🐛 Troubleshooting

**Problem:** Console says "CSV URLs not configured"
- **Fix:** Make sure you replaced ALL 5 `YOUR_..._HERE` placeholders

**Problem:** Console says "Failed to fetch game data"
- **Fix:** Check that Sheet is published (File → Share → Publish to web)
- **Fix:** Make sure you chose ".csv" format, not "Web page"

**Problem:** Data looks wrong in the game
- **Fix:** Check CSV headers match exactly (case-sensitive!)
- **Fix:** Make sure no extra commas in your data

**Problem:** Works on your computer but not for others
- **Fix:** Sheet must be published (not just shared)
- **Fix:** Published links are public - anyone with the link can view

---

## 📁 File Structure

```
space-ops-3030-v14.76.html    ← Main tracker (players use this)
FACTIONS.csv                  ← Template (import into Google Sheets)
MODELS.csv                    ← Template
WEAPONS.csv                   ← Template
SPECIAL_ACTIONS.csv           ← Template
STARTER_SQUADS.csv            ← Template
MASTER-DATA-SETUP.md          ← This file
```

---

## 🎮 For Players

Players don't need to do anything! They just:
1. Open the HTML file
2. Play the game
3. Get automatic updates when you change the Sheet

---

## 🔒 Security Note

**The Google Sheet is READ-ONLY for players.**

- Players can't edit your Sheet
- They only download a copy of the data
- You control all updates through the Sheet
- Only people with edit access to the Sheet can modify it

---

## 🚀 Next Steps

Once this works, you can:
- Add validation rules in Google Sheets
- Use formulas to calculate point costs
- Color-code rows for different factions
- Add comments/notes for your team
- Track version history (File → Version history)

---

**Questions? Issues? Check the browser console (F12) for detailed error messages.**
