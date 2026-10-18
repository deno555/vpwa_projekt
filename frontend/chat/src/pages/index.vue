<template>
	<q-layout view="lHh Lpr lFf" class="discord-bg text-white">
		<!-- Combined Left Sidebar (Servers + Channels) -->
		<q-drawer v-model="leftDrawerOpen" show-if-above :width="drawerWidth" :breakpoint="768">
			<div class="column no-wrap fit">
				<div class="row no-wrap col" style="min-height: 0">
					<!-- Servers Column (72px) -->
					<div class="server-sidebar col-auto" style="width: 72px; height: 100%">
						<q-scroll-area class="fit" :horizontal-thumb-style="{ opacity: '0' }">
							<div class="column items-center q-py-sm q-gutter-y-sm">
								<!-- Home / Direct Messages -->
								<div class="server-icon-wrapper">
									<q-btn round unelevated color="primary" icon="home" size="md" />
								</div>

								<q-separator dark class="q-mx-md" style="width: 32px" />

								<!-- Mock Servers -->
								<div
									class="server-icon-wrapper"
									:class="{ 'server-active': server.id === selectedServerId }"
									v-for="server in servers"
									:key="server.id"
								>
									<q-btn
										round
										unelevated
										:color="
											server.id === selectedServerId ? 'primary' : 'grey-8'
										"
										class="server-btn"
										size="md"
										:title="server.name"
										@click="selectServer(server.id)"
									>
										{{ server.name.charAt(0).toUpperCase() }}
									</q-btn>
								</div>

								<div class="server-icon-wrapper">
									<q-btn
										round
										unelevated
										text-color="green"
										color="grey-9"
										icon="add"
										size="md"
										@click="createServerPrompt"
										title="Vytvoriť server (/create)"
									/>
								</div>
							</div>
						</q-scroll-area>
					</div>

					<!-- Channels Column (240px) -->
					<div class="channel-sidebar col" style="height: 100%">
						<!-- Sidebar Header -->
						<div
							class="channel-header flex items-center justify-between q-px-md cursor-pointer"
						>
							<div class="row items-center no-wrap ellipsis col q-mr-xs">
								<div class="text-weight-bold ellipsis">
									{{ selectedServer?.name || 'Žiadny server' }}
								</div>
								<q-badge
									v-if="isServerAdmin"
									color="amber-9"
									text-color="black"
									class="q-ml-sm text-weight-bolder text-caption"
									title="Si vlastník tohto servera"
									style="font-size: 10px; padding: 2px 6px"
								>
									👑 VLASTNÍK
								</q-badge>
							</div>
							<div class="row items-center no-wrap">
								<q-icon name="expand_more" size="sm" class="q-mr-xs" />
								<q-btn
									flat
									round
									dense
									icon="close"
									size="xs"
									color="grey-5"
									class="lt-md"
									title="Zavrieť panel"
									@click.stop="chatStore.setLeftDrawer(false)"
								/>
							</div>

							<q-menu
								anchor="bottom left"
								self="top left"
								:offset="[0, 4]"
								class="discord-bg text-white"
								max-width="90vw"
							>
								<q-list dense style="min-width: 190px">
									<q-item
										v-if="selectedServer"
										dense
										class="text-caption text-grey-4 q-py-xs bg-grey-10"
									>
										<q-item-section>
											<div>
												Vlastník:
												<strong class="text-white">{{
													selectedServer.admin
												}}</strong>
											</div>
											<div
												v-if="isServerAdmin"
												class="text-amber-4 text-weight-bold"
												style="font-size: 10px"
											>
												(Tvoj server)
											</div>
										</q-item-section>
									</q-item>
									<q-separator dark class="q-my-xs" />
									<q-item
										clickable
										v-close-popup
										@click="inviteToTeam"
										class="text-white hover-bg-grey-9"
									>
										<q-item-section>Pozvať do tímu</q-item-section>
										<q-item-section side>
											<q-icon name="person_add" size="xs" color="primary" />
										</q-item-section>
									</q-item>
									<q-item
										clickable
										v-close-popup
										@click="leaveServer"
										class="text-red-4 hover-bg-grey-9"
									>
										<q-item-section>
											{{
												isServerAdmin
													? 'Zrušiť server (správca)'
													: 'Odísť zo servera'
											}}
										</q-item-section>
										<q-item-section side>
											<q-icon name="logout" size="xs" color="red-4" />
										</q-item-section>
									</q-item>
									<q-item
										v-if="isServerAdmin"
										clickable
										v-close-popup
										@click="deleteServer"
										class="text-red-4 hover-bg-grey-9"
									>
										<q-item-section>Zmazať server</q-item-section>
										<q-item-section side>
											<q-icon name="delete" size="xs" color="red-4" />
										</q-item-section>
									</q-item>
								</q-list>
							</q-menu>
						</div>

						<q-scroll-area
							style="height: calc(100% - 48px)"
							:horizontal-thumb-style="{ opacity: '0' }"
						>
							<div class="q-pa-sm">
								<!-- Top section for invites -->
								<div v-if="invitedChannels.length > 0" class="q-mb-md">
									<div
										class="text-overline text-grey-5 q-px-sm"
										style="line-height: 1"
									>
										POZVÁNKY
									</div>
									<q-list dense>
										<q-item
											v-for="channel in invitedChannels"
											:key="channel.id"
											clickable
											v-ripple
											:to="'/' + channel.name"
											exact
											@click="onChannelClick"
											class="channel-item invite-highlight q-mt-xs rounded-borders"
											active-class="text-white bg-grey-9"
										>
											<q-item-section
												avatar
												style="min-width: 30px; padding-right: 0"
											>
												<q-icon
													:name="
														channel.type === 'private' ? 'lock' : 'tag'
													"
													size="xs"
													color="primary"
												/>
											</q-item-section>
											<q-item-section class="text-weight-bold text-primary">
												{{ channel.name }}
											</q-item-section>
										</q-item>
									</q-list>
								</div>

								<!-- Regular channels list -->
								<div
									class="flex items-center justify-between q-px-sm q-mt-sm q-mb-xs group-header"
								>
									<div class="text-overline text-grey-5" style="line-height: 1">
										TEXTOVÉ KANÁLY
									</div>
									<q-btn
										flat
										round
										dense
										icon="add"
										size="xs"
										color="grey-5"
										class="add-btn"
										@click="createChannel"
									/>
								</div>

								<div
									v-if="regularChannels.length === 0"
									class="text-caption text-grey-6 q-px-sm q-py-xs"
								>
									Nie si členom žiadneho kanála.
								</div>

								<q-list v-else dense>
									<q-item
										v-for="channel in regularChannels"
										:key="channel.id"
										clickable
										v-ripple
										:to="'/' + channel.name"
										exact
										@click="onChannelClick"
										class="channel-item q-mb-xs rounded-borders text-grey-5"
										active-class="text-white bg-grey-9"
									>
										<q-item-section
											avatar
											style="min-width: 30px; padding-right: 0"
										>
											<q-icon
												:name="channel.type === 'private' ? 'lock' : 'tag'"
												size="xs"
											/>
										</q-item-section>
										<q-item-section>
											{{ channel.name }}
										</q-item-section>

										<!-- Action buttons (Leave / Delete) shown on hover or active -->
										<q-item-section side class="channel-actions">
											<div class="row q-gutter-xs">
												<q-btn
													v-if="channel.isAdmin"
													flat
													round
													dense
													icon="delete"
													size="xs"
													color="negative"
													@click.prevent.stop="
														deleteChannel(channel.name)
													"
													title="Zmazať kanál (/quit)"
												/>
												<q-btn
													flat
													round
													dense
													icon="logout"
													size="xs"
													color="grey-4"
													@click.prevent.stop="leaveChannel(channel.name)"
													title="Opustiť kanál (/cancel)"
												/>
											</div>
										</q-item-section>
									</q-item>
								</q-list>

								<!-- Discoverable public channels section -->
								<div v-if="discoverableChannels.length > 0" class="q-mt-md">
									<div
										class="text-overline text-grey-5 q-px-sm"
										style="line-height: 1"
									>
										DOSTUPNÉ VEREJNÉ KANÁLY
									</div>
									<q-list dense>
										<q-item
											v-for="channel in discoverableChannels"
											:key="channel.id"
											clickable
											v-ripple
											:to="'/' + channel.name"
											exact
											class="channel-item q-mb-xs rounded-borders text-grey-6"
											active-class="text-white bg-grey-9"
										>
											<q-item-section
												avatar
												style="min-width: 30px; padding-right: 0"
											>
												<q-icon name="tag" size="xs" color="grey-6" />
											</q-item-section>
											<q-item-section>
												{{ channel.name }}
											</q-item-section>
											<q-item-section side class="channel-actions">
												<q-btn
													flat
													round
													dense
													icon="login"
													size="xs"
													color="primary"
													title="Pripojiť sa do kanála (/join)"
													@click.prevent.stop="joinChannel(channel.name)"
												/>
											</q-item-section>
										</q-item>
									</q-list>
								</div>
							</div>
						</q-scroll-area>
					</div>
				</div>

				<!-- Status bar používateľa -->
				<div class="user-bar row no-wrap items-center q-px-sm">
					<div
						class="user-info row no-wrap items-center col cursor-pointer rounded-borders q-pa-xs"
					>
						<div class="user-avatar-wrapper">
							<q-avatar size="32px" color="primary" text-color="white">
								{{ currentUsername.charAt(0).toUpperCase() }}
							</q-avatar>
							<span
								class="status-dot"
								:style="{ backgroundColor: currentStatus.color }"
							/>
						</div>
						<div class="col q-ml-sm" style="min-width: 0">
							<div
								class="text-weight-bold ellipsis"
								style="font-size: 14px; line-height: 1.2"
							>
								{{ currentUsername }}
							</div>
							<div
								class="text-grey-5 ellipsis"
								style="font-size: 12px; line-height: 1.2"
							>
								{{ currentStatus.label }}
							</div>
						</div>

						<q-menu
							anchor="top left"
							self="bottom left"
							:offset="[0, 8]"
							class="status-menu"
							max-width="90vw"
						>
							<q-list dense style="min-width: 180px">
								<q-item
									v-for="option in statusOptions"
									:key="option.value"
									clickable
									v-close-popup
									:active="option.value === currentStatus.value"
									active-class="bg-grey-9"
									@click="setStatus(option.value)"
								>
									<q-item-section
										avatar
										style="min-width: 24px; padding-right: 0"
									>
										<span
											class="status-dot status-dot--inline"
											:style="{ backgroundColor: option.color }"
										/>
									</q-item-section>
									<q-item-section>
										<q-item-label>{{ option.label }}</q-item-label>
										<q-item-label
											v-if="option.description"
											caption
											class="text-grey-5"
											style="font-size: 11px; line-height: 1.1"
										>
											{{ option.description }}
										</q-item-label>
									</q-item-section>
								</q-item>
							</q-list>
						</q-menu>
					</div>

					<q-btn
						flat
						round
						dense
						icon="settings"
						size="sm"
						class="q-ml-xs text-grey-5"
						title="Nastavenia"
					>
						<q-menu
							anchor="top right"
							self="bottom right"
							:offset="[0, 8]"
							class="discord-bg text-white"
							max-width="90vw"
						>
							<q-list dense style="min-width: 150px">
								<q-item
									clickable
									v-close-popup
									@click="logout"
									class="text-red-4 hover-bg-grey-9"
								>
									<q-item-section>Odhlásiť sa</q-item-section>
									<q-item-section side>
										<q-icon name="logout" size="xs" color="red-4" />
									</q-item-section>
								</q-item>
							</q-list>
						</q-menu>
					</q-btn>
				</div>
			</div>
		</q-drawer>

		<q-page-container>
			<router-view :key="$route.fullPath + '-' + selectedServerId" />
		</q-page-container>
	</q-layout>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { Dialog } from 'quasar';
import { STATUS_OPTIONS, useAuthStore, useChatStore } from '@/stores/store';

// --- Quasar dialógy namiesto alert / confirm / prompt ---
function showAlert(message: string, title = 'Upozornenie'): Promise<void> {
	return new Promise((resolve) => {
		Dialog.create({
			title,
			message,
			dark: true,
			style: 'min-width: 280px; max-width: 94vw;',
			ok: { label: 'OK', color: 'primary', flat: true },
		})
			.onOk(() => resolve())
			.onDismiss(() => resolve());
	});
}

function showConfirm(message: string, title = 'Potvrdenie'): Promise<boolean> {
	return new Promise((resolve) => {
		let confirmed = false;
		Dialog.create({
			title,
			message,
			dark: true,
			persistent: true,
			style: 'min-width: 280px; max-width: 94vw;',
			ok: { label: 'Áno', color: 'negative', flat: true },
			cancel: { label: 'Zrušiť', color: 'grey', flat: true },
		})
			.onOk(() => {
				confirmed = true;
			})
			.onDismiss(() => resolve(confirmed));
	});
}

function showPrompt(message: string, title = 'Zadaj hodnotu'): Promise<string | null> {
	return new Promise((resolve) => {
		let value: string | null = null;
		Dialog.create({
			title,
			message,
			dark: true,
			style: 'min-width: 280px; max-width: 94vw;',
			prompt: { model: '', type: 'text', isValid: (val: string) => val.trim().length > 0 },
			ok: { label: 'OK', color: 'primary', flat: true },
			cancel: { label: 'Zrušiť', color: 'grey', flat: true },
		})
			.onOk((val: string) => {
				value = val.trim();
			})
			.onDismiss(() => resolve(value));
	});
}

function showVisibilityPicker(title: string): Promise<'public' | 'private' | null> {
	return new Promise((resolve) => {
		let value: 'public' | 'private' | null = null;
		Dialog.create({
			title,
			dark: true,
			style: 'min-width: 280px; max-width: 94vw;',
			options: {
				type: 'radio',
				model: 'public',
				items: [
					{ label: 'Verejný', value: 'public' },
					{ label: 'Súkromný', value: 'private' },
				],
			},
			ok: { label: 'Vytvoriť', color: 'primary', flat: true },
			cancel: { label: 'Zrušiť', color: 'grey', flat: true },
		})
			.onOk((val: 'public' | 'private') => {
				value = val;
			})
			.onDismiss(() => resolve(value));
	});
}

// --- Stav používateľa ---
type UserStatus = 'online' | 'mentions' | 'dnd' | 'offline';

interface StatusOption {
	value: UserStatus;
	label: string;
	color: string;
	description?: string;
}

interface ChannelItem {
	id: number;
	name: string;
	type: 'public' | 'private';
	admin: string;
	members: string[];
	invited: string[];
	banned: string[];
	kicks: Record<string, string[]>;
}

interface ServerItem {
	id: number;
	name: string;
	type: 'public' | 'private';
	admin: string;
	members: string[];
	channels: ChannelItem[];
}

export default defineComponent({
	name: 'MainLayout',

	data() {
		return {
			statusOptions: STATUS_OPTIONS,
			expiryInterval: null as ReturnType<typeof setInterval> | null,
		};
	},

	created() {
		// Používateľ bez uloženého stavu je po prihlásení online
		const username = this.authStore.currentUser;
		if (username && !this.chatStore.userStatuses[username.trim().toLowerCase()]) {
			this.chatStore.setUserStatus(username, 'online');
		}

		// Kanály neaktívne viac ako 30 dní zanikajú (pri štarte a potom každú minútu)
		this.chatStore.removeExpiredChannels();
		this.expiryInterval = setInterval(() => {
			this.chatStore.removeExpiredChannels();
		}, 60 * 1000);
	},

	beforeUnmount() {
		if (this.expiryInterval) {
			clearInterval(this.expiryInterval);
			this.expiryInterval = null;
		}
	},

	watch: {
		// Ak zanikol práve otvorený kanál, presunieme používateľa inam
		'chatStore.lastExpiredChannels'(names: string[]) {
			const params = this.$route.params as Record<string, string>;
			const current = (params.channelId || '').toLowerCase();
			if (!current || !names.some((n) => n.toLowerCase() === current)) return;
			this.$q.notify({
				type: 'info',
				icon: 'auto_delete',
				message: `Kanál #${params.channelId} zanikol po 30 dňoch bez novej správy.`,
				position: 'top',
			});
			void this.$router.replace('/');
		},
	},

	computed: {
		...mapStores(useAuthStore, useChatStore),

		drawerWidth(): number {
			return Math.min(312, this.$q.screen.width);
		},

		leftDrawerOpen: {
			get(): boolean {
				return this.chatStore.leftDrawerOpen;
			},
			set(val: boolean) {
				this.chatStore.setLeftDrawer(val);
			},
		},

		currentStatus(): StatusOption {
			const status = this.chatStore.currentUserStatus;
			return this.statusOptions.find((o) => o.value === status) ?? this.statusOptions[0]!;
		},

		servers(): ServerItem[] {
			return this.chatStore.visibleServers;
		},

		selectedServerId(): number {
			return this.selectedServer ? this.selectedServer.id : 0;
		},

		selectedServer(): ServerItem | null {
			return (this.chatStore.currentServer as ServerItem) || null;
		},

		// Computed vlastnosti pre rozdelenie zoznamu kanálov
		invitedChannels() {
			const currentNick = this.authStore.currentUser || '';
			return (this.selectedServer?.channels || [])
				.filter((c: ChannelItem) => {
					const isBanned = Array.isArray(c.banned) && c.banned.includes(currentNick);
					if (isBanned) return false;
					const isMember = Array.isArray(c.members) && c.members.includes(currentNick);
					const isInvited = Array.isArray(c.invited) && c.invited.includes(currentNick);
					return isInvited && !isMember;
				})
				.map((c: ChannelItem) => ({
					...c,
					isInvited: true,
					isAdmin: c.admin === currentNick,
				}));
		},

		regularChannels() {
			const currentNick = this.authStore.currentUser || '';
			return (this.selectedServer?.channels || [])
				.filter((c: ChannelItem) => {
					const isBanned = Array.isArray(c.banned) && c.banned.includes(currentNick);
					if (isBanned) return false;
					const isMember = Array.isArray(c.members) && c.members.includes(currentNick);
					return isMember;
				})
				.map((c: ChannelItem) => ({
					...c,
					isInvited: false,
					isAdmin: c.admin === currentNick,
				}));
		},

		discoverableChannels() {
			const currentNick = this.authStore.currentUser || '';
			return (this.selectedServer?.channels || [])
				.filter((c: ChannelItem) => {
					if (c.type !== 'public') return false;
					const isBanned = Array.isArray(c.banned) && c.banned.includes(currentNick);
					if (isBanned) return false;
					const isMember = Array.isArray(c.members) && c.members.includes(currentNick);
					const isInvited = Array.isArray(c.invited) && c.invited.includes(currentNick);
					return !isMember && !isInvited;
				})
				.map((c: ChannelItem) => ({
					...c,
					isInvited: false,
					isAdmin: c.admin === currentNick,
				}));
		},

		currentUsername(): string {
			return this.authStore.currentUser || 'Neznámy';
		},

		isServerAdmin(): boolean {
			const currentNick = (this.authStore.currentUser || '').trim().toLowerCase();
			const serverAdmin = (this.selectedServer?.admin || '').trim().toLowerCase();
			return !!currentNick && currentNick === serverAdmin;
		},
	},

	methods: {
		onChannelClick() {
			if (this.$q.screen.lt.md) {
				this.chatStore.setLeftDrawer(false);
			}
		},

		setStatus(status: UserStatus) {
			this.chatStore.setUserStatus(this.currentUsername, status);
		},

		hasChannelAccess(channel: ChannelItem): boolean {
			const currentNick = this.authStore.currentUser || '';
			return this.chatStore.hasChannelAccess(channel, currentNick);
		},

		async logout() {
			const username = this.authStore.currentUser;
			if (username) this.chatStore.setUserStatus(username, 'offline');
			this.authStore.logout();
			await this.$router.push('/login');
		},

		async selectServer(id: number) {
			this.chatStore.selectServer(id);
			if (this.$q.screen.lt.md) {
				this.chatStore.setLeftDrawer(false);
			}
			const server = this.chatStore.servers.find((s) => s.id === id);
			const currentNick = this.authStore.currentUser || '';
			const memberChannels = (server?.channels || []).filter(
				(c: ChannelItem) =>
					Array.isArray(c.members) &&
					c.members.includes(currentNick) &&
					(!Array.isArray(c.banned) || !c.banned.includes(currentNick)),
			);
			const invitedChannels = (server?.channels || []).filter(
				(c: ChannelItem) =>
					Array.isArray(c.invited) &&
					c.invited.includes(currentNick) &&
					(!Array.isArray(c.banned) || !c.banned.includes(currentNick)),
			);
			const accessibleChannels = (server?.channels || []).filter((c: ChannelItem) =>
				this.hasChannelAccess(c),
			);
			const firstChannel =
				memberChannels[0]?.name ||
				invitedChannels[0]?.name ||
				accessibleChannels[0]?.name ||
				server?.channels[0]?.name ||
				'všeobecný';
			await this.$router.push('/' + firstChannel);
		},

		async inviteToTeam() {
			if (!this.selectedServer) return;
			const serverId = this.selectedServer.id;
			const nick = await showPrompt(
				`Zadaj používateľské meno (prezývku) na pozvanie do tímu "${this.selectedServer.name}":`,
				'Pozvať do tímu',
			);
			if (!nick) return;
			const currentNick = this.authStore.currentUser || '';
			if (nick === currentNick) {
				await showAlert('Nemôžeš pozvať sám seba.');
				return;
			}
			const res = this.chatStore.inviteUserToTeam(serverId, nick);
			await showAlert(res.message, 'Pozvánka');
		},

		async createServerPrompt() {
			const name = await showPrompt(
				'Názov nového servera (alebo použi príkaz /create <nazov> [private]):',
				'Nový server',
			);
			if (!name) return;
			const visibility = await showVisibilityPicker('Typ servera');
			if (!visibility) return;
			const res = this.chatStore.executeCommand(
				'všeobecný',
				`/create ${name} ${visibility === 'private' ? 'private' : ''}`,
			);
			if (res.newServerId) {
				await this.selectServer(res.newServerId);
			} else if (res.redirectUrl) {
				await this.selectServer(this.chatStore.selectedServerId);
			}
		},

		async leaveServer() {
			if (!this.selectedServer) return;
			const serverName = this.selectedServer.name;
			const currentNick = this.authStore.currentUser || '';

			if (this.isServerAdmin) {
				if (
					await showConfirm(
						`Ako správca servera "${serverName}" jeho opustením server zrušíš (/delete). Naozaj chceš odísť?`,
						'Opustiť server',
					)
				) {
					if (!this.selectedServer) return;
					const res = this.chatStore.executeCommand(
						this.selectedServer.channels[0]?.name || 'všeobecný',
						'/delete',
					);
					if (res.redirectUrl) {
						await this.$router.push(res.redirectUrl);
					}
				}
				return;
			}

			if (
				await showConfirm(
					`Naozaj chceš odísť zo servera "${serverName}"?`,
					'Opustiť server',
				)
			) {
				if (!this.selectedServer) return;
				if (Array.isArray(this.selectedServer.members)) {
					this.selectedServer.members = this.selectedServer.members.filter(
						(m: string) => m !== currentNick,
					);
				}
				for (const channel of this.selectedServer.channels) {
					if (Array.isArray(channel.members)) {
						channel.members = channel.members.filter((m: string) => m !== currentNick);
					}
					if (Array.isArray(channel.invited)) {
						channel.invited = channel.invited.filter((i: string) => i !== currentNick);
					}
				}
				this.chatStore.saveServers();

				const visibleServers = this.servers.filter((s) => s.id !== this.selectedServerId);
				const nextServ = visibleServers[0];
				if (nextServ) {
					this.chatStore.selectServer(nextServ.id);
					const memberChannels = (nextServ.channels || []).filter(
						(c: ChannelItem) =>
							Array.isArray(c.members) &&
							c.members.includes(currentNick) &&
							(!Array.isArray(c.banned) || !c.banned.includes(currentNick)),
					);
					const invitedChannels = (nextServ.channels || []).filter(
						(c: ChannelItem) =>
							Array.isArray(c.invited) &&
							c.invited.includes(currentNick) &&
							(!Array.isArray(c.banned) || !c.banned.includes(currentNick)),
					);
					const accessibleChannels = (nextServ.channels || []).filter((c: ChannelItem) =>
						this.hasChannelAccess(c),
					);
					const nextChannel =
						memberChannels[0]?.name ||
						invitedChannels[0]?.name ||
						accessibleChannels[0]?.name ||
						nextServ.channels[0]?.name ||
						'všeobecný';
					await this.$router.push('/' + nextChannel);
					this.chatStore.addSystemMessage(
						nextChannel,
						`Opustil si server "${serverName}".`,
					);
				} else {
					await this.$router.push('/');
				}
			}
		},

		async deleteServer() {
			if (!this.selectedServer) return;
			const serverName = this.selectedServer.name;
			if (
				await showConfirm(
					`Naozaj chceš zmazať server "${serverName}"? Ako správca ho vymažeš natrvalo.`,
					'Zmazať server',
				)
			) {
				if (!this.selectedServer) return;
				const res = this.chatStore.executeCommand(
					this.selectedServer.channels[0]?.name || 'všeobecný',
					'/delete',
				);
				if (res.redirectUrl) {
					await this.$router.push(res.redirectUrl);
				}
			}
		},

		// --- Akcie pre kanály ---
		async createChannel() {
			const name = await showPrompt(
				'Názov nového kanála (alebo použi príkaz /join <nazov> [private]):',
				'Nový kanál',
			);
			if (!name) return;
			const visibility = await showVisibilityPicker('Typ kanála');
			if (!visibility) return;
			const res = this.chatStore.executeCommand(
				this.selectedServer?.channels[0]?.name || 'všeobecný',
				`/join ${name} ${visibility === 'private' ? 'private' : ''}`,
			);
			if (res.redirectUrl) {
				await this.$router.push(res.redirectUrl);
			}
		},

		async leaveChannel(channelName: string) {
			if (
				await showConfirm(
					`Naozaj chceš opustiť kanál #${channelName}? (zrušiť členstvo)`,
					'Opustiť kanál',
				)
			) {
				const res = this.chatStore.executeCommand(channelName, '/cancel');
				if (res.redirectUrl) {
					await this.$router.push(res.redirectUrl);
				}
			}
		},

		async deleteChannel(channelName: string) {
			if (
				await showConfirm(
					`Naozaj chceš zrušiť kanál #${channelName}? Ako správca ho zrušíš natrvalo.`,
					'Zrušiť kanál',
				)
			) {
				const res = this.chatStore.executeCommand(channelName, '/quit');
				if (res.redirectUrl) {
					await this.$router.push(res.redirectUrl);
				}
			}
		},

		async joinChannel(channelName: string) {
			const res = this.chatStore.executeCommand(channelName, `/join ${channelName}`);
			this.chatStore.addSystemMessage(channelName, res.message);
			if (res.redirectUrl) {
				await this.$router.push(res.redirectUrl);
			} else {
				await this.$router.push('/' + channelName);
			}
		},
	},
});
</script>

<style scoped>
.hover-bg-grey-9:hover {
	background-color: #35373c;
}
.server-sidebar {
	background-color: #1e1f22 !important;
	border-right: none;
}

.channel-sidebar {
	background-color: #2b2d31 !important;
	border-right: none;
}

.discord-bg {
	background-color: #313338;
}

/* Server Icons */
.server-icon-wrapper {
	position: relative;
	display: flex;
	justify-content: center;
	width: 100%;
}

.server-btn {
	transition:
		border-radius 0.2s ease,
		background-color 0.2s ease;
}

.server-btn:hover {
	border-radius: 16px;
	background-color: #5865f2 !important;
}

/* Aktívny server - zaoblený štvorec + indikátor vľavo */
.server-active .server-btn {
	border-radius: 16px;
}

.server-active::before {
	content: '';
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	width: 4px;
	height: 40px;
	border-radius: 0 4px 4px 0;
	background-color: #fff;
}

/* Channel Header */
.channel-header {
	height: 48px;
	border-bottom: 1px solid #1e1f22;
	transition: background-color 0.2s;
}

.channel-header:hover {
	background-color: #35373c;
}

/* Channel List Items */
.channel-item {
	min-height: 34px;
	padding: 0 8px;
	transition: background-color 0.1s;
}

.channel-item:hover {
	background-color: #35373c;
	color: #dbdee1 !important;
}

/* Zvýraznenie pre pozvánky */
.invite-highlight {
	background-color: rgba(88, 101, 242, 0.15);
	border: 1px solid rgba(88, 101, 242, 0.5);
}

.invite-highlight:hover {
	background-color: rgba(88, 101, 242, 0.25);
}

/* Channel Actions (Hide by default, show on hover or always on touchscreens) */
.channel-actions {
	opacity: 0;
	transition: opacity 0.1s;
}

.channel-item:hover .channel-actions {
	opacity: 1;
}

@media (max-width: 768px), (hover: none) {
	.channel-actions {
		opacity: 0.85;
	}

	.add-btn {
		opacity: 1;
	}
}

/* Add Channel Button */
.add-btn {
	opacity: 0.6;
}

.add-btn:hover {
	opacity: 1;
	color: #dbdee1 !important;
}

/* Status bar používateľa */
.user-bar {
	height: 56px;
	flex-shrink: 0;
	background-color: #232428;
}

.user-info {
	min-width: 0;
	transition: background-color 0.1s;
}

.user-info:hover {
	background-color: #35373c;
}

.user-avatar-wrapper {
	position: relative;
	flex-shrink: 0;
}

.status-dot {
	position: absolute;
	right: -2px;
	bottom: -2px;
	width: 12px;
	height: 12px;
	border-radius: 50%;
	border: 3px solid #232428;
	box-sizing: content-box;
}

.status-dot--inline {
	position: static;
	display: inline-block;
	border: none;
}
</style>
