/*!
 * efm-viewer v0.3.0
 * Illustrated Verdict - EFM Viewer
 * (c) 2019 Illustrated Verdict
 * Illustrated Verdict License
 * https://github.com/khristos/IV-EFMV
 */

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
   * @param   {object} strip  If provided, returns strip object
   * @returns {null|Object}   Object containing start and end
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
//var EFMViewer = (function() {
  var EFMAnimate = (function() {
	//
	// Variables
  //

  var player = {};
  var TLcontrols = {};
  var playButton = document.querySelector('.efm__play-pause');
  var playButtonIcon = document.querySelector( '.efm__play-pause .mdi' );
  var seekBar = document.querySelector('.efm__seek-bar');
  var seekTime = document.querySelector('.efm__seek-time');
  var media = document.querySelector('.efm__media');
  var mediaCollection = document.querySelector('.efm__media-collection');
  var controls = document.querySelector('.efm__controls');
  var nextButton = document.querySelector('.efm__next');
  var backButton = document.querySelector('.efm__previous');
  var timerCurrent = document.querySelector('.efm__timer-current');
  var timerTotal = document.querySelector('.efm__timer-total');
  var playSpeed = document.querySelector('.efm__play-speed');
  var mediaStartTime = 64.2e5;
  var mediaEndTime = 54.9e6;
  var mediaDurationOffset = 80e3;
  var mediaTotalTime = mediaEndTime - mediaStartTime;
  var mediaPixelOffset = 72;
  var scrollPercent;

  // Element to animate
  var marquee = document.querySelector('.efm__media-collection');
  marquee.style.whiteSpace = 'nowrap';
  // Children of element to animate (i.e. images)
  var children = [].slice.call(marquee.querySelectorAll( '.efm__media-item img'));
  var displacement = 0;

  player.init = function() {
    this.rate = 1;
    imagesLoaded( children, _createMarquee );
  };

  // Private methods
  var _createMarquee = function() {
    // Add up the width of all the elements in the marquee
    displacement = children.map((function(child) {
      //console.log("X1: ", child.clientWidth);
      return child.clientWidth;
    })).reduce((function(acc, next) {
      return acc + next;
    })) - marquee.clientWidth << 0;
    /*
    Crucial: subtract the width of the container;
    Optional: take the opportunity to round the displacement 
    value down to the nearest pixel. The browser may thank
    you for this by not blurring your text.
    */
    /*for ( var j = 0; j < children.length; ++j ) {
      displacement += children[j].clientWidth;
      console.log(displacement);
      displacement = (displacement - marquee.clientWidth) << 0;
    }*/
    console.log("Children #: ", children.length);
    console.log("Children width: ", displacement);
    console.log("marquee.clientWidth: ", marquee.clientWidth);
    timerCurrent.textContent = secondsToHms( mediaStartTime / 1000 ) || 0;
    _animateMarquee();
    //_addEvents();
  };

  var _animateMarquee = function() {
    player.duration = ( children.length * (4 * 673342) ) / player.rate;
    _addEvents();
    TLcontrols = anime.timeline({
      //direction: 'alternate',
      loop: false,
      easing: 'linear',
      //easing: 'easeOutQuad',
      run: function(animation) {
        //animation.progress === 100 && player.speed !== void 0 && (anime.speed = player.speed, player.speed = void 0);
      },
      complete: function(animation) {
        //runLogEl.value = 'not running';
        //runProgressLogEl.value = 'progress : 100%';
      },
      update: function(animation) {
        //console.log(animation);
        seekBar.value = TLcontrols.progress;
        seekBar.setAttribute('aria-valuenow', seekBar.value);

        //seekTime.textContent = secondsToHms( Math.round(animation.currentTime / 1000) || 0);
        //timerCurrent.textContent = (Math.round(animation.progress) ) || 0;
        if (seekTime && seekTime.textContent) {
          seekTime.textContent = seekBar.value;
        }
        //timerCurrent.textContent = ( Math.round(animation.currentTime) ) || 0;
        timerCurrent.textContent = secondsToHms( (animation.currentTime / 1000 ) + ( mediaStartTime / 1000) ) || 0;
        //timerTotal.textContent = secondsToHms(animation.duration / 100);
      },
      autoplay: false
    });

    TLcontrols
    .add({
      targets: marquee,
      translateX: [
        { value: -displacement }
      ],
      duration: function() { return player.duration },
      loop: true,
      offset: 0
    })

    console.log("TLcontrols: ", TLcontrols);
    console.log("Player duration: ", player.duration );
    playButton.addEventListener('click', _playMarquee, false );
  }

  var _playMarquee = function(evt) {
    evt.preventDefault();
    //seekBar.value = TLcontrols.progress;
    TLcontrols.seek(TLcontrols.duration * (seekBar.value / 100));
    if ( TLcontrols.paused ) {
      TLcontrols.play();
      playButtonIcon.classList.remove('mdi-play');
      playButtonIcon.classList.add('mdi-pause');
      showLog();
    }
    else {
      TLcontrols.pause();
      playButtonIcon.classList.remove('mdi-pause');
      playButtonIcon.classList.add('mdi-play');
      showLog();
    }
  }

  var _addEvents = function() {
    seekBar.addEventListener('input', (function() {
      TLcontrols.seek(TLcontrols.duration * (seekBar.value / 100));
    }));
    
    ['input','change'].forEach((function(evt) {
      seekBar.addEventListener(evt, (function() {
        TLcontrols.pause();
        playButtonIcon.classList.remove('mdi-pause');
        playButtonIcon.classList.add('mdi-play');
        TLcontrols.seek(TLcontrols.duration * (seekBar.value / 100));
      }));
    }));

    // https://github.com/juliangarnier/anime/issues/48
    playSpeed.addEventListener('change', (function() {
      console.log("TLcontrols.duration before: ", TLcontrols.duration);
      TLcontrols.pause();
      var rate = playSpeed.options[playSpeed.selectedIndex];
      player.rate = +(rate.value) || 1;
      player.duration = TLcontrols.duration;
      player.currentTime = TLcontrols.currentTime;
      player.progress = TLcontrols.progress;
      player.adjustment = Math.floor((100 / player.duration) * player.currentTime);
      if ( !TLcontrols.paused ) {
        playButtonIcon.classList.add('mdi-pause');
        playButtonIcon.classList.remove('mdi-play');
      }
      else {
        playButtonIcon.classList.remove('mdi-pause');
        playButtonIcon.classList.add('mdi-play');
      }
      anime.remove('.efm__media-collection');
      _animateMarquee();
      showLog();
     }));

     //media.addEventListener('scroll', debounce(setScroll), { passive: true });
     media.addEventListener('scroll', debounce(setScroll), { passive: true });

     nextButton.addEventListener('click', _skipForward, false );
     backButton.addEventListener('click', _skipBackward, false );
  }

  var setScroll = function() {
    if ( TLcontrols.currentTime === 0 ) {
      TLcontrols.play();
    }
    TLcontrols.pause();
    playButtonIcon.classList.remove('mdi-pause');
    playButtonIcon.classList.add('mdi-play');
    var xPos = 0;
    if (media) {
      //xPos += (media.offsetLeft - media.scrollLeft + media.clientLeft);
      xPos += (media.offsetLeft - media.scrollLeft + media.clientLeft);
    }
    //player.progress = (Math.abs(xPos) / displacement) * 100;
    //player.progress = Math.floor((100 / displacement) * xPos);
    scrollPercent = (xPos / displacement) * 100;
    console.log("\nscrollPercent: " + scrollPercent);
    mediaCollection.dataset.scroll = xPos;
    console.log("x: ", xPos, " media.offsetLeft: ", media.offsetLeft, " media.scrollLeft: ", media.scrollLeft, " media.clientLeft: ", media.clientLeft, "scrollPercent: ", scrollPercent);
    //TLcontrols.progress = Math.abs(scrollPercent);
    TLcontrols.currentTime = scrollPercent * TLcontrols.duration;
    TLcontrols.progress = Math.abs(scrollPercent);
    _updateSeekbar();
    showLog();
  }

  // Update the progress bar
  var _updateSeekbar = function() {
    seekBar.value = TLcontrols.progress;
    //TLcontrols.seek((seekBar.value / 100) * TLcontrols.duration);
    TLcontrols.seek(((seekBar.value / 100) * TLcontrols.duration) + TLcontrols.currentTime);
    console.log("TL progress: " + TLcontrols.progress);
    // Work out how much of the media has played via the duration and currentTime parameters
    //var percentage = Math.floor((100 / player.duration) * player.currentTime);
    // Update the progress bar's value
    //progressBar.value = percentage;
    // Update the progress bar's text (for browsers that don't support the progress element)
    //progressBar.innerHTML = percentage + '% played';
  }

  var _skipForward = function(evt) {
    evt.preventDefault();
    if ( TLcontrols.currentTime === 0 ) {
      TLcontrols.play();
    }
    TLcontrols.pause();
    playButtonIcon.classList.remove('mdi-pause');
    playButtonIcon.classList.add('mdi-play');
    console.log("Skip Next");
    TLcontrols.seek( (TLcontrols.duration * (seekBar.value / 100)) + ( TLcontrols.duration / (children.length * (children.length / 3) )) );
    _updateSeekbar();
  }

  var _skipBackward = function(evt) {
    evt.preventDefault();
    if ( TLcontrols.currentTime === 0 ) {
      TLcontrols.play();
    }
    TLcontrols.pause();
    playButtonIcon.classList.remove('mdi-pause');
    playButtonIcon.classList.add('mdi-play');
    console.log("Skip Back");
    TLcontrols.seek( (TLcontrols.duration * (seekBar.value / 100)) - ( TLcontrols.duration / (children.length * (children.length / 3) )) );
    _updateSeekbar();
  }

  var _seek = function(e) {
    var percent = e.offsetX / this.offsetWidth;
    player.currentTime = percent * player.duration;
    e.target.value = Math.floor(percent / 100);
    e.target.innerHTML = progressBar.value + '% played';
  }

  // The debounce function receives our function as a parameter
  const debounce = (fn) => {
    // This holds the requestAnimationFrame reference, so we can cancel it if we wish
    let frame;

    // The debounce function returns a new function that can receive a variable number of arguments
    return (...params) => {
      
      // If the frame variable has been defined, clear it now, and queue for next frame
      if (frame) { 
        cancelAnimationFrame(frame);
      }

      // Queue our function call for the next frame
      frame = requestAnimationFrame(() => {
        // Call our function and pass any params we received
        fn(...params);
      });
    } 
  };

  /**
   * Utilities
   */
  function secondsToHms(date) {
    date = Number(date);
    var h = Math.floor(date / 3600);
    var m = Math.floor(date % 3600 / 60);
    var s = Math.floor(date % 3600 % 60);
    return (h > 0 ? h + ':' : '') + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function listener(event) {
    console.log(event.type, event.pageX, event.pageY);
  }

  function showLog() {
    console.log("\nseekBar.value: ", seekBar.value , '%', "\n TLcontrols.progress: ", TLcontrols.progress, "\n TLcontrols.duration: ", TLcontrols.duration, "\n TLcontrols.currentTime: ", TLcontrols.currentTime);
  }

  if (document.readyState != 'loading') {
    player.init();
    //console.log('Hello main.js!');
  }
	// modern browsers
	else if (document.addEventListener) {
    document.addEventListener("DOMContentLoaded", (function() { player.init(); }), false);
    //console.log('Hello EFM2!');
  }

//})();
});
