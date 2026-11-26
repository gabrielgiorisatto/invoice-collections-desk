# Triage Labels

**This repo does not require triage labels.** Gabriel confirmed GitHub Issues as the tracker **without** mandating label create/maintenance for the take-home. Skills that mention triage roles may still refer to the canonical names below if labels exist; agents must **not** block on creating them (and must not fail setup if `gh label create` 403s).

Optional mapping if labels are added later:

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned (GitHub default may already exist) |

For `/to-spec` and `/to-tickets` on this project: publish issues without depending on triage label workflow unless Gabriel opts in later.
