<template>
    <div class="detectionion-container">
        <div class="frame-box">
            <div class="image-switch-box">
                <div class="inner-box" @click="handleSwitchImage('pre')">
                    <el-icon>
                        <ArrowLeft />
                    </el-icon>
                    <div>上一張(按鍵A)</div>
                </div>
                <div class="inner-box">
                    <div v-if="currentFile">{{ currentFile.fileName }}</div>
                </div>
                <div class="inner-box" @click="handleSwitchImage('next')">
                    <div>下一張(按鍵D)</div>
                    <el-icon>
                        <ArrowRight />
                    </el-icon>
                </div>
            </div>
            <div class="annotator-box" tabindex="1" ref="annotatorBox" @mouseover="enterAnnotatorBox"
                @mouseleave="leaveAnnotatorBox" @keydown.exact="handleKeyDownEvent" v-loading="loading"
                element-loading-text="Loading image...">
                <div class="inner-tool-box" :style="annotator.innerToolBox.boxStyle">
                    <select :value="currentLabel.name" @change="changeAnnotationLabel($event.target.value)">
                        <option v-for="item in labels" :key="item.name" :label="item.name" :value="item.name" />
                    </select>
                    <el-button type="danger" :icon="Delete"
                        @click="removeAnnotation(annotator.innerToolBox.keepItem.id)" circle></el-button>
                </div>
                <v-stage ref="stage" :config="annotator.stageConfig" @mousedown="addTransformerContent">
                    <v-layer :config="annotator.layerConfig" @mouseleave="leaveAddAnnotation" @wheel="wheelResizeLayer"
                        @dragmove="dragMoveLayer">
                        <v-image :config="annotator.imageConfig" @mousedown="addAnnotation"
                            @mousemove="handleNewAnnotaionSize" />
                        <v-group v-for="item in annotationItem.annotations" :key="item.id"
                            :config="{ name: item.id, visible: true }">
                            <v-rect :config="{
                                id: item.id,
                                x: item.x,
                                y: item.y,
                                width: item.width,
                                height: item.height,
                                stroke: `${getLabelColor(item.className)}`,
                                draggable: true,
                            }" @mouseup="finsihOnAddAnnotation" @dragmove="dragMoveAnnotation"
                                @dragend="dragEndAnnotation" @transformend="endTransformOnAnnotation" />
                            <v-text :config="{
                                id: item.id,
                                text: item.className,
                                x: item.x,
                                y: item.y - 20 / annotator.layer.scaleX(),
                                fill: '#fbfbfa',
                                fontSize: 20 / annotator.layer.scaleX(),
                                visible: true,
                            }" />
                        </v-group>
                        <v-transformer :config="annotator.transformerConfig" />
                    </v-layer>
                </v-stage>
            </div>
        </div>
        <div class="list-box">
            <div class="title">
                <div>No.</div>
                <div>類別</div>
                <div>X 座標</div>
                <div>Y 座標</div>
                <div>寬</div>
                <div>高</div>
                <div>操作</div>
            </div>
            <div class="content" v-if="currentFile">
                <template v-if="currentFile.annotations.length === 0 && loading">
                    <div style="margin: auto">empty data</div>
                </template>
                <template v-else>
                    <div class="content-wrapper" v-for="(item, index) in annotationItem.annotations" :key="item.id">
                        <div>{{ index + 1 }}</div>
                        <div>{{ item.className }}</div>
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
                            <el-icon @click="removeAnnotation(item.id)">
                                <Delete />
                            </el-icon>
                        </div>
                    </div>
                </template>
            </div>
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
import type { Shape } from "konva/lib/Shape";
import type { Group } from "konva/lib/Group";
import { Delete } from "@element-plus/icons-vue";


import { ImageInfo, Coordinate, AnnotationItem, Annotator, getImageData } from "@/services/annotator.service";


const {
    labels,
    currentLabel,
    fileList,
    currentFile,
    getLabelColor,
    changeCurrentLabelByName,
    changeCurrentFileByName,
} = useLabelToolStore();

const annotatorBox: Ref<HTMLDivElement | null> = ref(null);
const stage = ref(null);
const loading = ref(false);

const annotator = ref(new Annotator);
const annotationItem: AnnotationItem = reactive(new AnnotationItem());
const isMounted = ref(false);

function getInt(val: number): number {
    if (isNaN(val)) return 0;
    return Number(val.toFixed(3));
}

async function initAnnotator(container: Element, url: string, annotations: Coordinate[]): Promise<void> {
    loading.value = true;
    const content: ImageInfo = await getImageData(url);

    annotator.value = new Annotator(content, container);
    annotator.value.initCanvas(stage.value);
    annotator.value.transformer.nodes([]);
    annotator.value.innerToolBox.hidden();

    if (annotations.length >= 1) annotator.value.innerToolBox.keepItem = annotations[0];

    loading.value = false;
}



onMounted(async () => {
    isMounted.value = true;
    await init();
});

const currentUrl = computed(() => {
    return currentFile.url;
});

watch(currentUrl, async () => {
    await init();
});

async function init(): Promise<void> {
    if (!isMounted.value) return;
    const url = currentFile.url;
    if (url === "") return;
    const annotations = currentFile.annotations;
    await initAnnotator(annotatorBox.value, url, annotations);
    const imageScale = annotator.value.imageScale;
    annotationItem.annotations.splice(0);
    if (annotations.length === 0) return;
    annotations.forEach((item) => {
        const coordinate = annotationToCoordinate(item, imageScale);
        if (!coordinate) return;
        annotationItem.annotations.push(coordinate);
    });
}

function saveAnnotationsToFileList(): void {
    const fileIndex = fileList.findIndex((item) => item.fileName === currentFile.fileName);
    if (fileIndex === -1) return;
    fileList[fileIndex].annotations.splice(0);
    annotationItem.annotations.forEach((item) => {
        const annotation = coordinateToAnnotation(item, annotator.value.imageScale);
        if (!annotation) return;
        fileList[fileIndex].annotations.push(annotation);
    });
}

async function handleSwitchImage(action: string): Promise<void> {
    const fileIndex = fileList.findIndex((item) => item.fileName === currentFile.fileName);
    if (fileIndex === -1) return;
    if (fileIndex === 0 && action === "pre") return;
    const max = fileList.length - 1;
    if (fileIndex === max && action === "next") return;

    saveAnnotationsToFileList();

    const changeIndex = action === "pre" ? fileIndex - 1 : fileIndex + 1;
    const file = fileList[changeIndex];
    changeCurrentFileByName(file.fileName);
}

function getLastOneFromAnnotaionItem(): Coordinate | undefined {
    return annotationItem.annotations.at(-1);
}

function getAnnotationById(id: string): Coordinate | undefined {
    return annotationItem.annotations.find((item) => item.id === id);
}

function addAnnotation() {
    if (annotator.value.annotationMode !== "add") return;
    const { x, y } = annotator.value.layer.getRelativePointerPosition();

    const annotation: Coordinate = new Coordinate();
    annotation.x = x > 0 ? x : 0;
    annotation.y = y > 0 ? y : 0;
    annotation.className = currentLabel.name;

    if (annotationItem.annotations.length === 0) {
        annotator.value.innerToolBox.keepItem = annotation;
    }

    annotationItem.annotations.push(annotation);
    annotator.value.isAnnotating = true;
}

function handleNewAnnotaionSize() {
    if (annotator.value.annotationMode !== "add") return;
    if (!annotator.value.isAnnotating) return;
    const { x, y } = annotator.value.layer.getRelativePointerPosition();
    const annotation = getLastOneFromAnnotaionItem();
    if (!annotation) return;

    const oldX = annotation.x;
    const oldY = annotation.y;
    const xDiff = x - oldX;
    const yDiff = y - oldY;
    annotation.width = xDiff;
    annotation.height = yDiff;
}

function finsihOnAddAnnotation(event: KonvaPointerEvent) {
    if (annotator.value.annotationMode !== "add") return;

    annotator.value.isAnnotating = false;
    const annotation = getLastOneFromAnnotaionItem();
    if (!annotation) return;

    if (annotation.height === 0 || annotation.width === 0) {
        removeAnnotation(annotation.id);
        return;
    }

    adjustAnnotation(event.target as Shape, annotation);

    if (annotator.value.transformer.nodes().length == 0) annotator.value.innerToolBox.keepItem = annotation;

    annotator.value.innerToolBox.show(event.evt);
}

function removeAnnotation(id: string) {
    const rect = annotator.value.stage.findOne(`#${id}`);
    if (!rect) return;
    const parent = rect.findAncestor("Group") as Container;
    parent.destroy();
    annotator.value.transformer.nodes([]);

    const targetIndex = annotationItem.annotations.findIndex((item) => item.id === id);

    annotationItem.annotations.splice(targetIndex, 1);
    // annotator.value.innerToolBox.keepItem = annotationItem.annotations.at(-1);
    annotator.value.innerToolBox.hidden();
    saveAnnotationsToFileList();
}

function adjustAnnotation(target: Shape, annotation: Coordinate) {
    const { x: eventX, y: eventY, width: eventWidth, height: eventHeight } = target.attrs;
    if (eventWidth < 0) {
        const newX = eventX + eventWidth;
        const newWidth = Math.abs(eventWidth);
        target.setAttrs({ x: newX, width: newWidth });
        annotation.x = newX;
        annotation.width = newWidth;
    }

    if (eventHeight < 0) {
        const newY = eventY + eventHeight;
        const newHeight = Math.abs(eventHeight);
        target.setAttrs({ y: newY, height: newHeight });
        annotation.y = newY;
        annotation.height = newHeight;
    }
}

function leaveAddAnnotation() {
    saveAnnotationsToFileList();
    if (annotator.value.annotationMode !== "add") return;
    if (!annotator.value.isAnnotating) return;
    annotator.value.isAnnotating = false;

    const annotation = getLastOneFromAnnotaionItem();
    if (!annotation) return;

    const mousePos = annotator.value.stage.getPointerPosition() as Vector2d;
    const stageConfig = annotator.value.stageConfig;
    if (mousePos.x >= stageConfig.width) annotation.width = stageConfig.width - annotation.x;
    if (mousePos.y >= stageConfig.height) annotation.height = stageConfig.height - annotation.y;

    const target = annotator.value.stage.findOne(
        (node: Node) => node.attrs.id === annotation.id && node.getClassName() === "Rect"
    ) as Shape;
    adjustAnnotation(target, annotation);
}

function dragMoveAnnotation(event: KonvaPointerEvent) {
    annotator.value.innerToolBox.hidden();

    const { x, y, id } = event.target.attrs;
    const annotation = getAnnotationById(id);
    if (!annotation) return;
    annotation.x = x;
    annotation.y = y;
}

function dragEndAnnotation(event: KonvaPointerEvent) {
    const { id, x, y, height, width } = event.target.attrs;
    const { height: stageHeight, width: stageWidth } = annotator.value.stageConfig;
    const annotation = getAnnotationById(id);
    if (!annotation) return;

    if (annotation.y < 0) {
        annotation.y = 0;
    } else if (y + height > stageHeight) {
        annotation.y = stageHeight - height;
    } else {
        annotation.y = y;
    }

    if (annotation.x < 0) {
        annotation.x = 0;
    } else if (x + width > stageWidth) {
        annotation.x = stageWidth - width;
    } else {
        annotation.x = x;
    }
    annotator.value.innerToolBox.show(event.evt);
}

function updateTransformerContent(id: string, evt: MouseEvent) {
    const selectedNode = annotator.value.stage.findOne(`#${id}`);

    if (id === "" && annotator.value.transformer.nodes().length !== 0) return;
    annotator.value.transformer.nodes([selectedNode]);
    annotator.value.innerToolBox.show(evt);
}

function addTransformerContent(event: KonvaPointerEvent) {
    const target = event.target;

    if (target.getClassName() !== "Rect") {
        annotator.value.transformer.nodes([]);
        annotator.value.innerToolBox.hidden();
        return;
    }

    const annotation = getAnnotationById(target.attrs.id);
    if (!annotation) return;

    annotator.value.innerToolBox.keepItem = annotation;

    updateTransformerContent(annotation.id, event.evt);
    annotator.value.isAnnotating = false;
}

function endTransformOnAnnotation(event: KonvaPointerEvent) {
    annotator.value.isAnnotating = false;

    const target = event.target;
    const { id: eventId, x: eventX, y: eventY, scaleX, scaleY } = target.attrs;

    const annotation = getAnnotationById(eventId);
    if (!annotation) return;

    if (!scaleX || !scaleY) return;

    if (scaleX.toFixed(5) !== "1") annotation.width *= scaleX;
    if (scaleY.toFixed(5) !== "1") annotation.height *= scaleY;

    annotation.x = eventX;
    annotation.y = eventY;

    // target.position({x:eventX,y:eventY})
    target.setAttrs({ x: eventX, y: eventY, scaleX: 1, scaleY: 1 });
    annotator.value.innerToolBox.show(event.evt);
}

function wheelResizeLayer(event: KonvaPointerEvent) {
    // mouse wheel event
    event.evt.preventDefault();

    const altKey = ((event.evt as MouseEvent) as WheelEvent).altKey;
    if (!altKey) return;
    const direction = ((event.evt as MouseEvent) as WheelEvent).deltaY;

    // layer resize
    const oldScale = annotator.value.layer.scaleX();
    const scaleBy = 1.5;
    const newScale = direction > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    annotator.value.layer.scale({ x: newScale, y: newScale });

    // layer position
    const pointerPosition = annotator.value.stage.getPointerPosition() as Vector2d;

    const mousePointTo = {
        x: (pointerPosition.x - annotator.value.layer.x()) / oldScale,
        y: (pointerPosition.y - annotator.value.layer.y()) / oldScale,
    };
    const newPos = {
        x: pointerPosition.x - mousePointTo.x * newScale,
        y: pointerPosition.y - mousePointTo.y * newScale,
    };
    annotator.value.layer.position(newPos);
}

function dragMoveLayer() {
    annotator.value.innerToolBox.hidden();
}

function resetLayerPosition() {
    annotator.value.layer.setAttrs({ scaleX: 1, scaleY: 1, x: 0, y: 0 });
    annotator.value.innerToolBox.hidden();
}

function enterAnnotatorBox() {
    annotatorBox.value.focus();
}

function leaveAnnotatorBox() {
    document.body.style.cursor = "auto";
    annotator.value.innerToolBox.hidden();
}

function handleKeyDownEvent(event: KeyboardEvent) {
    let getLastItem: Coordinate[] = [];
    let labelCollation = [];
    const labelHotKey = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    let hotkeyNum = 0;

    switch (event.key.toUpperCase()) {
        case "A":
            handleSwitchImage("pre");
            break;
        case "D":
            handleSwitchImage("next");
            break;
        case "W":
            annotator.value.changeAnnotateMode("add");
            break;
        case "E":
            annotator.value.changeAnnotateMode("drag");
            break;
        case "S":
            pickAnnotationById(annotator.value.innerToolBox.keepItem.id);
            break;
        case "Z":
            resetLayerPosition();
            break;
        case "X":
            toggleAnnotationTextVisible();
            break;
        case "DELETE":
            if (annotationItem.length === 0) return;
            if (!annotator.value.innerToolBox.keepItem) return;
            removeAnnotation(annotator.value.innerToolBox.keepItem.id);
            break;
        default:
            if (!labelHotKey.includes(event.key)) return;
            hotkeyNum = Number(event.key) != 0 ? Number(event.key) - 1 : 9;
            if (labels[hotkeyNum] === undefined) return;
            changeCurrentLabelByName(labels[hotkeyNum].name);
    }
}

function pickAnnotationById(id: string) {
    const annotation = getAnnotationById(id);
    if (!annotation) return;

    const targetNode = annotator.value.stage.findOne(`#${annotation.id}`);
    annotator.value.transformer.nodes([targetNode]);
}

function toggleAnnotationTextVisible() {
    const textLabels = annotator.value.layer.find("Text");
    if (textLabels.length === 0) return;

    textLabels.forEach((item) => {
        const visibleStatus = item.getAttrs().visible;
        item.setAttrs({ visible: !visibleStatus });
    });
}

async function handleAnnotationVisibleById(id: string, action: boolean) {
    const groups = annotator.value.layer.find((node: Group) => node.getType() === "Group" && node.attrs.name === id);
    if (groups.length === 0) return;
    action ? groups[0].setAttrs({ visible: true }) : groups[0].setAttrs({ visible: false });
    if (groups[0].attrs.visible === false) annotator.value.transformer.nodes([]);
}

function checkAnnotationVisibleById(id: string): boolean {
    const groups = annotator.value.layer.find((node: Group) => node.getType() === "Group" && node.attrs.name === id);
    if (groups.length === 0) return true;
    return groups[0].attrs.visible;
}

function setAnnotationDraggableById(id: string, action: boolean) {
    const rects = annotator.value.layer.find((node: Node) => node.getClassName() === "Rect" && node.attrs.id === id);
    if (rects.length === 0) return;
    action ? rects[0].setAttrs({ draggable: true }) : rects[0].setAttrs({ draggable: false });
}

function checkAnnotationDraggableById(id: string): boolean {
    const rects = annotator.value.layer.find((node: Node) => node.getClassName() === "Rect" && node.attrs.id === id);
    if (rects.length === 0) return true;
    return rects[0].attrs.draggable;
}

function changeAnnotationLabel(selectedItem: string) {
    const annotation = getAnnotationById(annotator.value.innerToolBox.keepItem.id);
    if (!annotation) return;

    const labelName = labels.find((item) => item.name === selectedItem);
    if (!labelName) return;

    annotation.className = labelName.name;
}
</script>

<style scoped>
.detectionion-container {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.frame-box {
  @extend %custom-box-shadow;
  width: 100%;
  height: 75%;
  display: flex;
  flex-direction: column;
}
.list-box {
  @extend %custom-box-shadow;
  width: 100%;
  height: 22%;
  padding: 1%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  color: $primary-color-2;
  .title {
    height: 20%;
    display: flex;
    div {
      flex: 1;
      text-align: center;
    }
    div + div {
      border-left: 1px solid $grey-color;
    }
  }
  .content {
    height: 90%;
    overflow-y: scroll;
    &-wrapper {
      display: flex;
      div {
        flex: 1;
        text-align: center;
        border-top: 1px solid $grey-color;
      }
      .operate-box {
        display: flex;
        justify-content: space-evenly;
        cursor: pointer;
      }
    }
  }
}