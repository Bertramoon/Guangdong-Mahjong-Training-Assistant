<template>
  <div class="game-board">
    <!-- Top: Robot 2 (North) -->
    <div class="board-top">
      <OtherPlayer
        name="机器人2(北)"
        position="top"
        :hand-count="topPlayerHandCount"
        :melds="topPlayerMelds"
        :discards="topPlayerDiscards"
        :matched-tile-ids="matchedTileIds"
        :ghost-type="ghostType"
        :ghost-value="ghostValue"
      />
    </div>

    <!-- Middle row: Left + Center + Right -->
    <div class="board-middle">
      <div class="board-left">
        <OtherPlayer
          name="机器人1(西)"
          position="left"
          :hand-count="leftPlayerHandCount"
          :melds="leftPlayerMelds"
          :discards="leftPlayerDiscards"
          :matched-tile-ids="matchedTileIds"
          :ghost-type="ghostType"
          :ghost-value="ghostValue"
        />
      </div>

      <div class="board-center">
        <DiscardPool :tiles="centerDiscards" :matched-tile-ids="matchedTileIds" />
        <div class="ghost-indicator">鬼牌: {{ ghostName }}</div>
        <div class="turn-info" v-if="turnText">{{ turnText }}</div>
      </div>

      <div class="board-right">
        <OtherPlayer
          name="机器人3(东)"
          position="right"
          :hand-count="rightPlayerHandCount"
          :melds="rightPlayerMelds"
          :discards="rightPlayerDiscards"
          :matched-tile-ids="matchedTileIds"
          :ghost-type="ghostType"
          :ghost-value="ghostValue"
        />
      </div>
    </div>

    <!-- Bottom: Player (South) -->
    <div class="board-bottom">
      <MeldArea :melds="playerMelds" :matched-tile-ids="matchedTileIds" :ghost-type="ghostType" :ghost-value="ghostValue" />
      <PlayerHand
        :tiles="playerHand"
        label="你的手牌"
        :selected-id="selectedTileId"
        :highlighted-tile-ids="highlightedTileIds"
        :ghost-type="ghostType"
        :ghost-value="ghostValue"
        @select="$emit('select-tile', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Tile, Meld, TileType } from '../engine/types';
import PlayerHand from './PlayerHand.vue';
import MeldArea from './MeldArea.vue';
import DiscardPool from './DiscardPool.vue';
import OtherPlayer from './OtherPlayer.vue';

const props = defineProps<{
  hands: Tile[][];
  melds: Meld[][];
  discards: Tile[][];
  selectedTileId: number | null;
  highlightedTileIds: number[];
  matchedTileIds: number[];
  ghostType: TileType;
  ghostValue: number;
  ghostName: string;
  currentPlayer: number;
  phase: string;
  turnText: string;
}>();

defineEmits<{
  'select-tile': [tile: Tile];
}>();

const playerHand = computed(() => props.hands[0]);
const playerMelds = computed(() => props.melds[0]);

const leftPlayerHandCount = computed(() => props.hands[1].length);
const topPlayerHandCount = computed(() => props.hands[2].length);
const rightPlayerHandCount = computed(() => props.hands[3].length);

const leftPlayerMelds = computed(() => props.melds[1]);
const topPlayerMelds = computed(() => props.melds[2]);
const rightPlayerMelds = computed(() => props.melds[3]);

const leftPlayerDiscards = computed(() => props.discards[1]);
const topPlayerDiscards = computed(() => props.discards[2]);
const rightPlayerDiscards = computed(() => props.discards[3]);

const centerDiscards = computed(() => props.discards.flat());
</script>

<style scoped>
.game-board {
  width: 100%;
  max-width: 1100px;
  min-height: 700px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: radial-gradient(ellipse at center, #2d6a2d 0%, #1a4a1a 100%);
  border-radius: 16px;
}
.board-top {
  display: flex;
  justify-content: center;
}
.board-middle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
}
.board-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 300px;
}
.ghost-indicator {
  font-size: 14px;
  color: #ffd700;
  background: rgba(0,0,0,0.3);
  padding: 4px 12px;
  border-radius: 4px;
}
.turn-info {
  font-size: 14px;
  color: #fff;
}
.board-left, .board-right {
  display: flex;
  align-items: center;
}
.board-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
</style>
