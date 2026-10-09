<template>
  <q-page class="column flex-center bg-discord-main text-white q-pa-md">
    <q-spinner-dots size="40px" color="primary" />
    <div class="text-subtitle1 q-mt-md">Načítavam chat...</div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { useChatStore } from '@/stores/store';

export default defineComponent({
  name: 'IndexPage',

  computed: {
    ...mapStores(useChatStore),
  },

  mounted() {
    const firstChannel = this.chatStore.currentServer?.channels[0]?.name || 'všeobecný';
    void this.$router.replace('/' + firstChannel);
  },
});
</script>

<style scoped>
.bg-discord-main {
  background-color: #313338;
}
</style>
