export default {
  id: "tower-no-post",
  category: "tower",
  title: "New Build Won't POST",
  ticketSummary: "Customer built a new tower themselves and brought it in: fans spin and lights come on, but there's no display, no beep code, and it never reaches Windows.",
  sceneModule: "../scenes/tower.js",
  steps: [
    {
      type: "intro",
      title: "Ticket Received",
      body: "A customer self-built a new tower workstation. Power comes on (fans spin, case LEDs light), but there is no video output and no POST beep. Your job: diagnose, repair, test, and return it to the department.",
    },
    {
      type: "esd-gate",
      title: "Before You Touch Anything",
      body: "Static electricity can silently damage components even if you never feel a shock. Complete each safety step before opening the case.",
    },
    {
      type: "screw-panel",
      title: "Open the Case",
      body: "Remove the four screws holding the side panel in place. Click each screw on the 3D model to remove it.",
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
      body: "With the panel off, inspect the build. Select every issue you can see that would explain no POST / no display.",
      symptomText: "Symptom: powers on (fans + LEDs active), no display output, no POST beep, never reaches the OS.",
      options: [
        {
          id: "ramSlot",
          label: "RAM stick is installed in a slot the board doesn't read at boot for a single-stick config",
          explain: "Correct — check the motherboard spec sheet: with only one stick installed, most boards only read one specific channel/slot at POST. Wrong slot = no memory found = no display.",
        },
        {
          id: "cpuPower",
          label: "8-pin CPU power connector is not fully seated",
          explain: "Correct — without full CPU power, the board can bring up fans and LEDs from the 24-pin alone, but the CPU itself never fully initializes, so it never posts.",
        },
        {
          id: "standoff",
          label: "A stray standoff underneath the board is shorting it against the case",
          explain: "Correct — an extra standoff not aligned with a mounting hole touches a trace on the board's underside, shorting it and preventing a clean boot.",
        },
        {
          id: "cmos",
          label: "CMOS battery is dead",
          explain: "Not the cause here — a dead CMOS battery on a brand-new build usually just resets BIOS settings/date, it doesn't block fans, LEDs, or POST entirely.",
        },
        {
          id: "psu",
          label: "Power supply is DOA",
          explain: "Not the cause here — a dead PSU wouldn't spin the fans or light the case LEDs at all, and this build already shows both.",
        },
      ],
      correctIds: ["ramSlot", "cpuPower", "standoff"],
    },
    {
      type: "part-swap",
      title: "Reseat the RAM",
      body: "This board needs its single RAM stick in a specific slot to be read during POST. Check the motherboard spec sheet below, choose the correct slot, then seat the stick.",
      slotId: "ramSlotB",
      slotLabel: "Slot B (motherboard-recommended single-stick slot)",
      specSheet: {
        title: "Motherboard Manual — Memory Configuration",
        rows: [
          ["Model", "ATX-B450M Pro4 (reference board)"],
          ["Memory slots", "4x DDR4 DIMM (Slots A1 / A2 / B1 / B2)"],
          ["Single-stick (1 DIMM) install", "Must use Slot B1 — channel B is read first at POST"],
          ["Dual-channel (2 DIMM) install", "Use Slot A1 + Slot B1 (matching colors)"],
          ["Max capacity", "128GB (4x 32GB), DDR4-3200 max supported speed"],
        ],
      },
      candidates: [
        { id: "slotA", label: "Reinstall the stick back into Slot A", specLine: "The slot it was already in — not the single-stick slot per the manual" },
        { id: "slotB", label: "Move the stick into Slot B", specLine: "Matches the motherboard manual's single-DIMM recommendation (Slot B1)" },
      ],
      correctCandidateId: "slotB",
      mismatchHint: "Check the motherboard manual above — for a single stick, only Slot B1 is wired to the channel the CPU reads at POST.",
    },
    {
      type: "connector-check",
      title: "Reseat the CPU Power Connector",
      body: "Click the 8-pin CPU power connector near the top of the board and push it down firmly until it clicks fully into place.",
      connectorId: "cpuPower",
      actionLabel: "Reseat 8-pin CPU power connector",
    },
    {
      type: "connector-check",
      title: "Remove the Stray Standoff",
      body: "There's an extra standoff underneath the motherboard that isn't lined up with a mounting hole — it's shorting the board against the case. Click it to remove it.",
      connectorId: "standoff",
      actionLabel: "Remove shorting standoff",
    },
    {
      type: "test-run",
      title: "Power On and Test",
      body: "Close up isn't required for a bench test. Power the system on and check for a normal POST.",
      testLabel: "Attempt POST",
    },
    {
      type: "signoff",
      title: "Return to Department",
      body: "Document what you found and fixed, then return the unit.",
    },
  ],
};
