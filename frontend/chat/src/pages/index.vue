<template>
  <q-layout view="lHh Lpr lFf" class="discord-bg text-white">
    <!-- Combined Left Sidebar (Servers + Channels) -->
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      :width="312"
      :breakpoint="500"
      class="row no-wrap"
    >
      <!-- Servers Column (72px) -->
      <div class="server-sidebar col-auto" style="width: 72px; height: 100%;">
        <q-scroll-area class="fit" :horizontal-thumb-style="{ opacity: '0' }">
          <div class="column items-center q-py-sm q-gutter-y-sm">
            <!-- Home / Direct Messages -->
            <div class="server-icon-wrapper">
              <q-btn round unelevated color="primary" icon="home" size="md" />
            </div>

            <q-separator dark class="q-mx-md" style="width: 32px" />

            <!-- Mock Servers -->
            <div class="server-icon-wrapper" v-for="i in 5" :key="i">
              <q-btn round unelevated color="grey-8" class="server-btn" size="md">
                {{ ['D', 'S', 'G', 'M', 'A'][i-1] }}
              </q-btn>
            </div>
            
            <div class="server-icon-wrapper">
              <q-btn round unelevated text-color="green" color="grey-9" icon="add" size="md" />
            </div>
          </div>
        </q-scroll-area>
      </div>

      <!-- Channels Column (240px) -->
      <div class="channel-sidebar col" style="height: 100%;">
        <!-- Sidebar Header -->
        <div class="channel-header flex items-center justify-between q-px-md cursor-pointer">
          <div class="text-weight-bold">Môj Server</div>
          <q-icon name="expand_more" size="sm" />
        </div>

        <q-scroll-area style="height: calc(100% - 48px);" :horizontal-thumb-style="{ opacity: '0' }">
          <div class="q-pa-sm">
            <!-- Top section for invites -->
            <div v-if="invitedChannels.length > 0" class="q-mb-md">
              <div class="text-overline text-grey-5 q-px-sm" style="line-height: 1">POZVÁNKY</div>
              <q-list dense>
                <q-item 
                  v-for="channel in invitedChannels" 
                  :key="channel.id" 
                  clickable 
                  v-ripple
                  class="channel-item invite-highlight q-mt-xs rounded-borders"
                >
                  <q-item-section avatar style="min-width: 30px; padding-right: 0;">
                    <q-icon :name="channel.type === 'private' ? 'lock' : 'tag'" size="xs" color="primary" />
                  </q-item-section>
                  <q-item-section class="text-weight-bold text-primary">
                    {{ channel.name }}
                  </q-item-section>
                </q-item>
              </q-list>
            </div>

            <!-- Regular channels list -->
            <div class="flex items-center justify-between q-px-sm q-mt-sm q-mb-xs group-header">
              <div class="text-overline text-grey-5" style="line-height: 1">TEXTOVÉ KANÁLY</div>
              <q-btn flat round dense icon="add" size="xs" color="grey-5" class="add-btn" @click="createChannel" />
            </div>
            
            <q-list dense>
              <q-item 
                v-for="channel in regularChannels" 
                :key="channel.id" 
                clickable 
                v-ripple
                class="channel-item q-mb-xs rounded-borders text-grey-5"
                active-class="text-white bg-grey-9"
              >
                <q-item-section avatar style="min-width: 30px; padding-right: 0;">
                  <q-icon :name="channel.type === 'private' ? 'lock' : 'tag'" size="xs" />
                </q-item-section>
                <q-item-section>
                  {{ channel.name }}
                </q-item-section>
                
                <!-- Action buttons (Leave / Delete) shown on hover or active -->
                <q-item-section side class="channel-actions">
                  <div class="row q-gutter-xs">
                    <q-btn v-if="channel.isAdmin" flat round dense icon="delete" size="xs" color="negative" @click.stop="deleteChannel(channel.id)" title="Zmazať (Si správca)" />
                    <q-btn flat round dense icon="logout" size="xs" color="grey-4" @click.stop="leaveChannel(channel.id)" title="Opustiť" />
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-scroll-area>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const leftDrawerOpen = ref(true);

// --- Mock Channel Data pre 2. bod ---
interface Channel {
  id: number;
  name: string;
  type: 'public' | 'private';
  isInvited: boolean;
  isAdmin: boolean;
}

const channels = ref<Channel[]>([
  { id: 1, name: 'všeobecný', type: 'public', isInvited: false, isAdmin: false },
  { id: 2, name: 'tajný-vývoj', type: 'private', isInvited: false, isAdmin: true },
  { id: 3, name: 'nová-kampaň', type: 'public', isInvited: true, isAdmin: false }, // Pozvánka (topovaná a zvýraznená)
  { id: 4, name: 'off-topic', type: 'public', isInvited: false, isAdmin: true },
]);

// Computed vlastnosti pre rozdelenie zoznamu
const invitedChannels = computed(() => channels.value.filter(c => c.isInvited));
const regularChannels = computed(() => channels.value.filter(c => !c.isInvited));

// --- Akcie pre kanály ---
function createChannel() {
  const name = prompt('Názov nového kanála:');
  if (!name) return;
  
  const isPrivate = confirm('Má byť kanál súkromný? (OK = Áno, Zrušiť = Nie)');
  
  channels.value.push({
    id: Date.now(),
    name: name.toLowerCase().replace(/\s+/g, '-'),
    type: isPrivate ? 'private' : 'public',
    isInvited: false,
    isAdmin: true // Vytvoril si ho, takže si správca
  });
}

function leaveChannel(id: number) {
  if (confirm('Naozaj chceš opustiť tento kanál?')) {
    channels.value = channels.value.filter(c => c.id !== id);
  }
}

function deleteChannel(id: number) {
  if (confirm('Naozaj chceš zmazať tento kanál? Ako správca ho vymažeš natrvalo.')) {
    channels.value = channels.value.filter(c => c.id !== id);
  }
}
</script>

<style scoped>
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
  transition: border-radius 0.2s ease, background-color 0.2s ease;
}

.server-btn:hover {
  border-radius: 16px; 
  background-color: #5865F2 !important;
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

/* Channel Actions (Hide by default, show on hover) */
.channel-actions {
  opacity: 0;
  transition: opacity 0.1s;
}

.channel-item:hover .channel-actions {
  opacity: 1;
}

/* Add Channel Button */
.add-btn {
  opacity: 0.6;
}

.add-btn:hover {
  opacity: 1;
  color: #dbdee1 !important;
}
</style>
