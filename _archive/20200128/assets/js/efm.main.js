/*! efm-viewer v3.0.0 | (c) 2020 Illustrated Verdict | Illustrated Verdict License | https://github.com/khristos/IV-EFMV */
/**
 * @file: efm-.js
 */

// Global EFM object
var EFM = {};
/**
 * @file: efm-util.js
 */

/**
 * @name Util
 * @object
 * @description Collection of utility methods pertaining to EFM
 */
EFM.Util = {
  //
  // Utilities
  //

  /**
   * Merge two or more objects together.
   * @param   {Object}   objects  The objects to merge together
   * @returns {Object}            Merged values of defaults and options
   */
  extend: function () {
    var merged = {};
    Array.prototype.forEach.call(arguments, (function (obj) {
      for (var key in obj) {
        if (!obj.hasOwnProperty(key)) return;
        merged[key] = obj[key];
      }
    }));
    return merged;
  },


  /**
   * Convert seconds to hrs:mins:secs.
   * @param   {Numeric}         The seconds to convert.
   * @returns {String}          Merged values of hours, minutes, seconds
   */
  secondsToHms: function (seconds) {
    seconds = Number(seconds);
    var h = Math.floor(seconds / 3600);
    var m = Math.floor(seconds % 3600 / 60);
    var s = Math.floor(seconds % 3600 % 60);
    return (h > 0 ? h + ':' : '') + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  },

  /**
   * Convert hrs:mins:secs to milliseconds.
   * @param   {Numeric}         The hours, minutes, seconds to convert.
   * @returns {String}          Merged values of hours, minutes, seconds
   * https://www.calculateme.com/time/
   */
  hmsToMilliseconds: function (hr, min, sec) {
    var hrToMs = Math.floor(Number(hr * 60 * 60 * 1000)) || 0;
    var minToMs = Math.floor(Number(min * 60 * 1000)) || 0;
    var secToMs = Math.floor(Number(sec * 1000)) || 0;
    //console.log("ms: ", hrToMs + minToMs + secToMs);
    return (hrToMs + minToMs + secToMs);
  },


  /**
   * Debounce functions for better performance
   * (c) 2018 Chris Ferdinandi, MIT License, https://gomakethings.com
   * @param  {Function}   fn The function to debounce
   */
  debounce: function (fn) {
    // Setup a timer
    var timeout;
    // Return a function to run debounced
    return function () {
      // Setup the arguments
      var context = this;
      var args = arguments;
      // If there's a timer, cancel it
      if (timeout) {
        window.cancelAnimationFrame(timeout);
      }
      // Setup the new requestAnimationFrame()
      timeout = window.requestAnimationFrame((function () {
        fn.apply(context, args);
      }));
    }
  },


  /**
   * Emit a custom event
   * @param  {String} type   The event type
   * @param  {Node}   elem   The element to attach the event to
   * @param  {Object} detail Any details to pass along with the event
   */
  emitEvent: function (type, elem, detail) {
    // Make sure events are enabled
    if (!detail.settings.events) return;

    // Create a new event
    var event = new CustomEvent(type, {
      bubbles: true,
      cancelable: true,
      detail: detail
    });

    // Dispatch the event
    elem.dispatchEvent(event);
  },


  /**
  * Get an object value from a specific path
  * (c) 2018 Chris Ferdinandi, MIT License, https://gomakethings.com
  * @param  {Object}       obj  The object
  * @param  {String|Array} path The path
  * @param  {*}            def  A default value to return [optional]
  * @return {*}                 The value
  */
  get: function (obj, path, def) {
    /**
     * If the path is a string, convert it to an array
     * @param  {String|Array} path The path
     * @return {Array}             The path array
     */
    var stringToPath = function (path) {
      // If the path isn't a string, return it
      if (typeof path !== 'string') return path;

      // Create new array
      var output = [];

      // Split to an array with dot notation
      path.split('.').forEach((function (item) {

        // Split to an array with bracket notation
        item.split(/\[([^}]+)\]/g).forEach((function (key) {
          // Push to the new array
          if (key.length > 0) {
            output.push(key);
          }
        }));

      }));

      return output;
    };

    // Get the path as an array
    path = stringToPath(path);

    // Cache the current object
    var current = obj;

    // For each item in the path, dig into the object
    for (var i = 0; i < path.length; i++) {

      // If the item isn't found, return the default (or null)
      if (!current[path[i]]) return def;

      // Otherwise, update the current  value
      current = current[path[i]];

    }

    return current;
  },


  /**
   * @name getXHRData
   * @method
   * @description Retrieves JSON
   * @param {function} callback Action to execute when the requests
   * have finished
   */
  getXHRData: function( callback ) {
    var _this = EFM.Util;
    //atomic('https://jsonplaceholder.typicode.com/posts', {
    atomic('./content/data/config.json', {
      method: 'GET', // {String} the request type
      headers: {     // {Object} Adds headers to your request: request.setRequestHeader(key, value)
              "accept": "application/json",
              "Access-Control-Allow-Origin": "/"
      },
    })
    .then((function (response) {
        //console.log('success data: ', response.data); // xhr.responseText
        //console.log('success full response: ', response.xhr);  // full response
        _this.setLocalData(response.data.configData.id, response.data);
        callback();
    }))
    .catch((function (error) {
        console.log('error code: ', error.status); // xhr.status
        console.log('error description: ', error.statusText); // xhr.statusText
        JSONP.init({
          error: function(ex) {
            console.log("FAILED TO LOAD: " + ex.url);
          },
          timeout: 3000 //timeout in ms before error callback will be called if not yet completed
        });
        JSONP.get('./content/data/config.js?otherParam=1', {param1:'a', param2:'b'}, (function(response) {
          console.log("JSONP: ", response);
          _this.setLocalData(response.configData.id, response);
          callback();
        })/*, 'overrideCallbackName'*/);
    }));
  },


  /**
   * @name getLocalData
   * @method
   * @description Retrieves local storage
   * @param {string} name Name of local storage item
   * @returns {array|[null|Object]} Array of products in the current user order. If an ID is provided, returns either the Object in the cart, or `null`
   */
  getLocalData: function( storageID ) {
    var data = localStorage.getItem( storageID );
    if ( data ) return JSON.parse( data );
    return [];
  },


  /**
   * @name setLocalData
   * @method
   * @description Stores data to local storage 
   * @param {String} storageID ID of local storage
   * @param {Object|string} data Data to store
   */
  setLocalData: function( storageID, data ) {
    localStorage.setItem( storageID, typeof data === 'string' ? data : JSON.stringify( data ) );
  },


  /**
   * @name logConsole
   * @method
   * @description Console log
   * @param {String} input Information to log
   */
  logConsole: function(input) {
    console.log(input);
  },


  /**
   * @name logTable
   * @method
   * @description Console log
   * @param {String} input Information to log
   */
  logTable: function(input) {
    console.table(input);
  },


  /**
  * @name ready
  * @method
  * @description Run event after the DOM is ready
  * (c) 2017 Chris Ferdinandi, MIT License, https://gomakethings.com
  * @param  {Function} fn Callback function
  */
  ready: function (doc, fn) {
    // Sanity check
    if (typeof fn !== 'function') return;

    // If document is already loaded, run method
    if (doc.readyState === 'interactive' || doc.readyState === 'complete') {
      return fn();
    }

    // Otherwise, wait until document is loaded
    doc.addEventListener('DOMContentLoaded', fn, false);
  },


  /*!
  * Create a new object composed of properties that meet specific criteria
  * (c) 2018 Chris Ferdinandi, MIT License, https://gomakethings.com
  * @param  {Object}   obj      The original object
  * @param  {Function} callback The callback test to run
  * @return {Object}            The new, filtered object
  */
  objectFilter: function (obj, callback) {
    'use strict';
    // Setup a new object
    var filtered = {};

    // Loop through each item in the object and test it
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        // If the callback validates true, push item to the new object
        if (callback(obj[key], key, obj)) {
          filtered[key] = obj[key];
        }
      }
    }

    // Return the new object
    return filtered;
  },


  /*!
  * More accurately check the type of a JavaScript object
  * (c) 2018 Chris Ferdinandi, MIT License, https://vanillajstoolkit.com/helpers/truetypeof/
  * @param  {Object} obj The object
  * @return {String}     The object type
  */
  trueTypeOf: function (obj) {
    return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
  },


  /*!
  * Convert an array of objects into an object of objects
  * https://medium.com/dailyjs/rewriting-javascript-converting-an-array-of-objects-to-an-object-ec579cafbfc7
  * https://javascript.info/keys-values-entries#transforming-objects
  * @param  {Array} array       The array
  * @param  {String} keyField   The array field to use as key to object
  * @return {Object}            The object containing the strip information
  */
  arrayToObject: (function (array, keyField) {
    return array.reduce((function (obj, item) {
      obj[item[keyField]] = item;
      return obj;
    }), {});
  }),


  /**
   * @name getStrip
   * @method
   * @description Retrieves strip information from JSON file
   * @param   {Object|Array} strips An object or array containing EFM strip
   * @param   {String}       id     If provided, returns the strip that has the matching ID
   * @returns {null|Object}         Object of scans in the current strip. If an ID is
   *                                provided, returns either the Object in the strip, or `null`
   */
  getStrip: function(strips, id) {
    if ( !strips ) return console.info( 'NO STRIP INFORMATION RECEIVED.' );
    if ( !id ) return strips[0]; // Return the first strip if no id.

    for ( var i = 0; i < strips.length; ++i ) {
      if ( strips[ i ].id !== id ) continue;
      return strips[ i ];
    }
    return null;

    // Convert array to object.
    /*strips = EFM.Util.trueTypeOf(strips) == 'array' ? EFM.Util.arrayToObject(strips, 'id') : strips;
    var key = Object.keys(strips)[0];
    return strips[id] || strips[key];*/
  },


  /**
   * @name getStripTimes
   * @method
   * @description Retrieves strip start and end times
   * @param   {object} strip  Return JSON strip data.
   * @returns {null|Object}   Object containing strip start and end
   *                          times, or `null`
   */
  getStripTimes: function(strip) {
    if( !strip ) return null;

    var startHr = strip._startHour, endHr = strip._endHour,
    startMin = strip._startMinute, endMin = strip._endMinute,
    startSec = strip._startSecond, endSec = strip._endSecond,
    mediaStartTime = EFM.Util.hmsToMilliseconds(startHr, startMin, startSec),
    mediaEndTime = EFM.Util.hmsToMilliseconds(endHr, endMin, endSec);

    return {
      mediaStartTime: mediaStartTime,
      mediaEndTime: mediaEndTime
    };
  },

};


/* 
  class manipulation functions
*/
EFM.Util.hasClass = function(el, className) {
  if (el.classList) return el.classList.contains(className);
  else return !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'));
};

/*!
 * Get the first matching element in the DOM
 * (c) 2019 Chris Ferdinandi, MIT License, https://gomakethings.com
 * // https://vanillajstoolkit.com/helpers/
 * @param  {String} selector The element selector
 * @param  {Node}   parent   The parent to search in [optional]
 * @return {Node}            The element
 */
EFM.Util.$ = function (selector, parent) {
  return (parent ? parent : document).querySelector(selector);
};

/*!
 * Get an array of all matching elements in the DOM
 * (c) 2019 Chris Ferdinandi, MIT License, https://gomakethings.com
 * @param  {String} selector The element selector
 * @param  {Node}   parent   The parent to search in [optional]
 * @return {Array}           The elements
 */
EFM.Util.$$ = function (selector, parent) {
  return Array.prototype.slice.call((parent ? parent : document).querySelectorAll(selector));
};

// Convert to lowercase
EFM.Util.getNormalizedPageName = function(e) {
  var t = e.toLowerCase().trim(),
      n = t.indexOf(".html");
  return n > -1 && (t = t.substr(0, n)),
  (t = t.replace(/\s+/g, "_").replace(/[^a-z0-9-_]/g, "")) + ".html"
};

// Toggle state
EFM.Util.transition = function(object, state, event) {
  return object.data.machine.states[state].on[event] || state;
};