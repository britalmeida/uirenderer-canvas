import type { vec2, vec4 } from './shading';

// Set the position of the given thumbnails in a centered grid. Returns thumbnail size.
function fitThumbsInGrid(thumbs: ThumbnailImage[],
                         originalImageSize: vec2,
                         uiConfig: { totalSpacing: vec2; minMargin: number },
                         rect: { width: number, height: number })
                         : vec2 {

  const numImages = thumbs.length;

  // Get size of the region containing the thumbnails.
  const totalAvailableW = rect.width;
  const totalAvailableH = rect.height;
  //console.log(rect);
  //console.log("Region w:", totalAvailableW, "h:", totalAvailableH);

  // Get the available size, discounting white space size.
  const totalSpacing = uiConfig.totalSpacing;
  const minMargin = uiConfig.minMargin;
  const availableW = totalAvailableW - totalSpacing[0];
  const availableH = totalAvailableH - totalSpacing[1];

  // Get the original size and aspect ratio of the images.
  // Assume all images in the edit have the same aspect ratio.
  const originalImageW = originalImageSize[0];
  const originalImageH = originalImageSize[1];
  //console.log("Image a.ratio=", originalImageW / originalImageH, "(", originalImageW, "x", originalImageH,")");

  // Calculate maximum limit for thumbnail size.
  const maxThumbSize: vec2 = numImages === 1 ?
    [totalAvailableW - minMargin, totalAvailableH - minMargin]
    : [availableW, availableH];

  // Calculate by how much images need to be scaled in order to fit. (won't be perfect)
  const availableArea = availableW * availableH;
  const thumbnailArea = availableArea / numImages;
  // If the pixel area gets very small, early out, not worth rendering.
  if (thumbnailArea < 20) {
    return [0,0];
  }
  let scaleFactor = Math.sqrt(thumbnailArea / (originalImageW * originalImageH));
  //console.log("Scale factor:", scaleFactor);

  let thumbnailSize: vec2 = [originalImageW * scaleFactor, originalImageH * scaleFactor];

  const numImagesPerRow = Math.ceil(availableW / thumbnailSize[0]);
  const numImagesPerCol = Math.ceil(numImages / numImagesPerRow);
  //console.log("Thumbnail width ", thumbnailSize[0], "px, # per row:", numImagesPerRow);
  //console.log("Thumbnail height", thumbnailSize[1], "px, # per col:", numImagesPerCol);

  // Make sure that both a row and a column of images at the current scale will fit.
  // It is possible that, with few images and a region aspect ratio that is very different from
  // the images', there is enough area, but not enough length in one direction.
  // In that case, reduce the thumbnail size further.
  if (originalImageW * scaleFactor * numImagesPerRow > maxThumbSize[0])
    scaleFactor = maxThumbSize[0] / (originalImageW * numImagesPerRow)
  if (originalImageH * scaleFactor * numImagesPerCol > maxThumbSize[1])
    scaleFactor = maxThumbSize[1] / (originalImageH * numImagesPerCol)
  //console.log("Reduced scale factor:", scaleFactor);

  thumbnailSize = [originalImageW * scaleFactor, originalImageH * scaleFactor];

  //console.log("X");
  const spaceW = calculateSpacingCentered(totalAvailableW, thumbnailSize[0], numImagesPerRow, minMargin);
  //console.log("Y");
  const spaceH = calculateSpacingCentered(totalAvailableH, thumbnailSize[1], numImagesPerCol, minMargin);

  const margins: vec2 = [spaceW[0], spaceH[0]];
  const spacing: vec2 = [spaceW[1], spaceH[1]];

  // Set the position of each thumbnail.
  let startPosX = margins[0];
  let startPosY = margins[1];
  const lastStartPosX = Math.ceil(
    margins[0] + (numImagesPerRow - 1) * (thumbnailSize[0] + spacing[0])
  );

  for (const img of thumbs) {
    img.pos = [startPosX, startPosY];
    startPosX += thumbnailSize[0] + spacing[0];
    // Next row
    if (startPosX > lastStartPosX) {
      startPosX = margins[0];
      startPosY += thumbnailSize[1] + spacing[1];
    }
  }

  return thumbnailSize;
}

// Set the position of the given thumbnails and groups. Flows from top-left. Returns thumbnail size.
function fitThumbsInGroup(summaryText: { str: string, pos: vec2 },
                          groups: ThumbnailGroup[],
                          thumbs: ThumbnailImage[],
                          originalImageSize: vec2,
                          uiConfig: { fontSize: number, minMargin: number,
                                      groupedView: {summaryText: { spaceBefore: number, spaceAfter: number },
                                                    groupTitle: { spaceBefore: number, spaceAfter: number },
                                                    colorRect: { width: number, xOffset: number } }},
                          rect: { width: number, height: number }) : vec2 {

  const numGroups = groups.length;
  //console.log("Assigned", thumbs.length, "thumbnails to", numGroups, "groups");
  if (numGroups === 0) { return [0, 0]; }

  // Find the maximum scale at which the thumbnails can be displayed.

  // Get the distribution of thumbnails per group, sorted, with highest first.
  const thumbsPerGroup = [] as number[];
  for (const group of groups) {
    thumbsPerGroup.push(group.thumbIdxs.length);
  }
  thumbsPerGroup.sort((a, b) => b - a);
  const maxNumThumbsFoundInGroup: number = thumbsPerGroup[0];
  //console.log(thumbsPerGroup);

  // Get size of the region containing the thumbnails.
  const totalAvailableW = rect.width;
  const totalAvailableH = rect.height;
  //console.log("Region w:", totalAvailableW, "h:", totalAvailableH);

  // Get the available size, discounting white space size.
  const summaryHeight = numGroups <= 1 ? 0.0 :
    uiConfig.fontSize
    + uiConfig.groupedView.summaryText.spaceBefore
    + uiConfig.groupedView.summaryText.spaceAfter;
  const titleHeight = uiConfig.fontSize
    + uiConfig.groupedView.groupTitle.spaceBefore
    + uiConfig.groupedView.groupTitle.spaceAfter;
  const colorRectOffset = uiConfig.groupedView.colorRect.xOffset;
  const colorRectWidth = uiConfig.groupedView.colorRect.width;
  const bothMargins = uiConfig.minMargin;
  const minSideMargin = bothMargins * 0.5;
  const availableW = totalAvailableW - bothMargins - colorRectOffset;
  const availableH = totalAvailableH - bothMargins - summaryHeight - titleHeight * numGroups;

  // Get the original size and aspect ratio of the images.
  // Assume all images in the edit have the same aspect ratio.
  const originalImageW = originalImageSize[0];
  const originalImageH = originalImageSize[1];

  // Calculate by how much images need to be scaled in order to fit.

  // Thumbnail images are at their biggest possible size when each group has a single row.
  // Find maximum height and corresponding scale.
  let numImagesPerRow = maxNumThumbsFoundInGroup;
  let numImagesPerCol = numGroups;
  const heightFitFactor = getFitFactor(availableH, numImagesPerCol, originalImageH);
  // Find a thumbnail width that is guaranteed to fit with all the group's thumbnails in one row.
  const rowFitFactor = getFitFactor(availableW, numImagesPerRow, originalImageW);

  // Limit upscaling of the thumbnails to 1.5x.
  const upscaleLimit = 1.4;
  let scaleFactor = Math.min(upscaleLimit, heightFitFactor);

  // If the thumbnails do fit in one row, we're done!
  if (rowFitFactor < heightFitFactor) {
    // Otherwise, do a linear search for the number of columns that maximizes the thumb size.
    // A binary search may fall into a local maximum.
    scaleFactor = Math.min(upscaleLimit, rowFitFactor);
    for (let numCols = maxNumThumbsFoundInGroup; numCols > 0; numCols--) {
      // Calculate resulting number of rows, if there are "cols" number of columns.
      let numRows = 0;
      for (const n of thumbsPerGroup) {
        numRows += Math.ceil(n / numCols);
      }

      // Get the scale factor necessary to fit the thumbnails in width and in height.

      const checkFitFactorW = getFitFactor(availableW, numCols, originalImageW);
      const checkFitFactorH = getFitFactor(availableH, numRows, originalImageH);
      // The thumbnails would need to be scaled by the smallest factor to fit in both directions.
      const checkFitFactor = Math.min(upscaleLimit, checkFitFactorW, checkFitFactorH);
      //console.log("Checking (", numCols, "cols,", numRows, "rows). Scale factors:", checkFitFactorW, checkFitFactorH);

      // If the current number of columns gives bigger thumbnails, save it as current best.
      if (checkFitFactor > scaleFactor) {
        scaleFactor = checkFitFactor;
        numImagesPerRow = numCols;
        numImagesPerCol = numRows;
      }
    }
  }

  const thumbSize: vec2 = [originalImageW * scaleFactor, originalImageH * scaleFactor];
  //console.log("[", numImagesPerRow, "cols x", numImagesPerCol, "rows]. Scale factor:",
  // scaleFactor, "Thumb size:", thumbSize);

  //console.log("X");
  const usableW = totalAvailableW  - colorRectOffset;
  const spaceW = calculateSpacingTopLeftFlow(usableW, thumbSize[0], numImagesPerRow, minSideMargin);
  //console.log("Y");
  const usableH = totalAvailableH  - titleHeight * numGroups;
  const spaceH = calculateSpacingTopLeftFlow(usableH, thumbSize[1], numImagesPerCol, minSideMargin);

  // Set the positions of the elements to be displayed.

  const startPosX = minSideMargin + colorRectOffset;
  let titlePosY = minSideMargin + summaryHeight;
  const titleSize = uiConfig.fontSize + uiConfig.groupedView.groupTitle.spaceAfter;
  const thumbnailStepX = thumbSize[0] + spaceW;
  const thumbnailStepY = thumbSize[1] + spaceH;

  // Set the position of the aggregated group information
  if (summaryText.str) {
    const posY = minSideMargin + uiConfig.groupedView.summaryText.spaceBefore;
    summaryText.pos = [minSideMargin, posY];
  }

  // Set the position of each group title and colored rectangle.
  for (const group of groups) {
    const numThumbRows = Math.ceil(group.thumbIdxs.length / numImagesPerRow);

    // Set the title position and step.
    group.namePos = [startPosX, titlePosY];
    titlePosY += titleHeight + thumbnailStepY * numThumbRows;

    // Set the position for the colored rectangle.
    const rectHeight = titleSize + thumbnailStepY * numThumbRows;
    const titleTop = group.namePos[1];
    group.colorRect = [
      startPosX - colorRectOffset, titleTop,
      colorRectWidth, rectHeight];
  }

  // Set the position of each thumbnail.
  for (const thumb of thumbs) {
    if (thumb.posInGroup < 0 || !thumb.group) {
      console.warn("Attempting to layout thumbnails without group in group view.", thumb);
      continue;
    }
    const row = Math.floor(thumb.posInGroup / numImagesPerRow);
    const col = thumb.posInGroup % numImagesPerRow;
    const groupY = thumb.group.namePos[1];
    thumb.pos = [
      startPosX + thumbnailStepX * col,
      groupY + titleSize + thumbnailStepY * row,
    ];
  }

  return thumbSize;
}


function getFitFactor(availableSpace: number, numThumbs: number, originalImageSize: number): number {
  const res = Math.round(availableSpace / numThumbs);
  // Spacing must be at least 1/10th of the thumbnail size.
  const minSpacing = Math.round(res * 0.1);
  return (res - minSpacing) / originalImageSize;
}


// Get the remaining space not occupied by thumbnails and split it into margins
// and spacing between the thumbnails.
function calculateSpacingCentered(totalAvailable: number, thumbSize: number, numThumbs: number, minMargin: number): vec2 {

  const availableSpace = totalAvailable - thumbSize * numThumbs;
  //console.log("remaining space", availableSpace, "px =", totalAvailable, "-", thumbSize, "*", numThumbs);

  let spacing = 0;
  if (numThumbs > 1) {
    spacing = (availableSpace - minMargin) / (numThumbs - 1);
    //console.log("spacing", spacing);
    // Spacing between images should never be bigger than the margins.
    spacing = Math.min(Math.ceil(spacing), minMargin);
    //console.log("spacing clamped", spacing);
  }

  let margin = (availableSpace - spacing * (numThumbs - 1)) / 2;
  //console.log("margins", margin);
  margin = Math.floor(margin);

  return [margin, spacing];
}


// Get the remaining space not occupied by thumbnails and split it into spacing
// between the thumbnails. Margins are fixed on the top-left.
function calculateSpacingTopLeftFlow(usableSpace: number, thumbSize: number, numThumbs: number, minSideMargin: number): number {
  const remainingSpace = usableSpace - thumbSize * numThumbs - minSideMargin * 2;
  //console.log("remaining space", remainingSpace, "px");

  let spacing = 0;
  if (numThumbs > 1) {
    spacing = Math.round(remainingSpace / (numThumbs - 1));
    //console.log("spacing", spacing);
    // Spacing between images should never be bigger than the margins.
    spacing = Math.min(spacing, minSideMargin);
    // Or disproportionate to the thumbnail size.
    spacing = Math.min(spacing, Math.floor(thumbSize / 5));
    //console.log("spacing clamped", spacing);
  }

  return spacing;
}


// UI element specifying how a thumbnail should be drawn.
class ThumbnailImage {

  // Image display
  pos: vec2 = [0, 0]; // Position in px where the image should be displayed in canvas coordinates.
  // Represented object (shot/asset...)
  obj: object | null; // Object that this thumbnail represents, such as a shot, asset or person..
  objIdx: number; // Index in the array of objects.
  // Grouped view
  group: ThumbnailGroup | null = null; // Group that this thumbnail belongs to.
  posInGroup = -1; // Relative position in the thumbnails of this group.

  constructor(obj: object | null, objIdx: number) {
    this.obj = obj;
    this.objIdx = objIdx;
  }
}


// UI element representing a container of shots, with its own drawable name and a colorful rectangle.
class ThumbnailGroup {

  // Group title
  name: string;
  namePos: vec2 = [0, 0]; // Position in px where the group name should be displayed in canvas coordinates.
  // Group color
  color: vec4;
  colorRect: vec4 = [0, 0, 0, 0];
  // Contained thumbnails
  thumbIdxs: number[] = []; // Index in the thumbnails array.
  // Object that this group represents, e.g. a Sequence, a Task Status, or an Assignee.
  criteriaObj: object | null;

  constructor(displayStr = "", displayColor: vec4 = [0.8, 0.0, 0.0, 1.0], criteriaObj: object | null = null) {
    this.name = displayStr;
    this.color = displayColor;
    this.criteriaObj = criteriaObj;
  }
}


export { fitThumbsInGrid, fitThumbsInGroup, ThumbnailImage, ThumbnailGroup };


