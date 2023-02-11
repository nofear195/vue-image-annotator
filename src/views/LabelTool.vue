<template>
  <div class="flex items-center w-screen h-screen">
    <div class="w-[50vw] h-[50vh]">
      <AnnotatorBoard
        :labels="labels"
        :current-label="currentLabel"
        :file="file"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive } from "vue";
import AnnotatorBoard from "@/components/AnnotatorBoard.vue";
import {
  FileInfo,
  getFixedColorHEXCode,
  Label,
  ToolData,
} from "@/services/annotator.service";
// defineProps<{
//   msg: string;
// }>();
const labels: Label[] = reactive([]);
const currentLabel = computed<Label>(() => labels[0]);
const file: FileInfo = reactive(new FileInfo());
const toolData: ToolData = reactive(new ToolData());
onMounted(() => {
  toolData.labelNames = ["test1", "test2", "test3"];

  for (let i = 0; i < toolData.labelNames.length; i++) {
    labels.push({
      name: toolData.labelNames[i],
      color: getFixedColorHEXCode(i),
    });
  }
  file.name = "file01";
  file.markboxes = [];
  file.url =
    "https://www.rappler.com/tachyon/2022/12/spy-x-family-second-season-movie.jpeg?resize=1918%2C1080&zoom=1";
});
</script>
