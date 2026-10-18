import { AppVisibility, Notify } from 'quasar';

/**
 * Overí, či je aplikácia momentálne v stave "visible" podľa Quasar AppVisibility pluginu.
 * @returns {boolean}
 */
export function isAppVisibleNow() {
	if (typeof AppVisibility !== 'undefined' && typeof AppVisibility.appVisible === 'boolean') {
		return AppVisibility.appVisible;
	}
	if (typeof document !== 'undefined') {
		return (
			document.visibilityState === 'visible' &&
			(document.hasFocus ? document.hasFocus() : true)
		);
	}
	return false;
}

/**
 * Zvukový ping pomocou Web Audio API (nie je potrebný externý .mp3 súbor).
 * Vytvorí príjemný dvojtónový cinkot (660 Hz -> 880 Hz).
 */
export function playPingSound() {
	try {
		const AudioContextClass = window.AudioContext || window.webkitAudioContext;
		if (!AudioContextClass) return;
		const ctx = new AudioContextClass();

		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = 'sine';
		// Dvojtón: E5 (659.25 Hz) a potom A5 (880 Hz)
		osc.frequency.setValueAtTime(659.25, now);
		osc.frequency.setValueAtTime(880, now + 0.08);

		gain.gain.setValueAtTime(0.2, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start(now);
		osc.stop(now + 0.35);
	} catch (err) {
		// Prehliadač môže zablokovať prehrávanie pred prvým používateľským kliknutím
		console.debug('Ping sound prevented by autoplay policy:', err);
	}
}

/**
 * Overí, či sa v texte nachádza zmienka pre daného používateľa (@nickname).
 * Rešpektuje hranice slov a diakritiku, nepáruje podreťazce (napr. @denis nesmie chytiť @denisko).
 *
 * @param {string} text
 * @param {string} username
 * @returns {boolean}
 */
export function isUserMentioned(text, username) {
	if (!text || !username) return false;
	const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const regex = new RegExp(
		`(^|[^\\w@])@${escaped}(?![a-zA-Z0-9_áäčďéíĺľňóôŕšťúýžÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ-])`,
		'i',
	);
	return regex.test(text);
}

/**
 * Zobrazí vizuálne notifikácie a zahrá zvukový ping.
 * - V stave "online" prichádza notifikácia na každú novú správu.
 * - V stave "mentions" (Iba označenia) prichádza notifikácia iba pri @označení.
/**
 * Zobrazí vizuálne notifikácie a zahrá zvukový ping.
 * - V stave "online" prichádza notifikácia na každú novú správu.
 * - V stave "mentions" (Iba označenia) prichádza notifikácia iba pri @označení.
 * - Notifikácia obsahuje meno odosielateľa, tím/server, kanál a text správy.
 * - Zobrazuje Quasar Notify okno v rohu obrazovky a natívnu Windows notifikáciu.
 *
 * @param {string} channel
 * @param {{ id: number, author: string, text: string, time: string, isSystem?: boolean }} message
 * @param {boolean} [mentioned] true, ak správa obsahuje @zmienku pre aktuálneho používateľa
 * @param {string} [teamName] názov tímu/servera
 */
export function triggerPing(channel, message, mentioned = false, teamName = '') {
	if (message.isSystem) return;

	// 1. Zvukové upozornenie
	playPingSound();

	const cleanChannel = String(channel || '').replace(/^#/, '');
	const author = message.author || 'Neznámy';
	const rawText = message.text || '';
	const text = rawText.length > 30 ? rawText.slice(0, 30) + '...' : rawText;

	const location = teamName ? `v tíme "${teamName}" (#${cleanChannel})` : `v #${cleanChannel}`;
	const locationShort = teamName ? `[${teamName}] #${cleanChannel}` : `#${cleanChannel}`;

	// 2. Quasar Notify vyskakovacie okno (toast) v rohu obrazovky
	try {
		Notify.create({
			type: 'warning',
			color: 'amber-9',
			textColor: 'black',
			icon: mentioned ? 'alternate_email' : 'chat',
			message: mentioned
				? `Používateľ ${author} ťa označil ${location}:`
				: `Používateľ ${author} napísal správu ${location}:`,
			caption: text || '(prázdna správa)',
			position: 'top-right',
			timeout: 5000,
			progress: true,
			multiLine: true,
			actions: [
				{
					icon: 'close',
					color: 'black',
					round: true,
					dense: true,
				},
			],
		});
	} catch (err) {
		console.error('Notify.create error:', err);
	}

	// 3. Natívna Windows / Desktop notifikácia prehliadača
	const desktopEnabled =
		typeof window !== 'undefined'
			? localStorage.getItem('desktopNotificationsEnabled') !== 'false'
			: true;

	if (
		desktopEnabled &&
		typeof Notification !== 'undefined' &&
		Notification.permission === 'granted'
	) {
		try {
			const title = mentioned
				? `Používateľ ${author} ťa označil (${locationShort})`
				: `Používateľ ${author} napísal správu (${locationShort})`;
			new Notification(title, {
				body: text || '(prázdna správa)',
				icon: '/favicon.ico',
			});
		} catch (err) {
			console.error('Desktop notification error:', err);
		}
	}
}

/**
 * Vyžiada povolenie pre systémové notifikácie prehliadača.
 */
export async function requestNotificationPermission() {
	if (typeof Notification === 'undefined') {
		Notify.create({
			type: 'warning',
			message: 'Váš prehliadač nepodporuje systémové notifikácie.',
			position: 'top',
		});
		return false;
	}

	if (Notification.permission === 'granted') {
		Notify.create({
			type: 'positive',
			icon: 'notifications_active',
			message: 'Desktop notifikácie sú už aktívne!',
			position: 'top',
		});
		return true;
	}

	try {
		const res = await Notification.requestPermission();
		if (res === 'granted') {
			Notify.create({
				type: 'positive',
				icon: 'notifications_active',
				message: 'Desktop notifikácie boli úspešne povolené!',
				position: 'top',
			});
			return true;
		} else {
			Notify.create({
				type: 'negative',
				icon: 'notifications_off',
				message: 'Desktop notifikácie boli zamietnuté.',
				position: 'top',
			});
			return false;
		}
	} catch {
		return false;
	}
}

/**
 * Bezpečné ošetrenie HTML špeciálnych znakov proti XSS.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
	return String(str || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

/**
 * Prevedie text správy na bezpečné HTML s vizuálne zvýraznenými @zmienkami.
 *
 * @param {string} text
 * @param {string | null} currentUsername
 * @returns {string}
 */
export function renderMessageHtml(text, currentUsername) {
	if (!text) return '';
	const safe = escapeHtml(text);
	const currentNick = (currentUsername || '').toLowerCase();

	return safe.replace(/@([a-zA-Z0-9_áäčďéíĺľňóôŕšťúýžÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ-]+)/gi, (match, nick) => {
		const isMe = currentNick && nick.toLowerCase() === currentNick;
		const badgeClass = isMe ? 'mention-pill mention-pill--me' : 'mention-pill';
		return `<span class="${badgeClass}">@${nick}</span>`;
	});
}
