## 12-worker-routes
```
apps/agent-worker/src/index.ts:245:		if (url.pathname === '/health' && request.method === 'GET') {
apps/agent-worker/src/index.ts:254:		if (url.pathname === '/agent/chat' && request.method === 'POST') {
apps/agent-worker/src/index.ts:255:			return handleAgentChat(request, env);
apps/agent-worker/src/index.ts:258:		if (url.pathname === '/agent/daily-plans/sync' && request.method === 'POST') {
apps/agent-worker/src/index.ts:262:		if (url.pathname === '/agent/daily-plans/today' && request.method === 'GET') {
apps/agent-worker/src/index.ts:266:		if (url.pathname === '/agent/operating-context/refresh' && request.method === 'POST') {
apps/agent-worker/src/index.ts:267:			return handleAgentOperatingContextRefresh(request, env);
apps/agent-worker/src/index.ts:270:		if (url.pathname === '/agent/operating-context/today' && request.method === 'GET') {
apps/agent-worker/src/index.ts:271:			return handleTodayAgentOperatingContext(request, env);
apps/agent-worker/src/index.ts:338:async function handleAgentOperatingContextRefresh(request: Request, env: Env) {
apps/agent-worker/src/index.ts:404:async function handleTodayAgentOperatingContext(request: Request, env: Env) {
apps/agent-worker/src/index.ts:437:async function handleAgentChat(request: Request, env: Env) {
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:245:		if (url.pathname === '/health' && request.method === 'GET') {
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:254:		if (url.pathname === '/agent/chat' && request.method === 'POST') {
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:255:			return handleAgentChat(request, env);
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:258:		if (url.pathname === '/agent/daily-plans/sync' && request.method === 'POST') {
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:262:		if (url.pathname === '/agent/daily-plans/today' && request.method === 'GET') {
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:266:		if (url.pathname === '/agent/operating-context/refresh' && request.method === 'POST') {
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:267:			return handleAgentOperatingContextRefresh(request, env);
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:270:		if (url.pathname === '/agent/operating-context/today' && request.method === 'GET') {
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:271:			return handleTodayAgentOperatingContext(request, env);
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:338:async function handleAgentOperatingContextRefresh(request: Request, env: Env) {
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:369:async function handleTodayAgentOperatingContext(request: Request, env: Env) {
apps/agent-worker/src/index.ts.bak-openclaw-widget-20260705180126:402:async function handleAgentChat(request: Request, env: Env) {
apps/agent-worker/src/index.ts:245:		if (url.pathname === '/health' && request.method === 'GET') {
apps/agent-worker/src/index.ts:254:		if (url.pathname === '/agent/chat' && request.method === 'POST') {
apps/agent-worker/src/index.ts:255:			return handleAgentChat(request, env);
apps/agent-worker/src/index.ts:258:		if (url.pathname === '/agent/daily-plans/sync' && request.method === 'POST') {
apps/agent-worker/src/index.ts:262:		if (url.pathname === '/agent/daily-plans/today' && request.method === 'GET') {
apps/agent-worker/src/index.ts:266:		if (url.pathname === '/agent/operating-context/refresh' && request.method === 'POST') {
apps/agent-worker/src/index.ts:267:			return handleAgentOperatingContextRefresh(request, env);
apps/agent-worker/src/index.ts:270:		if (url.pathname === '/agent/operating-context/today' && request.method === 'GET') {
apps/agent-worker/src/index.ts:271:			return handleTodayAgentOperatingContext(request, env);
apps/agent-worker/src/index.ts:338:async function handleAgentOperatingContextRefresh(request: Request, env: Env) {
apps/agent-worker/src/index.ts:404:async function handleTodayAgentOperatingContext(request: Request, env: Env) {
apps/agent-worker/src/index.ts:437:async function handleAgentChat(request: Request, env: Env) {
```
