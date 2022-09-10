import {Rect, UIRenderer} from './shading';

class TextStyle {

  static HAlign = {
    Left: 0,
    Center: 1,
    Right: 2,
  }

  static VAlign = {
    Top: 0,
    Center: 1,
    Bottom: 2,
  }

  static Flow = {
    Crop: 0,
    Wrap: 1,
  }

  halign = TextStyle.HAlign.Left;
  valign = TextStyle.VAlign.Center;
  flow = TextStyle.Flow.Crop;

  family = "Inconsolata";
  fontAtlas = {
    map: ['!','"','#','$','%','&','\'','(',')','*','+',',','-','.','/','0','1','2','3','4','5','6','7','8','9',':',';','<','=','>','?','@','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','[','\\',']','^','_','`','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','{','|','}','~',' '],
    charsPerRow: 20,
  }
  size = 24;
  advance = 24 - 8;
  lineSpacing = 24 + 2;
  color;
  shadow = [0.0, 0.0, 0.0, 0.5];

  constructor(size: number, color = [0.86, 0.86, 0.86, 1.0]) {
    this.size = size;
    this.advance = size - size * 0.5;
    this.lineSpacing = size + 2.0;
    this.color = color;
  }

  getTextWidthPx(text: string): number {
    return text.length * this.advance + 10; // 10 = approx text box margin
  }
}

class TextBox {

  // Context
  renderer: UIRenderer;
  textStyle: TextStyle;

  // Textbox
  rect: Rect;
  margin = 5.0;
  text: string;

  constructor(renderer: UIRenderer, text: string, left: number, top: number, width: number, height: number, style: TextStyle) {
    // Context
    this.renderer = renderer;
    this.textStyle = style;

    // Textbox
    this.rect = new Rect(left, top, width, height);
    this.text = text;


    let tb = this;
    const fontSize = style.size;
    const textStyle = style;

    // Transform and clip the text box with the view.

    const v = this.renderer.getView();
    let bounds = new Rect(tb.rect.left, tb.rect.top, tb.rect.width, tb.rect.height);
    // Reduce the rectangle by a fixed size margin in px (zoom independent).
    bounds.shrink(tb.margin);
    // Move (pan) and zoom the rectangle according to the view stack.
    bounds = v.transformRect(bounds);
    // Clamp the rectangle to the visible area.
    const visibleBounds = v.clampRect(bounds);

    // Clip the text box bounds.
    if (visibleBounds.width <= 0 || visibleBounds.height <= 0)
      return;

    // Change style if it is different from the last used.
    //if (style.color !== this.textStyle.color)
      this.renderer.pushStyleIfNew(textStyle.color, null, null);
    this.textStyle.size = fontSize;

    // Layout the text.
    let x = bounds.left;
    let y = bounds.top;
    const stepX = textStyle.advance;
    const stepY = textStyle.lineSpacing;

    // The first layout pass is needed to determine the number of lines.
    let numLines = 1;
    // When cropping text, 1 line is the max.
    if (textStyle.flow !== TextStyle.Flow.Crop) {
      for (const character of text) {
        // Glyph selection should influence the actual advance and kerning.
        x += stepX;

        if (x + stepX >= bounds.right) {
          numLines++;

          x = bounds.left;
          y += stepY;

          // Out of vertical space.
          if (y >= bounds.bottom)
            break;
        }
      }
    }

    // Determine the vertical starting point.
    const neededTextHeight = numLines * textStyle.lineSpacing;
    if (textStyle.valign === TextStyle.VAlign.Top) { y = bounds.top; }
    else if (textStyle.valign === TextStyle.VAlign.Center) { y = bounds.top + (bounds.height - neededTextHeight) * 0.5; }
    else if (textStyle.valign === TextStyle.VAlign.Bottom) { y = bounds.top + bounds.height - neededTextHeight; }
    y = Math.max(y, bounds.top);

    // Determine the horizontal starting point. (not ragged per line, yet)
    x = bounds.left;
    if (numLines === 1) {
      const extraSpace = bounds.width - text.length * textStyle.advance;
      if (textStyle.halign === TextStyle.HAlign.Left) { x = bounds.left; }
      else if (textStyle.halign === TextStyle.HAlign.Center) { x = bounds.left + extraSpace * 0.5; }
      else if (textStyle.halign === TextStyle.HAlign.Right) { x = bounds.left + extraSpace; }
    }

    for (const character of text) {
      // Glyph selection
      const idx = textStyle.fontAtlas.map.indexOf(character);
      const glyphRow = (idx % textStyle.fontAtlas.charsPerRow);
      const glyphCol = Math.floor(idx / textStyle.fontAtlas.charsPerRow);

      // Clip the glyph bounds.
      const glyphBounds = new Rect(x, y, fontSize, fontSize);
      if (glyphBounds.right > visibleBounds.left && glyphBounds.left < visibleBounds.right
      || glyphBounds.bottom > visibleBounds.top || glyphBounds.top < visibleBounds.bottom) {

        //this.renderer.addFrame(glyphBounds.left, glyphBounds.top, glyphBounds.width, glyphBounds.height, 1.0, textStyle.color)
        this.renderer.addGlyph(glyphRow, glyphCol, glyphBounds);
      }

      x += stepX;
      if (x + stepX >= bounds.right) {
        if (textStyle.flow === TextStyle.Flow.Crop)
          break;

        x = bounds.left;
        y += stepY;

        // Out of vertical space.
        if (y >= bounds.bottom)
          break;
      }
    }

    //this.renderer.addFrame(bounds.left, bounds.top, bounds.width, bounds.height, 1.0, [0.86, 0.86, 0.86, 1.0])
    bounds = tb.rect;
    //this.renderer.addFrame(bounds.left, bounds.top, bounds.width, bounds.height, 1.0, [0.86, 0.86, 0.86, 1.0])

  }

}

export { TextStyle, TextBox }
