# Project Agent Instructions

For all SCADA SVG viewer work in this project, use:

```text
agents/skills/scada-svg-expert/SKILL.md
```

This project treats designer-exported SVG as the source of truth. Angular should handle data binding, interaction, state management, realtime updates, and alarm visualization only.

Do not introduce diagram editor libraries or recreate SVG graphics in TypeScript unless explicitly requested.
