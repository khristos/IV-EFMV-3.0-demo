/*! efm-viewer v3.0.0 | (c) 2020 Illustrated Verdict | Illustrated Verdict License | https://github.com/khristos/IV-EFMV */
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
    loader: '.efm__loader',
    controls: '.efm__controls',
    timeline: '.efm__timeline',
    timer: '.efm__timer',
    controlBar: '.efm__controlBar',
    mediaCollection: '.efm__media-collection',
    mediaItemImage: '.efm__media-item img',
    playButton: '.efm__play-pause',
    playButtonState: {isPlaying: 'mdi-pause', isPaused: 'mdi-play'},
    seekBar: '.efm__seek-bar',
    nextButton: '.efm__next',
    backButton: '.efm__previous',
    timerCurrent: '.efm__timer-current',
    timerTotal: '.efm__timer-total',
    playSpeed: document.querySelector('.efm__play-speed'),
    menuBar: '.efm__menuBar',
    menuBarStrips: '.dropdown-menu__strips',
    menuBarButton: '.efm__menuBar-strip--title',
    menuBarDropdownItem: '.dropdown-item',

    // Data
    storageID: 'efm__configData',

    // Templates (find in 'script' tags within html file)
    templateStrip: EFM.Util.$('[data--efm__media-item]'),
    templateTimeline: document.querySelector('[data--efm__timeline]'),
    templateTimer: document.querySelector('[data--efm__timer]'),
    templateControlBar: document.querySelector('[data--efm__controlBar]'),
    templateLoader: document.querySelector('[data--efm__loader]'),
    templateMenuBar: document.querySelector('[data--efm__menuBar]')

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
    var media, marquee, children, displacement,
        timerCurrent, timerStart, timerTotal, animations = [];
    var playButton, seekBar;

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
     * @description Parent EFM Viewer component.
     */
    var player = new Reef(selector, {
      data: {
        speed: 1,
        hasState: ' is-loading'
      },
      template: function (props) {
        var html = '<div class="efm__media"></div>';
        html += `<div class="efm__controls" role="toolbar" aria-label="efm player">
                  <form class="efm__timeline columns is-centered no-margin-bottom"></form>
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
     * @param {Object} [data] Data property for this component.
     * @param {Object} [template] Template property for this component.
     * @description Component - viewer fetal strip scans.
     */
    var strip = new Reef(defaults.media, {
      data: {
        duration: 0,
        id: null, // '3978fs' ID of strip
        strips: dataSource.data.configData.strips.strip,
        times: null, 
        title: null
      },
      template: function (props) {
        var template = defaults.templateStrip.innerHTML,
        strip = EFM.Util.getStrip(props.strips, props.id),
        stripID = this.data.id = strip.id,
        stripTitle = this.data.title = strip.title,
        scans = strip.scans.scan.length > 0 ? strip.scans.scan : ["NO SCANS FOUND."],
        markers = strip.markers,
        html = '<div class="efm__media-collection" ' + 'data-efm-media-' + stripID + '>';

        var playerData = player.getData();

        this.data.times = EFM.Util.getStripTimes(strip);

        scans.forEach((function (scan) {
          html += placeholders( template, scan );
        }));

        html += '</div>';
        html += `<div class="efm__loader${playerData.hasState}"></div>`;

        console.group("STRIP DATA");
        console.table(this.data);
        console.groupEnd();

        return html;
      },
      attachTo: [dataSource, player]
    });


    /**
     * @name timeline
     * @class
     * @description Component - viewer timeline control.
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
     * @description Component - viewer timer control.
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
     * @description Component - viewer control bar.
     */
    var controlBar = new Reef(defaults.controlBar, {
      data: {
        playPauseButton: defaults.playButton,
        hasState: defaults.playButtonState.isPaused
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
     * @name loader
     * @class
     * @description Component - viewer loading message.
     */
    var loader = new Reef(defaults.loader, {
      data: null,
      template: function (props) {
        var template = defaults.templateLoader.innerHTML,
        html = placeholders( template, props );
        return html;
      },
      attachTo: [dataSource, player]
    });


      /**
     * @name menuBar
     * @class
     * @description Component - viewer menubar.
     */
    var menuBar = new Reef(defaults.menuBar, {
      data: {
        isActive: false,
        attrs: {dropdown: '', ariaExpanded: 'false'},
        title: strip.getData().title
      },
      template: function (props) {
        var template = defaults.templateMenuBar.innerHTML,
        html = '';
        html += placeholders( template, props );
        return html;
      },
      attachTo: [dataSource, player]
    });


    /**
     * @name menuBarStrips
     * @class
     * @description Component - EFM strip titles for dropdown menu.
     */
    var menuBarStrips = new Reef(defaults.menuBarStrips, {
      data: {
        strips: dataSource.data.configData.strips.strip
      },
      template: function (props) {
        var html = '';

        props.strips.forEach((function (strip) {
          html += `
            <a class="dropdown-item strip-item border-bottom" data-strip-id="${strip.id}">
              ${strip.title} - ${strip.id}
              <span class="dropdown-edit">
                <i class="mdi mdi-lead-pencil strip-edit" title="Edit strip"></i>
                <i class="mdi mdi-trash-can strip-delete" title="Delete strip"></i>
              </span>
            </a>
          `;
        }));

        html += `
        <div class="dropdown-new border-bottom editing-strip">
          <input type="text" class="dropdown-menu__new-input" placeholder="output filename..."> 
          <a class="has-text-primary strip-save-changes">Save</a>
        </div>
        `

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
      player.setData({hasState: ''});
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
      console.log("# items: ", children.length, ";\nViewport width: ", marquee.clientWidth + ";\nDisplacement (total content width): ", displacement);
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
      seekBar = document.querySelector(settings.seekBar);

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
          seekBar.value = animations[stripData.id].progress;
          seekBar.setAttribute('aria-valuenow', seekBar.value);
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
      console.log("Instance duration: ", animations[stripData.id].duration);
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
        animations[stripData.id].play();
        controlBar.setData({hasState: settings.playButtonState.isPlaying});
        _showProgress();
      }
      else {
        animations[stripData.id].pause();
        controlBar.setData({hasState: settings.playButtonState.isPaused});
        _showProgress();
      }
      timer.render();
    };


    /**
     * @name _addEvents
     * @var
     * @function
     * @description binds events to the view
     */
    var _addEvents = function() {
      // Seek bar event listener
      ['input','change'].forEach((function(evt) {
        document.addEventListener(evt, handleSeekBar, false );
      }));

      // Media (i.e. swipe scans) event listener
      media = document.querySelector('.efm__media');
      media.addEventListener('scroll', EFM.Util.debounce(handleScroll), { capture: true, passive: true });

      // Skip forward/backward in time
      document.addEventListener('click', _skipForward, false );
      document.addEventListener('click', _skipBackward, false );
      document.addEventListener('click', _toggleMenuBar, false );
      document.addEventListener('click', _displayStrip, false );

      //document.addEventListener( 'click', handleClick, false );
      //document.addEventListener( 'change', handleChange, false );
      //document.addEventListener( 'render', handleRender, false );
    };


  /**
   * @name handleSeekBar
   * @var
   * @function
   * @description Event handler to execute when the user 
   * operates 'seek bar'.
   */
    var handleSeekBar = function(event) {
      var stripData = strip.getData();
      if ( !event.target.closest(settings.seekBar) ) return;
      animations[stripData.id].pause();
      animations[stripData.id].seek(animations[stripData.id].duration * (seekBar.value / 100));
      controlBar.setData({hasState: settings.playButtonState.isPaused});
      timer.render();
    };


  /**
   * @name handleScroll
   * @var
   * @function
   * @description Event handler to execute when the user swipes fetal scans.
   */
    var handleScroll = function(event) {
      var stripData = strip.getData(), xPos, transform, scrollPercent,
      animationTime, animationProgress;
      var stripStartTime = stripData.times.mediaStartTime;

      if ( !event.target.closest(settings.media) ) return;
      animations[stripData.id].play();
      animations[stripData.id].pause();
      controlBar.setData({hasState: settings.playButtonState.isPaused});

      xPos = 0;
      xPos += (media.offsetLeft - media.scrollLeft + media.clientLeft);
      marquee.dataset.scroll = xPos;
      scrollPercent = (Math.abs(xPos / displacement)) * 100;

      animationTime = animations[stripData.id].currentTime = (scrollPercent / 100) * animations[stripData.id].duration;
      animationProgress = seekBar.value = animations[stripData.id].progress = scrollPercent;

      animations[stripData.id].set(marquee, {
        //translateX: function() { return xPos; }
      });

      //transform = marquee.style.transform.match(/(-?[0-9\.]+)/g);
      //marquee.style.transform = "translateX(" + xPos + "px)";
      seekBar.setAttribute('aria-valuenow', animationProgress);
      animations[stripData.id].seek(animations[stripData.id].duration * (seekBar.value / 100));

      timer.setData({timerCurrent: EFM.Util.secondsToHms( (animations[stripData.id].currentTime / 1000 ) + ( stripStartTime / 1000) ) || 0});

      _showProgress();
      console.group("SCROLL PROGRESS");
      console.log("x: ", xPos, /*"transform: ", transform[0],*/ " media.offsetLeft: ", media.offsetLeft, " media.scrollLeft: ", media.scrollLeft, " media.clientLeft: ", media.clientLeft);
      console.log("scrollPercent: \t\t" + scrollPercent, "\nAnimation progress: " + animationProgress, "\nCurrent time: \t" + EFM.Util.secondsToHms( (animationTime / 1000 ) + ( stripStartTime / 1000) ));
      console.log("Instance: ", animations);
      console.groupEnd("");
    }


  /**
   * @name _skipForward
   * @var
   * @function
   * @description Event handler to execute when the user skips forward.
   */
    var _skipForward = function(event) {
      event.preventDefault();
      var stripData = strip.getData();
      if ( !event.target.closest(settings.nextButton) ) return;
      if ( animations[stripData.id].currentTime === 0 ) {
        animations[stripData.id].play();
      }
      animations[stripData.id].pause();
      controlBar.setData({hasState: settings.playButtonState.isPaused});
      //console.log("Skip Next");
      //animations[stripData.id].seek( (animations[stripData.id].duration * (seekBar.value / 100)) + ( animations[stripData.id].duration / (children.length * (children.length / 3) )) );
      animations[stripData.id].seek( (animations[stripData.id].currentTime) + ( 1000*60*15 ) ); // skip 15 minutes
      _updateSeekbar();
    }


  /**
   * @name _skipBackward
   * @var
   * @function
   * @description Event handler to execute when the user skips backward.
   */
    var _skipBackward = function(event) {
      event.preventDefault();
      var stripData = strip.getData();
      if ( !event.target.closest(settings.backButton) ) return;
      if ( animations[stripData.id].currentTime === 0 ) {
        animations[stripData.id].play();
      }
      animations[stripData.id].pause();
      controlBar.setData({hasState: settings.playButtonState.isPaused});
      //console.log("Skip Back");
      //animations[stripData.id].seek( (animations[stripData.id].duration * (seekBar.value / 100)) - ( animations[stripData.id].duration / (children.length * (children.length / 3) )) );
      animations[stripData.id].seek( (animations[stripData.id].currentTime) - ( 1000*60*15 ) ); // skip 15 minutes
      _updateSeekbar();
    }


  /**
   * @name _updateSeekbar
   * @var
   * @function
   * @description Update the seek bar (i.e. input range control).
   */
  var _updateSeekbar = function() {
    var stripData = strip.getData();
    seekBar.value = animations[stripData.id].progress;
    animations[stripData.id].seek(animations[stripData.id].currentTime);
    //animations[stripData.id].seek(animations[stripData.id].duration * (seekBar.value / 100));
    console.log("Instance: ", animations);
    // Work out how much of the media has played via the duration and currentTime parameters
    //var percentage = Math.floor((100 / player.duration) * player.currentTime);
    // Update the progress bar's value
    //progressBar.value = percentage;
    // Update the progress bar's text (for browsers that don't support the progress element)
    //progressBar.innerHTML = percentage + '% played';
  }


    /**
     * @name _showProgress
     * @param 
     * @description Console.log animation progress.
     */
    var _showProgress = function() {
      var stripData = strip.getData();
      console.group("ANIMATION PROGRESS");
      console.log("stripData.id: \t\t", stripData.id , "\nseekBar.value: \t\t", seekBar.value , '%', "\nanimations.progress: ", animations[stripData.id].progress, "\nanimations.duration: ", animations[stripData.id].duration, "\nanimations.currentTime: ", animations[stripData.id].currentTime);
      console.groupEnd();
    }


    /**
     * @name _toggleMenuBar
     * @param 
     * @description Console.log animation progress.
     */
    var _toggleMenuBar = function(event) {
      event.preventDefault();
      var menuBarData = menuBar.getData();
      if ( !event.target.closest(settings.menuBarButton) ) return;
      if (menuBarData.isActive == false) {
        menuBar.setData({isActive: true, attrs: {dropdown: 'is-active', ariaExpanded: 'true'}});
      }
      else {
        menuBar.setData({isActive: false, attrs: {dropdown: '', ariaExpanded: 'false'}});
      }
      menuBarStrips.render();
    }


    /**
     * @name _displayStrip
     * @param 
     * @description Select new strip to display.
     */
    var _displayStrip = function(event) {
      event.preventDefault();
      var menuBarData = menuBar.getData();
      if ( !event.target.closest(settings.menuBarDropdownItem) ) return;
      var stripID = event.target.getAttribute('data-strip-id');
      var stripData = strip.getData();
      animations[stripData.id].pause();
      strip.setData({
        id: stripID
      });
      var stripTitle = strip.getData().title;

      menuBar.setData({isActive: false, attrs: {dropdown: '', ariaExpanded: 'false'}, title: stripTitle});
      
      publicAPIs.animate();

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