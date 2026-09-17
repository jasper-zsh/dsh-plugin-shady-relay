export const CSS = `
/* dsh-plugin-shady-relay: HMR-managed styles */
.shadyRelayPage {
  color: var(--dsw-alias-label-primary, #e8e8e8);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 2px 24px;
}
.shadyRelayHeader { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.shadyRelayHeaderCopy { flex: 1 1 auto; min-width: 0; }
.shadyRelayTitle { margin: 0; font-size: 20px; line-height: 28px; }
.shadyRelayHint, .shadyRelayMeta { color: var(--dsw-alias-label-secondary, #999); font-size: 13px; line-height: 20px; }
.shadyRelayHint { margin: 4px 0 0; }
.shadyRelayToolbar, .shadyRelayActions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.shadyRelayToolbar { flex: 0 0 auto; flex-wrap: nowrap; }
.shadyRelayCard {
  border: 1px solid var(--dsw-alias-border-l1, #333);
  background: var(--dsw-alias-bg-layer-1, #171717);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.shadyRelayCardHeader { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.shadyRelayCardTitle { font-size: 14px; font-weight: 600; }
.shadyRelayGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.shadyRelayField { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.shadyRelayFieldWide { grid-column: 1 / -1; }
.shadyRelayLabel { color: var(--dsw-alias-label-secondary, #aaa); font-size: 12px; line-height: 18px; }
.shadyRelayInput, .shadyRelayTextarea {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid var(--dsw-alias-border-l2, #444);
  background: var(--dsw-alias-bg-base, #111);
  color: var(--dsw-alias-label-primary, #eee);
  border-radius: 8px;
  padding: 8px 10px;
  font: inherit;
  font-size: 13px;
  outline: none;
}
.shadyRelayInput:focus, .shadyRelayTextarea:focus { border-color: var(--dsw-alias-brand-primary, #6d8cff); }
.shadyRelayTextarea { min-height: 112px; resize: vertical; line-height: 20px; }
.shadyRelayButton {
  border: 1px solid var(--dsw-alias-border-l2, #444);
  background: var(--dsw-alias-bg-layer-2, #222);
  color: var(--dsw-alias-label-primary, #eee);
  border-radius: 8px;
  padding: 7px 12px;
  font: inherit;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
}
.shadyRelayButton:hover:not(:disabled) { border-color: var(--dsw-alias-brand-primary, #6d8cff); }
.shadyRelayButtonPrimary {
  background: var(--dsw-alias-button-primary-fill, #526de0);
  color: var(--dsw-alias-label-primary-foreground, #fff);
  border-color: transparent;
}
.shadyRelayButtonPrimary:hover:not(:disabled) {
  border-color: transparent;
  background: var(--dsw-alias-button-primary-hover, #6d8cff);
}
.shadyRelayButtonDanger { color: var(--dsw-alias-state-error-primary, #ff6666); }
.shadyRelayButton:disabled { cursor: not-allowed; opacity: .5; }
.shadyRelayStatus { border-radius: 8px; padding: 9px 11px; font-size: 13px; line-height: 20px; }
.shadyRelayStatusError { color: var(--dsw-alias-state-error-primary, #ff6666); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #ff6666) 10%, transparent); }
.shadyRelayStatusSuccess { color: var(--dsw-alias-state-success-primary, #4cc38a); background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #4cc38a) 10%, transparent); }
.shadyRelayEmpty { border: 1px dashed var(--dsw-alias-border-l2, #444); border-radius: 12px; color: var(--dsw-alias-label-secondary, #999); padding: 24px; text-align: center; }
@media (max-width: 720px) {
  .shadyRelayGrid { grid-template-columns: 1fr; }
  .shadyRelayFieldWide { grid-column: auto; }
  .shadyRelayHeader { flex-direction: column; }
}
`
