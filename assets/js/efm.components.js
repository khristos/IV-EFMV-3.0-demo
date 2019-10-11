/*!
 * efm-viewer v0.3.0
 * Illustrated Verdict - EFM Viewer
 * (c) 2019 Illustrated Verdict
 * Illustrated Verdict License
 * https://github.com/khristos/IV-EFMV
 */

/**
 * @file: efm-viewer.js
 */

/**
 * @name EFMViewer
 * @description Plugin for EFM Viewer UI
 */
(function (root, factory) {
  if ( typeof define === 'function' && define.amd ) {
    define([], (function () {
      return factory(root);
    }));
  } else if ( typeof exports === 'object' ) {
    module.exports = factory(root);
  } else {
    root.EFMViewer = factory(root);
  }
})(typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this, (function (window) {

  'use strict';

  //
  // Default settings
  //

  var defaults = {
    // Selectors
    media: '.efm__media',
    controls: '.efm__controls',
    timeline: '.efm__timeline',
    timer: '.efm__timer',
    controlBar: '.efm__controlBar',
    mediaCollection: '.efm__media-collection',
    mediaItemImage: '.efm__media-item img',
    playButton: '.efm__play-pause',
    playButtonState: {isPlaying: 'mdi-play', isPaused: 'mdi-pause'},
    seekBar: '.efm__seek-bar',
    seekTime: '.efm__seek-time',
    nextButton: document.querySelector('.efm__next'),
    backButton: document.querySelector('.efm__previous'),
    timerCurrent: '.efm__timer-current',
    timerTotal: '.efm__timer-total',
    playSpeed: document.querySelector('.efm__play-speed'),

    // Data
    storageID: 'efm__configData',

    // Templates (find in 'script' tags within html file)
    templateStrip: document.querySelector('[data--efm__media-item]'),
    templateTimeline: document.querySelector('[data--efm__timeline]'),
    templateTimer: document.querySelector('[data--efm__timer]'),
    templateControlBar: document.querySelector('[data--efm__controlBar]'),

  };


  /**
   * @name _saveViewer
   * @var
   * @function
   * @description Save viewer state to local storage
   */
  var _saveViewer = function (name, data) {
    setLocalData(name, JSON.stringify(data));
  };


  /**
   * @name handleClick
   * @var
   * @function
   * @description Handles functions to execute when the user clicks
   * @param {EventListenerObject} e 
   */
  var handleClick = function( e ) {
  };

  /**
   * @name handleChange
   * @var
   * @function
   * @description Handles functions to execute when input values change
   * @param {EventListenerObject} e 
   */
  var handleChange = function( e ) {
  };

  /**
   * @name handleRender
   * @var
   * @function
   * @description Handles functions to execute after the views have rendered
   * @param {EventListenerObject} e 
   */
  var handleRender = function( e ) {
    if (e.target.matches('.efm__player')) {
      alert("Render event.");
    }
  };


  /**
   * Create the Constructor object
   * @param {String} selector The selector to use for plugin
   * @param {Object} options  User options and settings
   */
  var Constructor = function (selector, options) {
    //
    // Variables
    //

    var publicAPIs = {}, settings;
    var marquee, children, displacement,
        timerCurrent, timerTotal, animations = [];
    var playButton, seekBar, seekTime;

    //
    // Methods
    //

    /**
     * A private method
     */
    var myPrivateMethod = function () {
      // Code goes here...
      //console.log("EFMViewer SETTINGS: ", settings);
    };


    /**
     * @name dataSource
     * @class
     * @description Main data source for viewer (i.e. 'config.json')
     */
    var dataSource = new Reef( null, {
      data: EFM.Util.getLocalData(defaults.storageID),
      lagoon: true
    });


    /**
     * @name player
     * @class
     * @description Parent EFM Viewer component
     */
    var player = new Reef(selector, {
      data: {
        speed: 1
      },
      template: function (props) {
        var html = '<div class="efm__media"></div>';
        html += `<div class="efm__controls" role="toolbar" aria-label="efm player">
                  <form class="efm__timeline columns is-centered"></form>
                  <div class="efm__controlBar"></div>
                </div>`;
        return html;
      },
      attachTo: [dataSource]
    });


    /**
     * @name strip
     * @class
     * @param {string} [defaults.media] DOM element hook for strip component
     * @param {Object} [data] Data property for this component
     * @param {Object} [template] Template property for this component
     * @description Component holding fetal strip scans
     */
    var strip = new Reef(defaults.media, {
      data: {
        duration: 0,
        id: null, // '3978fs' ID of strip
        strips: dataSource.data.configData.strips.strip,
        times: null
      },
      template: function (props) {
        var template = defaults.templateStrip.innerHTML,
        strip = EFM.Util.getStrip(props.strips, props.id),
        stripID = this.data.id = strip.id,
        scans = strip.scans.scan.length > 0 ? strip.scans.scan : ["NO SCANS FOUND."],
        markers = strip.markers,
        html = '<div class="efm__media-collection" ' + 'data-efm-media-' + stripID + '>';

        this.data.times = EFM.Util.getStripTimes(strip);
        console.group("STRIP DATA");
        console.table(this.data);
        console.groupEnd();

        scans.forEach((function (scan) {
          html += placeholders( template, scan );
        }));

        html += '</div>';
        return html;
      },
      attachTo: [dataSource, player]
    });


    /**
     * @name timeline
     * @class
     * @description Component holding fetal strip viewer timeline control
     */
    var timeline = new Reef(defaults.timeline, {
      data: null,
      template: function (props) {
        var template = defaults.templateTimeline.innerHTML,
        html = placeholders( template, props );
        return html;
      },
      attachTo: [dataSource, player]
    });


    /**
     * @name timer
     * @class
     * @description Component holding fetal strip viewer timer control
     */
    var timer = new Reef(defaults.timer, {
      data: {
        timerCurrent: 0,
        timerTotal: 0
      },
      template: function (props) {
        var template = defaults.templateTimer.innerHTML,
        html = placeholders( template, props );
        return html;
      },
      attachTo: [dataSource, player]
    });


    /**
     * @name controlBar
     * @class
     * @description Component holding fetal strip viewer control bar
     */
    var controlBar = new Reef(defaults.controlBar, {
      data: {
        playPauseButton: defaults.playButton,
        hasState: defaults.playButtonState.isPlaying
      },
      template: function (props) {
        props['playPauseButton'] = props['playPauseButton'].replace('.', '');
        var template = defaults.templateControlBar.innerHTML,
        html = placeholders( template, props );
        return html;
      },
      attachTo: [dataSource, player]
    });


    /**
     * Setup viewer plugin
     */
    publicAPIs.setup = function () {
      myPrivateMethod();

      // Initial render
      player.render();
      /*strip.setData({
        id: '3978fs'
      });*/

      // Attach animation
      publicAPIs.animate();

      // Setup event listeners
      //_addEvents();
    };


    /**
     * Animate viewer
     */
    publicAPIs.animate = function (id) {
      //EFMAnimate();
      _initMarquee();

      console.group("SETTINGS (EFMViewer)");
      console.log(settings);
      console.groupEnd();
      //settings.animate(selector, settings)
    };


    /**
     * @name _initMarquee
     * @param
     * @description Initialize marquee container for animated content (strip)
     */
    var _initMarquee = function() {
      marquee = document.querySelector(settings.mediaCollection);
      marquee.style.whiteSpace = 'nowrap';

      // Children of element to animate (i.e. scan images in each strip).
      children = [].slice.call(marquee.querySelectorAll(settings.mediaItemImage));
      displacement = 0;

      // Check if images have fully loaded before animating.
      imagesLoaded( children, _createMarquee );
    };


    /**
     * @name _createMarquee
     * @param 
     * @description Create marquee container for animated content
     */
    var _createMarquee = function() {
      timerCurrent = EFM.Util.secondsToHms( strip.data.times.mediaStartTime / 1000 ) || 0;
      timerTotal = EFM.Util.secondsToHms( strip.data.times.mediaEndTime / 1000 ) || 0;

      // Add up the width of all elements in the marquee.
      displacement = children.map((function(child) {
        //console.log("Marquee content item: " + child.src.substring(child.src.lastIndexOf('/') + 1) + " - width: ", child.clientWidth);
        return child.clientWidth;
      })).reduce((function(acc, next) {
        return acc + next;
      })) - marquee.clientWidth << 0;
      /**
       * Crucial: subtract the width of the container (marquee);
       * Optional: take the opportunity to round the displacement 
       * value down to the nearest pixel. The browser may thank
       * you for this by not blurring your text.
       */
      /*for ( var j = 0; j < children.length; ++j ) {
        displacement += children[j].clientWidth;
        console.log(displacement);
        displacement = (displacement - marquee.clientWidth) << 0;
      }*/

      console.group("MARQUEE");
      console.log("# items: ", children.length, ";\nviewport width: ", marquee.clientWidth + ";\ntotal content width: ", displacement);
      console.groupEnd();

      timer.setData({timerCurrent: timerCurrent, timerTotal: timerTotal});

      _animateMarquee();
    };


    /**
     * @name _animateMarquee
     * @param 
     * @description Animate marquee
     */
    var _animateMarquee = function() {
      playButton = settings.playButton,
      seekBar = document.querySelector(settings.seekBar),
      seekTime = document.querySelector(settings.seekTime);

      var stripData = strip.getData(), playerData = player.getData(),
      stripStartTime = stripData.times.mediaStartTime,
      stripEndTime = stripData.times.mediaEndTime;

      strip.data.duration = ( stripEndTime - stripStartTime ) / playerData.speed;

      _addEvents();

      animations[stripData.id] = anime.timeline({
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
          seekBar.value = animations[stripData.id].progress;
          seekBar.setAttribute('aria-valuenow', seekBar.value);
  
          //seekTime.textContent = secondsToHms( Math.round(animation.currentTime / 1000) || 0);
          //timerCurrent.textContent = (Math.round(animation.progress) ) || 0;
          if (seekTime && seekTime.textContent) {
            seekTime.textContent = seekBar.value;
          }
          timer.setData({timerCurrent: EFM.Util.secondsToHms( (animation.currentTime / 1000 ) + ( stripStartTime / 1000) ) || 0});
        },
        autoplay: false
      });

      animations[stripData.id]
      .add({
        targets: marquee,
        translateX: [
          { value: -displacement }
        ],
        duration: function() { return strip.data.duration },
        loop: true,
        offset: 0
      })

      events.on('click', playButton, _playMarquee);
      /*document.addEventListener( 'click', function (event) {
        // If the event target doesn't exist
        if (!event.target.closest(playButton)) return;
        _playMarquee(event);
      }, false );*/

      console.group("ANIMATIONS");
      console.log("Instance: ", animations);
      console.log("Instance duration: ", animations[stripData.id].duration );
      console.groupEnd();
    };


    /**
     * @name _playMarquee
     * @param 
     * @description Play marquee
     */
    var _playMarquee = function(event) {
      event.preventDefault();
      var stripData = strip.getData();

      animations[stripData.id].seek(animations[stripData.id].duration * (seekBar.value / 100));

      if ( animations[stripData.id].paused ) {
        controlBar.setData({hasState: settings.playButtonState.isPaused});
        animations[stripData.id].play();
        _showLog();
      }
      else {
        animations[stripData.id].pause();
        controlBar.setData({hasState: settings.playButtonState.isPlaying});
        _showLog();
      }
    };


    /**
     * @name _addEvents
     * @var
     * @function
     * @description binds events to the view
     */
    var _addEvents = function() {
      ['input','change'].forEach((function(evt) {
        document.addEventListener(evt, handleSeekBar, false );
      }));

      //document.addEventListener( 'click', handleClick, false );
      //document.addEventListener( 'change', handleChange, false );
      //document.addEventListener( 'render', handleRender, false );
    }


  /**
   * @name handleSeekBar
   * @var
   * @function
   * @description Function to execute when the user operates' seek bar'.
   */
    var handleSeekBar = function() {
      var stripData = strip.getData();
      if (!event.target.closest(settings.seekBar)) return;
      animations[stripData.id].pause();
      animations[stripData.id].seek(animations[stripData.id].duration * (seekBar.value / 100));
      controlBar.setData({hasState: settings.playButtonState.isPlaying});
    }


    /**
     * @name _showLog
     * @param 
     * @description Log animation metadata
     */
    var _showLog = function() {
      var stripData = strip.getData();
      console.group("ANIMATION PROGRESS");
      console.log("seekBar.value: ", seekBar.value , '%', "\n animations.progress: ", animations[stripData.id].progress, "\n animations.duration: ", animations[stripData.id].duration, "\n animations.currentTime: ", animations[stripData.id].currentTime);
      console.groupEnd();
    }


    /**
     * Initialize viewer plugin
     */
    publicAPIs.init = function (options) {
      // Merge user options into defaults
      settings = EFM.Util.extend(defaults, options || {});

      // Setup variables based on the current DOM
      publicAPIs.setup();
    };


    //
    // Initialize and setup event listeners
    //
    publicAPIs.init(options);


    // Return the public APIs
    return publicAPIs;
  };


  //
  // Return the Constructor
  //

  return Constructor;

}));


var defaultViewer = function() {
  EFM.Util.getXHRData.call(this, (function() {
    return new EFMViewer('[data-efm-player]', {});
  }));
}

EFM.Util.ready(document, defaultViewer);