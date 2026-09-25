import { CaptureUpdateAction } from "@excalidraw/excalidraw";
import { convertToExcalidrawElements } from "@excalidraw/element";
import { viewportCoordsToSceneCoords } from "@excalidraw/common";

import type { ExcalidrawElementSkeleton } from "@excalidraw/element";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

const buildKanbanSkeleton = (
  cx: number,
  cy: number,
): ExcalidrawElementSkeleton[] => {
  const columns = [
    { id: "kanban-col-todo", x: cx - 490, title: "À faire", color: "#a5d8ff" },
    { id: "kanban-col-doing", x: cx - 150, title: "En cours", color: "#ffec99" },
    { id: "kanban-col-done", x: cx + 190, title: "Terminé", color: "#b2f2bb" },
  ] as const;
  const columnY = cy - 260;
  const columnWidth = 300;
  const columnHeight = 520;

  const elements: ExcalidrawElementSkeleton[] = [];

  for (const column of columns) {
    elements.push({
      type: "rectangle",
      id: column.id,
      x: column.x,
      y: columnY,
      width: columnWidth,
      height: columnHeight,
      backgroundColor: "#f1f3f5",
      strokeColor: "#adb5bd",
      roundness: { type: 3 },
      label: {
        text: column.title,
        fontSize: 22,
        verticalAlign: "top",
      },
    });
  }

  const cardWidth = columnWidth - 40;
  const cardHeight = 80;
  const cardGap = 15;

  const cards: { columnIndex: 0 | 1 | 2; text: string }[] = [
    { columnIndex: 0, text: "Tâche à faire" },
    { columnIndex: 0, text: "Autre tâche" },
    { columnIndex: 1, text: "Tâche en cours" },
    { columnIndex: 2, text: "Tâche terminée" },
  ];
  const cardsPerColumn: number[] = [0, 0, 0];

  for (const card of cards) {
    const column = columns[card.columnIndex];
    const row = cardsPerColumn[card.columnIndex]++;
    elements.push({
      type: "stickynote",
      x: column.x + 20,
      y: columnY + 70 + row * (cardHeight + cardGap),
      width: cardWidth,
      height: cardHeight,
      backgroundColor: column.color,
      label: { text: card.text, fontSize: 18 },
    });
  }

  return elements;
};

const buildMindmapSkeleton = (
  cx: number,
  cy: number,
): ExcalidrawElementSkeleton[] => {
  const branches = [
    { id: "mindmap-n", x: cx - 90, y: cy - 280, text: "Idée 1", color: "#a5d8ff" },
    { id: "mindmap-e", x: cx + 260, y: cy - 35, text: "Idée 2", color: "#b2f2bb" },
    { id: "mindmap-s", x: cx - 90, y: cy + 210, text: "Idée 3", color: "#ffec99" },
    { id: "mindmap-w", x: cx - 440, y: cy - 35, text: "Idée 4", color: "#eebefa" },
  ] as const;
  const subBranches = [
    { id: "mindmap-e1", x: cx + 480, y: cy - 120, text: "Détail 2.1" },
    { id: "mindmap-e2", x: cx + 480, y: cy - 10, text: "Détail 2.2" },
  ] as const;

  const elements: ExcalidrawElementSkeleton[] = [
    {
      type: "ellipse",
      id: "mindmap-center",
      x: cx - 110,
      y: cy - 50,
      width: 220,
      height: 100,
      backgroundColor: "#ffd8a8",
      strokeColor: "#e8590c",
      label: { text: "Sujet central", fontSize: 20 },
    },
  ];

  for (const branch of branches) {
    elements.push({
      type: "ellipse",
      id: branch.id,
      x: branch.x,
      y: branch.y,
      width: 180,
      height: 70,
      backgroundColor: branch.color,
      label: { text: branch.text, fontSize: 16 },
    });
    elements.push({
      type: "arrow",
      x: cx,
      y: cy,
      width: branch.x + 90 - cx,
      height: branch.y + 35 - cy,
      startArrowhead: null,
      endArrowhead: null,
      start: { id: "mindmap-center" },
      end: { id: branch.id },
    });
  }

  const east = branches[1];
  for (const sub of subBranches) {
    elements.push({
      type: "ellipse",
      id: sub.id,
      x: sub.x,
      y: sub.y,
      width: 150,
      height: 60,
      backgroundColor: east.color,
      label: { text: sub.text, fontSize: 14 },
    });
    elements.push({
      type: "arrow",
      x: east.x + 180,
      y: east.y + 35,
      width: sub.x + 75 - (east.x + 180),
      height: sub.y + 30 - (east.y + 35),
      startArrowhead: null,
      endArrowhead: null,
      start: { id: east.id },
      end: { id: sub.id },
    });
  }

  return elements;
};

/** Inserts a template centered on the current viewport, the same way
 * pasting or dropping a library item does. */
const insertSkeleton = (
  excalidrawAPI: ExcalidrawImperativeAPI,
  buildSkeleton: (cx: number, cy: number) => ExcalidrawElementSkeleton[],
) => {
  const appState = excalidrawAPI.getAppState();
  const center = viewportCoordsToSceneCoords(
    {
      clientX: appState.offsetLeft + appState.width / 2,
      clientY: appState.offsetTop + appState.height / 2,
    },
    appState,
  );

  const newElements = convertToExcalidrawElements(
    buildSkeleton(center.x, center.y),
    { regenerateIds: true },
  );

  excalidrawAPI.updateScene({
    elements: [
      ...excalidrawAPI.getSceneElementsIncludingDeleted(),
      ...newElements,
    ],
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
};

export const insertKanbanTemplate = (excalidrawAPI: ExcalidrawImperativeAPI) =>
  insertSkeleton(excalidrawAPI, buildKanbanSkeleton);

export const insertMindmapTemplate = (
  excalidrawAPI: ExcalidrawImperativeAPI,
) => insertSkeleton(excalidrawAPI, buildMindmapSkeleton);
