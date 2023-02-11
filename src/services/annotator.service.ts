import { Layer } from "konva/lib/Layer";
import { Transformer } from "konva/lib/shapes/Transformer";
import { Stage } from "konva/lib/Stage";

class ImageInfo {
  element!: HTMLImageElement;
  width = 0;
  height = 0;
}

class Markbox {
  id = Date.now().toString();
  labelName = "";
  x = 0;
  y = 0;
  width = 0;
  height = 0;
}

class innerToolBox {
  public boxStyle = "display:none;";
  private markbox = new Markbox();

  public getMarkboxId(): string {
    return this.markbox.id;
  }

  public updateMarkbox(markbox: Markbox): void {
    this.markbox = markbox
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
  // state
  mode = "";
  isAnnotating = false;

  innerToolBox = new innerToolBox();
  // Konva settings
  imageScale = 1;

  stage: Stage = new Stage({ container: document.createElement("div") });
  stageConfig = { id: "stage", width: 1, height: 1 };

  layer: Layer = new Layer();
  layerConfig = { id: "layer", draggable: true };

  imageConfig = {
    image: new Image(),
    scaleX: this.imageScale,
    scaleY: this.imageScale,
  };

  transformer: Transformer = new Transformer();
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

  public async initImageSetting(
    container: Element,
    url: string
  ): Promise<void> {
    const { element, width, height }: ImageInfo = await getImageData(url);
    const imageMinLength = width < height ? width : height;
    const containerMaxLength =
      container.clientWidth < container.clientHeight
        ? container.clientWidth
        : container.clientHeight;
    this.imageScale = containerMaxLength / imageMinLength;
    this.stageConfig.width = width * this.imageScale;
    this.stageConfig.height = height * this.imageScale;
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
    this.transformer.nodes([]);
    this.innerToolBox.hidden();
    this.changeAnnotateMode("add");
  }

  public changeAnnotateMode(mode: string): void {
    switch (mode) {
      case "drag":
        this.layer.setAttrs({ draggable: true });
        document.body.style.cursor = "grab";
        this.mode = "drag";
        break;
      case "add":
        this.layer.setAttrs({ draggable: false });
        document.body.style.cursor = "crosshair";
        this.mode = "add";
        break;
      default:
        console.log("out of case");
    }
  }
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
function getFixedColorHEXCode(index: number): string {
  const color: string[] = [
    "#1B5FA3",
    "#ee9ca7",
    "#2193b0",
    "#f7797d",
    "#203A43",
  ];
  return color[index % color.length];
}

class Label {
  name = "example";
  color = "#fff";
}

function getLabelColor(name: string, labels: Label[]): string {
  const label = labels.find((item) => item.name === name);
  return label ? label.color : new Label().color;
}

class FileInfo {
  name = "";
  url = "";
  markboxes: Markbox[] = [];
}

class ToolData {
  labelNames: string[] = [];
  files: FileInfo[] = [];
}

export {
  Markbox,
  Annotator,
  getFixedColorHEXCode,
  Label,
  getLabelColor,
  FileInfo,
  ToolData,
};
