/*! efm-viewer v3.0.0 | (c) 2020 Illustrated Verdict | Illustrated Verdict License | https://github.com/khristos/IV-EFMV */
/*
 * anime.js v3.2.0
 * (c) 2020 Julian Garnier
 * Released under the MIT license
 * animejs.com
 */

'use strict';

// Defaults

var defaultInstanceSettings = {
  update: null,
  begin: null,
  loopBegin: null,
  changeBegin: null,
  change: null,
  changeComplete: null,
  loopComplete: null,
  complete: null,
  loop: 1,
  direction: 'normal',
  autoplay: true,
  timelineOffset: 0
};

var defaultTweenSettings = {
  duration: 1000,
  delay: 0,
  endDelay: 0,
  easing: 'easeOutElastic(1, .5)',
  round: 0
};

var validTransforms = ['translateX', 'translateY', 'translateZ', 'rotate', 'rotateX', 'rotateY', 'rotateZ', 'scale', 'scaleX', 'scaleY', 'scaleZ', 'skew', 'skewX', 'skewY', 'perspective', 'matrix', 'matrix3d'];

// Caching

var cache = {
  CSS: {},
  springs: {}
};

// Utils

function minMax(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function stringContains(str, text) {
  return str.indexOf(text) > -1;
}

function applyArguments(func, args) {
  return func.apply(null, args);
}

var is = {
  arr: function (a) { return Array.isArray(a); },
  obj: function (a) { return stringContains(Object.prototype.toString.call(a), 'Object'); },
  pth: function (a) { return is.obj(a) && a.hasOwnProperty('totalLength'); },
  svg: function (a) { return a instanceof SVGElement; },
  inp: function (a) { return a instanceof HTMLInputElement; },
  dom: function (a) { return a.nodeType || is.svg(a); },
  str: function (a) { return typeof a === 'string'; },
  fnc: function (a) { return typeof a === 'function'; },
  und: function (a) { return typeof a === 'undefined'; },
  hex: function (a) { return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(a); },
  rgb: function (a) { return /^rgb/.test(a); },
  hsl: function (a) { return /^hsl/.test(a); },
  col: function (a) { return (is.hex(a) || is.rgb(a) || is.hsl(a)); },
  key: function (a) { return !defaultInstanceSettings.hasOwnProperty(a) && !defaultTweenSettings.hasOwnProperty(a) && a !== 'targets' && a !== 'keyframes'; }
};

// Easings

function parseEasingParameters(string) {
  var match = /\(([^)]+)\)/.exec(string);
  return match ? match[1].split(',').map((function (p) { return parseFloat(p); })) : [];
}

// Spring solver inspired by Webkit Copyright © 2016 Apple Inc. All rights reserved. https://webkit.org/demos/spring/spring.js

function spring(string, duration) {

  var params = parseEasingParameters(string);
  var mass = minMax(is.und(params[0]) ? 1 : params[0], .1, 100);
  var stiffness = minMax(is.und(params[1]) ? 100 : params[1], .1, 100);
  var damping = minMax(is.und(params[2]) ? 10 : params[2], .1, 100);
  var velocity =  minMax(is.und(params[3]) ? 0 : params[3], .1, 100);
  var w0 = Math.sqrt(stiffness / mass);
  var zeta = damping / (2 * Math.sqrt(stiffness * mass));
  var wd = zeta < 1 ? w0 * Math.sqrt(1 - zeta * zeta) : 0;
  var a = 1;
  var b = zeta < 1 ? (zeta * w0 + -velocity) / wd : -velocity + w0;

  function solver(t) {
    var progress = duration ? (duration * t) / 1000 : t;
    if (zeta < 1) {
      progress = Math.exp(-progress * zeta * w0) * (a * Math.cos(wd * progress) + b * Math.sin(wd * progress));
    } else {
      progress = (a + b * progress) * Math.exp(-progress * w0);
    }
    if (t === 0 || t === 1) { return t; }
    return 1 - progress;
  }

  function getDuration() {
    var cached = cache.springs[string];
    if (cached) { return cached; }
    var frame = 1/6;
    var elapsed = 0;
    var rest = 0;
    while(true) {
      elapsed += frame;
      if (solver(elapsed) === 1) {
        rest++;
        if (rest >= 16) { break; }
      } else {
        rest = 0;
      }
    }
    var duration = elapsed * frame * 1000;
    cache.springs[string] = duration;
    return duration;
  }

  return duration ? solver : getDuration;

}

// Basic steps easing implementation https://developer.mozilla.org/fr/docs/Web/CSS/transition-timing-function

function steps(steps) {
  if ( steps === void 0 ) steps = 10;

  return function (t) { return Math.ceil((minMax(t, 0.000001, 1)) * steps) * (1 / steps); };
}

// BezierEasing https://github.com/gre/bezier-easing

var bezier = (function () {

  var kSplineTableSize = 11;
  var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

  function A(aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1 }
  function B(aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1 }
  function C(aA1)      { return 3.0 * aA1 }

  function calcBezier(aT, aA1, aA2) { return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT }
  function getSlope(aT, aA1, aA2) { return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1) }

  function binarySubdivide(aX, aA, aB, mX1, mX2) {
    var currentX, currentT, i = 0;
    do {
      currentT = aA + (aB - aA) / 2.0;
      currentX = calcBezier(currentT, mX1, mX2) - aX;
      if (currentX > 0.0) { aB = currentT; } else { aA = currentT; }
    } while (Math.abs(currentX) > 0.0000001 && ++i < 10);
    return currentT;
  }

  function newtonRaphsonIterate(aX, aGuessT, mX1, mX2) {
    for (var i = 0; i < 4; ++i) {
      var currentSlope = getSlope(aGuessT, mX1, mX2);
      if (currentSlope === 0.0) { return aGuessT; }
      var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
      aGuessT -= currentX / currentSlope;
    }
    return aGuessT;
  }

  function bezier(mX1, mY1, mX2, mY2) {

    if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) { return; }
    var sampleValues = new Float32Array(kSplineTableSize);

    if (mX1 !== mY1 || mX2 !== mY2) {
      for (var i = 0; i < kSplineTableSize; ++i) {
        sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
      }
    }

    function getTForX(aX) {

      var intervalStart = 0;
      var currentSample = 1;
      var lastSample = kSplineTableSize - 1;

      for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
        intervalStart += kSampleStepSize;
      }

      --currentSample;

      var dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
      var guessForT = intervalStart + dist * kSampleStepSize;
      var initialSlope = getSlope(guessForT, mX1, mX2);

      if (initialSlope >= 0.001) {
        return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
      } else if (initialSlope === 0.0) {
        return guessForT;
      } else {
        return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
      }

    }

    return function (x) {
      if (mX1 === mY1 && mX2 === mY2) { return x; }
      if (x === 0 || x === 1) { return x; }
      return calcBezier(getTForX(x), mY1, mY2);
    }

  }

  return bezier;

})();

var penner = (function () {

  // Based on jQuery UI's implemenation of easing equations from Robert Penner (http://www.robertpenner.com/easing)

  var eases = { linear: function () { return function (t) { return t; }; } };

  var functionEasings = {
    Sine: function () { return function (t) { return 1 - Math.cos(t * Math.PI / 2); }; },
    Circ: function () { return function (t) { return 1 - Math.sqrt(1 - t * t); }; },
    Back: function () { return function (t) { return t * t * (3 * t - 2); }; },
    Bounce: function () { return function (t) {
      var pow2, b = 4;
      while (t < (( pow2 = Math.pow(2, --b)) - 1) / 11) {}
      return 1 / Math.pow(4, 3 - b) - 7.5625 * Math.pow(( pow2 * 3 - 2 ) / 22 - t, 2)
    }; },
    Elastic: function (amplitude, period) {
      if ( amplitude === void 0 ) amplitude = 1;
      if ( period === void 0 ) period = .5;

      var a = minMax(amplitude, 1, 10);
      var p = minMax(period, .1, 2);
      return function (t) {
        return (t === 0 || t === 1) ? t : 
          -a * Math.pow(2, 10 * (t - 1)) * Math.sin((((t - 1) - (p / (Math.PI * 2) * Math.asin(1 / a))) * (Math.PI * 2)) / p);
      }
    }
  };

  var baseEasings = ['Quad', 'Cubic', 'Quart', 'Quint', 'Expo'];

  baseEasings.forEach((function (name, i) {
    functionEasings[name] = function () { return function (t) { return Math.pow(t, i + 2); }; };
  }));

  Object.keys(functionEasings).forEach((function (name) {
    var easeIn = functionEasings[name];
    eases['easeIn' + name] = easeIn;
    eases['easeOut' + name] = function (a, b) { return function (t) { return 1 - easeIn(a, b)(1 - t); }; };
    eases['easeInOut' + name] = function (a, b) { return function (t) { return t < 0.5 ? easeIn(a, b)(t * 2) / 2 : 
      1 - easeIn(a, b)(t * -2 + 2) / 2; }; };
  }));

  return eases;

})();

function parseEasings(easing, duration) {
  if (is.fnc(easing)) { return easing; }
  var name = easing.split('(')[0];
  var ease = penner[name];
  var args = parseEasingParameters(easing);
  switch (name) {
    case 'spring' : return spring(easing, duration);
    case 'cubicBezier' : return applyArguments(bezier, args);
    case 'steps' : return applyArguments(steps, args);
    default : return applyArguments(ease, args);
  }
}

// Strings

function selectString(str) {
  try {
    var nodes = document.querySelectorAll(str);
    return nodes;
  } catch(e) {
    return;
  }
}

// Arrays

function filterArray(arr, callback) {
  var len = arr.length;
  var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
  var result = [];
  for (var i = 0; i < len; i++) {
    if (i in arr) {
      var val = arr[i];
      if (callback.call(thisArg, val, i, arr)) {
        result.push(val);
      }
    }
  }
  return result;
}

function flattenArray(arr) {
  return arr.reduce((function (a, b) { return a.concat(is.arr(b) ? flattenArray(b) : b); }), []);
}

function toArray(o) {
  if (is.arr(o)) { return o; }
  if (is.str(o)) { o = selectString(o) || o; }
  if (o instanceof NodeList || o instanceof HTMLCollection) { return [].slice.call(o); }
  return [o];
}

function arrayContains(arr, val) {
  return arr.some((function (a) { return a === val; }));
}

// Objects

function cloneObject(o) {
  var clone = {};
  for (var p in o) { clone[p] = o[p]; }
  return clone;
}

function replaceObjectProps(o1, o2) {
  var o = cloneObject(o1);
  for (var p in o1) { o[p] = o2.hasOwnProperty(p) ? o2[p] : o1[p]; }
  return o;
}

function mergeObjects(o1, o2) {
  var o = cloneObject(o1);
  for (var p in o2) { o[p] = is.und(o1[p]) ? o2[p] : o1[p]; }
  return o;
}

// Colors

function rgbToRgba(rgbValue) {
  var rgb = /rgb\((\d+,\s*[\d]+,\s*[\d]+)\)/g.exec(rgbValue);
  return rgb ? ("rgba(" + (rgb[1]) + ",1)") : rgbValue;
}

function hexToRgba(hexValue) {
  var rgx = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  var hex = hexValue.replace(rgx, (function (m, r, g, b) { return r + r + g + g + b + b; }) );
  var rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  var r = parseInt(rgb[1], 16);
  var g = parseInt(rgb[2], 16);
  var b = parseInt(rgb[3], 16);
  return ("rgba(" + r + "," + g + "," + b + ",1)");
}

function hslToRgba(hslValue) {
  var hsl = /hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/g.exec(hslValue) || /hsla\((\d+),\s*([\d.]+)%,\s*([\d.]+)%,\s*([\d.]+)\)/g.exec(hslValue);
  var h = parseInt(hsl[1], 10) / 360;
  var s = parseInt(hsl[2], 10) / 100;
  var l = parseInt(hsl[3], 10) / 100;
  var a = hsl[4] || 1;
  function hue2rgb(p, q, t) {
    if (t < 0) { t += 1; }
    if (t > 1) { t -= 1; }
    if (t < 1/6) { return p + (q - p) * 6 * t; }
    if (t < 1/2) { return q; }
    if (t < 2/3) { return p + (q - p) * (2/3 - t) * 6; }
    return p;
  }
  var r, g, b;
  if (s == 0) {
    r = g = b = l;
  } else {
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return ("rgba(" + (r * 255) + "," + (g * 255) + "," + (b * 255) + "," + a + ")");
}

function colorToRgb(val) {
  if (is.rgb(val)) { return rgbToRgba(val); }
  if (is.hex(val)) { return hexToRgba(val); }
  if (is.hsl(val)) { return hslToRgba(val); }
}

// Units

function getUnit(val) {
  var split = /[+-]?\d*\.?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(%|px|pt|em|rem|in|cm|mm|ex|ch|pc|vw|vh|vmin|vmax|deg|rad|turn)?$/.exec(val);
  if (split) { return split[1]; }
}

function getTransformUnit(propName) {
  if (stringContains(propName, 'translate') || propName === 'perspective') { return 'px'; }
  if (stringContains(propName, 'rotate') || stringContains(propName, 'skew')) { return 'deg'; }
}

// Values

function getFunctionValue(val, animatable) {
  if (!is.fnc(val)) { return val; }
  return val(animatable.target, animatable.id, animatable.total);
}

function getAttribute(el, prop) {
  return el.getAttribute(prop);
}

function convertPxToUnit(el, value, unit) {
  var valueUnit = getUnit(value);
  if (arrayContains([unit, 'deg', 'rad', 'turn'], valueUnit)) { return value; }
  var cached = cache.CSS[value + unit];
  if (!is.und(cached)) { return cached; }
  var baseline = 100;
  var tempEl = document.createElement(el.tagName);
  var parentEl = (el.parentNode && (el.parentNode !== document)) ? el.parentNode : document.body;
  parentEl.appendChild(tempEl);
  tempEl.style.position = 'absolute';
  tempEl.style.width = baseline + unit;
  var factor = baseline / tempEl.offsetWidth;
  parentEl.removeChild(tempEl);
  var convertedUnit = factor * parseFloat(value);
  cache.CSS[value + unit] = convertedUnit;
  return convertedUnit;
}

function getCSSValue(el, prop, unit) {
  if (prop in el.style) {
    var uppercasePropName = prop.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    var value = el.style[prop] || getComputedStyle(el).getPropertyValue(uppercasePropName) || '0';
    return unit ? convertPxToUnit(el, value, unit) : value;
  }
}

function getAnimationType(el, prop) {
  if (is.dom(el) && !is.inp(el) && (getAttribute(el, prop) || (is.svg(el) && el[prop]))) { return 'attribute'; }
  if (is.dom(el) && arrayContains(validTransforms, prop)) { return 'transform'; }
  if (is.dom(el) && (prop !== 'transform' && getCSSValue(el, prop))) { return 'css'; }
  if (el[prop] != null) { return 'object'; }
}

function getElementTransforms(el) {
  if (!is.dom(el)) { return; }
  var str = el.style.transform || '';
  var reg  = /(\w+)\(([^)]*)\)/g;
  var transforms = new Map();
  var m; while (m = reg.exec(str)) { transforms.set(m[1], m[2]); }
  return transforms;
}

function getTransformValue(el, propName, animatable, unit) {
  var defaultVal = stringContains(propName, 'scale') ? 1 : 0 + getTransformUnit(propName);
  var value = getElementTransforms(el).get(propName) || defaultVal;
  if (animatable) {
    animatable.transforms.list.set(propName, value);
    animatable.transforms['last'] = propName;
  }
  return unit ? convertPxToUnit(el, value, unit) : value;
}

function getOriginalTargetValue(target, propName, unit, animatable) {
  switch (getAnimationType(target, propName)) {
    case 'transform': return getTransformValue(target, propName, animatable, unit);
    case 'css': return getCSSValue(target, propName, unit);
    case 'attribute': return getAttribute(target, propName);
    default: return target[propName] || 0;
  }
}

function getRelativeValue(to, from) {
  var operator = /^(\*=|\+=|-=)/.exec(to);
  if (!operator) { return to; }
  var u = getUnit(to) || 0;
  var x = parseFloat(from);
  var y = parseFloat(to.replace(operator[0], ''));
  switch (operator[0][0]) {
    case '+': return x + y + u;
    case '-': return x - y + u;
    case '*': return x * y + u;
  }
}

function validateValue(val, unit) {
  if (is.col(val)) { return colorToRgb(val); }
  if (/\s/g.test(val)) { return val; }
  var originalUnit = getUnit(val);
  var unitLess = originalUnit ? val.substr(0, val.length - originalUnit.length) : val;
  if (unit) { return unitLess + unit; }
  return unitLess;
}

// getTotalLength() equivalent for circle, rect, polyline, polygon and line shapes
// adapted from https://gist.github.com/SebLambla/3e0550c496c236709744

function getDistance(p1, p2) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function getCircleLength(el) {
  return Math.PI * 2 * getAttribute(el, 'r');
}

function getRectLength(el) {
  return (getAttribute(el, 'width') * 2) + (getAttribute(el, 'height') * 2);
}

function getLineLength(el) {
  return getDistance(
    {x: getAttribute(el, 'x1'), y: getAttribute(el, 'y1')}, 
    {x: getAttribute(el, 'x2'), y: getAttribute(el, 'y2')}
  );
}

function getPolylineLength(el) {
  var points = el.points;
  var totalLength = 0;
  var previousPos;
  for (var i = 0 ; i < points.numberOfItems; i++) {
    var currentPos = points.getItem(i);
    if (i > 0) { totalLength += getDistance(previousPos, currentPos); }
    previousPos = currentPos;
  }
  return totalLength;
}

function getPolygonLength(el) {
  var points = el.points;
  return getPolylineLength(el) + getDistance(points.getItem(points.numberOfItems - 1), points.getItem(0));
}

// Path animation

function getTotalLength(el) {
  if (el.getTotalLength) { return el.getTotalLength(); }
  switch(el.tagName.toLowerCase()) {
    case 'circle': return getCircleLength(el);
    case 'rect': return getRectLength(el);
    case 'line': return getLineLength(el);
    case 'polyline': return getPolylineLength(el);
    case 'polygon': return getPolygonLength(el);
  }
}

function setDashoffset(el) {
  var pathLength = getTotalLength(el);
  el.setAttribute('stroke-dasharray', pathLength);
  return pathLength;
}

// Motion path

function getParentSvgEl(el) {
  var parentEl = el.parentNode;
  while (is.svg(parentEl)) {
    if (!is.svg(parentEl.parentNode)) { break; }
    parentEl = parentEl.parentNode;
  }
  return parentEl;
}

function getParentSvg(pathEl, svgData) {
  var svg = svgData || {};
  var parentSvgEl = svg.el || getParentSvgEl(pathEl);
  var rect = parentSvgEl.getBoundingClientRect();
  var viewBoxAttr = getAttribute(parentSvgEl, 'viewBox');
  var width = rect.width;
  var height = rect.height;
  var viewBox = svg.viewBox || (viewBoxAttr ? viewBoxAttr.split(' ') : [0, 0, width, height]);
  return {
    el: parentSvgEl,
    viewBox: viewBox,
    x: viewBox[0] / 1,
    y: viewBox[1] / 1,
    w: width / viewBox[2],
    h: height / viewBox[3]
  }
}

function getPath(path, percent) {
  var pathEl = is.str(path) ? selectString(path)[0] : path;
  var p = percent || 100;
  return function(property) {
    return {
      property: property,
      el: pathEl,
      svg: getParentSvg(pathEl),
      totalLength: getTotalLength(pathEl) * (p / 100)
    }
  }
}

function getPathProgress(path, progress) {
  function point(offset) {
    if ( offset === void 0 ) offset = 0;

    var l = progress + offset >= 1 ? progress + offset : 0;
    return path.el.getPointAtLength(l);
  }
  var svg = getParentSvg(path.el, path.svg);
  var p = point();
  var p0 = point(-1);
  var p1 = point(+1);
  switch (path.property) {
    case 'x': return (p.x - svg.x) * svg.w;
    case 'y': return (p.y - svg.y) * svg.h;
    case 'angle': return Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI;
  }
}

// Decompose value

function decomposeValue(val, unit) {
  // const rgx = /-?\d*\.?\d+/g; // handles basic numbers
  // const rgx = /[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g; // handles exponents notation
  var rgx = /[+-]?\d*\.?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g; // handles exponents notation
  var value = validateValue((is.pth(val) ? val.totalLength : val), unit) + '';
  return {
    original: value,
    numbers: value.match(rgx) ? value.match(rgx).map(Number) : [0],
    strings: (is.str(val) || unit) ? value.split(rgx) : []
  }
}

// Animatables

function parseTargets(targets) {
  var targetsArray = targets ? (flattenArray(is.arr(targets) ? targets.map(toArray) : toArray(targets))) : [];
  return filterArray(targetsArray, (function (item, pos, self) { return self.indexOf(item) === pos; }));
}

function getAnimatables(targets) {
  var parsed = parseTargets(targets);
  return parsed.map((function (t, i) {
    return {target: t, id: i, total: parsed.length, transforms: { list: getElementTransforms(t) } };
  }));
}

// Properties

function normalizePropertyTweens(prop, tweenSettings) {
  var settings = cloneObject(tweenSettings);
  // Override duration if easing is a spring
  if (/^spring/.test(settings.easing)) { settings.duration = spring(settings.easing); }
  if (is.arr(prop)) {
    var l = prop.length;
    var isFromTo = (l === 2 && !is.obj(prop[0]));
    if (!isFromTo) {
      // Duration divided by the number of tweens
      if (!is.fnc(tweenSettings.duration)) { settings.duration = tweenSettings.duration / l; }
    } else {
      // Transform [from, to] values shorthand to a valid tween value
      prop = {value: prop};
    }
  }
  var propArray = is.arr(prop) ? prop : [prop];
  return propArray.map((function (v, i) {
    var obj = (is.obj(v) && !is.pth(v)) ? v : {value: v};
    // Default delay value should only be applied to the first tween
    if (is.und(obj.delay)) { obj.delay = !i ? tweenSettings.delay : 0; }
    // Default endDelay value should only be applied to the last tween
    if (is.und(obj.endDelay)) { obj.endDelay = i === propArray.length - 1 ? tweenSettings.endDelay : 0; }
    return obj;
  })).map((function (k) { return mergeObjects(k, settings); }));
}


function flattenKeyframes(keyframes) {
  var propertyNames = filterArray(flattenArray(keyframes.map((function (key) { return Object.keys(key); }))), (function (p) { return is.key(p); }))
  .reduce((function (a,b) { if (a.indexOf(b) < 0) { a.push(b); } return a; }), []);
  var properties = {};
  var loop = function ( i ) {
    var propName = propertyNames[i];
    properties[propName] = keyframes.map((function (key) {
      var newKey = {};
      for (var p in key) {
        if (is.key(p)) {
          if (p == propName) { newKey.value = key[p]; }
        } else {
          newKey[p] = key[p];
        }
      }
      return newKey;
    }));
  };

  for (var i = 0; i < propertyNames.length; i++) loop( i );
  return properties;
}

function getProperties(tweenSettings, params) {
  var properties = [];
  var keyframes = params.keyframes;
  if (keyframes) { params = mergeObjects(flattenKeyframes(keyframes), params); }
  for (var p in params) {
    if (is.key(p)) {
      properties.push({
        name: p,
        tweens: normalizePropertyTweens(params[p], tweenSettings)
      });
    }
  }
  return properties;
}

// Tweens

function normalizeTweenValues(tween, animatable) {
  var t = {};
  for (var p in tween) {
    var value = getFunctionValue(tween[p], animatable);
    if (is.arr(value)) {
      value = value.map((function (v) { return getFunctionValue(v, animatable); }));
      if (value.length === 1) { value = value[0]; }
    }
    t[p] = value;
  }
  t.duration = parseFloat(t.duration);
  t.delay = parseFloat(t.delay);
  return t;
}

function normalizeTweens(prop, animatable) {
  var previousTween;
  return prop.tweens.map((function (t) {
    var tween = normalizeTweenValues(t, animatable);
    var tweenValue = tween.value;
    var to = is.arr(tweenValue) ? tweenValue[1] : tweenValue;
    var toUnit = getUnit(to);
    var originalValue = getOriginalTargetValue(animatable.target, prop.name, toUnit, animatable);
    var previousValue = previousTween ? previousTween.to.original : originalValue;
    var from = is.arr(tweenValue) ? tweenValue[0] : previousValue;
    var fromUnit = getUnit(from) || getUnit(originalValue);
    var unit = toUnit || fromUnit;
    if (is.und(to)) { to = previousValue; }
    tween.from = decomposeValue(from, unit);
    tween.to = decomposeValue(getRelativeValue(to, from), unit);
    tween.start = previousTween ? previousTween.end : 0;
    tween.end = tween.start + tween.delay + tween.duration + tween.endDelay;
    tween.easing = parseEasings(tween.easing, tween.duration);
    tween.isPath = is.pth(tweenValue);
    tween.isColor = is.col(tween.from.original);
    if (tween.isColor) { tween.round = 1; }
    previousTween = tween;
    return tween;
  }));
}

// Tween progress

var setProgressValue = {
  css: function (t, p, v) { return t.style[p] = v; },
  attribute: function (t, p, v) { return t.setAttribute(p, v); },
  object: function (t, p, v) { return t[p] = v; },
  transform: function (t, p, v, transforms, manual) {
    transforms.list.set(p, v);
    if (p === transforms.last || manual) {
      var str = '';
      transforms.list.forEach((function (value, prop) { str += prop + "(" + value + ") "; }));
      t.style.transform = str;
    }
  }
};

// Set Value helper

function setTargetsValue(targets, properties) {
  var animatables = getAnimatables(targets);
  animatables.forEach((function (animatable) {
    for (var property in properties) {
      var value = getFunctionValue(properties[property], animatable);
      var target = animatable.target;
      var valueUnit = getUnit(value);
      var originalValue = getOriginalTargetValue(target, property, valueUnit, animatable);
      var unit = valueUnit || getUnit(originalValue);
      var to = getRelativeValue(validateValue(value, unit), originalValue);
      var animType = getAnimationType(target, property);
      setProgressValue[animType](target, property, to, animatable.transforms, true);
    }
  }));
}

// Animations

function createAnimation(animatable, prop) {
  var animType = getAnimationType(animatable.target, prop.name);
  if (animType) {
    var tweens = normalizeTweens(prop, animatable);
    var lastTween = tweens[tweens.length - 1];
    return {
      type: animType,
      property: prop.name,
      animatable: animatable,
      tweens: tweens,
      duration: lastTween.end,
      delay: tweens[0].delay,
      endDelay: lastTween.endDelay
    }
  }
}

function getAnimations(animatables, properties) {
  return filterArray(flattenArray(animatables.map((function (animatable) {
    return properties.map((function (prop) {
      return createAnimation(animatable, prop);
    }));
  }))), (function (a) { return !is.und(a); }));
}

// Create Instance

function getInstanceTimings(animations, tweenSettings) {
  var animLength = animations.length;
  var getTlOffset = function (anim) { return anim.timelineOffset ? anim.timelineOffset : 0; };
  var timings = {};
  timings.duration = animLength ? Math.max.apply(Math, animations.map((function (anim) { return getTlOffset(anim) + anim.duration; }))) : tweenSettings.duration;
  timings.delay = animLength ? Math.min.apply(Math, animations.map((function (anim) { return getTlOffset(anim) + anim.delay; }))) : tweenSettings.delay;
  timings.endDelay = animLength ? timings.duration - Math.max.apply(Math, animations.map((function (anim) { return getTlOffset(anim) + anim.duration - anim.endDelay; }))) : tweenSettings.endDelay;
  return timings;
}

var instanceID = 0;

function createNewInstance(params) {
  var instanceSettings = replaceObjectProps(defaultInstanceSettings, params);
  var tweenSettings = replaceObjectProps(defaultTweenSettings, params);
  var properties = getProperties(tweenSettings, params);
  var animatables = getAnimatables(params.targets);
  var animations = getAnimations(animatables, properties);
  var timings = getInstanceTimings(animations, tweenSettings);
  var id = instanceID;
  instanceID++;
  return mergeObjects(instanceSettings, {
    id: id,
    children: [],
    animatables: animatables,
    animations: animations,
    duration: timings.duration,
    delay: timings.delay,
    endDelay: timings.endDelay
  });
}

// Core

var activeInstances = [];
var pausedInstances = [];
var raf;

var engine = (function () {
  function play() { 
    raf = requestAnimationFrame(step);
  }
  function step(t) {
    var activeInstancesLength = activeInstances.length;
    if (activeInstancesLength) {
      var i = 0;
      while (i < activeInstancesLength) {
        var activeInstance = activeInstances[i];
        if (!activeInstance.paused) {
          activeInstance.tick(t);
        } else {
          var instanceIndex = activeInstances.indexOf(activeInstance);
          if (instanceIndex > -1) {
            activeInstances.splice(instanceIndex, 1);
            activeInstancesLength = activeInstances.length;
          }
        }
        i++;
      }
      play();
    } else {
      raf = cancelAnimationFrame(raf);
    }
  }
  return play;
})();

function handleVisibilityChange() {
  if (document.hidden) {
    activeInstances.forEach((function (ins) { return ins.pause(); }));
    pausedInstances = activeInstances.slice(0);
    anime.running = activeInstances = [];
  } else {
    pausedInstances.forEach((function (ins) { return ins.play(); }));
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

// Public Instance

function anime(params) {
  if ( params === void 0 ) params = {};


  var startTime = 0, lastTime = 0, now = 0;
  var children, childrenLength = 0;
  var resolve = null;

  function makePromise(instance) {
    var promise = window.Promise && new Promise(function (_resolve) { return resolve = _resolve; });
    instance.finished = promise;
    return promise;
  }

  var instance = createNewInstance(params);
  var promise = makePromise(instance);

  function toggleInstanceDirection() {
    var direction = instance.direction;
    if (direction !== 'alternate') {
      instance.direction = direction !== 'normal' ? 'normal' : 'reverse';
    }
    instance.reversed = !instance.reversed;
    children.forEach((function (child) { return child.reversed = instance.reversed; }));
  }

  function adjustTime(time) {
    return instance.reversed ? instance.duration - time : time;
  }

  function resetTime() {
    startTime = 0;
    lastTime = adjustTime(instance.currentTime) * (1 / anime.speed);
  }

  function seekChild(time, child) {
    if (child) { child.seek(time - child.timelineOffset); }
  }

  function syncInstanceChildren(time) {
    if (!instance.reversePlayback) {
      for (var i = 0; i < childrenLength; i++) { seekChild(time, children[i]); }
    } else {
      for (var i$1 = childrenLength; i$1--;) { seekChild(time, children[i$1]); }
    }
  }

  function setAnimationsProgress(insTime) {
    var i = 0;
    var animations = instance.animations;
    var animationsLength = animations.length;
    while (i < animationsLength) {
      var anim = animations[i];
      var animatable = anim.animatable;
      var tweens = anim.tweens;
      var tweenLength = tweens.length - 1;
      var tween = tweens[tweenLength];
      // Only check for keyframes if there is more than one tween
      if (tweenLength) { tween = filterArray(tweens, (function (t) { return (insTime < t.end); }))[0] || tween; }
      var elapsed = minMax(insTime - tween.start - tween.delay, 0, tween.duration) / tween.duration;
      var eased = isNaN(elapsed) ? 1 : tween.easing(elapsed);
      var strings = tween.to.strings;
      var round = tween.round;
      var numbers = [];
      var toNumbersLength = tween.to.numbers.length;
      var progress = (void 0);
      for (var n = 0; n < toNumbersLength; n++) {
        var value = (void 0);
        var toNumber = tween.to.numbers[n];
        var fromNumber = tween.from.numbers[n] || 0;
        if (!tween.isPath) {
          value = fromNumber + (eased * (toNumber - fromNumber));
        } else {
          value = getPathProgress(tween.value, eased * toNumber);
        }
        if (round) {
          if (!(tween.isColor && n > 2)) {
            value = Math.round(value * round) / round;
          }
        }
        numbers.push(value);
      }
      // Manual Array.reduce for better performances
      var stringsLength = strings.length;
      if (!stringsLength) {
        progress = numbers[0];
      } else {
        progress = strings[0];
        for (var s = 0; s < stringsLength; s++) {
          var a = strings[s];
          var b = strings[s + 1];
          var n$1 = numbers[s];
          if (!isNaN(n$1)) {
            if (!b) {
              progress += n$1 + ' ';
            } else {
              progress += n$1 + b;
            }
          }
        }
      }
      setProgressValue[anim.type](animatable.target, anim.property, progress, animatable.transforms);
      anim.currentValue = progress;
      i++;
    }
  }

  function setCallback(cb) {
    if (instance[cb] && !instance.passThrough) { instance[cb](instance); }
  }

  function countIteration() {
    if (instance.remaining && instance.remaining !== true) {
      instance.remaining--;
    }
  }

  function setInstanceProgress(engineTime) {
    var insDuration = instance.duration;
    var insDelay = instance.delay;
    var insEndDelay = insDuration - instance.endDelay;
    var insTime = adjustTime(engineTime);
    instance.progress = minMax((insTime / insDuration) * 100, 0, 100);
    instance.reversePlayback = insTime < instance.currentTime;
    if (children) { syncInstanceChildren(insTime); }
    if (!instance.began && instance.currentTime > 0) {
      instance.began = true;
      setCallback('begin');
    }
    if (!instance.loopBegan && instance.currentTime > 0) {
      instance.loopBegan = true;
      setCallback('loopBegin');
    }
    if (insTime <= insDelay && instance.currentTime !== 0) {
      setAnimationsProgress(0);
    }
    if ((insTime >= insEndDelay && instance.currentTime !== insDuration) || !insDuration) {
      setAnimationsProgress(insDuration);
    }
    if (insTime > insDelay && insTime < insEndDelay) {
      if (!instance.changeBegan) {
        instance.changeBegan = true;
        instance.changeCompleted = false;
        setCallback('changeBegin');
      }
      setCallback('change');
      setAnimationsProgress(insTime);
    } else {
      if (instance.changeBegan) {
        instance.changeCompleted = true;
        instance.changeBegan = false;
        setCallback('changeComplete');
      }
    }
    instance.currentTime = minMax(insTime, 0, insDuration);
    if (instance.began) { setCallback('update'); }
    if (engineTime >= insDuration) {
      lastTime = 0;
      countIteration();
      if (!instance.remaining) {
        instance.paused = true;
        if (!instance.completed) {
          instance.completed = true;
          setCallback('loopComplete');
          setCallback('complete');
          if (!instance.passThrough && 'Promise' in window) {
            resolve();
            promise = makePromise(instance);
          }
        }
      } else {
        startTime = now;
        setCallback('loopComplete');
        instance.loopBegan = false;
        if (instance.direction === 'alternate') {
          toggleInstanceDirection();
        }
      }
    }
  }

  instance.reset = function() {
    var direction = instance.direction;
    instance.passThrough = false;
    instance.currentTime = 0;
    instance.progress = 0;
    instance.paused = true;
    instance.began = false;
    instance.loopBegan = false;
    instance.changeBegan = false;
    instance.completed = false;
    instance.changeCompleted = false;
    instance.reversePlayback = false;
    instance.reversed = direction === 'reverse';
    instance.remaining = instance.loop;
    children = instance.children;
    childrenLength = children.length;
    for (var i = childrenLength; i--;) { instance.children[i].reset(); }
    if (instance.reversed && instance.loop !== true || (direction === 'alternate' && instance.loop === 1)) { instance.remaining++; }
    setAnimationsProgress(instance.reversed ? instance.duration : 0);
  };

  // Set Value helper

  instance.set = function(targets, properties) {
    setTargetsValue(targets, properties);
    return instance;
  };

  instance.tick = function(t) {
    now = t;
    if (!startTime) { startTime = now; }
    setInstanceProgress((now + (lastTime - startTime)) * anime.speed);
  };

  instance.seek = function(time) {
    setInstanceProgress(adjustTime(time));
  };

  instance.pause = function() {
    instance.paused = true;
    resetTime();
  };

  instance.play = function() {
    if (!instance.paused) { return; }
    if (instance.completed) { instance.reset(); }
    instance.paused = false;
    activeInstances.push(instance);
    resetTime();
    if (!raf) { engine(); }
  };

  instance.reverse = function() {
    toggleInstanceDirection();
    instance.completed = instance.reversed ? false : true;
    resetTime();
  };

  instance.restart = function() {
    instance.reset();
    instance.play();
  };

  instance.reset();

  if (instance.autoplay) { instance.play(); }

  return instance;

}

// Remove targets from animation

function removeTargetsFromAnimations(targetsArray, animations) {
  for (var a = animations.length; a--;) {
    if (arrayContains(targetsArray, animations[a].animatable.target)) {
      animations.splice(a, 1);
    }
  }
}

function removeTargets(targets) {
  var targetsArray = parseTargets(targets);
  for (var i = activeInstances.length; i--;) {
    var instance = activeInstances[i];
    var animations = instance.animations;
    var children = instance.children;
    removeTargetsFromAnimations(targetsArray, animations);
    for (var c = children.length; c--;) {
      var child = children[c];
      var childAnimations = child.animations;
      removeTargetsFromAnimations(targetsArray, childAnimations);
      if (!childAnimations.length && !child.children.length) { children.splice(c, 1); }
    }
    if (!animations.length && !children.length) { instance.pause(); }
  }
}

// Stagger helpers

function stagger(val, params) {
  if ( params === void 0 ) params = {};

  var direction = params.direction || 'normal';
  var easing = params.easing ? parseEasings(params.easing) : null;
  var grid = params.grid;
  var axis = params.axis;
  var fromIndex = params.from || 0;
  var fromFirst = fromIndex === 'first';
  var fromCenter = fromIndex === 'center';
  var fromLast = fromIndex === 'last';
  var isRange = is.arr(val);
  var val1 = isRange ? parseFloat(val[0]) : parseFloat(val);
  var val2 = isRange ? parseFloat(val[1]) : 0;
  var unit = getUnit(isRange ? val[1] : val) || 0;
  var start = params.start || 0 + (isRange ? val1 : 0);
  var values = [];
  var maxValue = 0;
  return function (el, i, t) {
    if (fromFirst) { fromIndex = 0; }
    if (fromCenter) { fromIndex = (t - 1) / 2; }
    if (fromLast) { fromIndex = t - 1; }
    if (!values.length) {
      for (var index = 0; index < t; index++) {
        if (!grid) {
          values.push(Math.abs(fromIndex - index));
        } else {
          var fromX = !fromCenter ? fromIndex%grid[0] : (grid[0]-1)/2;
          var fromY = !fromCenter ? Math.floor(fromIndex/grid[0]) : (grid[1]-1)/2;
          var toX = index%grid[0];
          var toY = Math.floor(index/grid[0]);
          var distanceX = fromX - toX;
          var distanceY = fromY - toY;
          var value = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
          if (axis === 'x') { value = -distanceX; }
          if (axis === 'y') { value = -distanceY; }
          values.push(value);
        }
        maxValue = Math.max.apply(Math, values);
      }
      if (easing) { values = values.map((function (val) { return easing(val / maxValue) * maxValue; })); }
      if (direction === 'reverse') { values = values.map((function (val) { return axis ? (val < 0) ? val * -1 : -val : Math.abs(maxValue - val); })); }
    }
    var spacing = isRange ? (val2 - val1) / maxValue : val1;
    return start + (spacing * (Math.round(values[i] * 100) / 100)) + unit;
  }
}

// Timeline

function timeline(params) {
  if ( params === void 0 ) params = {};

  var tl = anime(params);
  tl.duration = 0;
  tl.add = function(instanceParams, timelineOffset) {
    var tlIndex = activeInstances.indexOf(tl);
    var children = tl.children;
    if (tlIndex > -1) { activeInstances.splice(tlIndex, 1); }
    function passThrough(ins) { ins.passThrough = true; }
    for (var i = 0; i < children.length; i++) { passThrough(children[i]); }
    var insParams = mergeObjects(instanceParams, replaceObjectProps(defaultTweenSettings, params));
    insParams.targets = insParams.targets || params.targets;
    var tlDuration = tl.duration;
    insParams.autoplay = false;
    insParams.direction = tl.direction;
    insParams.timelineOffset = is.und(timelineOffset) ? tlDuration : getRelativeValue(timelineOffset, tlDuration);
    passThrough(tl);
    tl.seek(insParams.timelineOffset);
    var ins = anime(insParams);
    passThrough(ins);
    children.push(ins);
    var timings = getInstanceTimings(children, params);
    tl.delay = timings.delay;
    tl.endDelay = timings.endDelay;
    tl.duration = timings.duration;
    tl.seek(0);
    tl.reset();
    if (tl.autoplay) { tl.play(); }
    return tl;
  };
  return tl;
}

anime.version = '3.2.0';
anime.speed = 1;
anime.running = activeInstances;
anime.remove = removeTargets;
anime.get = getOriginalTargetValue;
anime.set = setTargetsValue;
anime.convertPx = convertPxToUnit;
anime.path = getPath;
anime.setDashoffset = setDashoffset;
anime.stagger = stagger;
anime.timeline = timeline;
anime.easing = parseEasings;
anime.penner = penner;
anime.random = function (min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; };

//module.exports = anime;
if ( typeof module !== 'undefined' ) {
	module.exports = anime
}
/*!
 * atomicjs v4.4.0
 * A tiny, Promise-based vanilla JS Ajax/HTTP plugin with 
 * great browser support.
 * (c) 2019 Chris Ferdinandi
 * MIT License
 * https://github.com/cferdinandi/atomic
 */

(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		define([], (function () {
			return factory(root);
		}));
	} else if (typeof exports === 'object') {
		module.exports = factory(root);
	} else {
		window.atomic = factory(root);
	}
})(typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this, (function (window) {

	'use strict';

	//
	// Variables
	//

	var settings;

	// Default settings
	var defaults = {
		method: 'GET',
		username: null,
		password: null,
		data: {},
		headers: {
			'Content-type': 'application/x-www-form-urlencoded'
		},
		responseType: 'text',
		timeout: null,
		withCredentials: false
	};


	//
	// Methods
	//

	/**
	 * Feature test
	 * @return {Boolean} If true, required methods and APIs are supported
	 */
	var supports = function () {
		return 'XMLHttpRequest' in window && 'JSON' in window && 'Promise' in window;
	};

	/**
	 * Merge two or more objects together.
	 * @param   {Object}   objects  The objects to merge together
	 * @returns {Object}            Merged values of defaults and options
	 */
	var extend = function () {

		// Variables
		var extended = {};

		// Merge the object into the extended object
		var merge = function (obj) {
			for (var prop in obj) {
				if (obj.hasOwnProperty(prop)) {
					if (Object.prototype.toString.call(obj[prop]) === '[object Object]') {
						extended[prop] = extend(extended[prop], obj[prop]);
					} else {
						extended[prop] = obj[prop];
					}
				}
			}
		};

		// Loop through each object and conduct a merge
		for (var i = 0; i < arguments.length; i++) {
			var obj = arguments[i];
			merge(obj);
		}

		return extended;

	};

	/**
	 * Parse text response into JSON
	 * @private
	 * @param  {String} req The response
	 * @return {Array}      A JSON Object of the responseText, plus the orginal response
	 */
	var parse = function (req) {
		var result;
		if (settings.responseType !== 'text' && settings.responseType !== '') {
			return {data: req.response, xhr: req};
		}
		try {
			result = JSON.parse(req.responseText);
		} catch (e) {
			result = req.responseText;
		}
		return {data: result, xhr: req};
	};

	/**
	 * Convert an object into a query string
	 * @link   https://blog.garstasio.com/you-dont-need-jquery/ajax/
	 * @param  {Object|Array|String} obj The object
	 * @return {String}                  The query string
	 */
	var param = function (obj) {

		// If already a string, or if a FormData object, return it as-is
		if (typeof (obj) === 'string' || Object.prototype.toString.call(obj) === '[object FormData]') return obj;

		// If the content-type is set to JSON, stringify the JSON object
		if (/application\/json/i.test(settings.headers['Content-type']) || Object.prototype.toString.call(obj) === '[object Array]') return JSON.stringify(obj);

		// Otherwise, convert object to a serialized string
		var encoded = [];
		for (var prop in obj) {
			if (obj.hasOwnProperty(prop)) {
				encoded.push(encodeURIComponent(prop) + '=' + encodeURIComponent(obj[prop]));
			}
		}
		return encoded.join('&');

	};

	/**
	 * Make an XHR request, returned as a Promise
	 * @param  {String} url The request URL
	 * @return {Promise}    The XHR request Promise
	 */
	var makeRequest = function (url) {

		// Create the XHR request
		var request = new XMLHttpRequest();

		// Setup the Promise
		var xhrPromise = new Promise(function (resolve, reject) {

			// Setup our listener to process compeleted requests
			request.onreadystatechange = function () {

				// Only run if the request is complete
				if (request.readyState !== 4) return;

				// Process the response
				if (request.status >= 200 && request.status < 300) {
					// If successful
					resolve(parse(request));
				} else {
					// If failed
					reject({
						status: request.status,
						statusText: request.statusText,
						responseText : request.responseText
					});
				}

			};

			// Setup our HTTP request
			request.open(settings.method, url, true, settings.username, settings.password);
			request.responseType = settings.responseType;

			// Add headers
			for (var header in settings.headers) {
				if (settings.headers.hasOwnProperty(header)) {
					request.setRequestHeader(header, settings.headers[header]);
				}
			}

			// Set timeout
			if (settings.timeout) {
				request.timeout = settings.timeout;
				request.ontimeout = function (e) {
					reject({
						status: 408,
						statusText: 'Request timeout'
					});
				};
			}

			// Add withCredentials
			if (settings.withCredentials) {
				request.withCredentials = true;
			}

			// Send the request
			request.send(param(settings.data));

		});

		// Cancel the XHR request
		xhrPromise.cancel = function () {
			request.abort();
		};

		// Return the request as a Promise
		return xhrPromise;

	};

	/**
	 * Instatiate Atomic
	 * @param {String} url      The request URL
	 * @param {Object} options  A set of options for the request [optional]
	 */
	var Atomic = function (url, options) {

		// Check browser support
		if (!supports()) throw 'Atomic: This browser does not support the methods used in this plugin.';

		// Merge options into defaults
		settings = extend(defaults, options || {});

		// Make request
		return makeRequest(url);

	};


	//
	// Public Methods
	//

	return Atomic;

}));
/*!
 * eventslibjs v1.2.0
 * A tiny event delegation helper library.
 * (c) 2019 Chris Ferdinandi
 * MIT License
 * http://github.com/cferdinandi/events
 */

(function (root, factory) {
	if ( typeof define === 'function' && define.amd ) {
		define([], (function () {
			return factory(root);
		}));
	} else if ( typeof exports === 'object' ) {
		module.exports = factory(root);
	} else {
		root.events = factory(root);
	}
})(typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this, (function (window) {

	'use strict';

	//
	// Variables
	//

	var publicAPIs = {};
	var activeEvents = {};


	//
	// Methods
	//

	/**
	 * Get the index for the listener
	 * @param  {Array}   arr      The listeners for an event
	 * @param  {Array}   listener The listener details
	 * @return {Integer}          The index of the listener
	 */
	var getIndex = function (arr, selector, callback) {
		for (var i = 0; i < arr.length; i++) {
			if (
				arr[i].selector === selector &&
				arr[i].callback.toString() === callback.toString()
			) return i;
		}
		return -1;
	};

	/**
	 * Check if the listener callback should run or not
	 * @param  {Node}         target   The event.target
	 * @param  {String|Node}  selector The selector to check the target against
	 * @return {Boolean}               If true, run listener
	 */
	var doRun = function (target, selector) {
		if ([
			'*',
			'window',
			'document',
			'document.documentElement',
			window,
			document,
			document.documentElement
		].indexOf(selector) > -1) return true;
		if (typeof selector !== 'string' && selector.contains) {
			return selector === target || selector.contains(target);
		}
		return target.closest(selector);
	};

	/**
	 * Handle listeners after event fires
	 * @param {Event} event The event
	 */
	var eventHandler = function (event) {
		if (!activeEvents[event.type]) return;
		activeEvents[event.type].forEach((function (listener) {
			if (!doRun(event.target, listener.selector)) return;
			listener.callback(event);
		}));
	};

	/**
	 * Add an event
	 * @param  {String}   types    The event type or types (comma separated)
	 * @param  {String}   selector The selector to run the event on
	 * @param  {Function} callback The function to run when the event fires
	 */
	publicAPIs.on = function (types, selector, callback) {

		// Make sure there's a selector and callback
		if (!selector || !callback) return;

		// Loop through each event type
		types.split(',').forEach((function (type) {

			// Remove whitespace
			type = type.trim();

			// If no event of this type yet, setup
			if (!activeEvents[type]) {
				activeEvents[type] = [];
				window.addEventListener(type, eventHandler, true);
			}

			// Push to active events
			activeEvents[type].push({
				selector: selector,
				callback: callback
			});

		}));

	};

	/**
	 * Remove an event
	 * @param  {String}   types    The event type or types (comma separated)
	 * @param  {String}   selector The selector to remove the event from
	 * @param  {Function} callback The function to remove
	 */
	publicAPIs.off = function (types, selector, callback) {

		// Loop through each event type
		types.split(',').forEach((function (type) {

			// Remove whitespace
			type = type.trim();

			// if event type doesn't exist, bail
			if (!activeEvents[type]) return;

			// If it's the last event of it's type, remove entirely
			if (activeEvents[type].length < 2 || !selector) {
				delete activeEvents[type];
				window.removeEventListener(type, eventHandler, true);
				return;
			}

			// Otherwise, remove event
			var index = getIndex(activeEvents[type], selector, callback);
			if (index < 0) return;
			activeEvents[type].splice(index, 1);

		}));

	};

	/**
	 * Add an event, and automatically remove it after it's first run
	 * @param  {String}   types    The event type or types (comma separated)
	 * @param  {String}   selector The selector to run the event on
	 * @param  {Function} callback The function to run when the event fires
	 */
	publicAPIs.once = function (types, selector, callback) {
		publicAPIs.on(types, selector, (function temp (event) {
			callback(event);
			publicAPIs.off(types, selector, temp);
		}));
	};

	/**
	 * Get an immutable copy of all active event listeners
	 * @return {Object} Active event listeners
	 */
	publicAPIs.get = function () {
		var obj = {};
		for (var type in activeEvents) {
			if (activeEvents.hasOwnProperty(type)) {
				obj[type] = activeEvents[type];
			}
		}
		return obj;
	};


	//
	// Return public APIs
	//

	return publicAPIs;

}));
/*!
 * imagesLoaded PACKAGED v4.1.4
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */

/**
 * EvEmitter v1.1.0
 * Lil' event emitter
 * MIT License
 */

/* jshint unused: true, undef: true, strict: true */

( (function( global, factory ) {
  // universal module definition
  /* jshint strict: false */ /* globals define, module, window */
  if ( typeof define == 'function' && define.amd ) {
    // AMD - RequireJS
    define( 'ev-emitter/ev-emitter',factory );
  } else if ( typeof module == 'object' && module.exports ) {
    // CommonJS - Browserify, Webpack
    module.exports = factory();
  } else {
    // Browser globals
    global.EvEmitter = factory();
  }

})( typeof window != 'undefined' ? window : this, (function() {



function EvEmitter() {}

var proto = EvEmitter.prototype;

proto.on = function( eventName, listener ) {
  if ( !eventName || !listener ) {
    return;
  }
  // set events hash
  var events = this._events = this._events || {};
  // set listeners array
  var listeners = events[ eventName ] = events[ eventName ] || [];
  // only add once
  if ( listeners.indexOf( listener ) == -1 ) {
    listeners.push( listener );
  }

  return this;
};

proto.once = function( eventName, listener ) {
  if ( !eventName || !listener ) {
    return;
  }
  // add event
  this.on( eventName, listener );
  // set once flag
  // set onceEvents hash
  var onceEvents = this._onceEvents = this._onceEvents || {};
  // set onceListeners object
  var onceListeners = onceEvents[ eventName ] = onceEvents[ eventName ] || {};
  // set flag
  onceListeners[ listener ] = true;

  return this;
};

proto.off = function( eventName, listener ) {
  var listeners = this._events && this._events[ eventName ];
  if ( !listeners || !listeners.length ) {
    return;
  }
  var index = listeners.indexOf( listener );
  if ( index != -1 ) {
    listeners.splice( index, 1 );
  }

  return this;
};

proto.emitEvent = function( eventName, args ) {
  var listeners = this._events && this._events[ eventName ];
  if ( !listeners || !listeners.length ) {
    return;
  }
  // copy over to avoid interference if .off() in listener
  listeners = listeners.slice(0);
  args = args || [];
  // once stuff
  var onceListeners = this._onceEvents && this._onceEvents[ eventName ];

  for ( var i=0; i < listeners.length; i++ ) {
    var listener = listeners[i]
    var isOnce = onceListeners && onceListeners[ listener ];
    if ( isOnce ) {
      // remove listener
      // remove before trigger to prevent recursion
      this.off( eventName, listener );
      // unset once flag
      delete onceListeners[ listener ];
    }
    // trigger listener
    listener.apply( this, args );
  }

  return this;
};

proto.allOff = function() {
  delete this._events;
  delete this._onceEvents;
};

return EvEmitter;

})));

/*!
 * imagesLoaded v4.1.4
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */

( (function( window, factory ) { 'use strict';
  // universal module definition

  /*global define: false, module: false, require: false */

  if ( typeof define == 'function' && define.amd ) {
    // AMD
    define( [
      'ev-emitter/ev-emitter'
    ], (function( EvEmitter ) {
      return factory( window, EvEmitter );
    }));
  } else if ( typeof module == 'object' && module.exports ) {
    // CommonJS
    module.exports = factory(
      window,
      require('ev-emitter')
    );
  } else {
    // browser global
    window.imagesLoaded = factory(
      window,
      window.EvEmitter
    );
  }

}))( typeof window !== 'undefined' ? window : this,

// --------------------------  factory -------------------------- //

(function factory( window, EvEmitter ) {



var $ = window.jQuery;
var console = window.console;

// -------------------------- helpers -------------------------- //

// extend objects
function extend( a, b ) {
  for ( var prop in b ) {
    a[ prop ] = b[ prop ];
  }
  return a;
}

var arraySlice = Array.prototype.slice;

// turn element or nodeList into an array
function makeArray( obj ) {
  if ( Array.isArray( obj ) ) {
    // use object if already an array
    return obj;
  }

  var isArrayLike = typeof obj == 'object' && typeof obj.length == 'number';
  if ( isArrayLike ) {
    // convert nodeList to array
    return arraySlice.call( obj );
  }

  // array of single index
  return [ obj ];
}

// -------------------------- imagesLoaded -------------------------- //

/**
 * @param {Array, Element, NodeList, String} elem
 * @param {Object or Function} options - if function, use as callback
 * @param {Function} onAlways - callback function
 */
function ImagesLoaded( elem, options, onAlways ) {
  // coerce ImagesLoaded() without new, to be new ImagesLoaded()
  if ( !( this instanceof ImagesLoaded ) ) {
    return new ImagesLoaded( elem, options, onAlways );
  }
  // use elem as selector string
  var queryElem = elem;
  if ( typeof elem == 'string' ) {
    queryElem = document.querySelectorAll( elem );
  }
  // bail if bad element
  if ( !queryElem ) {
    console.error( 'Bad element for imagesLoaded ' + ( queryElem || elem ) );
    return;
  }

  this.elements = makeArray( queryElem );
  this.options = extend( {}, this.options );
  // shift arguments if no options set
  if ( typeof options == 'function' ) {
    onAlways = options;
  } else {
    extend( this.options, options );
  }

  if ( onAlways ) {
    this.on( 'always', onAlways );
  }

  this.getImages();

  if ( $ ) {
    // add jQuery Deferred object
    this.jqDeferred = new $.Deferred();
  }

  // HACK check async to allow time to bind listeners
  setTimeout( this.check.bind( this ) );
}

ImagesLoaded.prototype = Object.create( EvEmitter.prototype );

ImagesLoaded.prototype.options = {};

ImagesLoaded.prototype.getImages = function() {
  this.images = [];

  // filter & find items if we have an item selector
  this.elements.forEach( this.addElementImages, this );
};

/**
 * @param {Node} element
 */
ImagesLoaded.prototype.addElementImages = function( elem ) {
  // filter siblings
  if ( elem.nodeName == 'IMG' ) {
    this.addImage( elem );
  }
  // get background image on element
  if ( this.options.background === true ) {
    this.addElementBackgroundImages( elem );
  }

  // find children
  // no non-element nodes, #143
  var nodeType = elem.nodeType;
  if ( !nodeType || !elementNodeTypes[ nodeType ] ) {
    return;
  }
  var childImgs = elem.querySelectorAll('img');
  // concat childElems to filterFound array
  for ( var i=0; i < childImgs.length; i++ ) {
    var img = childImgs[i];
    this.addImage( img );
  }

  // get child background images
  if ( typeof this.options.background == 'string' ) {
    var children = elem.querySelectorAll( this.options.background );
    for ( i=0; i < children.length; i++ ) {
      var child = children[i];
      this.addElementBackgroundImages( child );
    }
  }
};

var elementNodeTypes = {
  1: true,
  9: true,
  11: true
};

ImagesLoaded.prototype.addElementBackgroundImages = function( elem ) {
  var style = getComputedStyle( elem );
  if ( !style ) {
    // Firefox returns null if in a hidden iframe https://bugzil.la/548397
    return;
  }
  // get url inside url("...")
  var reURL = /url\((['"])?(.*?)\1\)/gi;
  var matches = reURL.exec( style.backgroundImage );
  while ( matches !== null ) {
    var url = matches && matches[2];
    if ( url ) {
      this.addBackground( url, elem );
    }
    matches = reURL.exec( style.backgroundImage );
  }
};

/**
 * @param {Image} img
 */
ImagesLoaded.prototype.addImage = function( img ) {
  var loadingImage = new LoadingImage( img );
  this.images.push( loadingImage );
};

ImagesLoaded.prototype.addBackground = function( url, elem ) {
  var background = new Background( url, elem );
  this.images.push( background );
};

ImagesLoaded.prototype.check = function() {
  var _this = this;
  this.progressedCount = 0;
  this.hasAnyBroken = false;
  // complete if no images
  if ( !this.images.length ) {
    this.complete();
    return;
  }

  function onProgress( image, elem, message ) {
    // HACK - Chrome triggers event before object properties have changed. #83
    setTimeout( (function() {
      _this.progress( image, elem, message );
    }));
  }

  this.images.forEach( (function( loadingImage ) {
    loadingImage.once( 'progress', onProgress );
    loadingImage.check();
  }));
};

ImagesLoaded.prototype.progress = function( image, elem, message ) {
  this.progressedCount++;
  this.hasAnyBroken = this.hasAnyBroken || !image.isLoaded;
  // progress event
  this.emitEvent( 'progress', [ this, image, elem ] );
  if ( this.jqDeferred && this.jqDeferred.notify ) {
    this.jqDeferred.notify( this, image );
  }
  // check if completed
  if ( this.progressedCount == this.images.length ) {
    this.complete();
  }

  if ( this.options.debug && console ) {
    console.log( 'progress: ' + message, image, elem );
  }
};

ImagesLoaded.prototype.complete = function() {
  var eventName = this.hasAnyBroken ? 'fail' : 'done';
  this.isComplete = true;
  this.emitEvent( eventName, [ this ] );
  this.emitEvent( 'always', [ this ] );
  if ( this.jqDeferred ) {
    var jqMethod = this.hasAnyBroken ? 'reject' : 'resolve';
    this.jqDeferred[ jqMethod ]( this );
  }
};

// --------------------------  -------------------------- //

function LoadingImage( img ) {
  this.img = img;
}

LoadingImage.prototype = Object.create( EvEmitter.prototype );

LoadingImage.prototype.check = function() {
  // If complete is true and browser supports natural sizes,
  // try to check for image status manually.
  var isComplete = this.getIsImageComplete();
  if ( isComplete ) {
    // report based on naturalWidth
    this.confirm( this.img.naturalWidth !== 0, 'naturalWidth' );
    return;
  }

  // If none of the checks above matched, simulate loading on detached element.
  this.proxyImage = new Image();
  this.proxyImage.addEventListener( 'load', this );
  this.proxyImage.addEventListener( 'error', this );
  // bind to image as well for Firefox. #191
  this.img.addEventListener( 'load', this );
  this.img.addEventListener( 'error', this );
  this.proxyImage.src = this.img.src;
};

LoadingImage.prototype.getIsImageComplete = function() {
  // check for non-zero, non-undefined naturalWidth
  // fixes Safari+InfiniteScroll+Masonry bug infinite-scroll#671
  return this.img.complete && this.img.naturalWidth;
};

LoadingImage.prototype.confirm = function( isLoaded, message ) {
  this.isLoaded = isLoaded;
  this.emitEvent( 'progress', [ this, this.img, message ] );
};

// ----- events ----- //

// trigger specified handler for event type
LoadingImage.prototype.handleEvent = function( event ) {
  var method = 'on' + event.type;
  if ( this[ method ] ) {
    this[ method ]( event );
  }
};

LoadingImage.prototype.onload = function() {
  this.confirm( true, 'onload' );
  this.unbindEvents();
};

LoadingImage.prototype.onerror = function() {
  this.confirm( false, 'onerror' );
  this.unbindEvents();
};

LoadingImage.prototype.unbindEvents = function() {
  this.proxyImage.removeEventListener( 'load', this );
  this.proxyImage.removeEventListener( 'error', this );
  this.img.removeEventListener( 'load', this );
  this.img.removeEventListener( 'error', this );
};

// -------------------------- Background -------------------------- //

function Background( url, element ) {
  this.url = url;
  this.element = element;
  this.img = new Image();
}

// inherit LoadingImage prototype
Background.prototype = Object.create( LoadingImage.prototype );

Background.prototype.check = function() {
  this.img.addEventListener( 'load', this );
  this.img.addEventListener( 'error', this );
  this.img.src = this.url;
  // check if image is already complete
  var isComplete = this.getIsImageComplete();
  if ( isComplete ) {
    this.confirm( this.img.naturalWidth !== 0, 'naturalWidth' );
    this.unbindEvents();
  }
};

Background.prototype.unbindEvents = function() {
  this.img.removeEventListener( 'load', this );
  this.img.removeEventListener( 'error', this );
};

Background.prototype.confirm = function( isLoaded, message ) {
  this.isLoaded = isLoaded;
  this.emitEvent( 'progress', [ this, this.element, message ] );
};

// -------------------------- jQuery -------------------------- //

ImagesLoaded.makeJQueryPlugin = function( jQuery ) {
  jQuery = jQuery || window.jQuery;
  if ( !jQuery ) {
    return;
  }
  // set local variable
  $ = jQuery;
  // $().imagesLoaded()
  $.fn.imagesLoaded = function( options, callback ) {
    var instance = new ImagesLoaded( this, options, callback );
    return instance.jqDeferred.promise( $(this) );
  };
};
// try making plugin
ImagesLoaded.makeJQueryPlugin();

// --------------------------  -------------------------- //

return ImagesLoaded;

}));


'use strict'
/*!
* Lightweight JSONP fetcher
* Copyright 2010-2019 Erik Arenhill. All rights reserved.
* BSD Zero Clause License
* https://github.com/erikarenhill/Lightweight-JSONP
*/
var JSONP = (function(window){
	var counter = 0, head, config = {};
	function load(url, onTimeout) {
		var script = document.createElement('script'),
			done = false,
			timeoutTimer = null;
		script.src = url;
		script.async = true;
 
		var errorHandler = config.error;
		if ( typeof errorHandler === 'function' ) {
			script.onerror = function(ex){
				_clearTimeout();
				errorHandler({url: url, event: ex});
			};
		}
		
		script.onload = script.onreadystatechange = function() {
			if ( !done && (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete') ) {
				done = true;
				_clearTimeout();
				script.onload = script.onreadystatechange = null;
				if ( script && script.parentNode ) {
					script.parentNode.removeChild( script );
				}
			}
		};

		function _clearTimeout(){
			clearTimeout(timeoutTimer);
			timeoutTimer = null;
		}

		function triggerTimeout() {
			if ( typeof errorHandler === 'function' ) {
				errorHandler({url: url, event: new Error('Timeout')})
				onTimeout();
			}
		}

		if ( config.timeout ) {
			timeoutTimer = setTimeout(triggerTimeout, config.timeout)
		}
		
		if ( !head ) {
			head = document.getElementsByTagName('head')[0];
		}
		head.appendChild( script );
	}
	function encode(str) {
		return encodeURIComponent(str);
	}
	function jsonp(url, params, callback, callbackName) {
		var query = (url||'').indexOf('?') === -1 ? '?' : '&', key;
				
		callbackName = (callbackName||config['callbackName']||'callback');
		if ( !config['callbackName'] ) {
			callbackName = callbackName + '_jsonp_' + (++counter);
		}
		
		params = params || {};
		for ( key in params ) {
			if ( params.hasOwnProperty(key) ) {
				query += encode(key) + '=' + encode(params[key]) + '&';
			}
		}	
		
		var didTimeout = false;
		window[ callbackName ] = function(data){
			if ( !didTimeout ) {
				callback(data);
			}
			try {
				delete window[ callbackName ];
			} catch (e) {}
			window[ callbackName ] = null;
		};
 
		load(url + query + 'callback=' + callbackName, (function(){didTimeout = true;}));
		return callbackName;
	}
	function setDefaults(obj){
		config = obj;
	}
	return {
		get:jsonp,
		init:setDefaults
	}
}(window))

if ( typeof module !== 'undefined' ) {
	module.exports = JSONP
}
/*!
 * Replaces placeholders with real content
 * Requires get() - https://vanillajstoolkit.com/helpers/get/
 * See 'efm-util.js' - EFM.Util.get()
 * (c) 2019 Chris Ferdinandi, MIT License, https://gomakethings.com
 * @param {String} template The template string
 * @param {String} local    A local placeholder to use, if any
 */
var placeholders = function (template, data) {

	'use strict';

	// Check if the template is a string or a function
	template = typeof (template) === 'function' ? template() : template;
	if (['string', 'number'].indexOf(typeof template) === -1) throw 'PlaceholdersJS: please provide a valid template';

	// If no data, return template as-is
	if (!data) return template;

	// Replace our curly braces with data
	template = template.replace(/\{\{([^}]+)\}\}/g, (function (match) {

		// Remove the wrapping curly braces
		match = match.slice(2, -2);

		// Get the value [See 'efm-util.js' - EFM.Util.get()]
		var val = EFM.Util.get(data, match);

		// Replace
		if (!val) return '{{' + match + '}}';
		return val;

	}));

	return template;

};
/*!
 * reefjs v4.1.13
 * A lightweight helper function for creating reactive, state-based components and UI
 * (c) 2020 Chris Ferdinandi
 * MIT License
 * http://github.com/cferdinandi/reef
 */

/**
 * Element.matches() polyfill (simple version)
 * https://developer.mozilla.org/en-US/docs/Web/API/Element/matches#Polyfill
 */
if (!Element.prototype.matches) {
	Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
}

(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		define([], (function () {
			return factory(root);
		}));
	} else if (typeof exports === 'object') {
		module.exports = factory(root);
	} else {
		root.Reef = factory(root);
	}
})(typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this, (function (window) {

	'use strict';

	//
	// Variables
	//

	// Attributes that might be changed dynamically
	var dynamicAttributes = ['checked', 'disabled', 'hidden', 'lang', 'readonly', 'required', 'selected', 'value'];

	// If true, debug mode is enabled
	var debug = false;

	// Create global support variable
	var support;


	//
	// Methods
	//

	/**
	 * Check feature support
	 */
	var checkSupport = function () {
		if (!window.DOMParser) return false;
		var parser = new DOMParser();
		try {
			parser.parseFromString('x', 'text/html');
		} catch(err) {
			return false;
		}
		return true;
	};

	/**
	 * More accurately check the type of a JavaScript object
	 * @param  {Object} obj The object
	 * @return {String}     The object type
	 */
	var trueTypeOf = function (obj) {
		return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
	};

	/**
	 * Throw an error message
	 * @param  {String} msg The error message
	 */
	var err = function (msg) {
		if (debug) {
			throw new Error(msg);
		}
	};

	/**
	 * Create an immutable copy of an object and recursively encode all of its data
	 * @param  {*}       obj       The object to clone
	 * @param  {Boolean} allowHTML If true, allow HTML in data strings
	 * @return {*}                 The immutable, encoded object
	 */
	var clone = function (obj, allowHTML) {

		// Get the object type
		var type = trueTypeOf(obj);

		// If an object, loop through and recursively encode
		if (type === 'object') {
			var cloned = {};
			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					cloned[key] = clone(obj[key], allowHTML);
				}
			}
			return cloned;
		}

		// If an array, create a new array and recursively encode
		if (type === 'array') {
			return obj.map((function (item) {
				return clone(item, allowHTML);
			}));
		}

		// If the data is a string, encode it
		if (type === 'string' && !allowHTML) {
			var temp = document.createElement('div');
			temp.textContent = obj;
			return temp.innerHTML;
		}

		// Otherwise, return object as is
		return obj;

	};

	/**
	 * Find the first matching item in an array
	 * @param  {Array}    arr      The array to search in
	 * @param  {Function} callback The callback to run to find a match
	 * @return {*}                 The matching item
	 */
	var find = function (arr, callback) {
		var matches = arr.filter(callback);
		if (matches.length < 1) return null;
		return matches[0];
	};

	/**
	 * Find the index of the first matching item in an array
	 * @param  {Array}    arr      The array to search in
	 * @param  {Function} callback The callback to run to find a match
	 * @return {*}                 The matching item's index
	 */
	var findIndex = function (arr, callback) {
		return arr.reduce((function (index, item, currentIndex) {
			if (index < 0 && callback(item, currentIndex)) return currentIndex;
			return index;
		}), -1);
	};

	/**
	 * Create the Component object
	 * @param {String|Node} elem    The element to make into a component
	 * @param {Object}      options The component options
	 */
	var Component = function (elem, options) {

		// Make sure an element is provided
		if (!elem && (!options || !options.lagoon)) return err('Reef.js: You did not provide an element to make into a component.');

		// Make sure a template is provided
		if (!options || (!options.template && !options.lagoon)) return err('Reef.js: You did not provide a template for this component.');

		// Set the component properties
		this.elem = elem;
		this.data = options.data;
		this.template = options.template;
		this.allowHTML = options.allowHTML;
		this.attached = [];
		this.lagoon = options.lagoon;

		// Attach linked components
		if (options.attachTo) {
			var _this = this;
			options.attachTo.forEach((function (coral) {
				if ('attach' in coral) {
					coral.attach(_this);
				}
			}));
		}

	};

	/**
	 * Create an array map of style names and values
	 * @param  {String} styles The styles
	 * @return {Array}         The styles
	 */
	var getStyleMap = function (styles) {
		return styles.split(';').reduce((function (arr, style) {
			if (style.indexOf(':') > 0) {
				var styleArr = style.trim().split(':');
				arr.push({
					name: styleArr[0] ? styleArr[0].trim() : '',
					value: styleArr[1] ? styleArr[1].trim() : ''
				});
			}
			return arr;
		}), []);
	};

	/**
	 * Remove styles from an element
	 * @param  {Node}  elem   The element
	 * @param  {Array} styles The styles to remove
	 */
	var removeStyles = function (elem, styles) {
		styles.forEach((function (style) {
			elem.style[style] = '';
		}));
	};

	/**
	 * Add or updates styles on an element
	 * @param  {Node}  elem   The element
	 * @param  {Array} styles The styles to add or update
	 */
	var changeStyles = function (elem, styles) {
		styles.forEach((function (style) {
			elem.style[style.name] = style.value;
		}));
	};

	/**
	 * Diff existing styles from new ones
	 * @param  {Node}   elem   The element
	 * @param  {String} styles The styles the element should have
	 */
	var diffStyles = function (elem, styles) {

		// Get style map
		var styleMap = getStyleMap(styles);

		// Get styles to remove
		var remove = Array.prototype.filter.call(elem.style, (function (style) {
			var findStyle = find(styleMap, (function (newStyle) {
				return newStyle.name === style && newStyle.value === elem.style[style];
			}));
			return findStyle === null;
		}));

		// Add and remove styles
		removeStyles(elem, remove);
		changeStyles(elem, styleMap);

	};

	/**
	 * Add attributes to an element
	 * @param {Node}  elem The element
	 * @param {Array} atts The attributes to add
	 */
	var addAttributes = function (elem, atts) {
		atts.forEach((function (attribute) {
			// If the attribute is a class, use className
			// Else if it's style, diff and update styles
			// Otherwise, set the attribute
			if (attribute.att === 'class') {
				elem.className = attribute.value;
			} else if (attribute.att === 'style') {
				diffStyles(elem, attribute.value);
			} else {
				if (attribute.att in elem) {
					try {
						elem[attribute.att] = attribute.value || attribute.att;
					} catch (e) {}
				}
				try {
					elem.setAttribute(attribute.att, attribute.value || '');
				} catch (e) {}

			}
		}));
	};

	/**
	 * Remove attributes from an element
	 * @param {Node}  elem The element
	 * @param {Array} atts The attributes to remove
	 */
	var removeAttributes = function (elem, atts) {
		atts.forEach((function (attribute) {
			// If the attribute is a class, use className
			// Else if it's style, remove all styles
			// Otherwise, use removeAttribute()
			if (attribute.att === 'class') {
				elem.className = '';
			} else if (attribute.att === 'style') {
				removeStyles(elem, Array.prototype.slice.call(elem.style));
			} else {
				if (attribute.att in elem) {
					try {
						elem[attribute.att] = '';
					} catch (e) {}
				}
				try {
					elem.removeAttribute(attribute.att);
				} catch (e) {}
			}
		}));
	};

	/**
	 * Create an object with the attribute name and value
	 * @param  {String} name  The attribute name
	 * @param  {*}      value The attribute value
	 * @return {Object}       The object of attribute details
	 */
	var getAttribute = function (name, value) {
		return {
			att: name,
			value: value
		};
	};

	/**
	 * Get the dynamic attributes for a node
	 * @param  {Node} node  The node
	 * @param  {Array} atts The static attributes
	 */
	var getDynamicAttributes = function (node, atts) {
		dynamicAttributes.forEach((function (prop) {
			if (!node[prop]) return;
			atts.push(getAttribute(prop, node[prop]));
		}));
	};

	/**
	 * Get base attributes for a node
	 * @param  {Node} node The node
	 * @return {Array}     The node's attributes
	 */
	var getBaseAttributes = function (node) {
		return Array.prototype.reduce.call(node.attributes, (function (arr, attribute) {
			if (dynamicAttributes.indexOf(attribute.name) < 0) {
				arr.push(getAttribute(attribute.name, attribute.value));
			}
			return arr;
		}), []);
	};

	/**
	 * Create an array of the attributes on an element
	 * @param  {NamedNodeMap} attributes The attributes on an element
	 * @param  {Node} node The node to get attributes from
	 * @return {Array}                   The attributes on an element as an array of key/value pairs
	 */
	var getAttributes = function (node) {
		var atts = getBaseAttributes(node);
		getDynamicAttributes(node, atts);
		return atts;
	};

	/**
	 * Make an HTML element
	 * @param  {Object} elem The element details
	 * @return {Node}        The HTML element
	 */
	var makeElem = function (elem) {

		// Create the element
		// var node = elem.type === 'text' ? document.createTextNode(elem.content) : (elem.type === 'comment' ? document.createComment(elem.content) : document.createElement(elem.type));
		var node;
		if (elem.type === 'text') {
			node = document.createTextNode(elem.content);
		} else if (elem.type === 'comment') {
			node = document.createComment(elem.content);
		} else if (elem.isSVG) {
			node = document.createElementNS('http://www.w3.org/2000/svg', elem.type);
		} else {
			node = document.createElement(elem.type);
		}

		// Add attributes
		addAttributes(node, elem.atts);

		// If the element has child nodes, create them
		// Otherwise, add textContent
		if (elem.children.length > 0) {
			elem.children.forEach((function (childElem) {
				node.appendChild(makeElem(childElem));
			}));
		} else if (elem.type !== 'text') {
			node.textContent = elem.content;
		}

		return node;

	};

	/**
	 * Diff the attributes on an existing element versus the template
	 * @param  {Object} template The new template
	 * @param  {Object} existing The existing DOM node
	 */
	var diffAtts = function (template, existing) {

		// Get attributes to remove
		var remove = existing.atts.filter((function (att) {
			var getAtt = find(template.atts, (function (newAtt) {
				return att.att === newAtt.att;
			}));
			return getAtt === null;
		}));

		// Get attributes to change
		var change = template.atts.filter((function (att) {
			var getAtt = find(existing.atts, (function (existingAtt) {
				return att.att === existingAtt.att;
			}));
			return getAtt === null || getAtt.value !== att.value;
		}));

		// Add/remove any required attributes
		addAttributes(existing.node, change);
		removeAttributes(existing.node, remove);

	};

	/**
	 * Diff the existing DOM node versus the template
	 * @param  {Array} templateMap A DOM tree map of the template content
	 * @param  {Array} domMap      A DOM tree map of the existing DOM node
	 * @param  {Node}  elem        The element to render content into
	 * @param  {Array} polyps      Attached components for this element
	 */
	var diff = function (templateMap, domMap, elem, polyps) {

		// If extra elements in domMap, remove them
		var count = domMap.length - templateMap.length;
		if (count > 0) {
			for (; count > 0; count--) {
				domMap[domMap.length - count].node.parentNode.removeChild(domMap[domMap.length - count].node);
			}
		}

		// Diff each item in the templateMap
		templateMap.forEach((function (node, index) {

			// If element doesn't exist, create it
			if (!domMap[index]) {
				elem.appendChild(makeElem(templateMap[index]));
				return;
			}

			// If element is not the same type, replace it with new element
			if (templateMap[index].type !== domMap[index].type) {
				domMap[index].node.parentNode.replaceChild(makeElem(templateMap[index]), domMap[index].node);
				return;
			}

			// If attributes are different, update them
			diffAtts(templateMap[index], domMap[index]);

			// If element is an attached component, skip it
			var isPolyp = polyps.filter((function (polyp) {
				return node.node.nodeType !== 3 && node.node.matches(polyp);
			}));
			if (isPolyp.length > 0) return;

			// If content is different, update it
			if (templateMap[index].content && templateMap[index].content !== domMap[index].content) {
				domMap[index].node.textContent = templateMap[index].content;
			}

			// If target element should be empty, wipe it
			if (domMap[index].children.length > 0 && node.children.length < 1) {
				domMap[index].node.innerHTML = '';
				return;
			}

			// If element is empty and shouldn't be, build it up
			// This uses a document fragment to minimize reflows
			if (domMap[index].children.length < 1 && node.children.length > 0) {
				var fragment = document.createDocumentFragment();
				diff(node.children, domMap[index].children, fragment, polyps);
				domMap[index].node.appendChild(fragment)
				return;
			}

			// If there are existing child elements that need to be modified, diff them
			if (node.children.length > 0) {
				diff(node.children, domMap[index].children, domMap[index].node, polyps);
			}

		}));

	};

	/**
	 * Create a DOM Tree Map for an element
	 * @param  {Node}   element The element to map
	 * @return {Array}          A DOM tree map
	 */
	var createDOMMap = function (element, isSVG) {
		return Array.prototype.map.call(element.childNodes, (function (node) {
			var details = {
				content: node.childNodes && node.childNodes.length > 0 ? null : node.textContent,
				atts: node.nodeType !== 1 ? [] : getAttributes(node),
				type: node.nodeType === 3 ? 'text' : (node.nodeType === 8 ? 'comment' : node.tagName.toLowerCase()),
				node: node
			};
			details.isSVG = isSVG || details.type === 'svg';
			details.children = createDOMMap(node, details.isSVG);
			return details;
		}));
	};

	/**
	 * If there are linked Reefs, render them, too
	 * @param  {Array} polyps Attached Reef components
	 */
	var renderPolyps = function (polyps, reef) {
		if (!polyps) return;
		polyps.forEach((function (coral) {
			if (coral.attached.indexOf(reef) > -1) return err('ReefJS: ' + reef.elem + ' has attached nodes that it is also attached to, creating an infinite loop.');
			if ('render' in coral) coral.render();
		}));
	};

	/**
	 * Convert a template string into HTML DOM nodes
	 * @param  {String} str The template string
	 * @return {Node}       The template HTML
	 */
	var stringToHTML = function (str) {

		// If DOMParser is supported, use it
		if (support) {

			// Create document
			var parser = new DOMParser();
			var doc = parser.parseFromString(str, 'text/html');

			// If there are items in the head, move them to the body
			if (doc.head.childNodes.length > 0) {
				Array.prototype.slice.call(doc.head.childNodes).reverse().forEach((function (node) {
					doc.body.insertBefore(node, doc.body.firstChild);
				}));
			}

			return doc.body;

		}

		// Otherwise, fallback to old-school method
		var dom = document.createElement('div');
		dom.innerHTML = str;
		return dom;

	};

	/**
	 * Render a template into the DOM
	 * @return {Node}  The elemenft
	 */
	Component.prototype.render = function () {

		// If this is used only for data, render attached and bail
		if (this.lagoon) {
			renderPolyps(this.attached, this);
			return;
		}

		// Make sure there's a template
		if (!this.template) return err('Reef.js: No template was provided.');

		// If elem is an element, use it.
		// If it's a selector, get it.
		var elem = trueTypeOf(this.elem) === 'string' ? document.querySelector(this.elem) : this.elem;
		if (!elem) return err('Reef.js: The DOM element to render your template into was not found.');

		// Encode the data
		// var data = this.allowHTML ? clone(this.data) : encode(this.data || {});
		var data = clone(this.data || {}, this.allowHTML);

		// Get the template
		var template = (trueTypeOf(this.template) === 'function' ? this.template(data) : this.template);
		if (['string', 'number'].indexOf(trueTypeOf(template)) === -1) return;

		// If UI is unchanged, do nothing
		if (elem.innerHTML === template.innerHTML) return;

		// If target element or template are empty, inject the entire template
		// Otherwise, diff and update
		if (elem.innerHTML.trim().length < 1 || template.trim().length < 1) {
			elem.innerHTML = template;
		} else {

			// Create DOM maps of the template and target element
			var templateMap = createDOMMap(stringToHTML(template));
			var domMap = createDOMMap(elem);

			// Diff and update the DOM
			var polyps = this.attached.map((function (polyp) { return polyp.elem; }));
			diff(templateMap, domMap, elem, polyps);

		}

		// Dispatch a render event
		var event;
		if (trueTypeOf(window.CustomEvent) === 'function') {
			event = new CustomEvent('render', {
				bubbles: true
			});
		} else {
			event = document.createEvent('CustomEvent');
			event.initCustomEvent('render', true, false, null);
		}
		elem.dispatchEvent(event);

		// If there are linked Reefs, render them, too
		renderPolyps(this.attached, this);

		// Return the elem for use elsewhere
		return elem;

	};

	/**
	 * Get a clone of the Component.data property
	 * @return {Object} A clone of the Component.data property
	 */
	Component.prototype.getData = function () {
		return clone(this.data, true);
	};

	/**
	 * Update the data property and re-render
	 * @param {Object} obj The data to merge into the existing state
	 */
	Component.prototype.setData = function (obj) {
		if (trueTypeOf(obj) !== 'object') return err('ReefJS: The provided data is not an object.');
		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
				this.data[key] = obj[key];
			}
		}
		this.render();
	};

	/**
	 * Attach a component to this one
	 * @param  {Function|Array} coral The component(s) to attach
	 */
	Component.prototype.attach = function (coral) {
		if (trueTypeOf(coral) === 'array') {
			Array.prototype.push.apply(this.attached, coral);
		} else {
			this.attached.push(coral);
		}
	};

	/**
	 * Detach a linked component to this one
	 * @param  {Function|Array} coral The linked component(s) to detach
	 */
	Component.prototype.detach = function (coral) {
		var isArray = trueTypeOf(coral) === 'array';
		this.attached = this.attached.filter((function (polyp) {
			if (isArray) {
				return coral.indexOf(polyp) === -1;
			} else {
				return polyp !== coral;
			}
		}));
	};

	/**
	 * Turn debug mode on or off
	 * @param  {Boolean} on If true, turn debug mode on
	 */
	Component.debug = function (on) {
		if (on) {
			debug = true;
		} else {
			debug = false;
		}
	};


	//
	// Set support
	//

	support = checkSupport();


	//
	// Export public methods
	//

	return Component;

}));

/*!
 * scrollbooster v2.2.0
 * Content drag-to-scroll library 
 * (c) 2020 Ilya Shubin
 * MIT License
 * https://github.com/ilyashubin/scrollbooster
 */

! (function(t, e) {
    "object" == typeof exports && "object" == typeof module ? module.exports = e() : "function" == typeof define && define.amd ? define("ScrollBooster", [], e) : "object" == typeof exports ? exports.ScrollBooster = e() : t.ScrollBooster = e()
})(this, (function() {
    return (function(t) {
        var e = {};

        function i(o) {
            if (e[o]) return e[o].exports;
            var n = e[o] = {
                i: o,
                l: !1,
                exports: {}
            };
            return t[o].call(n.exports, n, n.exports, i), n.l = !0, n.exports
        }
        return i.m = t, i.c = e, i.d = function(t, e, o) {
            i.o(t, e) || Object.defineProperty(t, e, {
                enumerable: !0,
                get: o
            })
        }, i.r = function(t) {
            "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(t, Symbol.toStringTag, {
                value: "Module"
            }), Object.defineProperty(t, "__esModule", {
                value: !0
            })
        }, i.t = function(t, e) {
            if (1 & e && (t = i(t)), 8 & e) return t;
            if (4 & e && "object" == typeof t && t && t.__esModule) return t;
            var o = Object.create(null);
            if (i.r(o), Object.defineProperty(o, "default", {
                    enumerable: !0,
                    value: t
                }), 2 & e && "string" != typeof t)
                for (var n in t) i.d(o, n, function(e) {
                    return t[e]
                }.bind(null, n));
            return o
        }, i.n = function(t) {
            var e = t && t.__esModule ? function() {
                return t.default
            } : function() {
                return t
            };
            return i.d(e, "a", e), e
        }, i.o = function(t, e) {
            return Object.prototype.hasOwnProperty.call(t, e)
        }, i.p = "", i(i.s = 0)
    })([(function(t, e, i) {
        "use strict";

        function o(t, e) {
            var i = Object.keys(t);
            if (Object.getOwnPropertySymbols) {
                var o = Object.getOwnPropertySymbols(t);
                e && (o = o.filter((function(e) {
                    return Object.getOwnPropertyDescriptor(t, e).enumerable
                }))), i.push.apply(i, o)
            }
            return i
        }

        function n(t) {
            for (var e = 1; e < arguments.length; e++) {
                var i = null != arguments[e] ? arguments[e] : {};
                e % 2 ? o(Object(i), !0).forEach((function(e) {
                    s(t, e, i[e])
                })) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(i)) : o(Object(i)).forEach((function(e) {
                    Object.defineProperty(t, e, Object.getOwnPropertyDescriptor(i, e))
                }))
            }
            return t
        }

        function s(t, e, i) {
            return e in t ? Object.defineProperty(t, e, {
                value: i,
                enumerable: !0,
                configurable: !0,
                writable: !0
            }) : t[e] = i, t
        }

        function r(t, e) {
            if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
        }

        function p(t, e) {
            for (var i = 0; i < e.length; i++) {
                var o = e[i];
                o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(t, o.key, o)
            }
        }
        i.r(e), i.d(e, "default", (function() {
            return h
        }));
        var a = function(t) {
                return Math.max(t.offsetHeight, t.scrollHeight)
            },
            h = (function() {
                function t() {
                    var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
                    r(this, t);
                    var i = {
                        content: e.viewport.children[0],
                        direction: "all",
                        pointerMode: "all",
                        scrollMode: void 0,
                        bounce: !0,
                        bounceForce: .1,
                        friction: .05,
                        textSelection: !1,
                        inputsFocus: !0,
                        emulateScroll: !1,
                        pointerDownPreventDefault: !0,
                        onClick: function() {},
                        onUpdate: function() {},
                        shouldScroll: function() {
                            return !0
                        }
                    };
                    if (this.props = n({}, i, {}, e), this.props.viewport && this.props.viewport instanceof Element)
                        if (this.props.content) {
                            this.isDragging = !1, this.isTargetScroll = !1, this.isScrolling = !1, this.isRunning = !1;
                            var o = {
                                x: 0,
                                y: 0
                            };
                            this.position = n({}, o), this.velocity = n({}, o), this.dragStartPosition = n({}, o), this.dragOffset = n({}, o), this.dragPosition = n({}, o), this.targetPosition = n({}, o), this.scrollOffset = n({}, o), this.rafID = null, this.events = {}, this.updateMetrics(), this.handleEvents()
                        } else console.error("ScrollBooster init error: Viewport does not have any content");
                    else console.error('ScrollBooster init error: "viewport" config property must be present and must be Element')
                }
                var e, i, o;
                return e = t, (i = [{
                    key: "updateOptions",
                    value: function() {
                        var t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
                        this.props = n({}, this.props, {}, t), this.props.onUpdate(this.getState()), this.startAnimationLoop()
                    }
                }, {
                    key: "updateMetrics",
                    value: function() {
                        var t;
                        this.viewport = {
                            width: this.props.viewport.clientWidth,
                            height: this.props.viewport.clientHeight
                        }, this.content = {
                            width: (t = this.props.content, Math.max(t.offsetWidth, t.scrollWidth)),
                            height: a(this.props.content)
                        }, this.edgeX = {
                            from: Math.min(-this.content.width + this.viewport.width, 0),
                            to: 0
                        }, this.edgeY = {
                            from: Math.min(-this.content.height + this.viewport.height, 0),
                            to: 0
                        }, this.props.onUpdate(this.getState()), this.startAnimationLoop()
                    }
                }, {
                    key: "startAnimationLoop",
                    value: function() {
                        var t = this;
                        this.isRunning = !0, cancelAnimationFrame(this.rafID), this.rafID = requestAnimationFrame((function() {
                            return t.animate()
                        }))
                    }
                }, {
                    key: "animate",
                    value: function() {
                        var t = this;
                        if (this.isRunning) {
                            this.updateScrollPosition(), this.isMoving() || (this.isRunning = !1, this.isTargetScroll = !1);
                            var e = this.getState();
                            this.setContentPosition(e), this.props.onUpdate(e), this.rafID = requestAnimationFrame((function() {
                                return t.animate()
                            }))
                        }
                    }
                }, {
                    key: "updateScrollPosition",
                    value: function() {
                        this.applyEdgeForce(), this.applyDragForce(), this.applyScrollForce(), this.applyTargetForce();
                        var t = 1 - this.props.friction;
                        this.velocity.x *= t, this.velocity.y *= t, "vertical" !== this.props.direction && (this.position.x += this.velocity.x), "horizontal" !== this.props.direction && (this.position.y += this.velocity.y), this.props.bounce && !this.isScrolling || this.isTargetScroll || (this.position.x = Math.max(Math.min(this.position.x, this.edgeX.to), this.edgeX.from), this.position.y = Math.max(Math.min(this.position.y, this.edgeY.to), this.edgeY.from))
                    }
                }, {
                    key: "applyForce",
                    value: function(t) {
                        this.velocity.x += t.x, this.velocity.y += t.y
                    }
                }, {
                    key: "applyEdgeForce",
                    value: function() {
                        if (this.props.bounce && !this.isDragging) {
                            var t = this.position.x < this.edgeX.from,
                                e = this.position.x > this.edgeX.to,
                                i = this.position.y < this.edgeY.from,
                                o = this.position.y > this.edgeY.to,
                                n = t || e,
                                s = i || o;
                            if (n || s) {
                                var r = t ? this.edgeX.from : this.edgeX.to,
                                    p = i ? this.edgeY.from : this.edgeY.to,
                                    a = r - this.position.x,
                                    h = p - this.position.y,
                                    c = {
                                        x: a * this.props.bounceForce,
                                        y: h * this.props.bounceForce
                                    },
                                    l = this.position.x + (this.velocity.x + c.x) / this.props.friction,
                                    u = this.position.y + (this.velocity.y + c.y) / this.props.friction;
                                (t && l >= this.edgeX.from || e && l <= this.edgeX.to) && (c.x = a * this.props.bounceForce - this.velocity.x), (i && u >= this.edgeY.from || o && u <= this.edgeY.to) && (c.y = h * this.props.bounceForce - this.velocity.y), this.applyForce({
                                    x: n ? c.x : 0,
                                    y: s ? c.y : 0
                                })
                            }
                        }
                    }
                }, {
                    key: "applyDragForce",
                    value: function() {
                        if (this.isDragging) {
                            var t = this.dragPosition.x - this.position.x,
                                e = this.dragPosition.y - this.position.y;
                            this.applyForce({
                                x: t - this.velocity.x,
                                y: e - this.velocity.y
                            })
                        }
                    }
                }, {
                    key: "applyScrollForce",
                    value: function() {
                        this.isScrolling && (this.applyForce({
                            x: this.scrollOffset.x - this.velocity.x,
                            y: this.scrollOffset.y - this.velocity.y
                        }), this.scrollOffset.x = 0, this.scrollOffset.y = 0)
                    }
                }, {
                    key: "applyTargetForce",
                    value: function() {
                        this.isTargetScroll && this.applyForce({
                            x: .08 * (this.targetPosition.x - this.position.x) - this.velocity.x,
                            y: .08 * (this.targetPosition.y - this.position.y) - this.velocity.y
                        })
                    }
                }, {
                    key: "isMoving",
                    value: function() {
                        return this.isDragging || this.isScrolling || Math.abs(this.velocity.x) >= .01 || Math.abs(this.velocity.y) >= .01
                    }
                }, {
                    key: "scrollTo",
                    value: function() {
                        var t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
                        this.isTargetScroll = !0, this.targetPosition.x = -t.x || 0, this.targetPosition.y = -t.y || 0, this.startAnimationLoop()
                    }
                }, {
                    key: "setPosition",
                    value: function() {
                        var t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {};
                        this.velocity.x = 0, this.velocity.y = 0, this.position.x = -t.x || 0, this.position.y = -t.y || 0, this.startAnimationLoop()
                    }
                }, {
                    key: "getState",
                    value: function() {
                        return {
                            isMoving: this.isMoving(),
                            isDragging: !(!this.dragOffset.x && !this.dragOffset.y),
                            position: {
                                x: -this.position.x,
                                y: -this.position.y
                            },
                            dragOffset: this.dragOffset,
                            borderCollision: {
                                left: this.position.x >= this.edgeX.to,
                                right: this.position.x <= this.edgeX.from,
                                top: this.position.y >= this.edgeY.to,
                                bottom: this.position.y <= this.edgeY.from
                            }
                        }
                    }
                }, {
                    key: "setContentPosition",
                    value: function(t) {
                        "transform" === this.props.scrollMode && (this.props.content.style.transform = "translate(".concat(-t.position.x, "px, ").concat(-t.position.y, "px)")), "native" === this.props.scrollMode && (this.props.viewport.scrollTop = t.position.y, this.props.viewport.scrollLeft = t.position.x)
                    }
                }, {
                    key: "handleEvents",
                    value: function() {
                        var t = this,
                            e = {
                                x: 0,
                                y: 0
                            },
                            i = null,
                            o = !1,
                            n = function(i) {
                                if (t.isDragging) {
                                    var n = o ? i.touches[0].pageX : i.pageX,
                                        s = o ? i.touches[0].pageY : i.pageY;
                                    t.dragOffset.x = n - e.x, t.dragOffset.y = s - e.y, t.dragPosition.x = t.dragStartPosition.x + t.dragOffset.x, t.dragPosition.y = t.dragStartPosition.y + t.dragOffset.y
                                }
                            };
                        this.events.pointerdown = function(i) {
                            var s = (o = !(!i.touches || !i.touches[0])) ? i.touches[0] : i,
                                r = s.pageX,
                                p = s.pageY,
                                a = s.clientX,
                                h = s.clientY,
                                c = t.props.viewport,
                                l = c.getBoundingClientRect();
                            if (!(a - l.left >= c.clientLeft + c.clientWidth) && !(h - l.top >= c.clientTop + c.clientHeight) && t.props.shouldScroll(t.getState(), i) && 2 !== i.button && ("mouse" !== t.props.pointerMode || !o) && ("touch" !== t.props.pointerMode || o) && !(t.props.inputsFocus && ["input", "textarea", "button", "select", "label"].indexOf(i.target.nodeName.toLowerCase()) > -1)) {
                                if (t.props.textSelection) {
                                    if (function(t, e, i) {
                                            for (var o = t.childNodes, n = document.createRange(), s = 0; s < o.length; s++) {
                                                var r = o[s];
                                                if (3 === r.nodeType) {
                                                    n.selectNodeContents(r);
                                                    var p = n.getBoundingClientRect();
                                                    if (e >= p.left && i >= p.top && e <= p.right && i <= p.bottom) return r
                                                }
                                            }
                                            return !1
                                        }(i.target, a, h)) return;
                                    (u = window.getSelection ? window.getSelection() : document.selection) && (u.removeAllRanges ? u.removeAllRanges() : u.empty && u.empty())
                                }
                                var u;
                                t.isDragging = !0, e.x = r, e.y = p, t.dragStartPosition.x = t.position.x, t.dragStartPosition.y = t.position.y, n(i), t.startAnimationLoop(), t.props.pointerDownPreventDefault && i.preventDefault()
                            }
                        }, this.events.pointermove = function(t) {
                            n(t)
                        }, this.events.pointerup = function() {
                            t.isDragging = !1
                        }, this.events.wheel = function(e) {
                            t.props.emulateScroll && (t.velocity.x = 0, t.velocity.y = 0, t.isScrolling = !0, t.scrollOffset.x = -e.deltaX, t.scrollOffset.y = -e.deltaY, t.startAnimationLoop(), clearTimeout(i), i = setTimeout((function() {
                                return t.isScrolling = !1
                            }), 80), e.preventDefault())
                        }, this.events.scroll = function() {
                            var e = t.props.viewport,
                                i = e.scrollLeft,
                                o = e.scrollTop;
                            Math.abs(t.position.x + i) > 3 && (t.position.x = -i, t.velocity.x = 0), Math.abs(t.position.y + o) > 3 && (t.position.y = -o, t.velocity.y = 0)
                        }, this.events.click = function(e) {
                            var i = t.getState(),
                                o = "vertical" !== t.props.direction ? i.dragOffset.x : 0,
                                n = "horizontal" !== t.props.direction ? i.dragOffset.y : 0;
                            Math.max(Math.abs(o), Math.abs(n)) > 5 && (e.preventDefault(), e.stopPropagation()), t.props.onClick(i, e)
                        }, this.events.contentLoad = function() {
                            return t.updateMetrics()
                        }, this.events.resize = function() {
                            return t.updateMetrics()
                        }, this.props.viewport.addEventListener("mousedown", this.events.pointerdown), this.props.viewport.addEventListener("touchstart", this.events.pointerdown), this.props.viewport.addEventListener("click", this.events.click), this.props.viewport.addEventListener("wheel", this.events.wheel), this.props.viewport.addEventListener("scroll", this.events.scroll), this.props.content.addEventListener("load", this.events.contentLoad, !0), window.addEventListener("mousemove", this.events.pointermove), window.addEventListener("touchmove", this.events.pointermove), window.addEventListener("mouseup", this.events.pointerup), window.addEventListener("touchend", this.events.pointerup), window.addEventListener("resize", this.events.resize)
                    }
                }, {
                    key: "destroy",
                    value: function() {
                        this.props.viewport.removeEventListener("mousedown", this.events.pointerdown), this.props.viewport.removeEventListener("touchstart", this.events.pointerdown), this.props.viewport.removeEventListener("click", this.events.click), this.props.viewport.removeEventListener("wheel", this.events.wheel), this.props.viewport.removeEventListener("scroll", this.events.scroll), this.props.content.removeEventListener("load", this.events.contentLoad), window.removeEventListener("mousemove", this.events.pointermove), window.removeEventListener("touchmove", this.events.pointermove), window.removeEventListener("mouseup", this.events.pointerup), window.removeEventListener("touchend", this.events.pointerup), window.removeEventListener("resize", this.events.resize)
                    }
                }]) && p(e.prototype, i), o && p(e, o), t
            })()
    })]).default
}));

