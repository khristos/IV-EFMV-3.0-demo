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
    forwardTimeButton: '.efm__forward',
    backwardTimeButton: '.efm__backward',
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
    templateStrip: EFM.Util.$('[data-efm-media-item]'),
    templateTimeline: document.querySelector('[data-efm-timeline]'),
    templateTimer: document.querySelector('[data-efm-timer]'),
    templateControlBar: document.querySelector('[data-efm-controlBar]'),
    templateLoader: document.querySelector('[data-efm-loader]'),
    templateMenuBar: document.querySelector('[data-efm-menuBar]')

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
        timerCurrent, timerTotal, animations = [];
    var playButton, seekBar, scrollInstance;

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
     * @param {String} selector The selector to use for component.
     * @param {Object} options  User options (data and template).
     */
    var player = new Reef(selector, {
      data: {
        speed: 1,
        hasState: 'is-loading'
      },
      template: function (props) {
        console.log('RENDER PLAYER.');
        var html = '<div class="efm__media"></div>';
        html += `<div class="efm__controls" role="toolbar" aria-label="efm controls">
                  <form class="efm__timeline columns is-centered no-margin-bottom"></form>
                  <div class="efm__controlBar"></div>
                  <div class="efm__menuBar has-text-justified flex-justify"></div>
                </div>`;
        return html;
      },
      attachTo: [dataSource]
    });


    /**
     * @name strip
     * @class
     * @param {string} [defaults.media] The selector to use for component.
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
        scans = strip.scans.scan.length > 0 ? strip.scans.scan : ["NO SCANS FOUND."],
        html = '<div class="efm__media-collection" ' + 'data-efm-media-' + stripID + '>';

        this.data.title = strip.title;
        this.data.times = EFM.Util.getStripTimes(strip);

        scans.forEach((function (scan) {
          html += placeholders( template, scan );
        }));

        html += '</div>';
        html += `<div class="efm__loader" data-state="${player.data.hasState}"></div>`;

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
        title: ' ',
        machine: {
          currentState: 'inactive',
          states: {
            inactive: {    on: { TOGGLE: 'active' }, 
                        attrs: { className: ' ', ariaExpanded: 'false' }
                      },
            active: {    on: { TOGGLE: 'inactive' }, 
                      attrs: { className: 'is-active', ariaExpanded: 'true' }
                    }
          }
        }
      },
      template: function (props) {
        this.data.title = strip.data.title;
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
      _addEvents();
    };


    /**
     * Animate viewer
     */
    publicAPIs.animate = function () {
      _initMarquee();

      console.group("SETTINGS (EFMViewer)");
      console.log(settings);
      console.groupEnd();
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
      delete EFM.Util.$(settings.loader).dataset.state;

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

      var playerData = player.getData(),
      stripStartTime = strip.data.times.mediaStartTime,
      stripEndTime = strip.data.times.mediaEndTime;

      strip.data.duration = ( stripEndTime - stripStartTime ) / playerData.speed;

      if (animations[strip.data.id]) return; // Exit if animation already exists.

      animations[strip.data.id] = anime.timeline({
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
          seekBar.value = animations[strip.data.id].progress;
          seekBar.setAttribute('aria-valuenow', seekBar.value);
          timer.setData({timerCurrent: EFM.Util.secondsToHms( (animation.currentTime / 1000) + (stripStartTime / 1000) ) || 0});
        },
        autoplay: false
      });

      animations[strip.data.id]
      .add({
        targets: marquee,
        translateX: [
          { value: -displacement }
        ],
        duration: function() { return strip.data.duration },
        loop: true,
        offset: 0
      })

      menuBar.setData({ attrs: {className: ' ', ariaExpanded: 'false'} });

      _setTimer();
    };


    /**
     * @name _playMarquee
     * @param 
     * @description Play marquee
     */
    var _playMarquee = function(event) {
      if (event) { event.preventDefault(); }

      var stripData = strip.data;

      if ( animations[stripData.id].paused === true ) {
        animations[strip.data.id].play();
        controlBar.setData({hasState: settings.playButtonState.isPlaying});
      }
      else {
        animations[stripData.id].pause();
        controlBar.setData({hasState: settings.playButtonState.isPaused});
      }
      //debugger;
      _showProgress("_playMarquee - isPaused: " + animations[stripData.id].paused);

      _setTimer();
    };

    /**
     * @name _pauseMarquee
     * @param 
     * @description Pause marquee
     */
    var _pauseMarquee = function() {
      if ( !animations[strip.data.id] || animations[strip.data.id].paused === true ) return; // Exit if animation is paused.
      animations[strip.data.id].pause();
      //_showProgress("_pauseMarquee: " + animations[strip.data.id].paused);
      controlBar.setData({hasState: settings.playButtonState.isPaused});
      //timer.render();
      //_setTimer();
    };


    /**
     * @name _addEvents
     * @var
     * @function
     * @description binds events to the view
     */
    var _addEvents = function() {
      // Play event listener.
      events.on('click', settings.playButton, _playMarquee);
      /*document.addEventListener( 'click', function (event) {
        // If the event target doesn't exist
        if (!event.target.closest(playButton)) return;
        _playMarquee(event);
      }, false );*/

      // Seek bar event listener.
      ['input','change'].forEach((function(evt) {
        document.addEventListener(evt, handleSeekBar, false );
      }));

      // Media scroll (i.e. swipe scans) event listener.
      media = document.querySelector(defaults.media);
      //media.addEventListener('scroll', EFM.Util.debounce(handleScroll), { capture: true, passive: true });

      // Skip forward/backward in time.
      document.addEventListener('click', _skipForward, false);
      document.addEventListener('click', _skipBackward, false);
      document.addEventListener('click', _toggleMenuBar, false);
      document.addEventListener('click', _selectStrip, false);

      _setupScroll();
      //document.addEventListener( 'click', handleClick, false );
      //document.addEventListener( 'change', handleChange, false );
      //document.addEventListener('render', handleRender, false);
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
      var targetButton = event.target.closest(settings.forwardTimeButton);
      if ( !targetButton ) return;
      if ( animations[strip.data.id].currentTime === 0 ) {
        animations[strip.data.id].play();
      }
      _pauseMarquee();
      var offset = parseInt( targetButton.dataset.offset );
      //console.log("Skip Forward");
      animations[strip.data.id].seek( (animations[strip.data.id].currentTime) + ( 1000*60*offset ) ); // skip offset minutes

      _showAnimations();
      _showProgress();
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
      var targetButton = event.target.closest(settings.backwardTimeButton);
      if ( !targetButton ) return;
      if ( animations[stripData.id].currentTime === 0 ) {
        animations[stripData.id].play();
      }
      _pauseMarquee();
      var offset = Number.parseInt( targetButton.dataset.offset );
      animations[stripData.id].pause();
      controlBar.setData({hasState: settings.playButtonState.isPaused});
      //console.log("Skip Backward");
      animations[stripData.id].seek( (animations[stripData.id].currentTime) - ( 1000*60*offset ) ); // skip offset minutes

      _showAnimations();
      _showProgress();
    }


  /**
   * @name _updateSeekbar
   * @var
   * @function
   * @description Update the seek bar (i.e. input range control).
   */
  var _updateSeekbar = function() {
    if (!animations[strip.data.id]) return;
    seekBar.value = animations[strip.data.id].progress;
    seekBar.setAttribute('aria-valuenow', seekBar.value);
    animations[strip.data.id].seek(animations[strip.data.id].currentTime);
    //animations[strip.data.id].seek(animations[strip.data.id].duration * (seekBar.value / 100));
    _setTimer();
    _showAnimations();
    _showProgress();
    // Work out how much of the media has played via the duration and currentTime parameters
    //var percentage = Math.floor((100 / player.duration) * player.currentTime);
    // Update the progress bar's value
    //progressBar.value = percentage;
    // Update the progress bar's text (for browsers that don't support the progress element)
    //progressBar.innerHTML = percentage + '% played';
  }


  /**
   * @name _updateProgress
   * @var
   * @function
   * @description Update animation progress and current time.
   */
  var _updateProgress = function() {
    if (!animations[strip.data.id]) return;
    animations[strip.data.id].currentTime = ((seekBar.value / 100) * animations[strip.data.id].duration);
    animations[strip.data.id].progress = seekBar.value;
    _setTimer();
    _showAnimations();
    _showProgress();
  }


    /**
     * @name _showProgress
     * @param 
     * @description Console.log animation progress.
     */
    var _showProgress = function(msg) {
      var stripData = strip.data;
      console.group("ANIMATION PROGRESS", msg || "");
      console.log("stripData.id: \t\t", stripData.id , "\nseekBar.value: \t\t", seekBar.value , '%', "\nanimations.progress: ", animations[stripData.id].progress, "\nanimations.duration: ", animations[stripData.id].duration, "\nanimations.currentTimeMS: ", animations[stripData.id].currentTime, "\nanimations.currentTimeHMS: ", EFM.Util.secondsToHms( (animations[stripData.id].currentTime / 1000 ) + ( strip.data.times.mediaStartTime / 1000) ), "\nanimations.id: ", animations[stripData.id].id);
      console.groupEnd();
    }


    /**
     * @name _showAnimations
     * @param 
     * @description Console.log animation instances.
     */
    var _showAnimations = function() {
      console.group("ANIMATIONS");
      console.log("Instances: ", animations, ";\nAnimation ID: ", animations[strip.data.id].id, ";\nStrip ID: ", strip.data.id, ";\nInstance duration: ", animations[strip.data.id].duration);
      console.groupEnd();
    }


    /**
     * @name _toggleMenuBar
     * @param 
     * @description MenuBar toggle state behavior.
     */
    var _toggleMenuBar = function(event) {
      event.preventDefault();
      if ( !event.target.closest(settings.menuBarButton) ) return;
      // TOGGLE STATE MACHINE
      var menuBarMachine = menuBar.data.machine,
      state = EFM.Util.transition(menuBar, menuBarMachine.currentState, 'TOGGLE');
      console.group("STATE (MenuBar): ", state, "\n", menuBarMachine.states[state]);
      console.groupEnd();
      var dropdown = menuBarMachine.states[state].attrs['className'];
      var ariaExpanded = menuBarMachine.states[state].attrs['ariaExpanded'];
      menuBarMachine['currentState'] = state;
      menuBar.setData({ attrs: {className: dropdown, ariaExpanded: ariaExpanded} });
      menuBarStrips.render();
    }


    /**
     * @name _selectStrip
     * @param 
     * @description Select new strip to display.
     */
    var _selectStrip = function(event) {
      event.preventDefault();
      if ( !event.target.closest(settings.menuBarDropdownItem) ) return;
      var stripID = event.target.getAttribute('data-strip-id'),
      menuBarMachine = menuBar.data.machine,
      state = EFM.Util.transition(menuBar, menuBarMachine.currentState, 'TOGGLE');
      console.groupCollapsed("STATE (MenuBar): ", state, "\n", menuBarMachine.states[state]);
      console.groupEnd();
      var dropdown = menuBarMachine.states[state].attrs['className'],
      ariaExpanded = menuBarMachine.states[state].attrs['ariaExpanded'];

      _pauseMarquee();
      strip.setData({id: stripID});
      menuBarMachine['currentState'] = state;
      menuBar.setData({ attrs: {className: dropdown, ariaExpanded: ariaExpanded}, title: strip.data.title });
      //scrollInstance.destroy();
      _initMarquee();
      _updateSeekbar();
      //scrollInstance.updateMetrics();
    }



    /**
     * @name _setTimer
     * @param 
     * @description Set current time and total time.
     */
    var _setTimer = function() {
      var stripData = strip.data;
      if (!animations[strip.data.id]) return;

      var stripStartTime = strip.data.times.mediaStartTime,
      stripEndTime = strip.data.times.mediaEndTime;
      timerCurrent = EFM.Util.secondsToHms( (animations[strip.data.id].currentTime / 1000 ) + ( stripStartTime / 1000) ) || EFM.Util.secondsToHms( stripStartTime / 1000 );
      timerTotal = EFM.Util.secondsToHms( stripEndTime / 1000 ) || 0;

      timer.setData({timerCurrent: timerCurrent, timerTotal: timerTotal});
    }


    /**
     * @name _setupScroll
     * @param 
     * @description Setup scrolling w/scrollbooster.js
     */
    var _setupScroll = function() {
      var viewport = document.querySelector(defaults.media);
      var content = document.querySelector(defaults.mediaCollection);
      var scrollPercent = 0;

      scrollInstance = new ScrollBooster({
          viewport,
          content,
          bounce: false,
          friction: 0.75,
          //direction: 'horizontal',
          onUpdate: (state) => {
            _pauseMarquee();
            if (!animations[strip.data.id]) return;

            scrollPercent = animations[strip.data.id].progress = ( (Math.abs(-state.position.x / displacement)) * 100 ) || animations[strip.data.id].progress;
            seekBar.value = scrollPercent;
            animations[strip.data.id].progress = scrollPercent;
            animations[strip.data.id].currentTime = (scrollPercent / 100) * animations[strip.data.id].duration;

            content.style.transform = `translateX(
              ${-state.position.x}px
            )`;

            _updateProgress();
            //_setTimer();
            //_showAnimations();
            //_showProgress();
          },
          // other options (see below)
      });
    }


    /**
     * @name _getXpos
     * @param 
     * @description Return x coordinate position using seekbar value.
     */
    var _getXpos = function() {
      return -(seekBar.value * displacement) / 100;
    }

    /**
     * @name _setXpos
     * @param 
     * @description Return x coordinate position using seekbar value.
     */
    var _setXpos = function() {
      anime.set(settings.mediaCollection, {
        translateX: function() { return _getXpos(); }
      });
    }

  /**
   * @name handleRender
   * @var
   * @function
   * @description Handles functions to execute after the views have rendered
   * @param {EventListenerObject} e 
   */
  var handleRender = function( e ) {
    //console.log(e);
    if (e.target.matches('.efm__player')) {
      //alert("Render event.");
    }
  };

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
  }; // END - Constructor

  //
  // Return the Constructor
  //

  return Constructor;

}));


var defaultViewer = function() {
  EFM.Util.getXHRData.call(this, (function() {
    return new EFMViewer('[data-efm-viewer]', {});
  }));
}

EFM.Util.ready(document, defaultViewer);