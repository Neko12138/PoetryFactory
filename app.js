import nspell from "nspell";
import dictionaryAff from "./node_modules/dictionary-en/index.aff?raw";
import dictionaryDic from "./node_modules/dictionary-en/index.dic?raw";


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
        title: "REPLICATOR",
        subtitle: "COPY x3",
        kind: "splitter",
        inputType: null,
        outputType: null
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

    randomizer: {
        title: "RANDOMIZER",
        subtitle: "",
        kind: "randomizer",
        inputType: TYPE.WORD,
        outputType: TYPE.WORD
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
    },

    randomizerHorizontal: {
        width: 180,
        height: 130
    },

    randomizerVertical: {
        width: 220,
        height: 104
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


const spellChecker =
    nspell(
        dictionaryAff,
        dictionaryDic
    );


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

    limiterBlind: document.getElementById("limiter-blind"),
    limiterBlindPlus: document.getElementById("limiter-blind-plus"),
    limiterAncientPoetry:
        document.getElementById("limiter-ancient-poetry"),
    limiterSpellingCompulsion:
        document.getElementById("limiter-spelling-compulsion"),
    limiterAcrostic:
        document.getElementById("limiter-acrostic"),
    limiterAcrosticPlus:
        document.getElementById("limiter-acrostic-plus"),

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

const LIMITER_MODE = Object.freeze({
    NONE: "none",
    BLIND: "blind",
    BLIND_PLUS: "blindPlus"
});

const STAGE_SYNTHESIZERS = new Set([
    "primary",
    "word",
    "intermediate",
    "sentence",
    "advanced",
    "stanza",
    "primal"
]);

let limiterMode =
    LIMITER_MODE.NONE;

let ancientPoetryEnabled = false;

let spellingCompulsionEnabled = false;

let acrosticEnabled = false;

let acrosticPlusEnabled = false;

let blindAnimationTimer = null;


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


function isStageSynthesizer(node) {
    return Boolean(
        node &&
        STAGE_SYNTHESIZERS.has(
            node.machineType
        )
    );
}


function isLimiterAffectedNode(node) {
    return Boolean(
        isStageSynthesizer(
            node
        ) ||
        node?.machineType === "randomizer"
    );
}


function isSpellingConstrainedNode(node) {
    return Boolean(
        node &&
        node.definition &&
        node.definition.outputType ===
            TYPE.WORD
    );
}


function extractSpellingWords(text) {

    if (
        typeof text !==
        "string"
    ) {
        return [];
    }


    return (
        text
            .toLowerCase()
            .match(
                /[a-z]+(?:'[a-z]+)?/g
            ) || []
    );
}


function normalizeSpellingWord(word) {

    if (
        typeof word !==
        "string"
    ) {
        return "";
    }


    return word
        .trim()
        .toLowerCase()
        .replace(
            /^[^a-z']+|[^a-z']+$/g,
            ""
        );
}


function isWordSpelledCorrectly(word) {

    const cleanWord =
        normalizeSpellingWord(
            word
        );


    if (!cleanWord) {
        return false;
    }


    return spellChecker.correct(
        cleanWord
    );
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
                22 * scale
            ),

        subtitle:
            Math.round(
                14.5 * scale
            ),

        output:
            Math.round(
                16 * scale
            ),

        letter:
            Math.round(
                46 * scale
            ),

        randomizer:
            Math.round(
                16 * scale
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

        this.evaluationRunId = 0;

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
            this.refreshAllOutputDisplays();
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


            if (node.outputText) {
                node.outputText.setFontSize(
                    Math.max(
                        12,
                        fonts.output
                    )
                );
            }


            if (node.randomizerText) {
                node.randomizerText.setFontSize(
                    Math.max(
                        12,
                        fonts.randomizer
                    )
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

            applyResolution(
                node.outputText
            );

            applyResolution(
                node.randomizerText
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
            outputText: null,
            randomizerText: null,
            rhymeIndicator: null,
            spellingIndicator: null,
            acrosticIndicator: null,

            ports: [],

            inputPorts: [],
            outputPorts: [],

            validOutput: false,

            rhymeValid: true,

            spellingValid: true,

            acrosticValid: true,

            actualOutput: "",

            displayOutput: "",

            replicatedType: null,

            replicatorInputPortId: null,

            randomizerChoice: null,

            randomizerChoiceRunId: -1,

            randomizerDisplayA: "",

            randomizerDisplayB: ""
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
            isStageSynthesizer(
                node
            )
        ) {

            node.outputText =
                this.add.text(
                    0,
                    0,
                    "",
                    {
                        fontFamily:
                            'Consolas, "Courier New", monospace',
                        fontSize:
                            `${Math.max(
                                12,
                                fonts.output
                            )}px`,
                        color: "#eeeeee",
                        align: "center",
                        wordWrap: {
                            width: 210,
                            useAdvancedWrap: true
                        }
                    }
                );

            node.outputText.setOrigin(
                0.5,
                0.5
            );

            node.container.add(
                node.outputText
            );
        }


        if (
            machineType ===
            "stanza"
        ) {

            node.rhymeIndicator =
                this.add.circle(
                    0,
                    0,
                    6,
                    0x555555
                );

            node.rhymeIndicator
                .setStrokeStyle(
                    1,
                    0x999999,
                    1
                );

            node.container.add(
                node.rhymeIndicator
            );
        }


        if (
            isSpellingConstrainedNode(
                node
            )
        ) {

            node.spellingIndicator =
                this.add.circle(
                    0,
                    0,
                    6,
                    0x555555
                );

            node.spellingIndicator
                .setStrokeStyle(
                    1,
                    0x999999,
                    1
                );

            node.container.add(
                node.spellingIndicator
            );
        }


        if (
            machineType ===
            "sentence"
        ) {

            node.acrosticIndicator =
                this.add.circle(
                    0,
                    0,
                    6,
                    0x555555
                );

            node.acrosticIndicator
                .setStrokeStyle(
                    1,
                    0x999999,
                    1
                );

            node.container.add(
                node.acrosticIndicator
            );
        }


        if (
            machineType ===
            "randomizer"
        ) {

            node.randomizerText =
                this.add.text(
                    0,
                    12,
                    "",
                    {
                        fontFamily:
                            'Consolas, "Courier New", monospace',
                        fontSize:
                            `${Math.max(
                                12,
                                fonts.randomizer
                            )}px`,
                        color: "#eeeeee",
                        align: "center"
                    }
                );

            node.randomizerText.setOrigin(
                0.5,
                0.5
            );

            node.container.add(
                node.randomizerText
            );
        }


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
        else if (
            def.kind === "randomizer"
        ) {

            if (
                node.orientation ===
                "horizontal"
            ) {
                node.width =
                    NODE_SIZES
                        .randomizerHorizontal
                        .width;

                node.height =
                    NODE_SIZES
                        .randomizerHorizontal
                        .height;
            }
            else {
                node.width =
                    NODE_SIZES
                        .randomizerVertical
                        .width;

                node.height =
                    NODE_SIZES
                        .randomizerVertical
                        .height;
            }
        }
        else {

            if (
                node.machineType === "poem"
            ) {

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
            else if (
                isStageSynthesizer(
                    node
                )
            ) {

                const adaptiveSize =
                    this.calculateAdaptiveNodeSize(
                        node,
                        node.displayOutput || ""
                    );

                node.width =
                    adaptiveSize.width;

                node.height =
                    adaptiveSize.height;
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


        if (
            node.definition.kind ===
            "randomizer"
        ) {

            node.titleText.setPosition(
                0,
                -node.height / 2 + 24
            );

            node.subtitleText.setPosition(
                0,
                -node.height / 2 + 40
            );

            if (
                node.randomizerText
            ) {
                node.randomizerText.setPosition(
                    0,
                    13
                );
            }

            return;
        }


        node.titleText.setPosition(
            0,
            -node.height / 2 + 22
        );

        node.subtitleText.setPosition(
            0,
            -node.height / 2 + 39
        );

        if (
            node.outputText
        ) {

            node.outputText.setPosition(
                0,
                14
            );

            node.outputText.setWordWrapWidth(
                Math.max(
                    80,
                    node.width - 32
                )
            );
        }


        if (
            node.machineType ===
                "stanza" &&
            node.rhymeIndicator
        ) {

            node.rhymeIndicator
                .setPosition(
                    node.width / 2 - 14,
                    -node.height / 2 + 14
                );
        }


        if (
            isSpellingConstrainedNode(
                node
            ) &&
            node.spellingIndicator
        ) {

            node.spellingIndicator
                .setPosition(
                    node.width / 2 - 14,
                    -node.height / 2 + 14
                );
        }


        if (
            node.machineType ===
                "sentence" &&
            node.acrosticIndicator
        ) {

            node.acrosticIndicator
                .setPosition(
                    node.width / 2 - 14,
                    -node.height / 2 + 14
                );
        }
    }


    calculateAdaptiveNodeSize(
        node,
        text
    ) {

        const minimumWidth =
            node.orientation === "vertical"
                ? 184
                : 132;

        const minimumHeight =
            node.orientation === "vertical"
                ? 126
                : 184;


        if (!text) {
            return {
                width: minimumWidth,
                height: minimumHeight
            };
        }


        const lines =
            String(text)
                .split("\n");

        const longestLine =
            Math.max(
                1,
                ...lines.map(
                    line =>
                        line.length
                )
            );

        const charactersPerLine =
            24;

        const wrappedLines =
            lines.reduce(
                (count, line) =>
                    count +
                    Math.max(
                        1,
                        Math.ceil(
                            line.length /
                            charactersPerLine
                        )
                    ),
                0
            );

        const width =
            clamp(
                Math.max(
                    minimumWidth,
                    Math.min(
                        longestLine,
                        charactersPerLine
                    ) * 9 + 54
                ),
                minimumWidth,
                280
            );

        const height =
            Math.max(
                minimumHeight,
                98 +
                    wrappedLines * 20
            );

        return {
            width,
            height
        };
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
         * REPLICATOR:
         * The internal kind remains "splitter" so old JSON files
         * with _split_0...3 ports continue to load.
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
                                null,

                            localX: p.x,
                            localY: p.y,

                            direction:
                                p.direction,

                            bidirectional: true,

                            alwaysLit: false
                        }
                    );
                }
            );

            return;
        }


        /*
         * RANDOMIZER:
         * two WORD inputs, one WORD output.
         */
        if (
            def.kind === "randomizer"
        ) {

            if (
                node.orientation ===
                "horizontal"
            ) {

                const inputSide =
                    node.reversed
                        ? "right"
                        : "left";

                const outputSide =
                    node.reversed
                        ? "left"
                        : "right";

                const inputX =
                    inputSide === "left"
                        ? -node.width / 2
                        : node.width / 2;

                const outputX =
                    outputSide === "left"
                        ? -node.width / 2
                        : node.width / 2;


                this.createPort(
                    node,
                    {
                        id:
                            node.id +
                            "_input_0",

                        role: "input",
                        dataType: TYPE.WORD,

                        localX: inputX,
                        localY: -node.height * 0.22,

                        direction: inputSide
                    }
                );

                this.createPort(
                    node,
                    {
                        id:
                            node.id +
                            "_input_1",

                        role: "input",
                        dataType: TYPE.WORD,

                        localX: inputX,
                        localY: node.height * 0.22,

                        direction: inputSide
                    }
                );

                this.createPort(
                    node,
                    {
                        id:
                            node.id +
                            "_output",

                        role: "output",
                        dataType: TYPE.WORD,

                        localX: outputX,
                        localY: 0,

                        direction: outputSide
                    }
                );
            }
            else {

                const inputSide =
                    node.reversed
                        ? "bottom"
                        : "top";

                const outputSide =
                    node.reversed
                        ? "top"
                        : "bottom";

                const inputY =
                    inputSide === "top"
                        ? -node.height / 2
                        : node.height / 2;

                const outputY =
                    outputSide === "top"
                        ? -node.height / 2
                        : node.height / 2;


                this.createPort(
                    node,
                    {
                        id:
                            node.id +
                            "_input_0",

                        role: "input",
                        dataType: TYPE.WORD,

                        localX: -node.width * 0.22,
                        localY: inputY,

                        direction: inputSide
                    }
                );

                this.createPort(
                    node,
                    {
                        id:
                            node.id +
                            "_input_1",

                        role: "input",
                        dataType: TYPE.WORD,

                        localX: node.width * 0.22,
                        localY: inputY,

                        direction: inputSide
                    }
                );

                this.createPort(
                    node,
                    {
                        id:
                            node.id +
                            "_output",

                        role: "output",
                        dataType: TYPE.WORD,

                        localX: 0,
                        localY: outputY,

                        direction: outputSide
                    }
                );
            }


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

        if (
            node.machineType ===
            "splitter"
        ) {

            if (
                !node.replicatedType
            ) {
                return TYPE_COLORS.INVALID;
            }


            return (
                TYPE_COLORS[
                    node.replicatedType
                ] ||
                TYPE_COLORS.INVALID
            );
        }


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
         * Normal always-lit outputs.
         */
        if (
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


    getEffectivePortType(port) {

        if (!port) {
            return null;
        }


        const node =
            this.nodes.get(
                port.nodeId
            );


        if (!node) {
            return null;
        }


        if (
            node.machineType ===
            "splitter"
        ) {
            return (
                node.replicatedType ||
                null
            );
        }


        return (
            port.dataType ||
            null
        );
    }


    getPortCapabilities(port) {

        const node =
            this.nodes.get(
                port.nodeId
            );


        if (!node) {
            return {
                canInput: false,
                canOutput: false
            };
        }


        if (
            node.machineType ===
            "splitter"
        ) {

            if (
                !node.replicatorInputPortId ||
                !node.replicatedType
            ) {
                return {
                    canInput: true,
                    canOutput: false
                };
            }


            if (
                port.id ===
                node.replicatorInputPortId
            ) {
                return {
                    canInput: true,
                    canOutput: false
                };
            }


            return {
                canInput: false,
                canOutput: true
            };
        }


        return {
            canInput:
                port.role === "input",

            canOutput:
                port.role === "output"
        };
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


        const connectionType =
            this.getEffectivePortType(
                from
            );


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
                connectionType
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

        const firstCapabilities =
            this.getPortCapabilities(
                first
            );

        const secondCapabilities =
            this.getPortCapabilities(
                second
            );


        /*
         * 点击起点可以是输出，
         * 也可以是输入。
         *
         * 所以方向根据端口能力自动判断。
         */

        if (
            firstCapabilities.canOutput &&
            secondCapabilities.canInput
        ) {

            return {
                from: first,
                to: second
            };
        }


        if (
            secondCapabilities.canOutput &&
            firstCapabilities.canInput
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

        for (
            const node of
            this.nodes.values()
        ) {

            if (
                node.machineType ===
                "splitter"
            ) {
                node.replicatedType =
                    null;

                node.replicatorInputPortId =
                    null;

                node.validOutput =
                    false;
            }
        }


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


        this.refreshAllOutputDisplays();

        this.refreshSpellingCompulsionState();

        this.refreshAncientPoetryState();

        this.refreshAcrosticState();

        this.drawConnections();

        refreshLeverState();
    }


    refreshAllOutputDisplays() {

        for (
            const node of
            this.nodes.values()
        ) {
            this.updateNodeActualOutput(
                node
            );
        }


        for (
            const node of
            this.nodes.values()
        ) {

            if (
                !isStageSynthesizer(
                    node
                )
            ) {
                continue;
            }


            node.displayOutput =
                this.getNodeDisplayOutput(
                    node
                );


            if (
                node.outputText
            ) {
                node.outputText.setText(
                    node.displayOutput
                );
            }


            this.rebuildNode(
                node
            );
        }


        for (
            const node of
            this.nodes.values()
        ) {

            if (
                node.machineType ===
                "randomizer"
            ) {
                this.refreshRandomizerDisplay(
                    node
                );
            }
        }


        this.drawConnections();
    }


    updateNodeActualOutput(node) {

        if (
            !isStageSynthesizer(
                node
            )
        ) {
            return;
        }


        if (
            !node.validOutput
        ) {
            node.actualOutput =
                "";

            return;
        }


        try {
            node.actualOutput =
                this.evaluateTextNode(
                    node
                ) || "";
        }
        catch (error) {

            console.warn(
                "Unable to evaluate node output:",
                node.id,
                error
            );

            node.actualOutput =
                "";
        }
    }


    getNodeDisplayOutput(node) {

        if (
            !isStageSynthesizer(
                node
            ) ||
            !node.validOutput
        ) {
            return "";
        }


        switch (
            limiterMode
        ) {

            case LIMITER_MODE.BLIND:
                return this.generateBlindText(
                    node.actualOutput
                );

            case LIMITER_MODE.BLIND_PLUS:
                return "";

            case LIMITER_MODE.NONE:
            default:
                return (
                    node.actualOutput ||
                    ""
                );
        }
    }


    generateBlindText(original) {

        if (
            typeof original !== "string" ||
            original.length === 0
        ) {
            return "";
        }


        const alphabet =
            "abcdefghijklmnopqrstuvwxyz";

        let result = "";


        for (
            const char of
            original
        ) {

            if (
                char === " " ||
                char === "\n" ||
                char === "\t"
            ) {
                result += char;
                continue;
            }


            result +=
                alphabet[
                    Math.floor(
                        Math.random() *
                        alphabet.length
                    )
                ];
        }


        return result;
    }


    calculateRandomizerValidity(node) {

        const validInputIndices =
            new Set();

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


            const match =
                connection
                    .toPortId
                    .match(
                        /_input_(0|1)$/
                    );

            if (!match) {
                continue;
            }


            validInputIndices.add(
                Number(
                    match[1]
                )
            );
        }


        return (
            validInputIndices.has(0) &&
            validInputIndices.has(1)
        );
    }


    getRandomizerInputValues(
        node,
        visited = new Set()
    ) {

        const result = [
            "",
            ""
        ];

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


            const match =
                connection
                    .toPortId
                    .match(
                        /_input_(0|1)$/
                    );

            if (!match) {
                continue;
            }


            const index =
                Number(
                    match[1]
                );

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


            result[index] =
                this.evaluateTextNode(
                    sourceNode,
                    visited
                );
        }


        return result;
    }


    refreshRandomizerDisplay(node) {

        if (
            node.machineType !==
                "randomizer" ||
            !node.randomizerText
        ) {
            return;
        }


        const values =
            this.getRandomizerInputValues(
                node
            );

        const wordA =
            values[0] || "";

        const wordB =
            values[1] || "";


        node.randomizerDisplayA =
            wordA;

        node.randomizerDisplayB =
            wordB;


        if (
            limiterMode ===
            LIMITER_MODE.BLIND_PLUS
        ) {

            node.randomizerText.setText(
                ""
            );

            return;
        }


        if (
            limiterMode ===
            LIMITER_MODE.BLIND
        ) {

            const blindA =
                wordA
                    ? this.generateBlindText(
                        wordA
                    )
                    : "-";

            const blindB =
                wordB
                    ? this.generateBlindText(
                        wordB
                    )
                    : "-";


            node.randomizerText.setText(
                `${blindA} ↔ ${blindB}`
            );

            return;
        }


        node.randomizerText.setText(
            `${wordA || "-"} ↔ ${wordB || "-"}`
        );
    }


    getSpellingTextForNode(node) {

        if (
            node.machineType ===
            "randomizer"
        ) {

            return this
                .getRandomizerInputValues(
                    node,
                    new Set()
                )
                .filter(
                    value =>
                        value !== ""
                )
                .join(" ");
        }


        return this.evaluateTextNode(
            node,
            new Set()
        );
    }


    evaluateWordSpelling(node) {

        if (
            !isSpellingConstrainedNode(
                node
            )
        ) {
            return true;
        }


        const words =
            extractSpellingWords(
                this.getSpellingTextForNode(
                    node
                )
            );


        if (
            words.length === 0
        ) {
            return false;
        }


        return words.every(
            word =>
                isWordSpelledCorrectly(
                    word
                )
        );
    }


    nodePassesActiveConstraints(
        node,
        structurallyValid
    ) {

        if (
            !structurallyValid
        ) {
            return false;
        }


        if (
            spellingCompulsionEnabled &&
            isSpellingConstrainedNode(
                node
            )
        ) {
            return this.evaluateWordSpelling(
                node
            );
        }


        return true;
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
            return this
                .calculateReplicatorValidity(
                    node
                );
        }


        if (
            def.kind === "randomizer"
        ) {
            return this.nodePassesActiveConstraints(
                node,
                this.calculateRandomizerValidity(
                    node
                )
            );
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
            const fromType =
                this.getEffectivePortType(
                    fromPort
                );


            /*
             * 目标输入口自身类型也必须一致。
             */
            if (
                fromType !== def.inputType ||
                toPort.dataType !== def.inputType
            ) {
                continue;
            }


            /*
             * 源节点输出本身必须有效。
             */
            if (
                sourceNode.validOutput
                &&
                this.connectionIsValid(
                    connection
                )
            ) {
                return this
                    .nodePassesActiveConstraints(
                        node,
                        true
                    );
            }
        }


        return false;
    }


    calculateReplicatorValidity(node) {

        const portIds =
            new Set(
                node.ports.map(
                    port => port.id
                )
            );


        const incoming =
            this.connections.filter(
                connection =>
                    portIds.has(
                        connection.toPortId
                    )
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


            const sourceNode =
                this.nodes.get(
                    fromPort.nodeId
                );


            if (
                !sourceNode ||
                !sourceNode.validOutput
            ) {
                continue;
            }


            const sourceType =
                this.getEffectivePortType(
                    fromPort
                );


            if (
                sourceType !== TYPE.LETTER &&
                sourceType !== TYPE.WORD &&
                sourceType !== TYPE.SENTENCE &&
                sourceType !== TYPE.STANZA
            ) {
                continue;
            }


            node.replicatorInputPortId =
                connection.toPortId;

            node.replicatedType =
                sourceType;

            return true;
        }


        node.replicatorInputPortId =
            null;

        node.replicatedType =
            null;

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


        if (
            !fromNode.validOutput
        ) {
            return false;
        }


        const fromType =
            this.getEffectivePortType(
                from
            );


        if (!fromType) {
            return false;
        }


        if (
            toNode.machineType ===
            "splitter"
        ) {

            if (
                toNode.replicatorInputPortId &&
                to.id !==
                    toNode.replicatorInputPortId
            ) {
                return false;
            }


            return (
                fromType === TYPE.LETTER ||
                fromType === TYPE.WORD ||
                fromType === TYPE.SENTENCE ||
                fromType === TYPE.STANZA
            );
        }


        if (
            fromType !==
            to.dataType
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


            const effectiveType =
                this.getEffectivePortType(
                    from
                );


            const lineColor =
                TYPE_COLORS[
                    effectiveType
                ] ||
                TYPE_COLORS.INVALID;


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

            const pendingType =
                this.getEffectivePortType(
                    this.pendingPort
                );


            const color =
                TYPE_COLORS[
                    pendingType
                ] ||
                TYPE_COLORS.INVALID;


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


            if (!fromNode) {
                continue;
            }


            const effectiveType =
                this.getEffectivePortType(
                    fromPort
                );


            if (
                effectiveType ===
                    TYPE.STANZA &&
                fromNode.validOutput &&
                this.connectionIsValid(
                    connection
                )
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

        this.evaluationRunId += 1;

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


        if (
            ancientPoetryEnabled &&
            !this.productionChainPassesAncientPoetry(
                root,
                new Set()
            )
        ) {

            this.refreshAncientPoetryState();

            return null;
        }

        if (
            spellingCompulsionEnabled &&
            !this.productionChainPassesSpellingCompulsion(
                root,
                new Set()
            )
        ) {

            this.refreshSpellingCompulsionState();

            return null;
        }

        if (
            (
                acrosticEnabled ||
                acrosticPlusEnabled
            ) &&
            !this.productionChainPassesAcrostic(
                root
            )
        ) {

            this.refreshAcrosticState();

            return null;
        }


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
           REPLICATOR

           Does not modify the content.
           It reproduces the exact content entering its active
           input port.
           ======================================================== */

        if (
            node.machineType ===
            "splitter"
        ) {

            if (
                !node.replicatorInputPortId
            ) {
                return "";
            }


            const connection =
                this.connections.find(
                    item =>
                        item.toPortId ===
                        node.replicatorInputPortId
                );

            if (!connection) {
                return "";
            }


            if (
                !this.connectionIsValid(
                    connection
                )
            ) {
                return "";
            }


            const fromPort =
                this.findPortById(
                    connection.fromPortId
                );

            if (!fromPort) {
                return "";
            }


            const sourceNode =
                this.nodes.get(
                    fromPort.nodeId
                );

            if (!sourceNode) {
                return "";
            }


            return this.evaluateTextNode(
                sourceNode,
                nextVisited
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
           RANDOMIZER

           Chooses one of two WORD inputs. The choice is stable
           within one poem-generation run.
           ======================================================== */

        if (
            node.machineType ===
            "randomizer"
        ) {

            if (
                !node.validOutput
            ) {
                return "";
            }


            const values =
                this.getRandomizerInputValues(
                    node,
                    nextVisited
                );

            const available =
                values.filter(
                    value =>
                        value !== ""
                );


            if (
                available.length < 2
            ) {
                return "";
            }


            if (
                node.randomizerChoiceRunId !==
                this.evaluationRunId
            ) {

                node.randomizerChoice =
                    Math.random() < 0.5
                        ? 0
                        : 1;

                node.randomizerChoiceRunId =
                    this.evaluationRunId;
            }


            return (
                values[
                    node.randomizerChoice
                ] || ""
            );
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


    getLastWordFromSentence(sentence) {

        if (
            typeof sentence !==
            "string"
        ) {
            return "";
        }


        const words =
            sentence
                .toLowerCase()
                .match(
                    /[a-z]+(?:'[a-z]+)?/g
                );


        if (
            !words ||
            words.length === 0
        ) {
            return "";
        }


        return (
            words[
                words.length - 1
            ] || ""
        );
    }


    getRhymingPartsForWord(word) {

        if (
            !word ||
            !window.pronouncing
        ) {
            return [];
        }


        const pronunciations =
            window
                .pronouncing
                .phonesForWord(
                    word.toLowerCase()
                );


        if (
            !Array.isArray(
                pronunciations
            )
        ) {
            return [];
        }


        const parts =
            pronunciations
                .map(
                    phones =>
                        window
                            .pronouncing
                            .rhymingPart(
                                phones
                            )
                )
                .filter(Boolean);


        return [
            ...new Set(parts)
        ];
    }


    wordsRhyme(
        wordA,
        wordB
    ) {

        const partsA =
            this.getRhymingPartsForWord(
                wordA
            );

        const partsB =
            this.getRhymingPartsForWord(
                wordB
            );


        if (
            partsA.length === 0 ||
            partsB.length === 0
        ) {
            return false;
        }


        return partsA.some(
            part =>
                partsB.includes(
                    part
                )
        );
    }


    evaluateStanzaRhyme(node) {

        if (
            node.machineType !==
            "stanza"
        ) {
            return true;
        }


        const sentences =
            this.getOrderedInputValues(
                node,
                new Set()
            )
                .filter(
                    value =>
                        typeof value ===
                            "string" &&
                        value.trim() !== ""
                );


        if (
            sentences.length <= 1
        ) {
            return true;
        }


        const endingWords =
            sentences.map(
                sentence =>
                    this.getLastWordFromSentence(
                        sentence
                    )
            );


        if (
            endingWords.some(
                word =>
                    !word
            )
        ) {
            return false;
        }


        const reference =
            endingWords[0];


        for (
            let i = 1;
            i < endingWords.length;
            i++
        ) {

            if (
                !this.wordsRhyme(
                    reference,
                    endingWords[i]
                )
            ) {
                return false;
            }
        }


        return true;
    }


    getFirstLetterFromSentence(sentence) {

        const match =
            String(
                sentence || ""
            )
                .toLowerCase()
                .match(/[a-z]/);

        return match
            ? match[0]
            : "";
    }


    getFirstWordFromSentence(sentence) {

        const match =
            String(
                sentence || ""
            )
                .toLowerCase()
                .match(/[a-z]+(?:'[a-z]+)?/);

        return match
            ? match[0]
            : "";
    }


    collectProductionChainNodes(
        node,
        collected = new Map(),
        visited = new Set()
    ) {

        if (!node) {
            return collected;
        }


        if (
            visited.has(
                node.id
            )
        ) {
            return collected;
        }


        visited.add(
            node.id
        );

        collected.set(
            node.id,
            node
        );


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


            this.collectProductionChainNodes(
                sourceNode,
                collected,
                visited
            );
        }


        return collected;
    }


    getAcrosticSentenceNodesForPoem(
        poemNode
    ) {

        return Array.from(
            this.collectProductionChainNodes(
                poemNode
            )
                .values()
        )
            .filter(
                node =>
                    node.machineType ===
                    "sentence"
            );
    }


    evaluateAcrosticSentenceNodes(
        sentenceNodes
    ) {

        if (
            !acrosticEnabled &&
            !acrosticPlusEnabled
        ) {
            return true;
        }


        if (
            sentenceNodes.length <=
            1
        ) {
            return true;
        }


        const keys = [];


        for (
            const node of
            sentenceNodes
        ) {

            if (
                !node.validOutput
            ) {
                return false;
            }


            const sentence =
                this.evaluateTextNode(
                    node,
                    new Set()
                );

            const key =
                acrosticPlusEnabled
                    ? this.getFirstWordFromSentence(
                        sentence
                    )
                    : this.getFirstLetterFromSentence(
                        sentence
                    );


            if (!key) {
                return false;
            }


            keys.push(
                key
            );
        }


        const reference =
            keys[0];

        return keys.every(
            key =>
                key === reference
        );
    }


    refreshAcrosticState() {

        for (
            const node of
            this.nodes.values()
        ) {

            if (
                node.machineType !==
                    "sentence" ||
                !node.acrosticIndicator
            ) {
                continue;
            }


            node.acrosticValid =
                true;

            node.acrosticIndicator
                .setFillStyle(
                    0x555555,
                    1
                );
        }


        if (
            !acrosticEnabled &&
            !acrosticPlusEnabled
        ) {
            return;
        }


        const states =
            new Map();

        const readyPoems =
            this.getReadyPoemMachines();


        for (
            const poemNode of
            readyPoems
        ) {

            const sentenceNodes =
                this.getAcrosticSentenceNodesForPoem(
                    poemNode
                );

            if (
                sentenceNodes.length ===
                0
            ) {
                continue;
            }


            const valid =
                this.evaluateAcrosticSentenceNodes(
                    sentenceNodes
                );


            for (
                const sentenceNode of
                sentenceNodes
            ) {

                states.set(
                    sentenceNode.id,
                    Boolean(
                        states.get(
                            sentenceNode.id
                        )
                    ) || valid
                );
            }
        }


        for (
            const [
                nodeId,
                valid
            ] of states
        ) {

            const node =
                this.nodes.get(
                    nodeId
                );


            if (
                !node ||
                !node.acrosticIndicator
            ) {
                continue;
            }


            node.acrosticValid =
                valid;

            node.acrosticIndicator
                .setFillStyle(
                    valid
                        ? 0x43b86b
                        : 0xb83f3f,
                    1
                );
        }
    }


    productionChainPassesAcrostic(
        poemNode
    ) {

        if (
            !acrosticEnabled &&
            !acrosticPlusEnabled
        ) {
            return true;
        }


        const sentenceNodes =
            this.getAcrosticSentenceNodesForPoem(
                poemNode
            );

        return this.evaluateAcrosticSentenceNodes(
            sentenceNodes
        );
    }


    passesAcrosticRule() {

        if (
            !acrosticEnabled &&
            !acrosticPlusEnabled
        ) {
            return true;
        }


        const readyPoems =
            this.getReadyPoemMachines();


        if (
            readyPoems.length ===
            0
        ) {
            return false;
        }


        return readyPoems.some(
            poemNode =>
                this.productionChainPassesAcrostic(
                    poemNode
                )
        );
    }


    refreshSpellingCompulsionState() {

        for (
            const node of
            this.nodes.values()
        ) {

            if (
                !isSpellingConstrainedNode(
                    node
                ) ||
                !node.spellingIndicator
            ) {
                continue;
            }


            if (
                !spellingCompulsionEnabled
            ) {

                node.spellingValid =
                    true;

                node.spellingIndicator
                    .setFillStyle(
                        0x555555,
                        1
                    );

                continue;
            }


            const valid =
                node.validOutput &&
                this.evaluateWordSpelling(
                    node
                );

            node.spellingValid =
                valid;

            node.spellingIndicator
                .setFillStyle(
                    valid
                        ? 0x43b86b
                        : 0xb83f3f,
                    1
                );
        }
    }


    productionChainPassesSpellingCompulsion(
        node,
        visited = new Set()
    ) {

        if (!node) {
            return false;
        }


        if (
            visited.has(
                node.id
            )
        ) {
            return true;
        }


        visited.add(
            node.id
        );


        if (
            isSpellingConstrainedNode(
                node
            ) &&
            !this.evaluateWordSpelling(
                node
            )
        ) {
            return false;
        }


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


            if (
                !this.productionChainPassesSpellingCompulsion(
                    sourceNode,
                    visited
                )
            ) {
                return false;
            }
        }


        return true;
    }


    passesSpellingCompulsionRule() {

        if (
            !spellingCompulsionEnabled
        ) {
            return true;
        }


        const readyPoems =
            this.getReadyPoemMachines();


        if (
            readyPoems.length === 0
        ) {
            return false;
        }


        return readyPoems.some(
            poemNode =>
                this.productionChainPassesSpellingCompulsion(
                    poemNode,
                    new Set()
                )
        );
    }


    refreshAncientPoetryState() {

        for (
            const node of
            this.nodes.values()
        ) {

            if (
                node.machineType !==
                "stanza" ||
                !node.rhymeIndicator
            ) {
                continue;
            }


            if (
                !ancientPoetryEnabled
            ) {

                node.rhymeValid =
                    true;

                node.rhymeIndicator
                    .setFillStyle(
                        0x555555,
                        1
                    );

                continue;
            }


            if (
                !node.validOutput
            ) {

                node.rhymeValid =
                    false;

                node.rhymeIndicator
                    .setFillStyle(
                        0xb83f3f,
                        1
                    );

                continue;
            }


            const valid =
                this.evaluateStanzaRhyme(
                    node
                );

            node.rhymeValid =
                valid;

            node.rhymeIndicator
                .setFillStyle(
                    valid
                        ? 0x43b86b
                        : 0xb83f3f,
                    1
                );
        }
    }


    productionChainPassesAncientPoetry(
        node,
        visited = new Set()
    ) {

        if (!node) {
            return false;
        }


        if (
            visited.has(
                node.id
            )
        ) {
            return true;
        }


        visited.add(
            node.id
        );


        if (
            node.machineType ===
                "stanza" &&
            !this.evaluateStanzaRhyme(
                node
            )
        ) {
            return false;
        }


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


            if (
                !this.productionChainPassesAncientPoetry(
                    sourceNode,
                    visited
                )
            ) {
                return false;
            }
        }


        return true;
    }


    passesAncientPoetryRule() {

        if (
            !ancientPoetryEnabled
        ) {
            return true;
        }


        const readyPoems =
            this.getReadyPoemMachines();


        if (
            readyPoems.length === 0
        ) {
            return false;
        }


        return readyPoems.some(
            poemNode =>
                this.productionChainPassesAncientPoetry(
                    poemNode,
                    new Set()
                )
        );
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

            limiters: {
                blind:
                    limiterMode ===
                    LIMITER_MODE.BLIND,

                blindPlus:
                    limiterMode ===
                    LIMITER_MODE.BLIND_PLUS,

                ancientPoetry:
                    ancientPoetryEnabled,

                spellingCompulsion:
                    spellingCompulsionEnabled,

                acrostic:
                    acrosticEnabled,

                acrosticPlus:
                    acrosticPlusEnabled
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


        if (
            data.limiters
        ) {

            if (
                data.limiters.blind
            ) {
                limiterMode =
                    LIMITER_MODE.BLIND;
            }
            else if (
                data.limiters.blindPlus
            ) {
                limiterMode =
                    LIMITER_MODE.BLIND_PLUS;
            }
            else {
                limiterMode =
                    LIMITER_MODE.NONE;
            }


            ancientPoetryEnabled =
                Boolean(
                    data.limiters
                        .ancientPoetry
                );

            spellingCompulsionEnabled =
                Boolean(
                    data.limiters
                        .spellingCompulsion
                );

            acrosticEnabled =
                Boolean(
                    data.limiters
                        .acrostic
                );

            acrosticPlusEnabled =
                Boolean(
                    data.limiters
                        .acrosticPlus
                );

            if (
                acrosticEnabled &&
                acrosticPlusEnabled
            ) {
                acrosticPlusEnabled =
                    false;
            }
        }
        else {
            limiterMode =
                LIMITER_MODE.NONE;

            ancientPoetryEnabled =
                false;

            spellingCompulsionEnabled =
                false;

            acrosticEnabled =
                false;

            acrosticPlusEnabled =
                false;
        }


        syncLimiterControls();

        updateBlindAnimationState();


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
                        null
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


function syncLimiterControls() {

    if (
        DOM.limiterBlind
    ) {
        DOM.limiterBlind.checked =
            limiterMode ===
            LIMITER_MODE.BLIND;
    }


    if (
        DOM.limiterBlindPlus
    ) {
        DOM.limiterBlindPlus.checked =
            limiterMode ===
            LIMITER_MODE.BLIND_PLUS;
    }


    if (
        DOM.limiterAncientPoetry
    ) {
        DOM.limiterAncientPoetry.checked =
            ancientPoetryEnabled;
    }


    if (
        DOM.limiterSpellingCompulsion
    ) {
        DOM.limiterSpellingCompulsion.checked =
            spellingCompulsionEnabled;
    }


    if (
        DOM.limiterAcrostic
    ) {
        DOM.limiterAcrostic.checked =
            acrosticEnabled;
    }


    if (
        DOM.limiterAcrosticPlus
    ) {
        DOM.limiterAcrosticPlus.checked =
            acrosticPlusEnabled;
    }
}


function updateBlindAnimationState() {

    if (
        blindAnimationTimer
    ) {
        clearInterval(
            blindAnimationTimer
        );

        blindAnimationTimer =
            null;
    }


    if (
        limiterMode !==
        LIMITER_MODE.BLIND
    ) {
        return;
    }


    blindAnimationTimer =
        setInterval(
            () => {

                if (
                    !factoryScene ||
                    limiterMode !==
                    LIMITER_MODE.BLIND
                ) {
                    return;
                }


                for (
                    const node of
                    factoryScene.nodes.values()
                ) {

                    if (
                        !isLimiterAffectedNode(
                            node
                        )
                    ) {
                        continue;
                    }


                    if (
                        node.machineType ===
                        "randomizer"
                    ) {

                        factoryScene
                            .refreshRandomizerDisplay(
                                node
                            );

                        continue;
                    }


                    if (
                        !node.validOutput ||
                        !node.outputText
                    ) {
                        continue;
                    }


                    const blindText =
                        factoryScene
                            .generateBlindText(
                                node.actualOutput
                            );


                    node.outputText.setText(
                        blindText
                    );
                }
            },
            90
        );
}


DOM.limiterBlind.addEventListener(
    "change",
    () => {

        if (
            DOM.limiterBlind.checked
        ) {
            DOM.limiterBlindPlus.checked =
                false;

            limiterMode =
                LIMITER_MODE.BLIND;
        }
        else {
            limiterMode =
                DOM.limiterBlindPlus.checked
                    ? LIMITER_MODE.BLIND_PLUS
                    : LIMITER_MODE.NONE;
        }


        factoryScene
            ?.refreshAllOutputDisplays();

        updateBlindAnimationState();
    }
);


DOM.limiterBlindPlus.addEventListener(
    "change",
    () => {

        if (
            DOM.limiterBlindPlus.checked
        ) {
            DOM.limiterBlind.checked =
                false;

            limiterMode =
                LIMITER_MODE.BLIND_PLUS;
        }
        else {
            limiterMode =
                DOM.limiterBlind.checked
                    ? LIMITER_MODE.BLIND
                    : LIMITER_MODE.NONE;
        }


        factoryScene
            ?.refreshAllOutputDisplays();

        updateBlindAnimationState();
    }
);


DOM.limiterAncientPoetry.addEventListener(
    "change",
    () => {

        ancientPoetryEnabled =
            DOM
                .limiterAncientPoetry
                .checked;

        if (
            factoryScene
        ) {

            factoryScene
                .refreshAncientPoetryState();
        }

        refreshLeverState();
    }
);


DOM.limiterSpellingCompulsion.addEventListener(
    "change",
    () => {

        spellingCompulsionEnabled =
            DOM
                .limiterSpellingCompulsion
                .checked;

        if (
            factoryScene
        ) {

            factoryScene
                .evaluateNetwork();
        }

        refreshLeverState();
    }
);


DOM.limiterAcrostic.addEventListener(
    "change",
    () => {

        if (
            DOM
                .limiterAcrostic
                .checked
        ) {

            DOM.limiterAcrosticPlus.checked =
                false;

            acrosticEnabled =
                true;

            acrosticPlusEnabled =
                false;
        }
        else {
            acrosticEnabled =
                false;
        }


        if (
            factoryScene
        ) {

            factoryScene
                .refreshAcrosticState();
        }

        refreshLeverState();
    }
);


DOM.limiterAcrosticPlus.addEventListener(
    "change",
    () => {

        if (
            DOM
                .limiterAcrosticPlus
                .checked
        ) {

            DOM.limiterAcrostic.checked =
                false;

            acrosticEnabled =
                false;

            acrosticPlusEnabled =
                true;
        }
        else {
            acrosticPlusEnabled =
                false;
        }


        if (
            factoryScene
        ) {

            factoryScene
                .refreshAcrosticState();
        }

        refreshLeverState();
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


    const structurallyReady =
        factoryScene
            .getReadyPoemMachines()
            .length > 0;

    const rhymeReady =
        factoryScene
            .passesAncientPoetryRule();

    const spellingReady =
        factoryScene
            .passesSpellingCompulsionRule();

    const acrosticReady =
        factoryScene
            .passesAcrosticRule();

    const ready =
        structurallyReady &&
        rhymeReady &&
        spellingReady &&
        acrosticReady;


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

        if (
            !factoryScene
                .passesAncientPoetryRule()
        ) {

            showToast(
                "Ancient Poetry requires every sentence to rhyme."
            );

            return;
        }

        if (
            !factoryScene
                .passesSpellingCompulsionRule()
        ) {

            showToast(
                "Spelling Compulsion requires dictionary words."
            );

            return;
        }

        if (
            !factoryScene
                .passesAcrosticRule()
        ) {

            showToast(
                acrosticPlusEnabled
                    ? "Acrostic+ requires every sentence to begin with the same word."
                    : "Acrostic requires every sentence to begin with the same letter."
            );

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
