import { Layer } from "konva/lib/Layer";
import { Transformer } from "konva/lib/shapes/Transformer";
import { Stage } from "konva/lib/Stage";

class ImageInfo {
  element!: HTMLImageElement;
  width = 0;
  height = 0;
}

class Coordinate {
  id = Date.now().toString();
  className = "";
  x = 0;
  y = 0;
  width = 0;
  height = 0;
}

class AnnotationItem {
  annotations: Coordinate[] = [];
}

class innerToolBox {
  public boxStyle = "display:none;";
  private _keepItem = new Coordinate();

  get keepItem(): Coordinate {
    return this._keepItem;
  }
  set keepItem(item: Coordinate) {
    this._keepItem = item;
  }

  public show(mouseEvent: MouseEvent): void {
    const offsetFormX = mouseEvent.offsetX;
    const offsetFromY = mouseEvent.offsetY;
    this.boxStyle = `left:${offsetFormX}px;top:${offsetFromY}px;`;
  }
  public hidden(): void {
    this.boxStyle = "display:none;";
  }
}

class Annotator {
  annotationMode = "";
  isAnnotating = false;
  innerToolBox = new innerToolBox();

  imageInfo: ImageInfo;
  imageScale: number;

  stage: Stage = new Stage({ container: document.createElement("div") });
  stageConfig: { id: string; width: number; height: number };

  layer: Layer = new Layer();
  transformer: Transformer = new Transformer();

  imageConfig: { image: HTMLImageElement; scaleX: number; scaleY: number };
  layerConfig = {
    id: "layer",
    draggable: true,
  };
  transformerConfig = {
    id: "transformer",
    rotateEnabled: false,
    enabledAnchors: [
      "top-left",
      "top-center",
      "top-right",
      "bottom-center",
      "bottom-left",
      "bottom-right",
      "middle-right",
      "middle-left",
    ],
    ignoreStroke: true,
  };

  constructor(content?: ImageInfo, container?: Element) {
    this.imageInfo = content ?? new ImageInfo();
    const { element, width, height } = this.imageInfo;
    const imageMinLength = width < height ? width : height;
    const containerMaxLength = container
      ? container.clientWidth < container.clientHeight
        ? container.clientWidth
        : container.clientHeight
      : 0;
    this.imageScale = container ? containerMaxLength / imageMinLength : 1;
    this.stageConfig = {
      id: "stage",
      width: width * this.imageScale,
      height: height * this.imageScale,
    };
    this.imageConfig = {
      image: element,
      scaleX: this.imageScale,
      scaleY: this.imageScale,
    };
  }

  public initCanvas(stageRef: any): void {
    this.stage = stageRef.getNode();
    this.layer = this.stage.findOne("Layer");
    this.transformer = this.stage.findOne("#transformer");
    this.changeAnnotateMode("add");
  }

  public changeAnnotateMode(mode: string): void {
    switch (mode) {
      case "drag":
        this.layer.setAttrs({ draggable: true });
        document.body.style.cursor = "grab";
        this.annotationMode = "drag";
        break;
      case "add":
        this.layer.setAttrs({ draggable: false });
        document.body.style.cursor = "crosshair";
        this.annotationMode = "add";
        break;
      default:
        console.log("out of case");
    }
  }
}

function getFixedColorHEXCode(index: number): string {
  const color: string[] = [
    "#1B5FA3",
    "#ee9ca7",
    "#2193b0",
    "#f7797d",
    "#203A43",
    "#c471ed",
    "#CC8BA2",
    "#1565C0",
    "#AD4E4C",
    "#64A86F",
    "#7F7FD5",
    "#f5af19",
    "#f12711",
    "#f4791f",
    "#4D8E8E",
    "#DEF2F5",
    "#DEF2F5",
    "#4e54c8",
    "#2c3e50",
    "#F37335",
    "#a8ff78",
    "#FF4B2B",
    "#60BC37",
    "#189CEB",
    "#544a7d",
    "#ffd452",
    "#1BAA7D",
    "#8360c3",
    "#dd3e54",
    "#6be585",
  ];
  return color[index % color.length];
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.src = url;
    image.onload = () => resolve(image);
    image.onerror = () => reject("image loading error");
  });
}

async function getImageData(url: string): Promise<ImageInfo> {
  const image = await loadImage(url);
  return {
    element: image,
    height: image.height,
    width: image.width,
  };
}

export {
  ImageInfo,
  Coordinate,
  AnnotationItem,
  Annotator,
  getFixedColorHEXCode,
  getImageData,
};
