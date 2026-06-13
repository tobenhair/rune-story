# Feature Backlog

Features planned for AstralBound, to be built later.

## 1. City Storage — ✅ Done

Add a storage system in the city (Aethon City hub) where the player can deposit
and retrieve inventory items. Acts as a persistent stash separate from the
carried bag, accessible via an NPC or interactable in the safe hub zone.

Implemented as the Storage Chest NPC in Aethon City (deposit/withdraw, base 10
slots, paid expansion).

## 2. Artifact-Tier Items — ✅ Done

Introduce a new **Artifact** rarity above Legendary. Artifact items:

- Drop **only from bosses**.
- Have a **1% drop chance**.
- Carry a **special power** (a unique active or passive effect beyond flat
  stat boosts).

Implemented via the `ARTIFACTS` pool (tier 5 in `RARS`) with four powers
(`lifesteal`, `haste`, `manaregen`, `thorns`) applied through `hasPow()`.

## 3. Expandable Inventory

Allow the player to permanently expand their inventory capacity.

- Cost: **2000g** per expansion.
- Purchased in the city.
