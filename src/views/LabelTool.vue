<template>
  <div class="flex items-center w-screen h-screen flex-col">
    <div class="w-[95vw] h-[22vh] border p-3 mt-3">
      <el-scrollbar>
        <div class="flex">
          <div
            v-for="file in toolData.files"
            :key="file.name"
            class="w-1/4 h-[20vh] flex flex-col justify-evenly items-center m-auto cursor-pointer"
            @click="pickFile(file.name)"
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
        @change-label="changeCurrentLabel"
      />
    </div>
    <div class="w-[95vw] h-[15vh] border p-3 mb-3 flex items-center">
      <div>Hot keys</div>
      <div
        v-for="item in hotKey"
        :key="item.name"
        class="rounded-lg w-1/3 h-3/5 flex flex-col items-center justify-between border m-3"
      >
        <div>{{ item.name }}</div>
        <div class="border-t">{{ item.label }}</div>
      </div>
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

const toolData: ToolData = reactive(new ToolData());
const fileIndex: Ref<number> = ref(0);
const currentfile = computed<FileInfo>(() => {
  return toolData.files.length === 0
    ? new FileInfo()
    : toolData.files[fileIndex.value];
});
const labels: Label[] = reactive([]);
const labelIndex: Ref<number> = ref(0);
const currentLabel = computed<Label>(() => {
  return labels.length === 0 ? new Label() : labels[labelIndex.value];
});

interface Hotkey {
  name: string;
  label: string;
}

const hotKey: Hotkey[] = [
  { name: "A", label: "prev image" },
  { name: "D", label: "next image" },
  { name: "W", label: "annotating" },
  { name: "E", label: "dragging" },
  { name: "1-9", label: "switch label" },
  { name: "Del", label: "delete label" },
  { name: "Scroll + Alt", label: "resize image" },
  { name: "Z", label: "recover image " },
  { name: "X", label: "invisible all " },
];

onMounted(() => {
  toolData.labelNames = ["test1", "test2", "test3"];
  for (let i = 0; i < toolData.labelNames.length; i++) {
    labels.push({
      name: toolData.labelNames[i],
      color: getFixedColorHEXCode(i),
    });
  }
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
});

function changeLoadInfile(name: string, action: string):void {
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

function changeCurrentLabel(name: string):void {
  const index = labels.findIndex((label) => label.name === name);
  if (index === -1) return;
  labelIndex.value = index;
}

function pickFile(name:string):void{
  const index = toolData.files.findIndex((item)=> item.name === name)
  if (index === -1) return;
  fileIndex.value = index;
}
</script>
