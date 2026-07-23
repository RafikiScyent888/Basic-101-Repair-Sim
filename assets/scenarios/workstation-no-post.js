export default {
  id: "workstation-no-post",
  category: "workstation",
  title: "In-Service Workstation Suddenly Won't POST",
  ticketSummary: "This workstation has been in service for three years and was working fine yesterday. This morning it won't POST — no display, no beep, fans spin normally.",
  sceneModule: "../scenes/tower.js",
  steps: [
    {
      type: "intro",
      title: "Ticket Received",
      body: "A department workstation that's been running fine for years suddenly won't POST this morning. Nothing was changed by the user. Diagnose, repair, test, and return it.",
    },
    {
      type: "esd-gate",
      title: "Before You Touch Anything",
      body: "Even on a machine you've serviced before, treat every open-case job the same way. Complete each safety step before opening the case.",
    },
    {
      type: "screw-panel",
      title: "Open the Case",
      body: "Remove the four screws holding the side panel in place.",
      panelId: "sidePanel",
      screws: [
        { id: "screw1", label: "Top-front panel screw" },
        { id: "screw2", label: "Top-rear panel screw" },
        { id: "screw3", label: "Bottom-front panel screw" },
        { id: "screw4", label: "Bottom-rear panel screw" },
      ],
      placementOptions: [
        { id: "tray", label: "Set them in a labeled magnetic parts tray on the bench." },
        { id: "pocket", label: "Drop them in your pocket for now." },
        { id: "loose", label: "Leave them loose on the workbench." },
      ],
      correctPlacement: "tray",
    },
    {
      type: "diagnose-select",
      title: "Diagnose the Fault",
      body: "This machine has years of vibration, dust, and thermal cycling on it. Inspect it and select every issue you find that would explain the sudden no-POST.",
      symptomText: "Symptom: worked fine yesterday, no POST this morning, no beep, no display. No known changes were made.",
      options: [
        {
          id: "cmos",
          label: "CMOS battery has died (common after years in service)",
          explain: "Correct — a CR2032 typically lasts 3-5 years; a dead one can cause boot failures on some boards, not just lost BIOS settings.",
        },
        {
          id: "ram",
          label: "RAM stick has jarred loose from its slot over time",
          explain: "Correct — thermal cycling and vibration over years of service can walk a stick partway out of its slot until it stops making a clean contact.",
        },
        {
          id: "power24",
          label: "24-pin main power connector has worked loose",
          explain: "Correct — the same vibration that loosens a RAM stick can work the main power connector partway out, starving the board of power it needs to POST.",
        },
        {
          id: "gpu",
          label: "GPU has failed",
          explain: "Not indicated yet — nothing here points to the GPU specifically, and it's not one of this machine's three findings once opened up.",
        },
        {
          id: "bios",
          label: "A corrupted BIOS update is the cause",
          explain: "Not the cause here — there's no known BIOS update event, and a corrupted BIOS wouldn't explain three separate loose physical connections found inside the case.",
        },
      ],
      correctIds: ["cmos", "ram", "power24"],
    },
    {
      type: "part-swap",
      title: "Reseat the RAM",
      body: "The RAM stick has worked partway out of its slot. Check the spec sheet below, remove it fully, and reseat it correctly.",
      slotId: "ramSlotB",
      slotLabel: "Slot B",
      specSheet: {
        title: "Motherboard Manual — Memory Configuration",
        rows: [
          ["Model", "ATX-B450M Pro4 (reference board)"],
          ["Memory slots", "4x DDR4 DIMM (Slots A1 / A2 / B1 / B2)"],
          ["Currently installed", "1x DIMM in Slot B1"],
          ["Seating check", "Latches on both ends must click fully closed — a partially seated stick can still power on but fail POST"],
        ],
      },
      candidates: [
        { id: "slotA", label: "Push it back down partway, it looks close enough", specLine: "Doesn't fully seat the contacts" },
        { id: "slotB", label: "Remove it completely and reseat it fully in the slot", specLine: "Ensures every contact pin makes a clean connection" },
      ],
      correctCandidateId: "slotB",
      mismatchHint: "A partially-seated stick can look fine but still fail every POST. Remove it fully and start over.",
    },
    {
      type: "connector-check",
      title: "Reseat the 24-Pin Main Power Connector",
      body: "Click the main 24-pin connector and push it firmly until it clicks into place.",
      connectorId: "mainPower24",
      actionLabel: "Reseat 24-pin main power connector",
    },
    {
      type: "connector-check",
      title: "Replace the CMOS Battery",
      body: "Click the CMOS battery to swap in a fresh CR2032 coin cell.",
      connectorId: "cmosBattery",
      actionLabel: "Replace CMOS battery",
    },
    {
      type: "test-run",
      title: "Power On and Test",
      body: "Power the system on and check for a normal POST. If the date/time reset, that confirms the CMOS battery was indeed the culprit.",
      testLabel: "Attempt POST",
    },
    {
      type: "signoff",
      title: "Return to Department",
      body: "Document what you found and fixed, then return the unit.",
    },
  ],
};
