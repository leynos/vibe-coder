# Migration notes

## Theme identifier rename (initial release)

The theme identifiers and the localStorage key used to persist the active
theme were renamed between the pre-release prototype and the initial
public release.

### What changed

| Old value             | New value              |
| --------------------- | ---------------------- |
| `vibecoder-night`     | `vibe-coder-night`     |
| `vibecoder-day`       | `vibe-coder-day`       |
| `vibecoder.theme` key | `vibe-coder.theme` key |

### Migration is automatic

No manual action is required. On first load after the update,
`ThemeProvider` detects the legacy `vibecoder.theme` key, maps the stored
value to its renamed equivalent, writes the result under the new
`vibe-coder.theme` key, and removes the old key. The selected theme is
preserved across the rename.

If the legacy key holds an unrecognised value, the key is removed and the
application falls back to the default theme (`vibe-coder-night`).
