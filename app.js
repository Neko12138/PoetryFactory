"use strict";

/* ============================================================
   POETRY FACTORY
   ------------------------------------------------------------
   本项目仅依赖本地 Phaser:
   ./phaser/engine/phaser.min.js

   无图片资源。
   所有机器、端口、线条均由 Phaser Graphics 绘制。
   ============================================================ */


/* ============================================================
   CONSTANTS
   ============================================================ */

const TYPE = Object.freeze({
    LETTER: "letter",
    WORD: "word",
    SENTENCE: "sentence",
    STANZA: "stanza"
});


const TYPE_COLORS = Object.freeze({
    [TYPE.LETTER]: 0xd94a4a,
    [TYPE.WORD]: 0xd7b63c,
    [TYPE.SENTENCE]: 0x4caf72,
    [TYPE.STANZA]: 0x39b9cf,

    INVALID: 0x111111,
    PORT_BORDER: 0x8a8a8a,
    NODE_FILL: 0x050505,
    NODE_BORDER: 0x6c6c6c,
    NODE_SELECTED: 0xbdbdbd,
    GRID_MINOR: 0x313131,
    GRID_MAJOR: 0x383838
});


const MACHINE_DEFINITIONS = Object.freeze({

    letterSource: {
        title: "LETTER",
        subtitle: "RESOURCE",
        kind: "source",
        inputType: null,
        outputType: TYPE.LETTER
    },

    splitter: {
        title: "LETTER",
        subtitle: "DIFFERENTIAL",
        kind: "splitter",
        inputType: TYPE.LETTER,
        outputType: TYPE.LETTER
    },

    primary: {
        title: "PRIMARY",
        subtitle: "MULTIPLE LETTERS",
        kind: "synth",
        inputType: TYPE.LETTER,
        outputType: TYPE.LETTER
    },

    word: {
        title: "WORD",
        subtitle: "SYNTHESIZER",
        kind: "synth",
        inputType: TYPE.LETTER,
        outputType: TYPE.WORD
    },

    intermediate: {
        title: "INTERMEDIATE",
        subtitle: "MULTIPLE WORDS",
        kind: "synth",
        inputType: TYPE.WORD,
        outputType: TYPE.WORD
    },

    sentence: {
        title: "SENTENCE",
        subtitle: "SYNTHESIZER",
        kind: "synth",
        inputType: TYPE.WORD,
        outputType: TYPE.SENTENCE
    },

    symbolModifier: {
        title: "SYMBOL",
        subtitle: "MODIFIER",
        kind: "modifier",
        inputType: TYPE.SENTENCE,
        outputType: TYPE.SENTENCE
    },

    advanced: {
        title: "ADVANCED",
        subtitle: "MULTIPLE SENTENCES",
        kind: "synth",
        inputType: TYPE.SENTENCE,
        outputType: TYPE.SENTENCE
    },

    stanza: {
        title: "STANZA",
        subtitle: "SYNTHESIZER",
        kind: "synth",
        inputType: TYPE.SENTENCE,
        outputType: TYPE.STANZA
    },

    primal: {
        title: "PRIMAL",
        subtitle: "MULTIPLE STANZAS",
        kind: "synth",
        inputType: TYPE.STANZA,
        outputType: TYPE.STANZA
    },

    poem: {
        title: "POEM",
        subtitle: "SYNTHESIZER",
        kind: "poem",
        inputType: TYPE.STANZA,
        outputType: null
    }

});


const NODE_SIZES = Object.freeze({
    source: {
        width: 86,
        height: 86
    },

    splitter: {
        width: 92,
        height: 92
    },

    synthHorizontal: {
        width: 118,
        height: 184
    },

    synthVertical: {
        width: 184,
        height: 118
    }
});


const PORT_RADIUS = 4.5;

const PORT_TRIANGLE_SIZE = 16;

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.0;
const ZOOM_FACTOR = 1.12;

const ALLOWED_SYMBOL_MODIFIERS = Object.freeze([
    ".",
    ",",
    "!",
    "?",
    ";",
    ":",
    "'",
    "\"",
    "-",
    "—",
    "…"
]);


/* ============================================================
   DOM
   ============================================================ */

const DOM = {
    machinePanel: document.getElementById("machine-panel"),
    bottomPanel: document.getElementById("bottom-panel"),

    leftHoverTrigger: document.getElementById("left-hover-trigger"),
    bottomHoverTrigger: document.getElementById("bottom-hover-trigger"),

    letterInput: document.getElementById("letter-input"),
    createLetterBtn: document.getElementById("create-letter-btn"),
    letterError: document.getElementById("letter-error"),

    symbolInput: document.getElementById("symbol-input"),
    createSymbolModifierBtn:
        document.getElementById("create-symbol-modifier-btn"),
    symbolError: document.getElementById("symbol-error"),

    lever: document.getElementById("poem-lever"),
    leverStatus: document.getElementById("lever-status"),

    zoomIn: document.getElementById("zoom-in"),
    zoomOut: document.getElementById("zoom-out"),
    zoomReset: document.getElementById("zoom-reset"),
    zoomLabel: document.getElementById("zoom-label"),

    nodeControls: document.getElementById("node-controls"),
    selectedNodeLabel: document.getElementById("selected-node-label"),

    orientationHorizontal:
        document.getElementById("orientation-horizontal"),

    orientationVertical:
        document.getElementById("orientation-vertical"),

    reverseNode:
        document.getElementById("reverse-node"),

    deleteNode:
        document.getElementById("delete-node"),

    currentPageBtn:
        document.getElementById("current-page-btn"),

    template1Btn:
        document.getElementById("template-1-btn"),

    template2Btn:
        document.getElementById("template-2-btn"),

    clearBtn:
        document.getElementById("clear-btn"),

    saveBtn:
        document.getElementById("save-btn"),

    loadBtn:
        document.getElementById("load-btn"),

    jsonFileInput:
        document.getElementById("json-file-input"),

    poemOverlay:
        document.getElementById("poem-output-overlay"),

    poemContent:
        document.getElementById("poem-output-content"),

    closePoemOutput:
        document.getElementById("close-poem-output"),

    toast:
        document.getElementById("toast")
};


/* ============================================================
   GLOBAL STATE
   ============================================================ */

let factoryScene = null;

let toastTimer = null;

let currentPageSnapshot = null;


/* ============================================================
   SPECIAL AUDIO
   ============================================================ */

const neverGonnaAudio =
    new Audio(
        "./phaser/music.mp3"
    );


neverGonnaAudio.preload =
    "auto";


neverGonnaAudio.volume =
    1;


/* ============================================================
   UTILITY
   ============================================================ */

function colorToCss(number) {
    return "#" + number.toString(16).padStart(6, "0");
}


function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}


function getResponsiveNodeFontSizes() {

    const width =
        document.documentElement.clientWidth ||
        window.innerWidth;

    const height =
        document.documentElement.clientHeight ||
        window.innerHeight;


    const scale =
        clamp(
            Math.min(
                width / 1920,
                height / 1080
            ),
            0.9,
            1.45
        );


    return {
        title:
            Math.round(
                16 * scale
            ),

        subtitle:
            Math.round(
                11 * scale
            ),

        letter:
            Math.round(
                34 * scale
            )
    };
}


function updateAllNodeTypography() {

    if (!factoryScene) {
        return;
    }

    factoryScene.updateNodeTypography();
}


function showToast(message, duration = 1700) {
    clearTimeout(toastTimer);

    DOM.toast.textContent = message;
    DOM.toast.classList.add("show");

    toastTimer = setTimeout(() => {
        DOM.toast.classList.remove("show");
    }, duration);
}


function generateId(prefix = "node") {
    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2, 8)
    );
}


function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}


/* ============================================================
   PHASER CONFIG
   ============================================================ */

class FactoryScene extends Phaser.Scene {

    constructor() {
        super({
            key: "FactoryScene"
        });

        this.nodes = new Map();

        this.connections = [];

        this.selectedNodeId = null;

        this.selectedPortId = null;

        this.pendingPort = null;

        this.globalOrientation = "horizontal";
        this.globalReversed = false;

        this.connectionGraphics = null;

        this.previewGraphics = null;

        this.gridGraphics = null;

        this.worldContainer = null;

        this.zoom = 1;

        this.cameraOffsetX = 0;
        this.cameraOffsetY = 0;

        this.lastPointerWorld = {
            x: 0,
            y: 0
        };

        this.isPanning = false;

        this.panStartPointerX = 0;
        this.panStartPointerY = 0;

        this.panStartScrollX = 0;
        this.panStartScrollY = 0;
    }


    create() {

        factoryScene = this;

        this.cameras.main.setBackgroundColor("#292929");

        this.game.canvas.addEventListener(
            "contextmenu",
            event => {
                event.preventDefault();
            }
        );

        /*
         * Grid 单独绘制，固定在世界中。
         */
        this.gridGraphics = this.add.graphics();
        this.gridGraphics.setDepth(-100);

        this.connectionGraphics = this.add.graphics();
        this.connectionGraphics.setDepth(-20);

        this.previewGraphics = this.add.graphics();
        this.previewGraphics.setDepth(1000);

        this.drawGrid();

        this.setupPointerEvents();

        this.scale.on("resize", gameSize => {
            this.cameras.main.setViewport(
                0,
                0,
                gameSize.width,
                gameSize.height
            );

            this.updateNodeTypography();
            this.drawGrid();
            this.drawConnections();
        });

        requestAnimationFrame(() => {
            const container =
                document.getElementById(
                    "game-container"
                );

            if (!container) {
                return;
            }

            const rect =
                container.getBoundingClientRect();

            this.scale.resize(
                Math.max(
                    1,
                    Math.round(rect.width)
                ),
                Math.max(
                    1,
                    Math.round(rect.height)
                )
            );
        });

        refreshLeverState();
        refreshSelectedNodeControls();
        updateZoomLabel();
    }


    /* ========================================================
       GRID
       ======================================================== */

    drawGrid() {

        if (
            !this.gridGraphics
        ) {
            return;
        }


        const g =
            this.gridGraphics;

        const camera =
            this.cameras.main;


        g.clear();


        const visibleWidth =
            camera.width /
            camera.zoom;

        const visibleHeight =
            camera.height /
            camera.zoom;


        const margin =
            Math.max(
                300,
                Math.max(
                    visibleWidth,
                    visibleHeight
                ) * 0.3
            );


        const minX =
            camera.scrollX -
            margin;

        const minY =
            camera.scrollY -
            margin;

        const maxX =
            camera.scrollX +
            visibleWidth +
            margin;

        const maxY =
            camera.scrollY +
            visibleHeight +
            margin;

        const minorStep = 24;
        const majorStep = 120;


        const minorStartX =
            Math.floor(
                minX /
                minorStep
            ) *
            minorStep;

        const minorStartY =
            Math.floor(
                minY /
                minorStep
            ) *
            minorStep;


        g.lineStyle(
            1,
            TYPE_COLORS.GRID_MINOR,
            0.52
        );

        for (
            let x = minorStartX;
            x <= maxX;
            x += minorStep
        ) {
            g.lineBetween(
                x,
                minY,
                x,
                maxY
            );
        }

        for (
            let y = minorStartY;
            y <= maxY;
            y += minorStep
        ) {
            g.lineBetween(
                minX,
                y,
                maxX,
                y
            );
        }


        const majorStartX =
            Math.floor(
                minX /
                majorStep
            ) *
            majorStep;

        const majorStartY =
            Math.floor(
                minY /
                majorStep
            ) *
            majorStep;


        g.lineStyle(
            1,
            TYPE_COLORS.GRID_MAJOR,
            0.78
        );

        for (
            let x = majorStartX;
            x <= maxX;
            x += majorStep
        ) {
            g.lineBetween(
                x,
                minY,
                x,
                maxY
            );
        }

        for (
            let y = majorStartY;
            y <= maxY;
            y += majorStep
        ) {
            g.lineBetween(
                minX,
                y,
                maxX,
                y
            );
        }
    }


    /* ========================================================
       POINTER / CAMERA
       ======================================================== */

    setupPointerEvents() {

        this.input.on(
            "pointerdown",
            (
                pointer,
                gameObjects
            ) => {

                if (
                    pointer.rightButtonDown()
                ) {

                    if (
                        this.pendingPort
                    ) {
                        this.cancelConnection();
                    }

                    return;
                }


                if (
                    gameObjects &&
                    gameObjects.length > 0
                ) {
                    return;
                }


                if (
                    !this.pendingPort
                ) {

                    this.selectedPortId =
                        null;

                    this.selectNode(null);

                    this.redrawAllPorts();
                }


                if (
                    pointer.leftButtonDown()
                ) {

                    this.isPanning =
                        true;


                    this.panStartPointerX =
                        pointer.x;

                    this.panStartPointerY =
                        pointer.y;


                    this.panStartScrollX =
                        this.cameras.main.scrollX;

                    this.panStartScrollY =
                        this.cameras.main.scrollY;
                }
            }
        );


        this.input.on(
            "pointermove",
            pointer => {

                const camera =
                    this.cameras.main;


                if (
                    this.isPanning &&
                    pointer.isDown
                ) {

                    const deltaX =
                        pointer.x -
                        this.panStartPointerX;

                    const deltaY =
                        pointer.y -
                        this.panStartPointerY;


                    camera.scrollX =
                        this.panStartScrollX -
                        deltaX /
                        camera.zoom;

                    camera.scrollY =
                        this.panStartScrollY -
                        deltaY /
                        camera.zoom;


                    this.drawGrid();

                    const worldPoint =
                        camera.getWorldPoint(
                            pointer.x,
                            pointer.y
                        );


                    this.lastPointerWorld.x =
                        worldPoint.x;

                    this.lastPointerWorld.y =
                        worldPoint.y;


                    if (
                        this.pendingPort
                    ) {

                        this.drawConnections(
                            worldPoint
                        );
                    }
                    else {

                        this.drawConnections();
                    }

                    return;
                }


                const worldPoint =
                    camera.getWorldPoint(
                        pointer.x,
                        pointer.y
                    );


                this.lastPointerWorld.x =
                    worldPoint.x;

                this.lastPointerWorld.y =
                    worldPoint.y;


                if (
                    this.pendingPort
                ) {

                    this.drawConnections(
                        worldPoint
                    );
                }
            }
        );


        this.input.on(
            "pointerup",
            pointer => {

                this.isPanning =
                    false;


                if (
                    this.pendingPort
                ) {

                    const worldPoint =
                        this.cameras.main
                            .getWorldPoint(
                                pointer.x,
                                pointer.y
                            );


                    this.lastPointerWorld.x =
                        worldPoint.x;

                    this.lastPointerWorld.y =
                        worldPoint.y;


                    this.drawConnections(
                        worldPoint
                    );
                }
            }
        );


        this.input.on(
            "pointerupoutside",
            () => {

                this.isPanning =
                    false;


                if (
                    this.pendingPort
                ) {

                    this.drawConnections(
                        this.lastPointerWorld
                    );
                }
            }
        );


        this.input.on(
            "wheel",
            (
                pointer,
                gameObjects,
                deltaX,
                deltaY,
                deltaZ
            ) => {

                if (
                    Math.abs(deltaY) < 1
                ) {
                    return;
                }


                if (deltaY < 0) {
                    this.changeZoom(
                        this.zoom *
                        ZOOM_FACTOR
                    );
                }
                else {
                    this.changeZoom(
                        this.zoom /
                        ZOOM_FACTOR
                    );
                }
            }
        );
    }


    changeZoom(
        requestedZoom
    ) {

        const camera =
            this.cameras.main;


        const oldZoom =
            camera.zoom;


        const newZoom = clamp(
            requestedZoom,
            MIN_ZOOM,
            MAX_ZOOM
        );


        if (
            Math.abs(
                newZoom - oldZoom
            ) < 0.0001
        ) {
            return;
        }


        const worldCenterX =
            camera.scrollX +
            camera.width /
            (2 * oldZoom);

        const worldCenterY =
            camera.scrollY +
            camera.height /
            (2 * oldZoom);


        camera.setZoom(newZoom);


        camera.scrollX =
            worldCenterX -
            camera.width /
            (2 * newZoom);

        camera.scrollY =
            worldCenterY -
            camera.height /
            (2 * newZoom);


        this.zoom =
            newZoom;

        this.updateTextResolutionForZoom();

        updateZoomLabel();

        this.drawGrid();

        this.drawConnections();
    }


    resetZoom() {

        const camera = this.cameras.main;

        const worldCenterX =
            camera.scrollX +
            camera.width /
            (2 * camera.zoom);

        const worldCenterY =
            camera.scrollY +
            camera.height /
            (2 * camera.zoom);

        camera.setZoom(1);

        camera.scrollX =
            worldCenterX -
            camera.width / 2;

        camera.scrollY =
            worldCenterY -
            camera.height / 2;

        this.zoom = 1;

        this.updateTextResolutionForZoom();

        updateZoomLabel();

        this.drawGrid();

        this.drawConnections();
    }


    updateNodeTypography() {

        const fonts =
            getResponsiveNodeFontSizes();


        for (
            const node of
            this.nodes.values()
        ) {

            if (node.titleText) {
                node.titleText.setFontSize(
                    fonts.title
                );
            }


            if (node.subtitleText) {
                node.subtitleText.setFontSize(
                    fonts.subtitle
                );
            }


            if (node.letterText) {
                node.letterText.setFontSize(
                    fonts.letter
                );
            }
        }


        this.updateTextResolutionForZoom();
    }


    updateTextResolutionForZoom() {

        const textResolution =
            clamp(
                1 / this.zoom,
                1,
                2.5
            );


        const applyResolution =
            text => {

                if (
                    text &&
                    typeof text.setResolution ===
                        "function"
                ) {
                    text.setResolution(
                        textResolution
                    );
                }
            };


        for (
            const node of
            this.nodes.values()
        ) {
            applyResolution(
                node.titleText
            );

            applyResolution(
                node.subtitleText
            );

            applyResolution(
                node.letterText
            );
        }
    }


    getCanvasCenterWorld() {

        const camera = this.cameras.main;

        return camera.getWorldPoint(
            camera.width / 2,
            camera.height / 2
        );
    }


    /* ========================================================
       CREATE NODE
       ======================================================== */

    createNode(
        machineType,
        x,
        y,
        options = {}
    ) {

        const definition =
            MACHINE_DEFINITIONS[machineType];

        if (!definition) {
            console.warn(
                "Unknown machine:",
                machineType
            );
            return null;
        }

        const node = {
            id:
                options.id ||
                generateId("node"),

            machineType,

            definition,

            x,
            y,

            letter:
                options.letter || null,

            symbol:
                options.symbol || null,

            orientation:
                options.orientation !== undefined
                    ? options.orientation
                    : this.globalOrientation,

            reversed:
                options.reversed !== undefined
                    ? Boolean(options.reversed)
                    : this.globalReversed,

            width: 100,
            height: 100,

            container: null,

            bodyGraphics: null,

            titleText: null,
            subtitleText: null,
            letterText: null,

            ports: [],

            inputPorts: [],
            outputPorts: [],

            validOutput: false
        };


        node.container =
            this.add.container(
                x,
                y
            );

        node.container.setDepth(10);

        node.bodyGraphics =
            this.add.graphics();

        node.container.add(
            node.bodyGraphics
        );


        const fonts =
            getResponsiveNodeFontSizes();


        node.titleText =
            this.add.text(
                0,
                0,
                "",
                {
                    fontFamily:
                        'Consolas, "Courier New", monospace',
                    fontSize:
                        `${fonts.title}px`,
                    color: "#d4d4d4",
                    align: "center"
                }
            );

        node.titleText.setOrigin(
            0.5,
            0.5
        );

        node.container.add(
            node.titleText
        );


        node.subtitleText =
            this.add.text(
                0,
                0,
                "",
                {
                    fontFamily:
                        'Consolas, "Courier New", monospace',
                    fontSize:
                        `${fonts.subtitle}px`,
                    color: "#909090",
                    align: "center"
                }
            );

        node.subtitleText.setOrigin(
            0.5,
            0.5
        );

        node.container.add(
            node.subtitleText
        );


        if (
            machineType === "letterSource" ||
            machineType === "symbolModifier"
        ) {

            let displayedValue = "?";

            let displayedColor =
                TYPE_COLORS[
                    TYPE.LETTER
                ];


            if (
                machineType ===
                "letterSource"
            ) {
                displayedValue =
                    node.letter || "?";

                displayedColor =
                    TYPE_COLORS[
                        TYPE.LETTER
                    ];
            }
            else {
                displayedValue =
                    node.symbol || "?";

                displayedColor =
                    TYPE_COLORS[
                        TYPE.SENTENCE
                    ];
            }


            node.letterText =
                this.add.text(
                    0,
                    0,
                    displayedValue,
                    {
                        fontFamily:
                            'Consolas, "Courier New", monospace',
                        fontSize:
                            `${fonts.letter}px`,
                        color: colorToCss(
                            displayedColor
                        )
                    }
                );

            node.letterText.setOrigin(
                0.5,
                0.5
            );

            node.container.add(
                node.letterText
            );
        }


        this.nodes.set(
            node.id,
            node
        );


        this.setupNodeInteraction(node);

        this.rebuildNode(node);

        this.updateTextResolutionForZoom();

        this.evaluateNetwork();

        return node;
    }


    setupNodeInteraction(node) {

        node.container.setInteractive(
            new Phaser.Geom.Rectangle(
                -node.width / 2,
                -node.height / 2,
                node.width,
                node.height
            ),
            Phaser.Geom.Rectangle.Contains
        );

        this.input.setDraggable(
            node.container
        );


        node.container.on(
            "pointerdown",
            (pointer) => {

                pointer.event.stopPropagation();

                this.selectNode(
                    node.id
                );
            }
        );


        node.container.on(
            "dragstart",
            () => {

                this.isPanning = false;

                node.container.setDepth(
                    100
                );

                this.selectNode(
                    node.id
                );
            }
        );


        node.container.on(
            "drag",
            (
                pointer,
                dragX,
                dragY
            ) => {

                node.x = dragX;
                node.y = dragY;

                node.container.x =
                    dragX;

                node.container.y =
                    dragY;

                this.drawConnections();
            }
        );


        node.container.on(
            "dragend",
            () => {

                node.container.setDepth(
                    10
                );

                this.drawConnections();
            }
        );
    }


    /* ========================================================
       NODE VISUAL
       ======================================================== */

    rebuildNode(node) {

        this.destroyNodePorts(node);

        const def = node.definition;

        if (
            def.kind === "source"
        ) {
            node.width =
                NODE_SIZES.source.width;

            node.height =
                NODE_SIZES.source.height;
        }
        else if (
            def.kind === "splitter"
        ) {
            node.width =
                NODE_SIZES.splitter.width;

            node.height =
                NODE_SIZES.splitter.height;
        }
        else {

            if (
                node.orientation ===
                "vertical"
            ) {
                node.width =
                    NODE_SIZES
                        .synthVertical
                        .width;

                node.height =
                    NODE_SIZES
                        .synthVertical
                        .height;
            }
            else {
                node.width =
                    NODE_SIZES
                        .synthHorizontal
                        .width;

                node.height =
                    NODE_SIZES
                        .synthHorizontal
                        .height;
            }
        }


        if (
            node.container.input &&
            node.container.input.hitArea
        ) {

            node.container.input.hitArea.setTo(
                -node.width / 2,
                -node.height / 2,
                node.width,
                node.height
            );
        }


        this.drawNodeBody(node);

        this.positionNodeText(node);

        this.buildNodePorts(node);

        this.drawConnections();
    }


    drawNodeBody(node) {

        const g =
            node.bodyGraphics;

        g.clear();

        const selected =
            this.selectedNodeId ===
            node.id;

        g.fillStyle(
            TYPE_COLORS.NODE_FILL,
            1
        );

        g.lineStyle(
            selected ? 2 : 1,
            selected
                ? TYPE_COLORS.NODE_SELECTED
                : TYPE_COLORS.NODE_BORDER,
            1
        );


        g.fillRect(
            -node.width / 2,
            -node.height / 2,
            node.width,
            node.height
        );

        g.strokeRect(
            -node.width / 2,
            -node.height / 2,
            node.width,
            node.height
        );


        /*
         * 内部很淡的结构线。
         */
        g.lineStyle(
            1,
            0x252525,
            1
        );

        if (
            node.definition.kind ===
            "source"
        ) {

            g.lineBetween(
                -node.width / 2 + 8,
                node.height / 2 - 17,
                node.width / 2 - 8,
                node.height / 2 - 17
            );
        }
        else if (
            node.definition.kind ===
            "splitter"
        ) {

            g.lineBetween(
                -18,
                -18,
                18,
                18
            );

            g.lineBetween(
                18,
                -18,
                -18,
                18
            );
        }
        else {

            if (
                node.orientation ===
                "horizontal"
            ) {

                g.lineBetween(
                    -node.width / 2 + 18,
                    0,
                    node.width / 2 - 18,
                    0
                );
            }
            else {

                g.lineBetween(
                    0,
                    -node.height / 2 + 18,
                    0,
                    node.height / 2 - 18
                );
            }
        }
    }


    positionNodeText(node) {

        node.titleText.setText(
            node.definition.title
        );

        node.subtitleText.setText(
            node.definition.subtitle
        );


        if (
            node.definition.kind ===
            "source"
        ) {

            node.titleText.setPosition(
                0,
                -29
            );

            node.subtitleText.setPosition(
                0,
                28
            );

            if (node.letterText) {
                node.letterText
                    .setPosition(
                        0,
                        -1
                    );
            }

            return;
        }


        if (
            node.definition.kind ===
            "splitter"
        ) {

            node.titleText.setPosition(
                0,
                -8
            );

            node.subtitleText.setPosition(
                0,
                7
            );

            return;
        }


        if (
            node.definition.kind ===
            "modifier"
        ) {

            node.titleText.setPosition(
                0,
                -24
            );

            node.subtitleText.setPosition(
                0,
                24
            );

            if (node.letterText) {
                node.letterText
                    .setPosition(
                        0,
                        0
                    );
            }

            return;
        }


        node.titleText.setPosition(
            0,
            -7
        );

        node.subtitleText.setPosition(
            0,
            8
        );
    }


    /* ========================================================
       PORTS
       ======================================================== */

    destroyNodePorts(node) {

        for (
            const port of node.ports
        ) {

            if (port.zone) {
                port.zone.destroy();
            }

            if (port.graphics) {
                port.graphics.destroy();
            }
        }

        node.ports = [];
        node.inputPorts = [];
        node.outputPorts = [];
    }


    createPort(
        node,
        config
    ) {

        const port = {
            id:
                config.id ||
                generateId("port"),

            nodeId:
                node.id,

            role:
                config.role,

            dataType:
                config.dataType,

            localX:
                config.localX,

            localY:
                config.localY,

            direction:
                config.direction,

            bidirectional:
                Boolean(
                    config.bidirectional
                ),

            alwaysLit:
                Boolean(
                    config.alwaysLit
                ),

            graphics: null,
            zone: null
        };


        port.graphics =
            this.add.graphics();

        port.graphics.setDepth(15);

        node.container.add(
            port.graphics
        );


        port.zone =
            this.add.zone(
                port.localX,
                port.localY,
                30,
                30
            );

        port.zone.setInteractive({
            useHandCursor: true
        });

        node.container.add(
            port.zone
        );


        port.zone.on(
            "pointerdown",
            (pointer) => {

                pointer.event.stopPropagation();

                this.handlePortClick(
                    port
                );
            }
        );


        node.ports.push(port);

        if (
            port.role === "input" ||
            port.bidirectional
        ) {
            node.inputPorts.push(port);
        }

        if (
            port.role === "output" ||
            port.bidirectional
        ) {
            node.outputPorts.push(port);
        }


        this.drawPort(
            node,
            port
        );

        return port;
    }


    buildNodePorts(node) {

        const def = node.definition;

        /*
         * LETTER SOURCE
         */
        if (
            def.kind === "source"
        ) {

            const direction =
                this.resolveSideDirection(
                    node,
                    "output"
                );

            const position =
                this.getSinglePortPosition(
                    node,
                    direction
                );

            this.createPort(
                node,
                {
                    id:
                        node.id +
                        "_output",

                    role: "output",
                    dataType:
                        TYPE.LETTER,

                    localX:
                        position.x,

                    localY:
                        position.y,

                    direction,

                    alwaysLit: true
                }
            );

            return;
        }


        /*
         * LETTER DIFFERENTIAL:
         * 四个口全部可输入、可输出。
         */
        if (
            def.kind === "splitter"
        ) {

            const positions = [
                {
                    x: 0,
                    y: -node.height / 2,
                    direction: "top"
                },
                {
                    x: node.width / 2,
                    y: 0,
                    direction: "right"
                },
                {
                    x: 0,
                    y: node.height / 2,
                    direction: "bottom"
                },
                {
                    x: -node.width / 2,
                    y: 0,
                    direction: "left"
                }
            ];


            positions.forEach(
                (p, index) => {

                    this.createPort(
                        node,
                        {
                            id:
                                node.id +
                                "_split_" +
                                index,

                            role: "both",

                            dataType:
                                TYPE.LETTER,

                            localX: p.x,
                            localY: p.y,

                            direction:
                                p.direction,

                            bidirectional: true,

                            alwaysLit: true
                        }
                    );
                }
            );

            return;
        }


        /*
         * SYMBOL MODIFIER:
         * exactly one sentence input and one sentence output.
         */
        if (
            def.kind === "modifier"
        ) {

            const inputDirection =
                this.resolveSideDirection(
                    node,
                    "input"
                );

            const outputDirection =
                this.resolveSideDirection(
                    node,
                    "output"
                );


            const inputPosition =
                this.getSinglePortPosition(
                    node,
                    inputDirection
                );

            const outputPosition =
                this.getSinglePortPosition(
                    node,
                    outputDirection
                );


            this.createPort(
                node,
                {
                    id:
                        node.id +
                        "_input_0",

                    role:
                        "input",

                    dataType:
                        TYPE.SENTENCE,

                    localX:
                        inputPosition.x,

                    localY:
                        inputPosition.y,

                    direction:
                        inputDirection
                }
            );


            this.createPort(
                node,
                {
                    id:
                        node.id +
                        "_output",

                    role:
                        "output",

                    dataType:
                        TYPE.SENTENCE,

                    localX:
                        outputPosition.x,

                    localY:
                        outputPosition.y,

                    direction:
                        outputDirection
                }
            );

            return;
        }


        /*
         * 普通合成器。
         */
        const inputDirection =
            this.resolveSideDirection(
                node,
                "input"
            );

        const outputDirection =
            this.resolveSideDirection(
                node,
                "output"
            );


        const inputPositions =
            this.getFivePortPositions(
                node,
                inputDirection
            );


        inputPositions.forEach(
            (position, index) => {

                this.createPort(
                    node,
                    {
                        id:
                            node.id +
                            "_input_" +
                            index,

                        role:
                            "input",

                        dataType:
                            def.inputType,

                        localX:
                            position.x,

                        localY:
                            position.y,

                        direction:
                            inputDirection
                    }
                );
            }
        );


        /*
         * POEM 合成器没有输出口。
         */
        if (
            def.kind !== "poem"
        ) {

            const outputPosition =
                this.getSinglePortPosition(
                    node,
                    outputDirection
                );

            this.createPort(
                node,
                {
                    id:
                        node.id +
                        "_output",

                    role:
                        "output",

                    dataType:
                        def.outputType,

                    localX:
                        outputPosition.x,

                    localY:
                        outputPosition.y,

                    direction:
                        outputDirection
                }
            );
        }
    }


    resolveSideDirection(
        node,
        role
    ) {

        /*
         * 左右布局：
         *
         * 默认:
         * input 左
         * output 右
         *
         * reverse:
         * input 右
         * output 左
         */

        if (
            node.orientation ===
            "horizontal"
        ) {

            if (
                role === "input"
            ) {
                return node.reversed
                    ? "right"
                    : "left";
            }

            return node.reversed
                ? "left"
                : "right";
        }


        /*
         * 上下布局：
         *
         * 默认:
         * input 上
         * output 下
         *
         * reverse:
         * input 下
         * output 上
         */

        if (
            role === "input"
        ) {
            return node.reversed
                ? "bottom"
                : "top";
        }

        return node.reversed
            ? "top"
            : "bottom";
    }


    getFivePortPositions(
        node,
        direction
    ) {

        const positions = [];

        const count = 5;

        /*
         * Port ordering is independent from input/output side.
         *
         * LEFT / RIGHT:
         * index 0 -> top
         * index 4 -> bottom
         *
         * TOP / BOTTOM:
         * index 0 -> left
         * index 4 -> right
         *
         * Reverse changes which edge is used, but it must not
         * reverse the logical port order.
         */

        if (
            direction === "left" ||
            direction === "right"
        ) {

            const x =
                direction === "left"
                    ? -node.width / 2
                    : node.width / 2;

            const usable =
                node.height - 42;

            const startY =
                -usable / 2;

            const step =
                usable /
                (count - 1);

            for (
                let index = 0;
                index < count;
                index++
            ) {

                positions.push({
                    x,
                    y:
                        startY +
                        step * index
                });
            }

            return positions;
        }


        if (
            direction === "top" ||
            direction === "bottom"
        ) {

            const y =
                direction === "top"
                    ? -node.height / 2
                    : node.height / 2;

            const usable =
                node.width - 50;

            const startX =
                -usable / 2;

            const step =
                usable /
                (count - 1);

            for (
                let index = 0;
                index < count;
                index++
            ) {

                positions.push({
                    x:
                        startX +
                        step * index,
                    y
                });
            }

            return positions;
        }


        return positions;
    }


    getSinglePortPosition(
        node,
        direction
    ) {

        switch (direction) {

            case "left":
                return {
                    x: -node.width / 2,
                    y: 0
                };

            case "right":
                return {
                    x: node.width / 2,
                    y: 0
                };

            case "top":
                return {
                    x: 0,
                    y: -node.height / 2
                };

            case "bottom":
                return {
                    x: 0,
                    y: node.height / 2
                };
        }

        return {
            x: 0,
            y: 0
        };
    }


    drawPort(
        node,
        port
    ) {

        const g =
            port.graphics;

        g.clear();

        const color =
            this.getPortDisplayColor(
                node,
                port
            );

        const selectedForDeletion =
            this.selectedPortId ===
            port.id;


        const triangleDepth =
            PORT_TRIANGLE_SIZE;

        const triangleHalfBase =
            PORT_TRIANGLE_SIZE * 0.625;

        const circleGap = 3;

        let circleX =
            port.localX;

        let circleY =
            port.localY;


        g.fillStyle(
            0x171717,
            1
        );

        g.lineStyle(
            1,
            TYPE_COLORS.PORT_BORDER,
            1
        );


        switch (
            port.direction
        ) {

            case "left": {

                const edgeX =
                    port.localX;

                const centerY =
                    port.localY;

                g.beginPath();

                g.moveTo(
                    edgeX,
                    centerY -
                        triangleHalfBase
                );

                g.lineTo(
                    edgeX,
                    centerY +
                        triangleHalfBase
                );

                g.lineTo(
                    edgeX -
                        triangleDepth,
                    centerY
                );

                g.closePath();
                g.fillPath();
                g.strokePath();

                circleX =
                    edgeX -
                    triangleDepth -
                    circleGap -
                    PORT_RADIUS;

                circleY =
                    centerY;

                break;
            }


            case "right": {

                const edgeX =
                    port.localX;

                const centerY =
                    port.localY;

                g.beginPath();

                g.moveTo(
                    edgeX,
                    centerY -
                        triangleHalfBase
                );

                g.lineTo(
                    edgeX,
                    centerY +
                        triangleHalfBase
                );

                g.lineTo(
                    edgeX +
                        triangleDepth,
                    centerY
                );

                g.closePath();
                g.fillPath();
                g.strokePath();

                circleX =
                    edgeX +
                    triangleDepth +
                    circleGap +
                    PORT_RADIUS;

                circleY =
                    centerY;

                break;
            }


            case "top": {

                const centerX =
                    port.localX;

                const edgeY =
                    port.localY;

                g.beginPath();

                g.moveTo(
                    centerX -
                        triangleHalfBase,
                    edgeY
                );

                g.lineTo(
                    centerX +
                        triangleHalfBase,
                    edgeY
                );

                g.lineTo(
                    centerX,
                    edgeY -
                        triangleDepth
                );

                g.closePath();
                g.fillPath();
                g.strokePath();

                circleX =
                    centerX;

                circleY =
                    edgeY -
                    triangleDepth -
                    circleGap -
                    PORT_RADIUS;

                break;
            }


            case "bottom": {

                const centerX =
                    port.localX;

                const edgeY =
                    port.localY;

                g.beginPath();

                g.moveTo(
                    centerX -
                        triangleHalfBase,
                    edgeY
                );

                g.lineTo(
                    centerX +
                        triangleHalfBase,
                    edgeY
                );

                g.lineTo(
                    centerX,
                    edgeY +
                        triangleDepth
                );

                g.closePath();
                g.fillPath();
                g.strokePath();

                circleX =
                    centerX;

                circleY =
                    edgeY +
                    triangleDepth +
                    circleGap +
                    PORT_RADIUS;

                break;
            }
        }


        g.fillStyle(
            color,
            1
        );

        g.lineStyle(
            selectedForDeletion
                ? 3
                : 1,
            selectedForDeletion
                ? 0xffffff
                : 0x909090,
            1
        );

        g.fillCircle(
            circleX,
            circleY,
            PORT_RADIUS
        );

        g.strokeCircle(
            circleX,
            circleY,
            PORT_RADIUS
        );

        if (
            selectedForDeletion
        ) {

            g.lineStyle(
                1,
                0xffffff,
                0.65
            );

            g.strokeCircle(
                circleX,
                circleY,
                PORT_RADIUS + 4
            );
        }


        /*
         * 更新可点击区域到圆的位置。
         */
        port.zone.setPosition(
            circleX,
            circleY
        );
    }


    getPortDisplayColor(
        node,
        port
    ) {

        /*
         * 输入口颜色始终保持自身类型颜色。
         */
        if (
            port.role === "input"
        ) {
            return TYPE_COLORS[
                port.dataType
            ];
        }


        /*
         * 差分机四个口一直亮。
         */
        if (
            port.bidirectional ||
            port.alwaysLit
        ) {
            return TYPE_COLORS[
                port.dataType
            ];
        }


        /*
         * 普通输出口：
         *
         * 必须存在至少一个合法输入才亮。
         */
        if (
            port.role === "output"
        ) {

            return node.validOutput
                ? TYPE_COLORS[
                    port.dataType
                ]
                : TYPE_COLORS.INVALID;
        }


        return TYPE_COLORS.INVALID;
    }


    getPortWorldPosition(port) {

        const node =
            this.nodes.get(
                port.nodeId
            );

        if (!node) {
            return {
                x: 0,
                y: 0
            };
        }


        let x =
            port.zone.x;

        let y =
            port.zone.y;


        x += node.x;
        y += node.y;


        return {
            x,
            y
        };
    }


    redrawAllPorts() {

        for (
            const node of
            this.nodes.values()
        ) {

            for (
                const port of
                node.ports
            ) {

                this.drawPort(
                    node,
                    port
                );
            }
        }
    }


    /* ========================================================
       PORT CONNECTION
       ======================================================== */

    handlePortClick(port) {

        const existingConnection =
            this.getConnectionForPort(
                port.id
            );


        if (
            existingConnection &&
            !this.pendingPort
        ) {

            if (
                this.selectedPortId ===
                port.id
            ) {
                this.selectedPortId =
                    null;
            }
            else {
                this.selectedPortId =
                    port.id;
            }


            this.redrawAllPorts();

            this.drawConnections();

            refreshSelectedNodeControls();

            return;
        }


        this.selectedPortId =
            null;

        this.redrawAllPorts();


        if (!this.pendingPort) {

            this.pendingPort = port;

            if (
                this.game &&
                this.game.canvas
            ) {
                this.game.canvas.style.cursor =
                    "crosshair";
            }

            this.drawConnections(
                this.getPortWorldPosition(
                    port
                )
            );

            return;
        }


        const first =
            this.pendingPort;

        const second =
            port;


        if (
            first.id === second.id
        ) {
            this.cancelConnection();
            return;
        }


        /*
         * 同节点内部不允许自连。
         * 差分机自身的四个口也不允许直接互连。
         */
        if (
            first.nodeId ===
            second.nodeId
        ) {
            showToast(
                "A machine cannot connect directly to itself."
            );

            this.cancelConnection();

            return;
        }


        const result =
            this.resolveConnectionDirection(
                first,
                second
            );


        if (!result) {

            showToast(
                "These ports cannot form a connection."
            );

            this.cancelConnection();

            return;
        }


        const {
            from,
            to
        } = result;


        if (
            this.portIsOccupied(
                from.id
            ) ||
            this.portIsOccupied(
                to.id
            )
        ) {

            showToast(
                "One or both ports are already connected."
            );

            this.cancelConnection();

            return;
        }


        /*
         * 防止完全重复的线。
         */
        if (
            this.connectionExists(
                from.id,
                to.id
            )
        ) {
            this.cancelConnection();
            return;
        }


        this.connections.push({
            id:
                generateId(
                    "connection"
                ),

            fromPortId:
                from.id,

            toPortId:
                to.id,

            dataType:
                from.dataType
        });


        this.pendingPort = null;

        if (
            this.game &&
            this.game.canvas
        ) {
            this.game.canvas.style.cursor =
                "default";
        }

        this.evaluateNetwork();
    }


    resolveConnectionDirection(
        first,
        second
    ) {

        const firstCanOut =
            first.role === "output" ||
            first.bidirectional;

        const firstCanIn =
            first.role === "input" ||
            first.bidirectional;

        const secondCanOut =
            second.role === "output" ||
            second.bidirectional;

        const secondCanIn =
            second.role === "input" ||
            second.bidirectional;


        /*
         * 点击起点可以是输出，
         * 也可以是输入。
         *
         * 所以方向根据端口能力自动判断。
         */

        if (
            firstCanOut &&
            secondCanIn
        ) {

            return {
                from: first,
                to: second
            };
        }


        if (
            secondCanOut &&
            firstCanIn
        ) {

            return {
                from: second,
                to: first
            };
        }


        return null;
    }


    hasIncomingConnection(
        portId
    ) {

        return this.connections.some(
            connection =>
                connection.toPortId ===
                portId
        );
    }


    portIsOccupied(
        portId
    ) {

        return this.connections.some(
            connection =>
                connection.fromPortId ===
                    portId ||
                connection.toPortId ===
                    portId
        );
    }


    getConnectionForPort(
        portId
    ) {

        return (
            this.connections.find(
                connection =>
                    connection.fromPortId ===
                        portId ||
                    connection.toPortId ===
                        portId
            ) || null
        );
    }


    connectionExists(
        fromId,
        toId
    ) {

        return this.connections.some(
            connection =>
                connection.fromPortId ===
                    fromId &&
                connection.toPortId ===
                    toId
        );
    }


    cancelConnection() {

        this.pendingPort = null;

        this.isPanning = false;

        if (
            this.game &&
            this.game.canvas
        ) {
            this.game.canvas.style.cursor =
                "default";
        }

        this.drawConnections();
    }


    /* ========================================================
       CONNECTION LOOKUP
       ======================================================== */

    findPortById(portId) {

        for (
            const node of
            this.nodes.values()
        ) {

            const port =
                node.ports.find(
                    p => p.id === portId
                );

            if (port) {
                return port;
            }
        }

        return null;
    }


    getIncomingConnectionsForNode(
        node
    ) {

        const inputOrder =
            new Map();


        node.inputPorts.forEach(
            (port, index) => {
                inputOrder.set(
                    port.id,
                    index
                );
            }
        );

        return this.connections.filter(
            connection =>
                inputOrder.has(
                    connection.toPortId
                )
        ).sort(
            (a, b) =>
                inputOrder.get(
                    a.toPortId
                ) -
                inputOrder.get(
                    b.toPortId
                )
        );
    }


    getOutgoingConnectionsForNode(
        node
    ) {

        const outputIds =
            new Set(
                node.outputPorts.map(
                    p => p.id
                )
            );

        return this.connections.filter(
            connection =>
                outputIds.has(
                    connection.fromPortId
                )
        );
    }


    /* ========================================================
       NETWORK VALIDATION
       ======================================================== */

    evaluateNetwork() {

        /*
         * 重复几轮是为了处理：
         *
         * source -> machine -> machine -> ...
         *
         * 的级联状态传播。
         */

        const maxIterations =
            Math.max(
                8,
                this.nodes.size + 2
            );


        for (
            let iteration = 0;
            iteration < maxIterations;
            iteration++
        ) {

            let changed = false;


            for (
                const node of
                this.nodes.values()
            ) {

                const previous =
                    node.validOutput;

                const next =
                    this.calculateNodeValidity(
                        node
                    );


                node.validOutput =
                    next;


                if (
                    previous !== next
                ) {
                    changed = true;
                }
            }


            if (!changed) {
                break;
            }
        }


        for (
            const node of
            this.nodes.values()
        ) {

            for (
                const port of
                node.ports
            ) {
                this.drawPort(
                    node,
                    port
                );
            }

            this.drawNodeBody(node);
        }


        this.drawConnections();

        refreshLeverState();
    }


    calculateNodeValidity(node) {

        const def =
            node.definition;


        if (
            def.kind === "source"
        ) {
            return true;
        }


        if (
            def.kind === "splitter"
        ) {
            return true;
        }


        const incoming =
            this.getIncomingConnectionsForNode(
                node
            );


        if (
            incoming.length === 0
        ) {
            return false;
        }


        /*
         * 至少存在一条合法输入即可令输出激活。
         *
         * 不合法的连线仍然可以存在，
         * 但不会参与输出判定。
         */

        for (
            const connection of
            incoming
        ) {

            const fromPort =
                this.findPortById(
                    connection.fromPortId
                );

            const toPort =
                this.findPortById(
                    connection.toPortId
                );


            if (
                !fromPort ||
                !toPort
            ) {
                continue;
            }


            const sourceNode =
                this.nodes.get(
                    fromPort.nodeId
                );


            if (!sourceNode) {
                continue;
            }


            /*
             * 类型不一致。
             */
            if (
                fromPort.dataType !==
                def.inputType
            ) {
                continue;
            }


            /*
             * 目标输入口自身类型也必须一致。
             */
            if (
                toPort.dataType !==
                def.inputType
            ) {
                continue;
            }


            /*
             * 源节点输出本身必须有效。
             *
             * source / splitter 恒为 true。
             */
            if (
                sourceNode.validOutput
            ) {
                return true;
            }
        }


        return false;
    }


    connectionIsValid(connection) {

        const from =
            this.findPortById(
                connection.fromPortId
            );

        const to =
            this.findPortById(
                connection.toPortId
            );


        if (
            !from ||
            !to
        ) {
            return false;
        }


        const fromNode =
            this.nodes.get(
                from.nodeId
            );

        const toNode =
            this.nodes.get(
                to.nodeId
            );


        if (
            !fromNode ||
            !toNode
        ) {
            return false;
        }


        /*
         * 差分机可接受 letter。
         */
        if (
            to.bidirectional
        ) {
            return (
                from.dataType ===
                TYPE.LETTER
            );
        }


        if (
            from.dataType !==
            to.dataType
        ) {
            return false;
        }


        if (
            !fromNode.validOutput
        ) {
            return false;
        }


        return true;
    }


    /* ========================================================
       CONNECTION DRAWING
       ======================================================== */

    drawConnections(
        previewWorldPoint = null
    ) {

        if (
            !this.connectionGraphics
        ) {
            return;
        }


        const g =
            this.connectionGraphics;

        g.clear();


        for (
            const connection of
            this.connections
        ) {

            const from =
                this.findPortById(
                    connection.fromPortId
                );

            const to =
                this.findPortById(
                    connection.toPortId
                );


            if (
                !from ||
                !to
            ) {
                continue;
            }


            const start =
                this.getPortWorldPosition(
                    from
                );

            const end =
                this.getPortWorldPosition(
                    to
                );


            const valid =
                this.connectionIsValid(
                    connection
                );


            const lineColor =
                TYPE_COLORS[
                    from.dataType
                ];


            g.lineStyle(
                valid ? 3 : 2,
                lineColor,
                valid ? 0.92 : 0.34
            );


            g.lineBetween(
                start.x,
                start.y,
                end.x,
                end.y
            );
        }


        /*
         * 未完成连接预览。
         */
        if (
            this.pendingPort &&
            previewWorldPoint
        ) {

            const start =
                this.getPortWorldPosition(
                    this.pendingPort
                );

            const color =
                TYPE_COLORS[
                    this.pendingPort
                        .dataType
                ];


            g.lineStyle(
                2,
                color,
                0.55
            );


            g.lineBetween(
                start.x,
                start.y,
                previewWorldPoint.x,
                previewWorldPoint.y
            );
        }
    }


    drawBezierLikeConnection(
        graphics,
        start,
        end,
        startDirection,
        endDirection
    ) {

        /*
         * Phaser Graphics 的 cubicBezierTo
         * 在不同 Phaser 3 小版本实现略有区别，
         * 因此这里使用 Path，兼容性更高。
         */

        const path =
            new Phaser.Curves.Path(
                start.x,
                start.y
            );


        const distance =
            Math.max(
                60,
                Phaser.Math.Distance.Between(
                    start.x,
                    start.y,
                    end.x,
                    end.y
                ) * 0.35
            );


        const c1 =
            this.directionControlPoint(
                start,
                startDirection,
                distance
            );


        const c2 =
            this.directionControlPoint(
                end,
                endDirection
                    ? this.oppositeDirection(
                        endDirection
                    )
                    : this.inferDirection(
                        end,
                        start
                    ),
                distance
            );


        path.cubicBezierTo(
            end.x,
            end.y,
            c1.x,
            c1.y,
            c2.x,
            c2.y
        );


        path.draw(
            graphics
        );
    }


    directionControlPoint(
        point,
        direction,
        distance
    ) {

        const result = {
            x: point.x,
            y: point.y
        };


        switch (direction) {

            case "left":
                result.x -= distance;
                break;

            case "right":
                result.x += distance;
                break;

            case "top":
                result.y -= distance;
                break;

            case "bottom":
                result.y += distance;
                break;

            default:
                result.x += distance;
                break;
        }


        return result;
    }


    inferDirection(
        from,
        toward
    ) {

        const dx =
            toward.x - from.x;

        const dy =
            toward.y - from.y;


        if (
            Math.abs(dx) >
            Math.abs(dy)
        ) {

            return dx >= 0
                ? "right"
                : "left";
        }


        return dy >= 0
            ? "bottom"
            : "top";
    }


    oppositeDirection(direction) {

        switch (direction) {

            case "left":
                return "right";

            case "right":
                return "left";

            case "top":
                return "bottom";

            case "bottom":
                return "top";
        }

        return null;
    }


    /* ========================================================
       NODE SELECTION
       ======================================================== */

    selectPort(portId) {

        if (!portId) {

            this.selectedPortId =
                null;

            refreshSelectedNodeControls();

            this.redrawAllPorts();

            return;
        }


        const connection =
            this.getConnectionForPort(
                portId
            );


        if (!connection) {

            this.selectedPortId =
                null;

            refreshSelectedNodeControls();

            this.redrawAllPorts();

            return;
        }


        this.selectedPortId =
            portId;

        refreshSelectedNodeControls();

        this.redrawAllPorts();
    }


    selectNode(nodeId) {

        if (
            nodeId !==
            this.selectedNodeId
        ) {
            this.selectedPortId =
                null;
        }


        const previous =
            this.selectedNodeId;

        this.selectedNodeId =
            nodeId;


        if (previous) {

            const previousNode =
                this.nodes.get(
                    previous
                );

            if (previousNode) {
                this.drawNodeBody(
                    previousNode
                );
            }
        }


        if (nodeId) {

            const node =
                this.nodes.get(
                    nodeId
                );

            if (node) {
                this.drawNodeBody(node);
            }
        }


        refreshSelectedNodeControls();

        this.redrawAllPorts();
    }


    getSelectedNode() {

        if (
            !this.selectedNodeId
        ) {
            return null;
        }


        return (
            this.nodes.get(
                this.selectedNodeId
            ) || null
        );
    }


    setGlobalOrientation(
        orientation
    ) {

        if (
            orientation !== "horizontal" &&
            orientation !== "vertical"
        ) {
            return;
        }


        this.globalOrientation =
            orientation;


        for (
            const node of
            this.nodes.values()
        ) {

            if (
                node.definition.kind ===
                "splitter"
            ) {
                continue;
            }


            node.orientation =
                orientation;


            this.rebuildNode(
                node
            );
        }


        this.evaluateNetwork();

        this.drawConnections();

        refreshGlobalLayoutControls();
    }


    reverseGlobalLayout() {

        this.globalReversed =
            !this.globalReversed;


        for (
            const node of
            this.nodes.values()
        ) {

            if (
                node.definition.kind ===
                "splitter"
            ) {
                continue;
            }


            node.reversed =
                this.globalReversed;


            this.rebuildNode(
                node
            );
        }


        this.evaluateNetwork();

        this.drawConnections();

        refreshGlobalLayoutControls();
    }


    deleteSelectedNode() {

        if (
            this.deleteSelectedConnection()
        ) {
            return;
        }


        const node =
            this.getSelectedNode();

        if (!node) {
            return;
        }


        this.deleteNode(
            node.id
        );
    }


    deleteSelectedConnection() {

        if (
            !this.selectedPortId
        ) {
            return false;
        }


        const connection =
            this.getConnectionForPort(
                this.selectedPortId
            );


        if (!connection) {

            this.selectedPortId =
                null;

            this.redrawAllPorts();

            refreshSelectedNodeControls();

            return false;
        }


        const connectionId =
            connection.id;


        this.connections =
            this.connections.filter(
                item =>
                    item.id !==
                    connectionId
            );


        this.selectedPortId =
            null;

        this.pendingPort =
            null;


        this.evaluateNetwork();

        this.redrawAllPorts();

        this.drawConnections();

        refreshSelectedNodeControls();

        showToast(
            "Connection deleted."
        );

        return true;
    }


    deleteNode(nodeId) {

        const node =
            this.nodes.get(
                nodeId
            );

        if (!node) {
            return;
        }


        const portIds =
            new Set(
                node.ports.map(
                    p => p.id
                )
            );


        if (
            this.selectedPortId &&
            portIds.has(
                this.selectedPortId
            )
        ) {
            this.selectedPortId =
                null;
        }


        this.connections =
            this.connections.filter(
                connection =>
                    !portIds.has(
                        connection
                            .fromPortId
                    ) &&
                    !portIds.has(
                        connection
                            .toPortId
                    )
            );


        this.destroyNodePorts(node);

        node.container.destroy(
            true
        );

        this.nodes.delete(
            nodeId
        );


        if (
            this.selectedNodeId ===
            nodeId
        ) {
            this.selectedNodeId =
                null;
        }


        this.cancelConnection();

        this.evaluateNetwork();

        refreshSelectedNodeControls();
    }


    /* ========================================================
       LETTER SOURCE
       ======================================================== */

    letterSourceExists(letter) {

        const normalized =
            letter.toLowerCase();


        for (
            const node of
            this.nodes.values()
        ) {

            if (
                node.machineType ===
                    "letterSource" &&
                node.letter ===
                    normalized
            ) {
                return true;
            }
        }


        return false;
    }


    /* ========================================================
       POEM MACHINE
       ======================================================== */

    getReadyPoemMachines() {

        const result = [];


        for (
            const node of
            this.nodes.values()
        ) {

            if (
                node.machineType !==
                "poem"
            ) {
                continue;
            }


            if (
                this.poemMachineHasValidInput(
                    node
                )
            ) {
                result.push(node);
            }
        }


        return result;
    }


    poemMachineHasValidInput(
        poemNode
    ) {

        const incoming =
            this.getIncomingConnectionsForNode(
                poemNode
            );


        for (
            const connection of
            incoming
        ) {

            const fromPort =
                this.findPortById(
                    connection.fromPortId
                );

            if (!fromPort) {
                continue;
            }


            const fromNode =
                this.nodes.get(
                    fromPort.nodeId
                );


            if (
                fromPort.dataType ===
                    TYPE.STANZA &&
                fromNode &&
                fromNode.validOutput
            ) {
                return true;
            }
        }


        return false;
    }


    /* ========================================================
       TRACE PRODUCTION NETWORK
       ======================================================== */

    generatePoemData() {

        const poemMachines =
            this.getReadyPoemMachines();


        if (
            poemMachines.length === 0
        ) {
            return null;
        }


        /*
         * 如果存在多个合法诗歌合成器，
         * 当前选择第一个。
         */
        const root =
            poemMachines[0];


        const visited =
            new Set();


        const trace =
            this.traceNodeBackward(
                root,
                visited
            );


        return {
            root,
            trace,
            poem:
                this.evaluateTextNode(
                    root
                )
        };
    }


    traceNodeBackward(
        node,
        visited
    ) {

        if (
            visited.has(
                node.id
            )
        ) {

            return {
                id: node.id,
                type:
                    node.machineType,
                cycle: true
            };
        }


        visited.add(
            node.id
        );


        const result = {
            id: node.id,

            type:
                node.machineType,

            letter:
                node.letter,

            symbol:
                node.symbol,

            inputs: []
        };


        const incoming =
            this.getIncomingConnectionsForNode(
                node
            );


        for (
            const connection of
            incoming
        ) {

            if (
                !this.connectionIsValid(
                    connection
                )
            ) {
                continue;
            }


            const fromPort =
                this.findPortById(
                    connection.fromPortId
                );


            if (!fromPort) {
                continue;
            }


            const sourceNode =
                this.nodes.get(
                    fromPort.nodeId
                );


            if (!sourceNode) {
                continue;
            }


            result.inputs.push(
                this.traceNodeBackward(
                    sourceNode,
                    new Set(visited)
                )
            );
        }


        return result;
    }


    evaluateTextNode(
        node,
        visited = new Set()
    ) {

        if (!node) {
            return "";
        }


        /*
         * Prevent circular evaluation.
         */
        if (
            visited.has(
                node.id
            )
        ) {
            return "";
        }


        const nextVisited =
            new Set(
                visited
            );

        nextVisited.add(
            node.id
        );


        /* ========================================================
           LETTER RESOURCE
           ======================================================== */

        if (
            node.machineType ===
            "letterSource"
        ) {
            return (
                node.letter || ""
            );
        }


        /* ========================================================
           LETTER DIFFERENTIAL

           Does not modify the content.
           It only duplicates routing capacity.
           ======================================================== */

        if (
            node.machineType ===
            "splitter"
        ) {

            const inputs =
                this.getOrderedInputValues(
                    node,
                    nextVisited
                );

            return (
                inputs[0] || ""
            );
        }


        /* ========================================================
           SYMBOL MODIFIER

           Preserve the incoming text exactly, then attach
           the configured symbol.
           ======================================================== */

        if (
            node.machineType ===
            "symbolModifier"
        ) {

            const values =
                this.getOrderedInputValues(
                    node,
                    nextVisited
                );

            const text =
                values.join("");

            return (
                text +
                (node.symbol || "")
            );
        }


        /* ========================================================
           PRIMARY SYNTHESIZER

           Extends letter capacity.
           No spaces, no punctuation, no conversion side effects.
           ======================================================== */

        if (
            node.machineType ===
            "primary"
        ) {

            return this
                .getOrderedInputValues(
                    node,
                    nextVisited
                )
                .join("");
        }


        /* ========================================================
           WORD SYNTHESIZER

           Converts letter-level material into one word.
           No spaces inside the resulting word.
           ======================================================== */

        if (
            node.machineType ===
            "word"
        ) {

            return this
                .getOrderedInputValues(
                    node,
                    nextVisited
                )
                .join("");
        }


        /* ========================================================
           INTERMEDIATE SYNTHESIZER

           Capacity expansion for word-stage material.
           It preserves word boundaries but does not create
           sentence-level side effects.
           ======================================================== */

        if (
            node.machineType ===
            "intermediate"
        ) {

            return this
                .getOrderedInputValues(
                    node,
                    nextVisited
                )
                .filter(
                    value =>
                        value !== ""
                )
                .join(" ");
        }


        /* ========================================================
           SENTENCE SYNTHESIZER

           Converts word-stage material into a sentence.
           Word groups are separated by one space.
           ======================================================== */

        if (
            node.machineType ===
            "sentence"
        ) {

            return this
                .getOrderedInputValues(
                    node,
                    nextVisited
                )
                .filter(
                    value =>
                        value !== ""
                )
                .join(" ");
        }


        /* ========================================================
           ADVANCED SYNTHESIZER

           Capacity expansion for sentence-stage material.
           It preserves sentence separation with spaces, not lines.
           ======================================================== */

        if (
            node.machineType ===
            "advanced"
        ) {

            return this
                .getOrderedInputValues(
                    node,
                    nextVisited
                )
                .filter(
                    value =>
                        value !== ""
                )
                .join(" ");
        }


        /* ========================================================
           STANZA SYNTHESIZER

           Converts sentence-stage material into a stanza.
           This is where line breaks are introduced.
           ======================================================== */

        if (
            node.machineType ===
            "stanza"
        ) {

            return this
                .getOrderedInputValues(
                    node,
                    nextVisited
                )
                .filter(
                    value =>
                        value !== ""
                )
                .join("\n");
        }


        /* ========================================================
           PRIMAL SYNTHESIZER

           Capacity expansion for stanza-stage material.
           It remains stanza-type material.
           ======================================================== */

        if (
            node.machineType ===
            "primal"
        ) {

            return this
                .getOrderedInputValues(
                    node,
                    nextVisited
                )
                .filter(
                    value =>
                        value !== ""
                )
                .join("\n\n");
        }


        /* ========================================================
           POEM SYNTHESIZER

           Final poem export stage.
           ======================================================== */

        if (
            node.machineType ===
            "poem"
        ) {

            return this
                .getOrderedInputValues(
                    node,
                    nextVisited
                )
                .filter(
                    value =>
                        value !== ""
                )
                .join("\n\n");
        }


        return this
            .getOrderedInputValues(
                node,
                nextVisited
            )
            .join("");
    }


    getOrderedInputValues(
        node,
        visited
    ) {

        const incoming =
            this.getIncomingConnectionsForNode(
                node
            );


        const ordered =
            incoming
                .map(
                    connection => {

                        const match =
                            connection
                                .toPortId
                                .match(
                                    /_input_(\d+)$/
                                );

                        const index =
                            match
                                ? Number(
                                    match[1]
                                )
                                : 0;

                        return {
                            index,
                            connection
                        };
                    }
                )
                .sort(
                    (a, b) =>
                        a.index -
                        b.index
                );


        const values = [];


        for (
            const item of ordered
        ) {

            const connection =
                item.connection;


            if (
                !this.connectionIsValid(
                    connection
                )
            ) {
                continue;
            }


            const fromPort =
                this.findPortById(
                    connection.fromPortId
                );

            if (!fromPort) {
                continue;
            }


            const sourceNode =
                this.nodes.get(
                    fromPort.nodeId
                );

            if (!sourceNode) {
                continue;
            }


            const value =
                this.evaluateTextNode(
                    sourceNode,
                    visited
                );

            if (
                value !== ""
            ) {
                values.push(
                    value
                );
            }
        }


        return values;
    }


    /* ========================================================
       SERIALIZATION
       ======================================================== */

    serialize() {

        const nodes = [];


        for (
            const node of
            this.nodes.values()
        ) {

            nodes.push({
                id:
                    node.id,

                machineType:
                    node.machineType,

                x:
                    node.x,

                y:
                    node.y,

                letter:
                    node.letter,

                symbol:
                    node.symbol,

                orientation:
                    node.orientation,

                reversed:
                    node.reversed
            });
        }


        return {
            app:
                "PoetryFactory",

            version:
                1,

            createdAt:
                new Date()
                    .toISOString(),

            layout: {
                orientation:
                    this.globalOrientation,

                reversed:
                    this.globalReversed
            },

            camera: {
                zoom:
                    this.zoom,

                scrollX:
                    this.cameras
                        .main
                        .scrollX,

                scrollY:
                    this.cameras
                        .main
                        .scrollY
            },

            nodes,

            connections:
                deepClone(
                    this.connections
                )
        };
    }


    loadSerialized(data) {

        if (
            !data ||
            !Array.isArray(
                data.nodes
            ) ||
            !Array.isArray(
                data.connections
            )
        ) {

            throw new Error(
                "Invalid PoetryFactory JSON."
            );
        }


        this.clearWorkspace(
            false
        );


        if (
            data.layout
        ) {

            if (
                data.layout.orientation ===
                "vertical"
            ) {

                this.globalOrientation =
                    "vertical";
            }
            else {

                this.globalOrientation =
                    "horizontal";
            }


            this.globalReversed =
                Boolean(
                    data.layout.reversed
                );
        }


        /*
         * 先建立节点。
         */
        for (
            const savedNode of
            data.nodes
        ) {

            if (
                !MACHINE_DEFINITIONS[
                    savedNode.machineType
                ]
            ) {
                continue;
            }


            this.createNode(
                savedNode.machineType,
                Number(
                    savedNode.x
                ) || 0,
                Number(
                    savedNode.y
                ) || 0,
                {
                    id:
                        savedNode.id,

                    letter:
                        savedNode.letter,

                    symbol:
                        savedNode.symbol,

                    orientation:
                        savedNode.orientation !== undefined
                            ? savedNode.orientation
                            : this.globalOrientation,

                    reversed:
                        savedNode.reversed !== undefined
                            ? Boolean(savedNode.reversed)
                            : this.globalReversed
                }
            );
        }


        /*
         * createNode 产生了标准 port ID，
         * 所以旧连接可以直接恢复。
         */
        this.connections = [];


        for (
            const connection of
            data.connections
        ) {

            const from =
                this.findPortById(
                    connection
                        .fromPortId
                );

            const to =
                this.findPortById(
                    connection
                        .toPortId
                );


            if (
                from &&
                to
            ) {

                this.connections.push({
                    id:
                        connection.id ||
                        generateId(
                            "connection"
                        ),

                    fromPortId:
                        connection
                            .fromPortId,

                    toPortId:
                        connection
                            .toPortId,

                    dataType:
                        connection
                            .dataType ||
                        from.dataType
                });
            }
        }


        if (
            data.camera
        ) {

            const zoom =
                clamp(
                    Number(
                        data.camera.zoom
                    ) || 1,
                    MIN_ZOOM,
                    MAX_ZOOM
                );


            this.zoom = zoom;

            this.cameras.main.setZoom(
                zoom
            );


            this.cameras.main.setScroll(
                Number(
                    data.camera.scrollX
                ) || 0,

                Number(
                    data.camera.scrollY
                ) || 0
            );
        }


        this.evaluateNetwork();

        this.selectNode(null);

        this.drawGrid();

        this.drawConnections();

        refreshGlobalLayoutControls();

        updateZoomLabel();
    }


    clearWorkspace(
        showMessage = true
    ) {

        const ids =
            Array.from(
                this.nodes.keys()
            );


        for (
            const id of ids
        ) {

            const node =
                this.nodes.get(
                    id
                );

            if (!node) {
                continue;
            }


            this.destroyNodePorts(node);

            node.container.destroy(
                true
            );
        }


        this.nodes.clear();

        this.connections = [];

        this.pendingPort = null;

        this.selectedNodeId = null;

        this.connectionGraphics.clear();

        this.evaluateNetwork();

        refreshSelectedNodeControls();


        if (showMessage) {
            showToast(
                "Workspace cleared."
            );
        }
    }
}


/* ============================================================
   PHASER BOOT
   ============================================================ */

const phaserConfig = {
    type: Phaser.AUTO,

    parent:
        "game-container",

    width:
        Math.max(
            1,
            Math.round(
                window.innerWidth
            )
        ),

    height:
        Math.max(
            1,
            Math.round(
                window.innerHeight
            )
        ),

    backgroundColor:
        "#292929",

    transparent:
        false,

    antialias:
        true,

    pixelArt:
        false,

    roundPixels:
        false,

    scene: [
        FactoryScene
    ],

    scale: {
        mode:
            Phaser.Scale.RESIZE,

        autoCenter:
            Phaser.Scale.NO_CENTER,

        width:
            Math.max(
                1,
                Math.round(
                    window.innerWidth
                )
            ),

        height:
            Math.max(
                1,
                Math.round(
                    window.innerHeight
                )
            )
    },

    render: {
        antialias:
            true,

        pixelArt:
            false,

        roundPixels:
            false
    },

    input: {
        mouse: {
            preventDefaultWheel:
                true
        }
    }
};


const game =
    new Phaser.Game(
        phaserConfig
    );


/* ============================================================
   MACHINE CREATION
   ============================================================ */

function createMachineAtCenter(
    machineType,
    options = {}
) {

    if (!factoryScene) {
        return;
    }


    const center =
        factoryScene
            .getCanvasCenterWorld();


    /*
     * 每次稍微偏移，避免连续生成完全叠在一起。
     */
    const count =
        factoryScene.nodes.size;


    const offset =
        (count % 6) * 14;


    const node =
        factoryScene.createNode(
            machineType,

            center.x +
                offset,

            center.y +
                offset,

            options
        );


    if (node) {
        factoryScene.selectNode(
            node.id
        );
    }
}


/* ============================================================
   LETTER SOURCE VALIDATION
   ============================================================ */

function normalizeLetterInput(
    value
) {

    if (
        typeof value !==
        "string"
    ) {
        return "";
    }


    return value
        .slice(0, 1)
        .toLowerCase();
}


function isLatinLetter(
    value
) {

    return /^[a-z]$/.test(
        value
    );
}


function normalizeSymbolInput(
    value
) {

    if (
        typeof value !== "string"
    ) {
        return "";
    }


    return Array.from(value)[0] || "";
}


function isAllowedSymbolModifier(
    value
) {

    return ALLOWED_SYMBOL_MODIFIERS.includes(
        value
    );
}


function createLetterSource() {

    DOM.letterError.textContent =
        "";


    const value =
        normalizeLetterInput(
            DOM.letterInput.value
        );


    DOM.letterInput.value =
        value;


    if (
        !isLatinLetter(value)
    ) {

        DOM.letterError.textContent =
            "Only one Latin letter from A-Z is allowed.";

        return;
    }


    if (
        factoryScene
            .letterSourceExists(
                value
            )
    ) {

        DOM.letterError.textContent =
            `Letter resource "${value}" already exists.`;

        return;
    }


    createMachineAtCenter(
        "letterSource",
        {
            letter:
                value
        }
    );


    DOM.letterInput.value =
        "";

    DOM.letterError.textContent =
        "";
}


function createSymbolModifier() {

    DOM.symbolError.textContent =
        "";


    const value =
        normalizeSymbolInput(
            DOM.symbolInput.value
        );


    DOM.symbolInput.value =
        value;


    if (!value) {

        DOM.symbolError.textContent =
            "Enter one punctuation mark.";

        return;
    }


    if (
        !isAllowedSymbolModifier(
            value
        )
    ) {

        DOM.symbolError.textContent =
            `"${value}" is not an allowed punctuation mark.`;

        return;
    }


    createMachineAtCenter(
        "symbolModifier",
        {
            symbol:
                value
        }
    );


    DOM.symbolInput.value =
        "";

    DOM.symbolError.textContent =
        "";
}


/* ============================================================
   LEFT PANEL
   ============================================================ */

document
    .querySelectorAll(
        ".machine-button"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const machineType =
                        button.dataset
                            .machine;

                    createMachineAtCenter(
                        machineType
                    );
                }
            );
        }
    );


DOM.createLetterBtn.addEventListener(
    "click",
    createLetterSource
);


DOM.letterInput.addEventListener(
    "input",
    () => {

        const raw =
            DOM.letterInput.value;


        DOM.letterInput.value =
            raw
                .slice(0, 1)
                .toLowerCase();


        DOM.letterError.textContent =
            "";
    }
);


DOM.letterInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {
            createLetterSource();
        }
    }
);


DOM.createSymbolModifierBtn.addEventListener(
    "click",
    createSymbolModifier
);


DOM.symbolInput.addEventListener(
    "input",
    () => {

        const value =
            normalizeSymbolInput(
                DOM.symbolInput.value
            );


        DOM.symbolInput.value =
            value;

        DOM.symbolError.textContent =
            "";
    }
);


DOM.symbolInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {
            createSymbolModifier();
        }
    }
);


/* ============================================================
   AUTO COLLAPSE PANELS
   ============================================================ */

let leftPanelCloseTimer = null;
let bottomPanelCloseTimer = null;


function openLeftPanel() {

    clearTimeout(
        leftPanelCloseTimer
    );


    DOM.machinePanel
        .classList.remove(
            "collapsed"
        );
}


function closeLeftPanel() {

    clearTimeout(
        leftPanelCloseTimer
    );


    DOM.machinePanel
        .classList.add(
            "collapsed"
        );
}


function scheduleLeftPanelClose() {

    clearTimeout(
        leftPanelCloseTimer
    );


    leftPanelCloseTimer =
        setTimeout(
            () => {

                closeLeftPanel();

            },
            180
        );
}


DOM.leftHoverTrigger
    .addEventListener(
        "mouseenter",
        () => {

            openLeftPanel();
        }
    );


DOM.machinePanel
    .addEventListener(
        "mouseenter",
        () => {

            openLeftPanel();
        }
    );


DOM.machinePanel
    .addEventListener(
        "mouseleave",
        event => {

            if (
                event.relatedTarget ===
                DOM.leftHoverTrigger
            ) {
                return;
            }


            scheduleLeftPanelClose();
        }
    );


DOM.leftHoverTrigger
    .addEventListener(
        "mouseleave",
        event => {

            if (
                DOM.machinePanel.contains(
                    event.relatedTarget
                )
            ) {
                return;
            }


            scheduleLeftPanelClose();
        }
    );


function openBottomPanel() {

    clearTimeout(
        bottomPanelCloseTimer
    );


    DOM.bottomPanel
        .classList.remove(
            "collapsed"
        );
}


function closeBottomPanel() {

    clearTimeout(
        bottomPanelCloseTimer
    );


    DOM.bottomPanel
        .classList.add(
            "collapsed"
        );
}


function scheduleBottomPanelClose() {

    clearTimeout(
        bottomPanelCloseTimer
    );


    bottomPanelCloseTimer =
        setTimeout(
            () => {

                closeBottomPanel();

            },
            180
        );
}


DOM.bottomHoverTrigger
    .addEventListener(
        "mouseenter",
        () => {

            openBottomPanel();
        }
    );


DOM.bottomPanel
    .addEventListener(
        "mouseenter",
        () => {

            openBottomPanel();
        }
    );


DOM.bottomPanel
    .addEventListener(
        "mouseleave",
        event => {

            if (
                event.relatedTarget ===
                DOM.bottomHoverTrigger
            ) {
                return;
            }


            scheduleBottomPanelClose();
        }
    );


DOM.bottomHoverTrigger
    .addEventListener(
        "mouseleave",
        event => {

            if (
                DOM.bottomPanel.contains(
                    event.relatedTarget
                )
            ) {
                return;
            }


            scheduleBottomPanelClose();
        }
    );


/* ============================================================
   NODE CONTROLS
   ============================================================ */

function refreshSelectedNodeControls() {

    if (!factoryScene) {
        return;
    }


    const node =
        factoryScene.getSelectedNode();

    const selectedPortId =
        factoryScene.selectedPortId;


    DOM.nodeControls
        .classList.remove(
            "disabled"
        );


    if (
        selectedPortId
    ) {

        DOM.selectedNodeLabel.textContent =
            "CONNECTION SELECTED";

        DOM.deleteNode.textContent =
            "DELETE CONNECTION";

        DOM.deleteNode.disabled =
            false;

        DOM.deleteNode.classList.remove(
            "control-disabled"
        );

        refreshGlobalLayoutControls();

        return;
    }


    if (!node) {

        DOM.selectedNodeLabel.textContent =
            "GLOBAL LAYOUT";

        DOM.deleteNode.textContent =
            "DELETE";

        DOM.deleteNode.disabled =
            true;


        DOM.deleteNode.classList.add(
            "control-disabled"
        );
    }
    else {

        let label =
            node.definition.title;


        if (
            node.machineType ===
            "letterSource"
        ) {
            label +=
                ` [${node.letter}]`;
        }

        if (
            node.machineType ===
            "symbolModifier"
        ) {
            label +=
                ` [${node.symbol}]`;
        }


        DOM.selectedNodeLabel.textContent =
            label;

        DOM.deleteNode.textContent =
            "DELETE NODE";

        DOM.deleteNode.disabled =
            false;


        DOM.deleteNode.classList.remove(
            "control-disabled"
        );
    }


    refreshGlobalLayoutControls();
}


function refreshGlobalLayoutControls() {

    if (!factoryScene) {
        return;
    }


    DOM.orientationHorizontal
        .classList.toggle(
            "active",
            factoryScene.globalOrientation ===
                "horizontal"
        );


    DOM.orientationVertical
        .classList.toggle(
            "active",
            factoryScene.globalOrientation ===
                "vertical"
        );


    DOM.reverseNode
        .classList.toggle(
            "active",
            factoryScene.globalReversed
        );
}


DOM.orientationHorizontal
    .addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();


            if (!factoryScene) {
                return;
            }

            factoryScene
                .setGlobalOrientation(
                    "horizontal"
                );
        }
    );


DOM.orientationVertical
    .addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();


            if (!factoryScene) {
                return;
            }

            factoryScene
                .setGlobalOrientation(
                    "vertical"
                );
        }
    );


DOM.reverseNode
    .addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();


            if (!factoryScene) {
                return;
            }

            factoryScene
                .reverseGlobalLayout();
        }
    );


DOM.deleteNode
    .addEventListener(
        "click",
        () => {

            factoryScene
                ?.deleteSelectedNode();
        }
    );


/* ============================================================
   ZOOM CONTROLS
   ============================================================ */

function updateZoomLabel() {

    if (!factoryScene) {
        return;
    }


    DOM.zoomLabel.textContent =
        Math.round(
            factoryScene.zoom *
            100
        ) + "%";
}


DOM.zoomIn.addEventListener(
    "click",
    event => {

        event.preventDefault();
        event.stopPropagation();


        if (!factoryScene) {
            return;
        }


        factoryScene.changeZoom(
            factoryScene.zoom *
            ZOOM_FACTOR
        );
    }
);


DOM.zoomOut.addEventListener(
    "click",
    event => {

        event.preventDefault();
        event.stopPropagation();


        if (!factoryScene) {
            return;
        }


        factoryScene.changeZoom(
            factoryScene.zoom /
            ZOOM_FACTOR
        );
    }
);


DOM.zoomReset.addEventListener(
    "click",
    event => {

        event.preventDefault();
        event.stopPropagation();


        if (!factoryScene) {
            return;
        }


        factoryScene.resetZoom();
    }
);


/* ============================================================
   LEVER
   ============================================================ */

function refreshLeverState() {

    if (!factoryScene) {
        return;
    }


    const ready =
        factoryScene
            .getReadyPoemMachines()
            .length > 0;


    DOM.lever.classList.toggle(
        "ready",
        ready
    );


    DOM.lever.classList.toggle(
        "disabled",
        !ready
    );


}


DOM.lever.addEventListener(
    "click",
    () => {

        if (!factoryScene) {
            return;
        }


        const result =
            factoryScene
                .generatePoemData();


        if (!result) {

            showToast(
                "The Poem Synthesizer has no valid stanza input."
            );

            return;
        }


        DOM.lever.classList.add(
            "pulled"
        );


        setTimeout(
            () => {

                DOM.lever
                    .classList.remove(
                        "pulled"
                    );

            },
            260
        );


        if (
            containsNeverGonnaGiveYouUp(
                result.poem
            )
        ) {

            playNeverGonnaMusic();
        }
        else {

            neverGonnaAudio.pause();

            neverGonnaAudio.currentTime =
                0;
        }


        openGeneratedPoem(
            result.poem
        );


        console.log(
            "PoetryFactory production trace:",
            result.trace
        );
    }
);


/* ============================================================
   POEM OUTPUT
   ============================================================ */

function openGeneratedPoem(
    poem
) {

    DOM.poemContent.textContent =
        poem;

    DOM.poemOverlay
        .classList.remove(
            "hidden"
        );
}


function closeGeneratedPoem() {

    DOM.poemOverlay
        .classList.add(
            "hidden"
        );
}


DOM.closePoemOutput
    .addEventListener(
        "click",
        closeGeneratedPoem
    );


DOM.poemOverlay
    .addEventListener(
        "pointerdown",
        event => {

            if (
                event.target ===
                DOM.poemOverlay
            ) {
                closeGeneratedPoem();
            }
        }
    );


/* ============================================================
   SAVE
   ============================================================ */

function saveWorkspaceToJson() {

    if (!factoryScene) {
        return;
    }


    const data =
        factoryScene.serialize();


    const json =
        JSON.stringify(
            data,
            null,
            2
        );


    const blob =
        new Blob(
            [json],
            {
                type:
                    "application/json"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    const now =
        new Date();


    const stamp = [
        now.getFullYear(),

        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        ),

        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        ),

        "_",

        String(
            now.getHours()
        ).padStart(
            2,
            "0"
        ),

        String(
            now.getMinutes()
        ).padStart(
            2,
            "0"
        )
    ].join("");


    link.href =
        url;

    link.download =
        `poetry-factory-${stamp}.json`;


    document.body.appendChild(
        link
    );

    link.click();

    link.remove();


    setTimeout(
        () => {

            URL.revokeObjectURL(
                url
            );

        },
        100
    );


    showToast(
        "Workspace saved as JSON."
    );
}


/* ============================================================
   LOAD
   ============================================================ */

function requestLoadJson() {

    DOM.jsonFileInput.value =
        "";

    DOM.jsonFileInput.click();
}


DOM.jsonFileInput
    .addEventListener(
        "change",
        async event => {

            const file =
                event.target.files?.[0];


            if (!file) {
                return;
            }


            try {

                const text =
                    await file.text();


                const data =
                    JSON.parse(text);


                factoryScene
                    .loadSerialized(
                        data
                    );


                currentPageSnapshot =
                    deepClone(data);


                showToast(
                    "Workspace loaded."
                );
            }
            catch (error) {

                console.error(error);

                showToast(
                    "Unable to load this JSON file."
                );
            }
        }
    );


/* ============================================================
   CURRENT PAGE
   ============================================================ */

function saveCurrentPageSnapshot() {

    if (!factoryScene) {
        return;
    }


    currentPageSnapshot =
        deepClone(
            factoryScene.serialize()
        );


    showToast(
        "Current workspace stored."
    );
}


/* ============================================================
   BUILTIN TEMPLATES
   ============================================================ */

async function loadTemplateJson(
    filePath,
    successMessage
) {

    if (!factoryScene) {

        return;
    }


    try {

        const response =
            await fetch(
                filePath,
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const data =
            await response.json();


        currentPageSnapshot =
            deepClone(
                factoryScene.serialize()
            );


        factoryScene
            .loadSerialized(
                deepClone(
                    data
                )
            );


        showToast(
            successMessage
        );
    }
    catch (error) {

        console.error(
            `Unable to load ${filePath}:`,
            error
        );


        showToast(
            "Unable to load this example."
        );
    }
}


function containsNeverGonnaGiveYouUp(
    text
) {

    if (
        typeof text !==
        "string"
    ) {

        return false;
    }


    return text
        .toLowerCase()
        .includes(
            "never gonna give you up"
        );
}


function playNeverGonnaMusic() {

    neverGonnaAudio.pause();

    neverGonnaAudio.currentTime =
        0;


    const playResult =
        neverGonnaAudio.play();


    if (
        playResult &&
        typeof playResult.catch ===
            "function"
    ) {

        playResult.catch(
            error => {

                console.warn(
                    "Audio playback was blocked:",
                    error
                );
            }
        );
    }
}


/* ============================================================
   BOTTOM BUTTONS
   ============================================================ */

DOM.currentPageBtn
    .addEventListener(
        "click",
        () => {

            /*
             * 第一次点击：
             * 记录当前状态。
             *
             * 如果已经记录：
             * 恢复记录的当前页面。
             */

            if (
                !currentPageSnapshot
            ) {

                saveCurrentPageSnapshot();

                return;
            }


            factoryScene
                ?.loadSerialized(
                    deepClone(
                        currentPageSnapshot
                    )
                );


            showToast(
                "Current workspace restored."
            );
        }
    );


DOM.template1Btn
    .addEventListener(
        "click",
        () => {

            loadTemplateJson(
                "./sunday.json",
                "Example loaded."
            );
        }
    );


DOM.template2Btn
    .addEventListener(
        "click",
        () => {

            loadTemplateJson(
                "./never.json",
                "NoPoemHere loaded."
            );
        }
    );


DOM.clearBtn
    .addEventListener(
        "click",
        () => {

            factoryScene
                ?.clearWorkspace(
                    true
                );
        }
    );


DOM.saveBtn
    .addEventListener(
        "click",
        saveWorkspaceToJson
    );


DOM.loadBtn
    .addEventListener(
        "click",
        requestLoadJson
    );


/* ============================================================
   KEYBOARD
   ============================================================ */

window.addEventListener(
    "keydown",
    event => {

        /*
         * 输入字母框时不要触发画布快捷键。
         */
        if (
            document.activeElement ===
                DOM.letterInput ||
            document.activeElement ===
                DOM.symbolInput
        ) {
            return;
        }


        /*
         * Delete 删除节点。
         */
        if (
            event.key === "Delete"
        ) {

            factoryScene
                ?.deleteSelectedNode();
        }


        /*
         * Escape：
         *
         * 取消连线 / 取消选择 / 关闭诗歌结果
         */
        if (
            event.key === "Escape"
        ) {

            closeGeneratedPoem();

            if (
                factoryScene
            ) {

                factoryScene
                    .cancelConnection();

                factoryScene.selectedPortId =
                    null;

                factoryScene
                    .selectNode(null);

                factoryScene
                    .redrawAllPorts();
            }
        }
    }
);


/* ============================================================
   WINDOW RESIZE
   ============================================================ */

let resizeFrame = null;

window.addEventListener(
    "resize",
    () => {

        if (resizeFrame !== null) {
            cancelAnimationFrame(
                resizeFrame
            );
        }


        resizeFrame =
            requestAnimationFrame(() => {

                resizeFrame = null;

                if (!factoryScene) {
                    return;
                }

                const container =
                    document.getElementById(
                        "game-container"
                    );

                if (!container) {
                    return;
                }

                const rect =
                    container.getBoundingClientRect();

                factoryScene.scale.resize(
                    Math.max(
                        1,
                        Math.round(rect.width)
                    ),
                    Math.max(
                        1,
                        Math.round(rect.height)
                    )
                );
            });
    }
);


/* ============================================================
   DEBUG API
   ------------------------------------------------------------
   方便之后你手动制作模板。
   
   浏览器 Console：
   
   PoetryFactory.export()
   PoetryFactory.clear()
   PoetryFactory.load({...})
   
   可以直接拿 serialize 结果保存为 JSON 模板文件。
   ============================================================ */

window.PoetryFactory = {

    export() {

        if (!factoryScene) {
            return null;
        }

        const data =
            factoryScene.serialize();

        console.log(
            JSON.stringify(
                data,
                null,
                2
            )
        );

        return data;
    },


    load(data) {

        factoryScene
            ?.loadSerialized(
                data
            );
    },


    clear() {

        factoryScene
            ?.clearWorkspace();
    },


    scene() {

        return factoryScene;
    }
};
