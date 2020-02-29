const paper = require('paper');
const uniqid = require('uniqid');
const fs = require('fs');

const DEBUG = false;

function rand(max, min=0) {
  return Math.floor(Math.random() * (max-min)) + min;
}

function randOption(options) {
  if(Array.isArray(options)) {
    const i = rand(options.length);
    return options[i];
  } else {
    const p = rand(100);
    for (const option in options) {
      p -= options[option];
      if(p <= 0) return o;
    }
    console.log("option not found, returing first");
    return options[options.keys[0]];
  }
}

function curveTo(path, h1, h2, pt) {
  if(DEBUG) {
    const debugStyle = { strokeColor: new paper.Color(1, 0, 0), dashArray: [5,10] };

    new paper.Path.Circle(h1, 5)
    new paper.Path.Line(h1, path.lastSegment.point).style = debugStyle;

    new paper.Path.Circle(h2, 5)
    new paper.Path.Line(h2, pt).style = debugStyle;
  }

  path.cubicCurveTo(h1, h2, pt);
}

function fillPath(path, rotation=null, spacing=null) {
  path.closePath();
  spacing = spacing || rand(35, 20);
  rotation = rotation || randOption([45, 135]);
  const height =  path.bounds.height;
  const extend = height / 2;

  const top = new paper.Path.Line(path.bounds.topLeft.add([-extend, -1000]), path.bounds.topRight.add([extend, -1000]));
  const bottom = new paper.Path.Line(path.bounds.bottomLeft.add([-extend, 1000]), path.bounds.bottomRight.add([extend * 2, 1000]));

  let i=0;
  while(i < top.length) {
    const fill = new paper.Path.Rectangle(top.getPointAt(i).add([0, -100]), bottom.getPointAt(i + (spacing / 3)).add([0, 100])).rotate(rotation);
    path.intersect(fill, { insert: true });
    fill.remove();
    i += spacing;
  }

  top.remove();
  bottom.remove();
}

const cX = 300;
const cY = 800;

const length = rand(1600, 1000);
let width = rand(length / 2, 250);
if(width > 400) width = 400;
const midLength = Math.floor(length / 2), midWidth = Math.floor(width / 2);;

paper.setup([cX * 2, cY * 2]);
paper.project.currentStyle = {
    strokeColor: 'black',
    strokeWidth: 1,
}

const start = new paper.Point([cX, cY - midLength]);
const mid = new paper.Point([cX - midWidth, cY + (rand(5, -10) / 100 * length)]);
let end = new paper.Point([cX, cY + midLength]);
let tail, tailShape;

// 2 point tail shapes
if(rand(100) > 35) {
  const tailMidWidth = midWidth * (rand(95, 30) / 100)
  const tailOffset = rand(tailMidWidth / 2, -tailMidWidth / 2);
  if(tailOffset >= 0) // convex / flat tail
    tail = end.add([-tailMidWidth, -tailOffset]);
  else { // concave
    tail = end.add([-tailMidWidth, 0]);
    end = end.add([0, tailOffset]);
  }
}

let silhouette = new paper.Path();
silhouette.moveTo(start);

const noseOBH = start.add([-rand(midWidth, 0.4 * midWidth), rand(20)]);
const midIBH = mid.add([0, -rand(midLength * 0.9, 0.3 * midLength)]);
curveTo(silhouette, noseOBH, midIBH, mid);

if(tail) {
  const midOBH = mid.add([0, rand(midLength / 2)]);
  const tailIBH = tail.add([rand(cX - tail.x - midWidth), -50]);
  const tailOBH = tail.add([rand(midWidth / 3), 0]);
  const endIBH = end.add([-rand(midWidth / 3), 0]);

  curveTo(silhouette, midOBH, tailIBH, tail);
  curveTo(silhouette, tailOBH, endIBH, end);
} else {
  const endIBH = end.add([-rand(midWidth, 0.4 * midWidth), -rand(20)]);
  const midOBH = mid.add([0, rand(midLength * 0.9, 0.3 * midLength)]);
  curveTo(silhouette, midOBH, endIBH, end);
}

if(DEBUG) {
  new paper.Path.Circle(start, 10)
  new paper.Path.Circle(mid, 10)
  new paper.Path.Circle(end, 10)
  if(tail) new paper.Path.Circle(tail, 10)
}

// mirror board
const singleSideSiloutte = silhouette;
silhouette = singleSideSiloutte.clone().scale(-1, 1).translate([cX - mid.x, 0]).join(silhouette);
silhouette.closePath();
singleSideSiloutte.remove();

// asym (modify some points / handle positions)
//if(true || rand(100) > 90) {
  //silhouette.segments[0].handleIn.add([rand(10, -5), rand(10, -5)]);
//}

// stringer(s)
if(rand(100) > 10) {
  if(rand(100) > 20)
    new paper.Path.Line(start, end);
  else {
    const offset = midWidth / 2;
    const s = [new paper.Path.Line(start.add([-offset, 0]), end.add([-offset, 100])),
    new paper.Path.Line(start.add([offset, 0]), end.add([offset, 100]))];

    for (const i in s) {
      const intersections = s[i].getCrossings(silhouette);
      new paper.Path.Line(intersections[0].point, intersections[1].point)
      s[i].remove();
    }
  }
}

// designs
const designs = ["blank", "black", "twoTone", "border", "circle-logo", "rectangle-logo", "horizontal-bar", "tail-lines"];
let design = randOption(designs);

switch(design) {
  case "black":
    fillPath(silhouette);
    break;
  case "twoTone":
    let cut;
    if(randOption([true, false]))
      cut = new paper.Path.Rectangle([0, 0], [cX * 2, mid.y]);
    else
      cut = new paper.Path.Rectangle([0, mid.y], silhouette.bounds.bottomRight);
    const darkSide = silhouette.intersect(cut, { insert: true });

    fillPath(darkSide);
    new paper.Path.Line(mid, mid.add([width, 0]));

    darkSide.remove();
    cut.remove();

    break;
  case "circle-logo":
    const logoCenter = [randOption([cX, cX - (midWidth/2), cX + (midWidth/2)]), mid.y + rand(length * 0.1, -length * 0.1)];
    const logoRadius = rand(70, 50);
    const cl = new paper.Path.Circle(logoCenter, logoRadius)
    if(rand(100) > 50)
      fillPath(cl);
    else
      for(let i=rand(3, 1) ; i >= 0 ; i--)
        new paper.Path.Circle(logoCenter, logoRadius - (i * 3))

    break;
  case "rectangle-logo":
    const offset = rand(length * 0.2, -length * 0.2);
    const rec = new paper.Path.Rectangle(mid.add([-10, offset]), mid.add([rand(midWidth - (midWidth * 0.2), midWidth / 2), rand(70, 50) + offset]));
    const logo = silhouette.intersect(rec, { insert: true });
    fillPath(logo);
    rec.remove();
    break;
  case "horizontal-bar":
    const topOffset = rand(length * 0.3, -length * 0.2);
    const barBounds = new paper.Path.Rectangle(mid.add([-10, topOffset]), mid.add([width * 2, rand(70, 50) + topOffset]));
    const bar = silhouette.intersect(barBounds, { insert: true });
    fillPath(bar);
    barBounds.remove();
    break;
  case "border":
    const scaleRand = rand(6) * 0.01
    const innerBorder = silhouette.clone().scale(0.8 + scaleRand, 0.9 + scaleRand);
    if(rand(100) > 60)
      fillPath(innerBorder);
    break;
  case "tail-lines":
    const endOffset = silhouette.getOffsetOf(tail || end);
    const depth = rand(50, 25);
    const len = rand(400, 250);
    const offsetStart = rand(70, 30);

    const path = new paper.Path();
    for(let o=offsetStart ; o <= len ; o += 10) {
      const pt = silhouette.getLocationAt(endOffset + o).point;
      const nPt = silhouette.getNormalAt(endOffset + o).multiply(-depth);

      path.add(pt);
      path.insert(0, pt.add(nPt));
    }
    const mirroredPath = path.clone().scale(-1, 1).translate([((cX - path.bounds.topRight.x) * 2) + path.bounds.width, 0]);

    const spacing = rand(15, 30);
    fillPath(path, 45, spacing);
    fillPath(mirroredPath, 135, spacing);

    if(randOption([true, false])) {
      path.remove();
      mirroredPath.remove();
    }

    break;
}

const isFish = tail ? end.y - tail.y > 20 : false;

// tail pad? don't think so

// leash plug
if(rand(100) < 90) {
  const plugRadius = 10;
  if(!isFish && (!tail || rand(100) < 60)) {
    const offset = -rand(45, 35);
    new paper.Path.Circle(end.add([0, offset]), plugRadius);
    new paper.Path.Circle(end.add([0, offset]), plugRadius - 2);
    new paper.Path.Line(end.add([0, offset - plugRadius + 2]), end.add([0, offset + plugRadius -2]));
  } else {
    const xOffset = rand(40, 30), yOffset = isFish ? (tail.y - end.y) / 2 : -xOffset;
    new paper.Path.Circle(tail.add([xOffset, yOffset]), plugRadius);
    new paper.Path.Circle(tail.add([xOffset, yOffset]), plugRadius - 2);
    new paper.Path.Line(tail.add([xOffset, yOffset - plugRadius + 2]), tail.add([xOffset, yOffset + plugRadius - 2]));
  }
}

const svg = paper.project.exportSVG({ asString: true })
if (!fs.existsSync("out")) fs.mkdirSync("out");
fs.writeFile(`out/${uniqid()}.svg`, svg, function (err) {
  if (err) throw err

  process.stdout.write(".");
})
