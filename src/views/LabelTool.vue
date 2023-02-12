<template>
  <div class="flex items-center w-screen h-screen flex-col">
    <div class="w-[95vw] h-[22vh] border p-3 mt-3">
      <el-scrollbar>
        <div class="flex">
          <div
            v-for="file in toolData.files"
            :key="file.name"
            class="w-1/4 h-[20vh] flex flex-col justify-evenly items-center m-auto"
          >
            <el-image :src="file.url" fit="contain"></el-image>
            <div class="my-1 text-center">
              {{ file.name }}
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>
    <div class="w-[95vw] h-[60vh] border p-3 m-3">
      <AnnotatorBoard
        :labels="labels"
        :current-label="currentLabel"
        :file="currentfile"
        @change-file="changeLoadInfile"
        @save-markbox="saveMarkbox"
      />
    </div>
    <div class="w-[95vw] h-[15vh] border p-3 mb-3 flex items-center">
      <div>hot key</div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref, type Ref } from "vue";
import AnnotatorBoard from "@/components/AnnotatorBoard.vue";
import {
  FileInfo,
  getFixedColorHEXCode,
  Label,
  Markbox,
  ToolData,
} from "@/services/annotator.service";

const labels: Label[] = reactive([]);
const currentLabel: Label = reactive(new Label());
const toolData: ToolData = reactive(new ToolData());
const fileIndex: Ref<number> = ref(0);
const currentfile = computed(() => {
  return toolData.files.length === 0
    ? new FileInfo()
    : toolData.files[fileIndex.value];
});

onMounted(() => {
  toolData.labelNames = ["test1", "test2", "test3"];
  for (let i = 0; i < toolData.labelNames.length; i++) {
    labels.push({
      name: toolData.labelNames[i],
      color: getFixedColorHEXCode(i),
    });
  }
  currentLabel.name = labels[0].name;
  currentLabel.color = labels[0].color;
  toolData.files.push(
    {
      name: "file01",
      markboxes: [],
      url: "https://images.unsplash.com/photo-1495638671147-2cb03fe8e33e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80",
    },
    {
      name: "file02",
      markboxes: [],
      url: "https://images.unsplash.com/photo-1623623294213-ec23975a7038?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1674&q=80",
    }
  );
  fileIndex.value = 0;
});

function changeLoadInfile(name: string, action: string) {
  const index = toolData.files.findIndex((item) => item.name === name);
  if (index === -1) return;
  if (index === 0 && action === "prev") return;
  const max = toolData.files.length - 1;
  if (index === max && action === "next") return;

  const changeIndex = action === "prev" ? index - 1 : index + 1;
  fileIndex.value = changeIndex;
}

function saveMarkbox(name: string, markboxes: Markbox[]) {
  const target = toolData.files.find((item) => item.name === name);
  if (!target) return;
  target.markboxes = JSON.parse(JSON.stringify(markboxes));
}
</script>
