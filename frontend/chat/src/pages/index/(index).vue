<template>
  <q-page class="column flex-center bg-discord-main text-white q-pa-md">
    <q-spinner-dots size="40px" color="primary" />
    <div class="text-subtitle1 q-mt-md">Načítavam chat...</div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { useChatStore, useAuthStore } from '@/stores/store';

interface ChannelItem {
  name: string;
  type: 'public' | 'private';
  admin: string;
  members: string[];
  invited: string[];
  banned: string[];
}

export default defineComponent({
  name: 'IndexPage',

  computed: {
    ...mapStores(useChatStore, useAuthStore),
  },

  mounted() {
    const server = this.chatStore.currentServer;
    const currentNick = this.authStore.currentUser || '';
    const accessibleChannels = (server?.channels || []).filter((c: ChannelItem) =>
      this.chatStore.hasChannelAccess(c, currentNick)
    );
    const firstChannel = accessibleChannels[0]?.name || server?.channels[0]?.name || 'všeobecný';
    void this.$router.replace('/' + firstChannel);
  },
});
</script>

<style scoped>
.bg-discord-main {
  background-color: #313338;
}
</style>
