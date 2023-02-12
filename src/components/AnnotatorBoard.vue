<template>
  <div class="w-full h-full flex flex-row justify-between">
    <div
      class="flex-auto relative focus:outline-none"
      tabindex="1"
      ref="annotatorBox"
      @mouseover="enterAnnotatorBox"
      @mouseleave="leaveAnnotatorBox"
      @keydown.exact="handleKeyDownEvent"
      v-loading="loading"
      element-loading-text="Loading image..."
    >
      <div class="flex absolute z-10" :style="annotator.innerToolBox.boxStyle">
        <select :value="currentLabel.name" @change="changeAnnotationLabel">
          <option
            v-for="item in labels"
            :key="item.name"
            :label="item.name"
            :value="item.name"
          />
        </select>
        <el-button
          type="danger"
          :icon="Delete"
          @click="removeMarkbox(annotator.innerToolBox.getMarkboxId())"
          circle
        ></el-button>
      </div>
      <v-stage
        ref="stage"
        :config="annotator.stageConfig"
        @mousedown="startResizeMarkbox"
      >
        <v-layer
          :config="annotator.layerConfig"
          @mouseleave="leaveAnnotateRange"
          @wheel="wheelResizeLayer"
          @dragmove="dragLayer"
        >
          <v-image
            :config="annotator.imageConfig"
            @mousedown="createMarkbox"
            @mousemove="editMarkboxVolume"
          />
          <v-group
            v-for="item in markboxes"
            :key="item.id"
            :config="{ name: item.id, visible: true }"
          >
            <v-rect
              :config="{
                id: item.id,
                x: item.x,
                y: item.y,
                width: item.width,
                height: item.height,
                stroke: `${getLabelColor(item.labelName, labels)}`,
                draggable: true,
              }"
              @mouseup="stopEditMarkboxVolume"
              @dragmove="startDragMarkbox"
              @dragend="stopDragMarkbox"
              @transformend="stopResizeMarkbox"
            />
            <v-text
              :config="{
                id: item.id,
                text: item.labelName,
                x: item.x,
                y: item.y - 20 / annotator.layer.scaleX(),
                fill: '#fbfbfa',
                fontSize: 20 / annotator.layer.scaleX(),
                visible: true,
              }"
            />
          </v-group>
          <v-transformer :config="annotator.transformerConfig" />
        </v-layer>
      </v-stage>
    </div>
    <div class="flex-auto w-1/3 h-full">
      <el-table :data="markboxes" max-height="100%" stripe height="100%">
        <el-table-column type="expand">
          <template #default="scope">
            <div class="flex h-8 justify-evenly">
              <el-icon
                size="1.5rem"
                class="cursor-pointer"
                @click="toggleMarkboxVisible(scope.row.id)"
              >
                <template v-if="markboxVisible(scope.row.id)">
                  <View />
                </template>
                <template v-else>
                  <Hide />
                </template>
              </el-icon>
              <el-icon
                size="1.5rem"
                class="cursor-pointer"
                @click="toggleMarkboxDraggable(scope.row.id)"
              >
                <template v-if="markboxDraggable(scope.row.id)">
                  <Unlock />
                </template>
                <template v-else>
                  <Lock />
                </template>
              </el-icon>
              <el-icon
                size="1.5rem"
                class="cursor-pointer"
                @click="pickMarkboxById(scope.row.id)"
              >
                <Edit />
              </el-icon>
              <el-icon
                size="1.5rem"
                class="cursor-pointer"
                @click="removeMarkbox(scope.row.id)"
              >
                <Delete />
              </el-icon>
            </div>
          </template>
        </el-table-column>
        <el-table-column type="index" label="No." />
        <el-table-column prop="labelName" label="class" />
        <el-table-column label="X">
          <template #default="scope">
            <div class="flex items-center">
              {{ scope.row.x.toFixed(2) }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Y">
          <template #default="scope">
            <div class="flex items-center">
              {{ scope.row.y.toFixed(2) }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Width">
          <template #default="scope">
            <div class="flex items-center">
              {{ scope.row.width.toFixed(2) }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Height">
          <template #default="scope">
            <div class="flex items-center">
              {{ scope.row.height.toFixed(2) }}
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import type { Ref } from "vue";
import type { KonvaPointerEvent } from "konva/lib/PointerEvents";
import type { Vector2d } from "konva/lib/types";
import type { Node } from "konva/lib/Node";
import type { Container } from "konva/lib/Container";
import type { Group } from "konva/lib/Group";
import { Delete } from "@element-plus/icons-vue";
import {
  Markbox,
  Annotator,
  Label,
  getLabelColor,
  FileInfo,
} from "@/services/annotator.service";

const props = defineProps<{
  labels: Label[];
  currentLabel: Label;
  file: FileInfo;
}>();

const emits = defineEmits<{
  (e: "saveMarkbox", name: string, markboxes: Markbox[]): void;
  (e: "changeFile", name: string, action: string): void;
}>();

const loading = ref(false);
const isMounted = ref(false);
const annotator = reactive(new Annotator());
const markboxes: Markbox[] = reactive([]);
const annotatorBox: Ref<HTMLDivElement | null> = ref(null);
const stage = ref(null);

onMounted(async () => {
  isMounted.value = true;
  await init();
});

const currentUrl = computed(() => {
  return props.file.url;
});

watch(currentUrl, async () => {
  await init();
});

async function init(): Promise<void> {
  if (!isMounted.value) return;
  const url = props.file.url;
  if (url === "") return;
  const fileMarkboxes = props.file.markboxes;
  if (!annotatorBox.value) return;
  await initAnnotator(annotatorBox.value, url, fileMarkboxes);
  markboxes.splice(0);

  if (fileMarkboxes.length === 0) return;
  fileMarkboxes.forEach((item) => markboxes.push(item));
}

async function initAnnotator(
  container: Element,
  url: string,
  markboxes: Markbox[]
): Promise<void> {
  loading.value = true;

  annotator.initImageSetting(container, url);
  annotator.initCanvas(stage.value);
  if (markboxes.length >= 1) annotator.innerToolBox.updateMarkbox(markboxes[0]);

  loading.value = false;
}

/////////

function getLastestMarkbox(): Markbox | undefined {
  return markboxes.at(-1);
}

function getMarkboxById(id: string): Markbox | undefined {
  return markboxes.find((item) => item.id === id);
}

function adjustMarkbox(node: Node, markbox: Markbox) {
  const { x: nodeX, y: nodeY, width: shapeWidth, height: shapeHeight } = node.attrs;
  if (shapeWidth < 0) {
    const newX = nodeX + shapeWidth;
    const newWidth = Math.abs(shapeWidth);
    node.setAttrs({ x: newX, width: newWidth });
    markbox.x = newX;
    markbox.width = newWidth;
  }

  if (shapeHeight < 0) {
    const newY = nodeY + shapeHeight;
    const newHeight = Math.abs(shapeHeight);
    node.setAttrs({ y: newY, height: newHeight });
    markbox.y = newY;
    markbox.height = newHeight;
  }
}

function removeMarkbox(id: string) {
  const rect = annotator.stage.findOne(`#${id}`);
  if (!rect) return;
  const parent = rect.findAncestor("Group") as Container;
  parent.destroy();
  annotator.transformer.nodes([]);

  annotator.innerToolBox.hidden();
  const targetIndex = markboxes.findIndex((item) => item.id === id);
  if (targetIndex === -1) return;
  markboxes.splice(targetIndex, 1);
  if (markboxes.length === 0) return;
  annotator.innerToolBox.updateMarkbox(markboxes.at(-1)!);
}

///////// creat markbox

function createMarkbox(): void {
  if (annotator.mode !== "add") return;
  const { x, y } = annotator.layer.getRelativePointerPosition();
  const markbox: Markbox = new Markbox();
  markbox.x = x > 0 ? x : 0;
  markbox.y = y > 0 ? y : 0;
  markbox.labelName = props.currentLabel.name;

  markboxes.push(markbox);
  annotator.innerToolBox.updateMarkbox(markbox);
  annotator.isAnnotating = true;
}

function editMarkboxVolume(): void {
  if (annotator.mode !== "add") return;
  if (!annotator.isAnnotating) return;
  const { x: newX, y: newY } = annotator.layer.getRelativePointerPosition();
  const markbox = getLastestMarkbox();
  if (!markbox) return;
  const { x: oldX, y: oldY } = markbox;
  markbox.width = newX - oldX;
  markbox.height = newY - oldY;
}

function stopEditMarkboxVolume(event: KonvaPointerEvent): void {
  if (annotator.mode !== "add") return;

  annotator.isAnnotating = false;
  const markbox = getLastestMarkbox();
  if (!markbox) return;

  if (markbox.height === 0 || markbox.width === 0) {
    removeMarkbox(markbox.id);
    return;
  }

  adjustMarkbox(event.target, markbox);

  if (annotator.transformer.nodes().length == 0)
    annotator.innerToolBox.updateMarkbox(markbox);

  annotator.innerToolBox.show(event.evt);
  emits("saveMarkbox", props.file.name, markboxes);
}

function leaveAnnotateRange(): void {
  if (annotator.mode !== "add") return;
  if (!annotator.isAnnotating) return;
  annotator.isAnnotating = false;

  const markbox = getLastestMarkbox();
  if (!markbox) return;

  const mousePos = annotator.stage.getPointerPosition() as Vector2d;
  const stageConfig = annotator.stageConfig;
  if (mousePos.x >= stageConfig.width) markbox.width = stageConfig.width - markbox.x;
  if (mousePos.y >= stageConfig.height) markbox.height = stageConfig.height - markbox.y;

  const markboxNode = annotator.stage.findOne(
    (node: Node) => node.attrs.id === markbox.id && node.getClassName() === "Rect"
  );
  adjustMarkbox(markboxNode, markbox);
}

////// drag markbox
function startDragMarkbox(event: KonvaPointerEvent): void {
  annotator.innerToolBox.hidden();

  const { x, y, id } = event.target.attrs;
  const markbox = getMarkboxById(id);
  if (!markbox) return;
  markbox.x = x;
  markbox.y = y;
}

function stopDragMarkbox(event: KonvaPointerEvent): void {
  const { id, x, y, height, width } = event.target.attrs;
  const { height: stageHeight, width: stageWidth } = annotator.stageConfig;
  const markbox = getMarkboxById(id);
  if (!markbox) return;

  if (markbox.y < 0) {
    markbox.y = 0;
  } else if (y + height > stageHeight) {
    markbox.y = stageHeight - height;
  } else {
    markbox.y = y;
  }

  if (markbox.x < 0) {
    markbox.x = 0;
  } else if (x + width > stageWidth) {
    markbox.x = stageWidth - width;
  } else {
    markbox.x = x;
  }
  annotator.innerToolBox.show(event.evt);
}

function updateTransformerContent(id: string, evt: MouseEvent): void {
  const node = annotator.stage.findOne(`#${id}`);
  if (!node) return;
  annotator.transformer.nodes([node]);
  annotator.innerToolBox.show(evt);
}

function startResizeMarkbox(event: KonvaPointerEvent): void {
  const target = event.target;

  if (target.getClassName() !== "Rect") {
    annotator.transformer.nodes([]);
    annotator.innerToolBox.hidden();
    return;
  }

  const markbox = getMarkboxById(target.attrs.id);
  if (!markbox) return;

  annotator.innerToolBox.updateMarkbox(markbox);

  updateTransformerContent(markbox.id, event.evt);
}

function stopResizeMarkbox(event: KonvaPointerEvent) {
  const target = event.target;
  const { id: eventId, x: eventX, y: eventY, scaleX, scaleY } = target.attrs;

  const markbox = getMarkboxById(eventId);
  if (!markbox) return;

  if (!scaleX || !scaleY) return;

  if (scaleX.toFixed(5) !== "1") markbox.width *= scaleX;
  if (scaleY.toFixed(5) !== "1") markbox.height *= scaleY;

  markbox.x = eventX;
  markbox.y = eventY;

  target.setAttrs({ x: eventX, y: eventY, scaleX: 1, scaleY: 1 });
  annotator.innerToolBox.show(event.evt);
}

// resize layer
function wheelResizeLayer(event: KonvaPointerEvent) {
  // mouse wheel event
  event.evt.preventDefault();

  const altKey = ((event.evt as MouseEvent) as WheelEvent).altKey;
  if (!altKey) return;
  const direction = ((event.evt as MouseEvent) as WheelEvent).deltaY;

  // layer resize
  const oldScale = annotator.layer.scaleX();
  const scaleBy = 1.5;
  const newScale = direction > 0 ? oldScale / scaleBy : oldScale * scaleBy;
  annotator.layer.scale({ x: newScale, y: newScale });

  // layer position
  const pointerPosition = annotator.stage.getPointerPosition() as Vector2d;

  const mousePointTo = {
    x: (pointerPosition.x - annotator.layer.x()) / oldScale,
    y: (pointerPosition.y - annotator.layer.y()) / oldScale,
  };
  const newPos = {
    x: pointerPosition.x - mousePointTo.x * newScale,
    y: pointerPosition.y - mousePointTo.y * newScale,
  };
  annotator.layer.position(newPos);
}

function dragLayer() {
  annotator.innerToolBox.hidden();
}

function resetLayerPosition() {
  annotator.layer.setAttrs({ scaleX: 1, scaleY: 1, x: 0, y: 0 });
  annotator.innerToolBox.hidden();
}

// annotator box

function enterAnnotatorBox() {
  if (!annotatorBox.value) return;
  annotatorBox.value.focus();
}

function leaveAnnotatorBox() {
  document.body.style.cursor = "auto";
  annotator.innerToolBox.hidden();
}

function handleKeyDownEvent(event: KeyboardEvent) {
  const labelHotKey = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  let hotkeyNum = 0;

  switch (event.key.toUpperCase()) {
    case "A":
      changeFile("prev");
      break;
    case "D":
      changeFile("next");
      break;
    case "W":
      annotator.changeAnnotateMode("add");
      break;
    case "E":
      annotator.changeAnnotateMode("drag");
      break;
    case "S":
      pickMarkboxById(annotator.innerToolBox.getMarkboxId());
      break;
    case "Z":
      resetLayerPosition();
      break;
    case "X":
      toggleAnnotationTextVisible();
      break;
    case "DELETE":
      if (markboxes.length === 0) return;
      if (annotator.innerToolBox.getMarkboxId() === "") return;
      removeMarkbox(annotator.innerToolBox.getMarkboxId());
      break;
    default:
      if (!labelHotKey.includes(event.key)) return;
      hotkeyNum = Number(event.key) != 0 ? Number(event.key) - 1 : 9;
      if (props.labels[hotkeyNum] === undefined) return;
  }
}

function pickMarkboxById(id: string) {
  const markbox = getMarkboxById(id);
  if (!markbox) return;

  const node = annotator.stage.findOne(`#${markbox.id}`);
  annotator.transformer.nodes([node]);
}

function toggleAnnotationTextVisible() {
  const textLabels = annotator.layer.find("Text");
  if (textLabels.length === 0) return;

  textLabels.forEach((item) => {
    const visibleStatus = item.getAttrs().visible;
    item.setAttrs({ visible: !visibleStatus });
  });
}

async function toggleMarkboxVisible(id: string) {
  const groups = annotator.layer.find(
    (node: Group) => node.getType() === "Group" && node.attrs.name === id
  );
  if (groups.length === 0) return;
  if (groups[0].attrs.visible) {
    groups[0].setAttrs({ visible: false });
    annotator.transformer.nodes([]);
  } else {
    groups[0].setAttrs({ visible: true });
  }
}

function markboxVisible(id: string): boolean {
  const groups = annotator.layer.find(
    (node: Group) => node.getType() === "Group" && node.attrs.name === id
  );
  if (groups.length === 0) return true;
  return groups[0].attrs.visible;
}

function toggleMarkboxDraggable(id: string) {
  const rects = annotator.layer.find(
    (node: Node) => node.getClassName() === "Rect" && node.attrs.id === id
  );
  if (rects.length === 0) return;
  rects[0].attrs.draggable
    ? rects[0].setAttrs({ draggable: false })
    : rects[0].setAttrs({ draggable: true });
}

function markboxDraggable(id: string): boolean {
  const rects = annotator.layer.find(
    (node: Node) => node.getClassName() === "Rect" && node.attrs.id === id
  );
  if (rects.length === 0) return true;
  return rects[0].attrs.draggable;
}

function changeAnnotationLabel(value: any) {
  if (typeof value !== "string") return;

  const markbox = getMarkboxById(annotator.innerToolBox.getMarkboxId());
  if (!markbox) return;

  const labelName = props.labels.find((item) => item.name === value);
  if (!labelName) return;

  markbox.labelName = labelName.name;
}

function changeFile(action: string): void {
  emits("changeFile", props.file.name, action);
}
</script>
