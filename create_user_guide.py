#!/usr/bin/env python3
"""Generate the Space-Ops 3030 Tracker User Guide PDF."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)

# Colors
ACCENT = HexColor("#E8441E")
DARK = HexColor("#1a1a1a")
GRAY = HexColor("#666666")
LIGHT_BG = HexColor("#f5f5f5")
BORDER = HexColor("#dddddd")

# Build PDF
output_path = "/Users/andrebalmet/Documents/SpaceOps_3030 Tracker/SpaceOps3030_User_Guide.pdf"
doc = SimpleDocTemplate(
    output_path,
    pagesize=letter,
    topMargin=0.75 * inch,
    bottomMargin=0.75 * inch,
    leftMargin=0.85 * inch,
    rightMargin=0.85 * inch,
)

styles = getSampleStyleSheet()

# Custom styles
styles.add(ParagraphStyle(
    'CoverTitle', parent=styles['Title'],
    fontSize=36, leading=42, textColor=DARK,
    fontName='Helvetica-Bold', alignment=TA_CENTER,
    spaceAfter=6,
))
styles.add(ParagraphStyle(
    'CoverSub', parent=styles['Normal'],
    fontSize=16, leading=20, textColor=GRAY,
    fontName='Helvetica', alignment=TA_CENTER,
    spaceAfter=4,
))
styles.add(ParagraphStyle(
    'SectionHead', parent=styles['Heading1'],
    fontSize=22, leading=28, textColor=ACCENT,
    fontName='Helvetica-Bold', spaceBefore=24, spaceAfter=10,
    borderWidth=0, borderPadding=0,
))
styles.add(ParagraphStyle(
    'SubHead', parent=styles['Heading2'],
    fontSize=15, leading=20, textColor=DARK,
    fontName='Helvetica-Bold', spaceBefore=16, spaceAfter=6,
))
styles.add(ParagraphStyle(
    'Body', parent=styles['Normal'],
    fontSize=11, leading=16, textColor=DARK,
    fontName='Helvetica', spaceAfter=8,
))
styles.add(ParagraphStyle(
    'BulletItem', parent=styles['Normal'],
    fontSize=11, leading=16, textColor=DARK,
    fontName='Helvetica', leftIndent=20, spaceAfter=4,
    bulletIndent=8, bulletFontSize=11,
))
styles.add(ParagraphStyle(
    'StepNum', parent=styles['Normal'],
    fontSize=11, leading=16, textColor=DARK,
    fontName='Helvetica-Bold', leftIndent=20, spaceAfter=2,
))
styles.add(ParagraphStyle(
    'StepBody', parent=styles['Normal'],
    fontSize=11, leading=16, textColor=GRAY,
    fontName='Helvetica', leftIndent=20, spaceAfter=8,
))
styles.add(ParagraphStyle(
    'Tip', parent=styles['Normal'],
    fontSize=10, leading=14, textColor=HexColor("#555555"),
    fontName='Helvetica-Oblique', leftIndent=16,
    spaceBefore=4, spaceAfter=12,
    borderWidth=0, backColor=LIGHT_BG,
    borderPadding=(8, 8, 8, 8),
))
styles.add(ParagraphStyle(
    'TOCItem', parent=styles['Normal'],
    fontSize=13, leading=22, textColor=DARK,
    fontName='Helvetica', leftIndent=10,
))
styles.add(ParagraphStyle(
    'Footer', parent=styles['Normal'],
    fontSize=9, textColor=GRAY,
    fontName='Helvetica', alignment=TA_CENTER,
))

story = []


def divider():
    return HRFlowable(width="100%", thickness=1, color=BORDER, spaceBefore=6, spaceAfter=12)


def step(num, title, desc):
    """Return a numbered step with description."""
    return [
        Paragraph(f"Step {num}: {title}", styles['StepNum']),
        Paragraph(desc, styles['StepBody']),
    ]


def bullet(text):
    return Paragraph(f"\u2022  {text}", styles['BulletItem'])


# ─── COVER PAGE ───
story.append(Spacer(1, 1.8 * inch))
story.append(Paragraph("SPACE-OPS 3030", styles['CoverTitle']))
story.append(Paragraph("TRACKER", styles['CoverTitle']))
story.append(Spacer(1, 0.3 * inch))
story.append(HRFlowable(width="40%", thickness=3, color=ACCENT, spaceBefore=0, spaceAfter=16))
story.append(Paragraph("User Guide", styles['CoverSub']))
story.append(Paragraph("v14.76", styles['CoverSub']))
story.append(Spacer(1, 1.5 * inch))
story.append(Paragraph("A complete guide to managing teams, joining sessions,<br/>and tracking combat for Space-Ops 3030.", styles['CoverSub']))
story.append(Spacer(1, 0.5 * inch))
story.append(Paragraph("\u00a9 2026 Triggertype LLC. All rights reserved.", styles['Footer']))
story.append(PageBreak())


# ─── TABLE OF CONTENTS ───
story.append(Paragraph("Table of Contents", styles['SectionHead']))
story.append(divider())
toc_items = [
    "1.  Getting Started",
    "2.  Logging In",
    "3.  Building a Team",
    "4.  Managing Saved Teams",
    "5.  Exporting Teams to PDF",
    "6.  Joining a Session",
    "7.  In-Session Gameplay",
    "8.  Quick Reference",
]
for item in toc_items:
    story.append(Paragraph(item, styles['TOCItem']))
story.append(PageBreak())


# ─── 1. GETTING STARTED ───
story.append(Paragraph("1. Getting Started", styles['SectionHead']))
story.append(divider())
story.append(Paragraph(
    "Space-Ops 3030 Tracker is a web-based companion app for the Space-Ops 3030 tabletop game. "
    "It runs entirely in your browser \u2014 no app install required. All your data (teams, sessions, combat state) "
    "is saved to the cloud via Firebase, so you can access it from any device.",
    styles['Body']
))
story.append(Paragraph("What You Can Do", styles['SubHead']))
story.append(bullet("Build and customize teams with faction-specific models"))
story.append(bullet("Equip models with weapons and gear from the game database"))
story.append(bullet("Save teams to your account and export them as PDF roster sheets"))
story.append(bullet("Create or join multiplayer sessions"))
story.append(bullet("Track health, status effects, and combat in real time"))
story.append(bullet("Roll dice directly in the app"))
story.append(Spacer(1, 8))
story.append(Paragraph("What Gets Saved", styles['SubHead']))
story.append(Paragraph(
    "Your player name is stored in your browser's local storage so you stay logged in between visits. "
    "Teams and session data are saved to Firebase (cloud) and tied to your player name. "
    "Anyone using the same player name on any device can access the same teams and sessions.",
    styles['Body']
))
story.append(Paragraph(
    "Tip: Choose a unique player name to keep your data separate from other players.",
    styles['Tip']
))
story.append(Paragraph("Supported Factions", styles['SubHead']))

faction_data = [
    ["Faction", "Description"],
    ["Arc Rangers", "Disciplined military operators with versatile loadouts"],
    ["Space-Wyrm", "Alien warriors with powerful melee and psychic abilities"],
    ["Kippin", "Agile scouts with stealth and tech-focused equipment"],
    ["Malegeist", "Undead horrors with dark abilities"],
]
faction_table = Table(faction_data, colWidths=[1.8 * inch, 4.2 * inch])
faction_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), DARK),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 10),
    ('LEADING', (0, 0), (-1, -1), 16),
    ('BACKGROUND', (0, 1), (-1, -1), LIGHT_BG),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
]))
story.append(faction_table)
story.append(PageBreak())


# ─── 2. LOGGING IN ───
story.append(Paragraph("2. Logging In", styles['SectionHead']))
story.append(divider())

story.append(Paragraph("First-Time Login", styles['SubHead']))
for s in step(1, "Open the app", "Navigate to the Space-Ops 3030 Tracker in your browser."):
    story.append(s)
for s in step(2, 'Click "Login"', 'On the landing page, tap the <b>LOGIN</b> button.'):
    story.append(s)
for s in step(3, "Enter your player name",
              'A popup will appear asking for your name. Type your player name and click <b>Save</b>.'):
    story.append(s)
for s in step(4, "You're in!",
              'The LOGIN button will change to <b>LOGIN:YourName</b>, confirming you are logged in. '
              'You will stay on the main menu to choose what to do next.'):
    story.append(s)

story.append(Paragraph("Switching Players", styles['SubHead']))
story.append(Paragraph(
    'If you are already logged in, clicking <b>LOGIN:YourName</b> will open the player name popup '
    'with your current name pre-filled. You can change it or click <b>Logout</b> to sign out completely.',
    styles['Body']
))

story.append(Paragraph("Logging Out", styles['SubHead']))
for s in step(1, "Click your login button", 'Click <b>LOGIN:YourName</b> on the main menu.'):
    story.append(s)
for s in step(2, 'Click "Logout"',
              'In the popup, click the red <b>Logout</b> button. '
              'Your name is cleared and the button reverts to <b>LOGIN</b>.'):
    story.append(s)

story.append(Paragraph(
    "Tip: Your player name determines which saved teams you can access. "
    "If you log in with a different name, you will see that player's teams instead.",
    styles['Tip']
))
story.append(PageBreak())


# ─── 3. BUILDING A TEAM ───
story.append(Paragraph("3. Building a Team", styles['SectionHead']))
story.append(divider())

story.append(Paragraph("Starting a New Team", styles['SubHead']))
for s in step(1, 'Click "Build Team"',
              'From the main menu, click <b>BUILD TEAM</b>. If you are not logged in, '
              'you will be prompted to enter your player name first.'):
    story.append(s)
for s in step(2, "Choose a faction",
              "Select your faction from the faction selector screen. "
              "This determines which models and equipment are available to you."):
    story.append(s)
for s in step(3, "Name your team",
              'In the team builder, type a name in the <b>Team Name</b> field (e.g., "Alpha Squad").'):
    story.append(s)

story.append(Paragraph("Adding Models", styles['SubHead']))
story.append(Paragraph(
    "The team builder has two columns:",
    styles['Body']
))
story.append(bullet("<b>Left column</b> \u2014 Available Models for your faction, showing name, stats, starting gear, and point cost"))
story.append(bullet("<b>Right column</b> \u2014 Your Team roster with the models you've added"))
story.append(Spacer(1, 4))
story.append(Paragraph(
    'Click the <b>+</b> button next to any available model to add it to your team. '
    'The point total updates automatically.',
    styles['Body']
))

story.append(Paragraph("Editing Models", styles['SubHead']))
story.append(Paragraph(
    'Click <b>Edit</b> on any model in your roster to expand the inline editor. Here you can:',
    styles['Body']
))
story.append(bullet("Change the model's name (custom names)"))
story.append(bullet("Swap weapons using dropdown menus"))
story.append(bullet("Add equipment from the available gear list"))
story.append(bullet("Adjust stats or reset them to base values"))
story.append(bullet("Add notes"))

story.append(Paragraph("Removing Models", styles['SubHead']))
story.append(Paragraph(
    'Click the <b>\u2715</b> button on any model in your roster to remove it. '
    'Points are adjusted automatically.',
    styles['Body']
))

story.append(Paragraph("Saving Your Team", styles['SubHead']))
for s in step(1, 'Click "Save Team"',
              'Click the <b>SAVE TEAM</b> button in the top-right of the team builder.'):
    story.append(s)
for s in step(2, "Confirmation",
              'A confirmation dialog appears showing team name, faction, points, and model count. '
              'From here you can join a session, view your teams, build another, or return to the menu.'):
    story.append(s)

story.append(Paragraph(
    "Tip: If you are editing an existing team (loaded via 'Load Saved Team' or from My Teams), "
    "saving will update the existing team instead of creating a duplicate.",
    styles['Tip']
))
story.append(PageBreak())


# ─── 4. MANAGING SAVED TEAMS ───
story.append(Paragraph("4. Managing Saved Teams", styles['SectionHead']))
story.append(divider())

story.append(Paragraph("Viewing Your Teams", styles['SubHead']))
story.append(Paragraph(
    'Navigate to <b>My Teams</b> from the team builder menu or the saved dialog. '
    'You will see all your saved teams displayed as cards showing the team name, faction, '
    'point total, and model count.',
    styles['Body']
))

story.append(Paragraph("Editing a Saved Team", styles['SubHead']))
story.append(Paragraph(
    'Click <b>Edit</b> on any team card. This opens the full team builder with your team loaded \u2014 '
    'available models on the left, your roster on the right. Make changes and click <b>Save Team</b> '
    'to update.',
    styles['Body']
))

story.append(Paragraph("Loading a Saved Team in the Builder", styles['SubHead']))
story.append(Paragraph(
    'While inside the team builder (after choosing a faction), click <b>LOAD SAVED TEAM</b> '
    'in the top bar. A dropdown appears listing only your saved teams for that faction. '
    'Click a team to load it into the builder for editing.',
    styles['Body']
))
story.append(Paragraph(
    "Tip: The Load Saved Team picker is faction-filtered. If you're building an Arc Rangers team, "
    "only Arc Rangers teams appear. Switch factions to see teams from other factions.",
    styles['Tip']
))

story.append(Paragraph("Deleting a Team", styles['SubHead']))
story.append(Paragraph(
    'Click <b>Delete</b> on a team card in My Teams. A confirmation prompt will appear. '
    'This action is permanent \u2014 the team is removed from Firebase.',
    styles['Body']
))

story.append(Paragraph("Import / Export CSV", styles['SubHead']))
story.append(Paragraph(
    'My Teams includes <b>Export to CSV</b> and <b>Import from CSV</b> buttons. '
    'Use these to back up your teams or transfer them between accounts.',
    styles['Body']
))
story.append(PageBreak())


# ─── 5. EXPORTING TO PDF ───
story.append(Paragraph("5. Exporting Teams to PDF", styles['SectionHead']))
story.append(divider())
story.append(Paragraph(
    "You can export any saved team as a printable PDF roster sheet, formatted for tabletop play.",
    styles['Body']
))

for s in step(1, "Go to My Teams",
              "Navigate to <b>My Teams</b> from the menu."):
    story.append(s)
for s in step(2, 'Click "PDF"',
              "Click the <b>PDF</b> button on the team you want to export."):
    story.append(s)
for s in step(3, "Download",
              "A PDF file downloads automatically. It includes:"):
    story.append(s)

story.append(bullet("<b>Header</b> \u2014 Player name, faction, and total points"))
story.append(bullet("<b>Model cards</b> \u2014 6 per page in a 2\u00d73 grid"))
story.append(bullet("<b>Stats</b> \u2014 Speed, Fight, Shoot, Defense, Grit in dark stat boxes"))
story.append(bullet("<b>Standard Equipment</b> \u2014 Default loadout for each model"))
story.append(bullet("<b>Gear slots</b> \u2014 4 gear slots per model (weapons + equipment)"))
story.append(Spacer(1, 4))
story.append(Paragraph(
    "Teams with more than 6 models automatically generate additional pages.",
    styles['Body']
))
story.append(PageBreak())


# ─── 6. JOINING A SESSION ───
story.append(Paragraph("6. Joining a Session", styles['SectionHead']))
story.append(divider())

story.append(Paragraph("Creating or Joining", styles['SubHead']))
for s in step(1, 'Click "Join Session"',
              "From the main menu, click <b>JOIN SESSION</b>."):
    story.append(s)
for s in step(2, "Enter a session name",
              "Type a session name. If the session exists, you will join it. "
              "If it doesn't exist, a new session is created automatically."):
    story.append(s)
for s in step(3, "You're in the session",
              "The app switches to the session view with tabs for Join/Create, Sessions, Game, and Tools."):
    story.append(s)

story.append(Paragraph("Loading a Team into a Session", styles['SubHead']))
story.append(Paragraph(
    "Once in a session, you can load one of your saved teams to populate your characters. "
    "Your team's models become your playable characters for that session, complete with "
    "stats, weapons, and equipment.",
    styles['Body']
))
story.append(PageBreak())


# ─── 7. IN-SESSION GAMEPLAY ───
story.append(Paragraph("7. In-Session Gameplay", styles['SectionHead']))
story.append(divider())

story.append(Paragraph("Character Cards", styles['SubHead']))
story.append(Paragraph(
    "Each of your characters is displayed as a card showing:",
    styles['Body']
))
story.append(bullet("Name, role, and portrait"))
story.append(bullet("Health bar with <b>+</b> and <b>\u2013</b> buttons for tracking damage/healing"))
story.append(bullet("Stats grid (Speed, Shoot, Fight, Defense/Nerve, Grit)"))
story.append(bullet("Weapons and equipment"))
story.append(bullet("Status effects with duration tracking"))

story.append(Paragraph("Editing Characters In-Session", styles['SubHead']))
story.append(Paragraph(
    'Click <b>Edit</b> on any character card to open the inline editor. '
    'This uses the same dropdown-based editor as the team builder, letting you swap weapons, '
    'change equipment, adjust stats, rename characters, and more \u2014 all saved to Firebase in real time.',
    styles['Body']
))

story.append(Paragraph("Combat Tracking", styles['SubHead']))
story.append(bullet("<b>Health</b> \u2014 Use + and \u2013 buttons to track damage and healing"))
story.append(bullet("<b>Status Effects</b> \u2014 Add conditions like Stunned, Poisoned, etc. with duration"))
story.append(bullet("<b>Initiative</b> \u2014 Track turn order for all players"))
story.append(bullet("<b>Combat Timer</b> \u2014 Optional round timer for timed games"))

story.append(Paragraph("Tools Tab", styles['SubHead']))
story.append(Paragraph(
    "The Tools tab provides a built-in dice roller with D4, D6, D8, D12, and D20 options. "
    "Roll results are displayed immediately in the app.",
    styles['Body']
))
story.append(PageBreak())


# ─── 8. QUICK REFERENCE ───
story.append(Paragraph("8. Quick Reference", styles['SectionHead']))
story.append(divider())

ref_data = [
    ["Action", "How To"],
    ["Log in", 'Click LOGIN, enter your name, click Save'],
    ["Log out", 'Click LOGIN:YourName, click Logout'],
    ["Switch player", 'Click LOGIN:YourName, change the name, click Save'],
    ["Build a team", 'Main menu \u2192 Build Team \u2192 Choose faction \u2192 Add models'],
    ["Save a team", 'In team builder, click Save Team'],
    ["Load a saved team", 'In team builder, click Load Saved Team \u2192 pick a team'],
    ["Edit a saved team", 'My Teams \u2192 Edit \u2192 modify in team builder \u2192 Save'],
    ["Export PDF", 'My Teams \u2192 PDF button on any team'],
    ["Delete a team", 'My Teams \u2192 Delete button on any team'],
    ["Join a session", 'Main menu \u2192 Join Session \u2192 enter session name'],
    ["Edit in-session", 'Click Edit on any character card'],
    ["Track damage", 'Use + and \u2013 buttons on health display'],
    ["Roll dice", 'Session \u2192 Tools tab \u2192 select die type'],
]
ref_table = Table(ref_data, colWidths=[2.0 * inch, 4.3 * inch])
ref_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), DARK),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, -1), 10),
    ('LEADING', (0, 0), (-1, -1), 15),
    ('BACKGROUND', (0, 1), (0, -1), LIGHT_BG),
    ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
    ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('ROWBACKGROUNDS', (1, 1), (-1, -1), [white, HexColor("#fafafa")]),
]))
story.append(ref_table)

story.append(Spacer(1, 0.5 * inch))
story.append(HRFlowable(width="40%", thickness=2, color=ACCENT, spaceBefore=8, spaceAfter=12))
story.append(Paragraph(
    "For questions or feedback, visit the Space-Ops 3030 community or contact Triggertype LLC.",
    styles['Body']
))
story.append(Paragraph("\u00a9 2026 Triggertype LLC. All rights reserved.", styles['Footer']))

# Build
doc.build(story)
print(f"PDF created: {output_path}")
