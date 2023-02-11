<template>
  <div class="w-full h-full flex flex-col justify-between">
    <div
      class="w-full h-full m-auto relative focus:outline-none"
      tabindex="1"
      ref="annotatorBox"
      @mouseover="enterAnnotatorBox"
      @mouseleave="leaveAnnotatorBox"
      @keydown.exact="handleKeyDownEvent"
      v-loading="loading"
      element-loading-text="Loading image..."
    >
      <!-- <div class="inner-tool-box" :style="annotator.innerToolBox.boxStyle">
                    <select :value="currentLabel.name" @change="changeAnnotationLabel()">
                        <option v-for="item in labels" :key="item.name" :label="item.name" :value="item.name" />
                    </select>
                    <el-button type="danger" :icon="Delete"
                        @click="removeMarkbox(annotator.innerToolBox.getCoordinateId())" circle></el-button>
                </div> -->
      <v-stage
        ref="stage"
        :config="annotator.stageConfig"
        @mousedown="addTransformerContent"
      >
        <v-layer
          :config="annotator.layerConfig"
          @mouseleave="leaveAnnotateRange"
          @wheel="wheelResizeLayer"
          @dragmove="dragMoveLayer"
        >
          <v-image
            :config="annotator.imageConfig"
            @mousedown="createMarkbox"
            @mousemove="resizeNewMarkbox"
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
              @mouseup="stopResizeNewMarkbox"
              @dragmove="dragMoveAnnotation"
              @dragend="dragEndAnnotation"
              @transformend="endTransformOnAnnotation"
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
    <!-- <div class="list-box">
            <div class="title">
                <div>No.</div>
                <div>類別</div>
                <div>X 座標</div>
                <div>Y 座標</div>
                <div>寬</div>
                <div>高</div>
                <div>操作</div>
            </div>
            <div class="content" v-if="file">
                <template v-if="file.coordinates.length === 0 && loading">
                    <div style="margin: auto">empty data</div>
                </template>
                <template v-else>
                    <div class="content-wrapper" v-for="(item, index) in coordinates" :key="item.id">
                        <div>{{ index + 1 }}</div>
                        <div>{{ item.labelName }}</div>
                        <div>{{ getInt(item.x / annotator.imageScale) }}</div>
                        <div>{{ getInt(item.y / annotator.imageScale) }}</div>
                        <div>{{ getInt(item.width / annotator.imageScale) }}</div>
                        <div>{{ getInt(item.height / annotator.imageScale) }}</div>
                        <div class="operate-box">
                            <template v-if="checkAnnotationVisibleById(item.id)">
                                <el-icon @click="handleAnnotationVisibleById(item.id, false)">
                                    <View />
                                </el-icon>
                            </template>
                            <template v-else>
                                <el-icon @click="handleAnnotationVisibleById(item.id, true)">
                                    <Hide />
                                </el-icon>
                            </template>
                            <template v-if="checkAnnotationDraggableById(item.id)">
                                <el-icon @click="setAnnotationDraggableById(item.id, false)">
                                    <Unlock />
                                </el-icon>
                            </template>
                            <template v-else>
                                <el-icon @click="setAnnotationDraggableById(item.id, true)">
                                    <Lock />
                                </el-icon>
                            </template>
                            <el-icon @click="pickAnnotationById(item.id)">
                                <Edit />
                            </el-icon>
                            <el-icon @click="removeMarkbox(item.id)">
                                <Delete />
                            </el-icon>
                        </div>
                    </div>
                </template>
            </div>
        </div> -->
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import type { Ref } from "vue";
import type { KonvaPointerEvent } from "konva/lib/PointerEvents";
import type { Vector2d } from "konva/lib/types";
import type { Node } from "konva/lib/Node";
import type { Container } from "konva/lib/Container";
import type { Shape } from "konva/lib/Shape";
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
  (e: "saveMarkbox"): void;
  (e: "changeFile"): void;
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
  if (markboxes.length >= 1)
    annotator.innerToolBox.updateMarkbox(markboxes[0]);

  loading.value = false;
}

/////////
function getInt(val: number): number {
  if (isNaN(val)) return 0;
  return Number(val.toFixed(3));
}

function getLastestMarkbox(): Markbox | undefined {
  return markboxes.at(-1);
}

function getMarkboxById(id: string): Markbox | undefined {
  return markboxes.find((item) => item.id === id);
}

function adjustMarkbox(shape: Shape, markbox: Markbox) {
  const {
    x: shapeX,
    y: shapeY,
    width: shapeWidth,
    height: shapeHeight,
  } = shape.attrs;
  if (shapeWidth < 0) {
    const newX = shapeX + shapeWidth;
    const newWidth = Math.abs(shapeWidth);
    shape.setAttrs({ x: newX, width: newWidth });
    markbox.x = newX;
    markbox.width = newWidth;
  }

  if (shapeHeight < 0) {
    const newY = shapeY + shapeHeight;
    const newHeight = Math.abs(shapeHeight);
    shape.setAttrs({ y: newY, height: newHeight });
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

  const targetIndex = markboxes.findIndex((item) => item.id === id);
  if (targetIndex === -1) return;
  markboxes.splice(targetIndex, 1);
  if (markboxes.length === 0) return;
  annotator.innerToolBox.updateMarkbox(markboxes.at(-1)!);
  annotator.innerToolBox.hidden();
}

/////////

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

function resizeNewMarkbox(): void {
  if (annotator.mode !== "add") return;
  if (!annotator.isAnnotating) return;
  const { x: newX, y: newY } = annotator.layer.getRelativePointerPosition();
  const markbox = getLastestMarkbox();
  if (!markbox) return;
  const { x: oldX, y: oldY } = markbox;
  markbox.width = newX - oldX;
  markbox.height = newY - oldY;
}

function stopResizeNewMarkbox(event: KonvaPointerEvent) {
  if (annotator.mode !== "add") return;

  annotator.isAnnotating = false;
  const markbox = getLastestMarkbox();
  if (!markbox) return;

  if (markbox.height === 0 || markbox.width === 0) {
    removeMarkbox(markbox.id);
    return;
  }

  adjustMarkbox(event.target as Shape, markbox);

  if (annotator.transformer.nodes().length == 0)
    annotator.innerToolBox.updateMarkbox(markbox);

  annotator.innerToolBox.show(event.evt);
}

function leaveAnnotateRange() {
  if (annotator.mode !== "add") return;
  if (!annotator.isAnnotating) return;
  annotator.isAnnotating = false;

  const markbox = getLastestMarkbox();
  if (!markbox) return;

  const mousePos = annotator.stage.getPointerPosition() as Vector2d;
  const stageConfig = annotator.stageConfig;
  if (mousePos.x >= stageConfig.width)
    markbox.width = stageConfig.width - markbox.x;
  if (mousePos.y >= stageConfig.height)
    markbox.height = stageConfig.height - markbox.y;

  const target = annotator.stage.findOne(
    (node: Node) =>
      node.attrs.id === markbox.id && node.getClassName() === "Rect"
  ) as Shape;
  adjustMarkbox(target, markbox);
}

function dragMoveAnnotation(event: KonvaPointerEvent) {
  annotator.innerToolBox.hidden();

  const { x, y, id } = event.target.attrs;
  const markbox = getMarkboxById(id);
  if (!markbox) return;
  markbox.x = x;
  markbox.y = y;
}

function dragEndAnnotation(event: KonvaPointerEvent) {
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

function updateTransformerContent(id: string, evt: MouseEvent) {
  const selectedNode = annotator.stage.findOne(`#${id}`);

  if (id === "" && annotator.transformer.nodes().length !== 0) return;
  annotator.transformer.nodes([selectedNode]);
  annotator.innerToolBox.show(evt);
}

function addTransformerContent(event: KonvaPointerEvent) {
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
  annotator.isAnnotating = false;
}

function endTransformOnAnnotation(event: KonvaPointerEvent) {
  annotator.isAnnotating = false;

  const target = event.target;
  const { id: eventId, x: eventX, y: eventY, scaleX, scaleY } = target.attrs;

  const markbox = getMarkboxById(eventId);
  if (!markbox) return;

  if (!scaleX || !scaleY) return;

  if (scaleX.toFixed(5) !== "1") markbox.width *= scaleX;
  if (scaleY.toFixed(5) !== "1") markbox.height *= scaleY;

  markbox.x = eventX;
  markbox.y = eventY;

  // target.position({x:eventX,y:eventY})
  target.setAttrs({ x: eventX, y: eventY, scaleX: 1, scaleY: 1 });
  annotator.innerToolBox.show(event.evt);
}

function wheelResizeLayer(event: KonvaPointerEvent) {
  // mouse wheel event
  event.evt.preventDefault();

  const altKey = (event.evt as MouseEvent as WheelEvent).altKey;
  if (!altKey) return;
  const direction = (event.evt as MouseEvent as WheelEvent).deltaY;

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

function dragMoveLayer() {
  annotator.innerToolBox.hidden();
}

function resetLayerPosition() {
  annotator.layer.setAttrs({ scaleX: 1, scaleY: 1, x: 0, y: 0 });
  annotator.innerToolBox.hidden();
}

function enterAnnotatorBox() {
  if (!annotatorBox.value) return;
  annotatorBox.value.focus();
}

function leaveAnnotatorBox() {
  document.body.style.cursor = "auto";
  annotator.innerToolBox.hidden();
}

function handleKeyDownEvent(event: KeyboardEvent) {
  let getLastItem: Markbox[] = [];
  let labelCollation = [];
  const labelHotKey = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  let hotkeyNum = 0;

  switch (event.key.toUpperCase()) {
    case "A":
      // handleSwitchImage("pre");
      break;
    case "D":
      // handleSwitchImage("next");
      break;
    case "W":
      annotator.changeAnnotateMode("add");
      break;
    case "E":
      annotator.changeAnnotateMode("drag");
      break;
    case "S":
      pickAnnotationById(annotator.innerToolBox.getMarkboxId());
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
    // changeCurrentLabelByName(labels[hotkeyNum].name);
  }
}

function pickAnnotationById(id: string) {
  const markbox = getMarkboxById(id);
  if (!markbox) return;

  const targetNode = annotator.stage.findOne(`#${markbox.id}`);
  annotator.transformer.nodes([targetNode]);
}

function toggleAnnotationTextVisible() {
  const textLabels = annotator.layer.find("Text");
  if (textLabels.length === 0) return;

  textLabels.forEach((item) => {
    const visibleStatus = item.getAttrs().visible;
    item.setAttrs({ visible: !visibleStatus });
  });
}

async function handleAnnotationVisibleById(id: string, action: boolean) {
  const groups = annotator.layer.find(
    (node: Group) => node.getType() === "Group" && node.attrs.name === id
  );
  if (groups.length === 0) return;
  action
    ? groups[0].setAttrs({ visible: true })
    : groups[0].setAttrs({ visible: false });
  if (groups[0].attrs.visible === false) annotator.transformer.nodes([]);
}

function checkAnnotationVisibleById(id: string): boolean {
  const groups = annotator.layer.find(
    (node: Group) => node.getType() === "Group" && node.attrs.name === id
  );
  if (groups.length === 0) return true;
  return groups[0].attrs.visible;
}

function setAnnotationDraggableById(id: string, action: boolean) {
  const rects = annotator.layer.find(
    (node: Node) => node.getClassName() === "Rect" && node.attrs.id === id
  );
  if (rects.length === 0) return;
  action
    ? rects[0].setAttrs({ draggable: true })
    : rects[0].setAttrs({ draggable: false });
}

function checkAnnotationDraggableById(id: string): boolean {
  const rects = annotator.layer.find(
    (node: Node) => node.getClassName() === "Rect" && node.attrs.id === id
  );
  if (rects.length === 0) return true;
  return rects[0].attrs.draggable;
}

function changeAnnotationLabel(selectedItem: string) {
  if (!selectedItem) return;
  const markbox = getMarkboxById(annotator.innerToolBox.getMarkboxId());
  if (!markbox) return;

  const labelName = props.labels.find((item) => item.name === selectedItem);
  if (!labelName) return;

  markbox.labelName = labelName.name;
}
</script>
