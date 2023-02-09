<script setup lang="ts">
import { reactive } from "vue";

// defineProps<{
//   msg: string;
// }>();
const configKonva = reactive({
  width: 200,
  height: 200,
});

const configCircle = reactive({
  x: 100,
  y: 100,
  radius: 70,
  fill: "red",
  stroke: "black",
  strokeWidth: 4,
});
</script>
<template>
  <h1 class="text-3xl font-bold underline">Hello world!</h1>
  <v-stage :config="configKonva">
    <v-layer>
      <v-circle :config="configCircle"></v-circle>
    </v-layer>
  </v-stage>
</template>
