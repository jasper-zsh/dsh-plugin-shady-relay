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
select.shadyRelayInput {
  appearance: none;
  padding-right: 32px;
  cursor: pointer;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23888' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 11px center;
}
select.shadyRelayInput option { background: var(--dsw-alias-bg-layer-1, #171717); color: var(--dsw-alias-label-primary, #eee); }
.shadyRelayCombo { position: relative; }
.shadyRelayComboButton {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  text-align: left;
  cursor: pointer;
}
.shadyRelayComboButton:disabled { cursor: not-allowed; opacity: .5; }
.shadyRelayComboValue { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.shadyRelayComboPlaceholder { color: var(--dsw-alias-label-secondary, #888); }
.shadyRelayComboArrow {
  flex: 0 0 auto;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid var(--dsw-alias-label-secondary, #888);
}
.shadyRelayComboPopup {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  max-height: 300px;
  border: 1px solid var(--dsw-alias-border-l2, #444);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2, #1e1e1e);
  box-shadow: 0 10px 28px rgba(0, 0, 0, .45);
}
.shadyRelayComboSearch {
  box-sizing: border-box;
  margin: 8px 8px 4px;
  border: 1px solid var(--dsw-alias-border-l2, #444);
  border-radius: 6px;
  background: var(--dsw-alias-bg-base, #111);
  color: var(--dsw-alias-label-primary, #eee);
  padding: 6px 9px;
  font: inherit;
  font-size: 13px;
  outline: none;
}
.shadyRelayComboSearch:focus { border-color: var(--dsw-alias-brand-primary, #6d8cff); }
.shadyRelayComboList { overflow-y: auto; padding: 2px 4px 4px; }
.shadyRelayComboOption {
  display: block;
  padding: 7px 9px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}
.shadyRelayComboOptionActive, .shadyRelayComboOption:hover {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #6d8cff) 16%, transparent);
}
.shadyRelayComboOptionSelected { color: var(--dsw-alias-brand-primary, #8fa7ff); }
.shadyRelayComboOptionMissing { font-style: italic; }
.shadyRelayComboEmpty {
  padding: 14px 10px;
  color: var(--dsw-alias-label-secondary, #999);
  font-size: 13px;
  text-align: center;
}
.shadyRelayComboMeta {
  padding: 4px 10px 7px;
  color: var(--dsw-alias-label-secondary, #999);
  font-size: 11px;
  line-height: 16px;
  border-top: 1px solid var(--dsw-alias-border-l1, #2a2a2a);
}
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
