## 06-agent-widget-css-full
```
.agent-command-widget {
  width: min(760px, 100%);
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #dbe5f3;
  border-radius: 18px;
  box-shadow: 0 18px 60px rgba(26, 50, 88, 0.08);
  overflow: hidden;
  color: #07111f;
}

.agent-command-widget * {
  box-sizing: border-box;
}

.agent-widget-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
  border-bottom: 1px solid #eef2f8;
}

.agent-brand-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.agent-brand-row h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.agent-active-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  border-radius: 999px;
  background: #f1f4f9;
  color: #52617e;
  font-size: 13px;
  font-weight: 700;
}

.agent-active-pill.is-active {
  background: #e9f9ef;
  color: #109638;
}

.agent-active-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 0 rgba(22, 198, 83, 0.45);
  animation: agentBreathe 1.8s ease-in-out infinite;
}

@keyframes agentBreathe {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(22, 198, 83, 0.4);
  }

  50% {
    box-shadow: 0 0 0 8px rgba(22, 198, 83, 0);
  }
}

.agent-last-check {
  color: #35456b;
  font-size: 14px;
  font-weight: 500;
}

.agent-analyze-btn,
.agent-secondary-btn,
.agent-primary-btn {
  border: 1px solid #d9e3f2;
  background: #fff;
  color: #09111f;
  border-radius: 10px;
  padding: 11px 16px;
  font-size: 14px;
  font-weight: 750;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.agent-analyze-btn:disabled,
.agent-secondary-btn:disabled,
.agent-primary-btn:disabled {
  opacity: 0.65;
  pointer-events: none;
}

.agent-analyze-btn:hover,
.agent-secondary-btn:hover {
  transform: translateY(-1px);
  border-color: #b9c9e4;
  box-shadow: 0 10px 24px rgba(32, 68, 126, 0.08);
}

.agent-primary-btn {
  background: #0b5cff;
  color: #fff;
  border-color: #0b5cff;
  box-shadow: 0 14px 28px rgba(11, 92, 255, 0.18);
}

.agent-primary-btn:hover {
  transform: translateY(-1px);
  background: #004ee5;
}

.agent-headline {
  padding: 0 22px 18px;
  font-size: 24px;
  letter-spacing: -0.03em;
}

.agent-headline strong {
  color: #0b5cff;
}

.agent-review-mode {
  padding: 0 22px 22px;
  display: block;
}

.agent-main-card,
.agent-plan-card {
  border: 1px solid #dbe5f3;
  border-radius: 16px;
  background: #fff;
}

.agent-main-card {
  min-height: auto;
}

.agent-main-card {
  padding: 24px;
  position: relative;
  overflow: hidden;
}

.agent-main-card::after {
  content: "";
  position: absolute;
  inset: 0;
  border: 1px solid rgba(11, 92, 255, 0);
  border-radius: inherit;
  pointer-events: none;
  animation: agentDetectPulse 5s ease infinite;
}

@keyframes agentDetectPulse {
  0%,
  75%,
  100% {
    border-color: rgba(11, 92, 255, 0);
  }

  85% {
    border-color: rgba(11, 92, 255, 0.28);
  }
}

.agent-event-shell {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 18px;
  transition:
    opacity 0.34s ease,
    transform 0.34s ease;
}

.agent-event-shell.slide-out {
  opacity: 0;
  transform: translateX(-24px);
}

.agent-event-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: var(--agent-soft);
  color: var(--agent-accent);
}

.agent-event-icon svg {
  width: 25px;
  height: 25px;
  stroke-width: 2.2;
}

.agent-label {
  color: #0b2b73;
  font-size: 13px;
  font-weight: 850;
  margin-bottom: 8px;
}

.agent-event-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.agent-event-title {
  margin: 0;
  font-size: 23px;
  letter-spacing: -0.025em;
}

.agent-severity {
  border-radius: 999px;
  padding: 5px 10px;
  background: var(--agent-soft);
  color: var(--agent-accent);
  font-size: 12px;
  font-weight: 850;
}

.agent-event-message {
  color: #172957;
  font-size: 16px;
  line-height: 1.55;
  margin: 14px 0 0;
  max-width: 640px;
  font-weight: 560;
}

.agent-promise {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #f7faff;
  border: 1px solid #dce8ff;
  color: #102a68;
  line-height: 1.5;
  font-size: 14px;
}

.agent-impact-row {
  margin-top: 18px;
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
}

.agent-impact-pill {
  border: 1px solid #d9e5f8;
  background: #f8fbff;
  color: #173466;
  border-radius: 999px;
  padding: 8px 11px;
  font-size: 13px;
  font-weight: 700;
}

.agent-action-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 24px;
}

.agent-plan-card {
  padding: 20px;
}

.agent-plan-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  padding-bottom: 14px;
  border-bottom: 1px solid #edf2f8;
}

.agent-plan-head h3 {
  margin: 0;
  font-size: 17px;
  letter-spacing: -0.01em;
}

.agent-plan-head p {
  margin: 5px 0 0;
  color: #42537c;
  font-size: 13px;
}

.agent-plan-list {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

.agent-plan-step {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 10px;
}

.agent-step-number {
  width: 25px;
  height: 25px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #edf4ff;
  color: #0b5cff;
  font-size: 12px;
  font-weight: 850;
}

.agent-step-title {
  font-size: 14px;
  font-weight: 850;
}

.agent-step-copy {
  margin-top: 2px;
  color: #35456b;
  font-size: 13px;
  line-height: 1.42;
}

.agent-command-widget.compact .agent-plan-card {
  display: none;
}

.agent-command-widget.compact .agent-review-mode {
  display: block;
}

.agent-command-widget.compact .agent-main-card {
  min-height: auto;
  padding: 18px;
}

.agent-command-widget.compact .agent-event-shell {
  grid-template-columns: 44px 1fr;
  align-items: center;
}

.agent-command-widget.compact .agent-event-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
}

.agent-command-widget.compact .agent-event-title {
  font-size: 18px;
}

.agent-command-widget.compact .agent-event-message {
  font-size: 14px;
  margin-top: 6px;
  max-width: 720px;
}

.agent-command-widget.compact .agent-action-row {
  margin-top: 16px;
}

.agent-execution-mode {
  display: none;
  padding: 0 22px 22px;
}

.agent-command-widget.executing .agent-review-mode,
.agent-command-widget.executing .agent-headline {
  display: none;
}

.agent-command-widget.executing .agent-execution-mode {
  display: block;
}

.agent-stream-panel {
  border: 1px solid #dbe5f3;
  border-radius: 16px;
  background:
    radial-gradient(circle at 12% 0%, rgba(11, 92, 255, 0.06), transparent 34%),
    #fff;
  padding: 24px;
  min-height: 300px;
}

.agent-stream-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.agent-stream-mark {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: linear-gradient(145deg, #0b5cff, #79a8ff);
  box-shadow: 0 14px 30px rgba(11, 92, 255, 0.22);
}

.agent-stream-title {
  margin: 0;
  font-size: 17px;
  letter-spacing: -0.01em;
}

.agent-stream-subtitle {
  margin: 2px 0 0;
  color: #52617e;
  font-size: 13px;
}

.agent-stream-body {
  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    "Liberation Mono",
    monospace;
  font-size: 14px;
  line-height: 1.85;
  color: #10244d;
  min-height: 150px;
}

.agent-stream-line {
  opacity: 0;
  transform: translateY(5px);
  animation: agentLineIn 0.22s ease forwards;
}

@keyframes agentLineIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.agent-stream-line.thinking {
  color: #0b5cff;
  font-weight: 800;
}

.agent-stream-line.done {
  color: #13a048;
}

.agent-cursor {
  display: inline-block;
  width: 7px;
  height: 16px;
  margin-left: 3px;
  background: #0b5cff;
  vertical-align: -3px;
  animation: agentBlink 0.9s steps(2) infinite;
}

@keyframes agentBlink {
  50% {
    opacity: 0;
  }
}

.agent-result-mini {
  display: none;
  margin-top: 18px;
  border-top: 1px solid #edf2f8;
  padding-top: 18px;
}

.agent-result-mini.visible {
  display: block;
  animation: agentLineIn 0.24s ease forwards;
}

.agent-result-title {
  color: #0f7d35;
  font-weight: 900;
  font-size: 15px;
  margin-bottom: 6px;
}

.agent-result-copy {
  margin: 0;
  color: #1d2c4f;
  font-size: 14px;
  line-height: 1.5;
}

.agent-result-data {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.agent-data-chip {
  border: 1px solid #dfe8f5;
  border-radius: 12px;
  padding: 11px 12px;
  background: #fbfdff;
}

.agent-data-chip span {
  display: block;
  color: #6a7894;
  font-size: 12px;
  font-weight: 750;
  margin-bottom: 4px;
}

.agent-data-chip strong {
  font-size: 14px;
}

@media (max-width: 860px) {
  .agent-widget-top {
    align-items: flex-start;
    flex-direction: column;
  }

  .agent-review-mode {
    grid-template-columns: 1fr;
  }

  .agent-plan-card,
  .agent-main-card {
    min-height: auto;
  }

  .agent-result-data {
    grid-template-columns: 1fr;
  }
}
```
