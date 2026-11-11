<template>
	<q-page class="column flex-center bg-discord-main text-white q-pa-md text-center">
		<template v-if="hasServers">
			<q-spinner-dots size="40px" color="primary" />
			<div class="text-subtitle1 q-mt-md">Načítavam chat...</div>
		</template>
		<template v-else>
			<q-icon name="forum" size="56px" color="grey-6" />
			<div class="text-h6 q-mt-md">Zatiaľ nie si v žiadnom serveri</div>
			<div class="text-body2 text-grey-5 q-mt-sm" style="max-width: 360px">
				Vytvor si vlastný server tlačidlom <b>+</b> vľavo, alebo počkaj, kým ťa niekto
				pozve do svojho.
			</div>
		</template>
	</q-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { firstChannelFor, useChatStore, useAuthStore } from '@/stores/store';

export default defineComponent({
	name: 'IndexPage',

	computed: {
		...mapStores(useChatStore, useAuthStore),

		firstChannel(): string | null {
			return firstChannelFor(this.chatStore.currentServer, this.authStore.currentUser || '');
		},

		hasServers(): boolean {
			return this.chatStore.servers.length > 0;
		},
	},

	watch: {
		// Server môže pribudnúť aj neskôr (napr. pozvánka od iného používateľa)
		firstChannel: {
			immediate: true,
			handler(name: string | null) {
				if (name) void this.$router.replace('/' + name);
			},
		},
	},
});
</script>

<style scoped>
.bg-discord-main {
	background-color: #313338;
}
</style>
