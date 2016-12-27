/*!
 * Please create the tag with source //player.vimeo.com/api/player.js first
 *
 * Created by Vitali Korezki (http://true-metrics.com)
 * Based on vimeo.ga.js | v0.6
 * Created by LukasBeaton (https://github.com/LukasBeaton/vimeo.ga.js)
 * Copyright (c) 2016 Vitali Korezki (http://true-metrics.com)
 * MIT licensed
 */


vimeoGAJS = window.vimeoGAJS = window.vimeoGAJS || {};

(function($) {
  vimeoGAJS = {
    iframes : [],
    gaTracker : undefined,
    eventMarker : {},
    player : {},

    init: function () {
      vimeoGAJS.iframes = $('iframe');

      $.each(vimeoGAJS.iframes, function (index, iframe) {
        var iframeId = $(iframe).attr('id') || '';

        if (!iframeId) {
          iframeId = 'vimeo'+Math.floor((Math.random() * 1000000000000) + 1);
          $(iframe).attr('id', iframeId );
        }

        eventMarker = {
          'progress25' : false,
          'progress50' : false,
          'progress75' : false,
          'videoPlayed' : false,
          'videoPaused' : false,
          'videoResumed' : false,
          'videoSeeking' : false,
          'videoCompleted' : false,
          'timePercentComplete' : 0
        };

        // console.log('Init iFrame #', index, iframe);
        
        var player = null;
        try {
          player = new Vimeo.Player(iframe);
        }
        catch(error) {
          console.log('video tracking error for #', index, error);
          return;
        }

        // console.log('Player Object #', index, player);
        
        player.getVideoTitle().then(function(title) {
            $(iframe).attr('title', title );
        }).catch(function(error) {
            // an error occurred
        });

        player.on('play', function(data) {
            var iframe = this.element;
            var eventMarker = vimeoGAJS.eventMarker[iframe.id];

            // console.log('play', iframe, iframe.id, eventMarker, vimeoGAJS.eventMarker);

            if (!eventMarker.videoPlayed) {
              // console.log('send event to play');
              vimeoGAJS.sendEvent(iframe, 'Started video');
              eventMarker.videoPlayed = true; // Avoid subsequent play trackings
            } 
            else if (!eventMarker.videoResumed && eventMarker.videoPaused) {
              vimeoGAJS.sendEvent(iframe, 'Resumed video');
              eventMarker.videoResumed = true; // Avoid subsequent resume trackings
            }
          });
        player.on('pause', function(data) {
            // console.log('pause', data);
            var iframe = this.element;
            var eventMarker = vimeoGAJS.eventMarker[iframe.id];

            vimeoGAJS.onPause(iframe);
          });
        player.on('ended', function(data) {
            // console.log('ended', data);
            var iframe = this.element;
            var eventMarker = vimeoGAJS.eventMarker[iframe.id];

            if (!eventMarker.videoCompleted) {
              vimeoGAJS.sendEvent(iframe, 'Completed video');
              eventMarker.videoCompleted = true; // Avoid subsequent finish trackings
            }
          });
        player.on('seeked', function(data) {
            // console.log('seeked', data);
            // console.log('played the video!');
          });
        player.on('timeupdate', function(data) {
            // console.log('timeupdate', data);
            var iframe = this.element;
            var eventMarker = vimeoGAJS.eventMarker[iframe.id];

            vimeoGAJS.onPlayProgress(data, iframe);
          });

          vimeoGAJS.eventMarker[iframeId] = player;
      });

      // Check which version of Google Analytics is used
      if (typeof ga === "function") {
        vimeoGAJS.gaTracker = 'ua'; // Universal Analytics (universal.js)
        // console.info('Universal Analytics');
      }

      if (typeof _gaq !== "undefined" && typeof _gaq.push === "function") {
        vimeoGAJS.gaTracker = 'ga'; // Classic Analytics (ga.js)
        // console.info('Classic Analytics');
      }

      if (typeof dataLayer !== "undefined" && typeof dataLayer.push === "function") {
        vimeoGAJS.gaTracker = 'gtm'; // Google Tag Manager (dataLayer)
        // console.info('Google Tag Manager');
      }
      
      if (typeof utag !== "undefined") {
        vimeoGAJS.gaTracker = 'tealium'; // Tealium 
        // console.info('Tealium');
      }
    },

    getLabel : function(iframe) {
      var iframeEl = $(iframe);
      var iframeSrc = iframeEl.attr('src').split('?')[0];
      var label = iframeSrc;
      if (iframeEl.data('title')) {
        label += ' (' + iframeEl.data('title') + ')';
      } else if (iframeEl.attr('title')) {
        label += ' (' + iframeEl.attr('title') + ')';
      }
      return label;
    },

    onPause: function(iframe) {
      if (vimeoGAJS.eventMarker[iframe.id].timePercentComplete < 99 && !vimeoGAJS.eventMarker[iframe.id].videoPaused) {
        vimeoGAJS.sendEvent(iframe, 'Paused video');
        vimeoGAJS.eventMarker[iframe.id].videoPaused = true; // Avoid subsequent pause trackings
      }
    },

    // Tracking video progress
    onPlayProgress: function(data, iframe) {
      var progress,
          iframeId = iframe.id,
          iframeEl = $(iframe),
          eventMarker = vimeoGAJS.eventMarker[iframe.id];

      eventMarker.timePercentComplete = Math.round((data.percent) * 100); // Round to a whole number

      if (eventMarker.timePercentComplete > 24 && !eventMarker.progress25) {
        progress = 'Played video: 25%';
        eventMarker.progress25 = true;
      }

      if (eventMarker.timePercentComplete > 49 && !eventMarker.progress50) {
        progress = 'Played video: 50%';
        eventMarker.progress50 = true;
      }

      if (eventMarker.timePercentComplete > 74 && !eventMarker.progress75) {
        progress = 'Played video: 75%';
        eventMarker.progress75 = true;
      }

      if (progress) {
        vimeoGAJS.sendEvent(iframeEl, progress);
      }
    },

    // Send event to Classic Analytics, Universal Analytics or Google Tag Manager
    sendEvent: function (iframeEl, action) {
      var bounce = $(iframeEl).data('bounce');
      var label = vimeoGAJS.getLabel(iframeEl);

      switch (vimeoGAJS.gaTracker) {
      case 'gtm':
        dataLayer.push({'event': 'Vimeo', 'eventCategory': 'Vimeo', 'eventAction': action, 'eventLabel': label, 'eventValue': undefined, 'eventNonInteraction': (bounce) ? false : true });
        break;

      case 'ua':
        ga('send', 'event', 'Vimeo', action, label, undefined, {'nonInteraction': (bounce) ? 0 : 1});
        break;

      case 'ga':
        _gaq.push(['_trackEvent', 'Vimeo', action, label, undefined, (bounce) ? false : true]);
        break;
    
      case 'tealium':
        utag.link({
          'event_type' : 'video tracking',
          'event_attr1' : 'video tracking',
          'event_attr2' : action,
          'event_attr3' : label,
          'ga_non_interaction' : '1'
        });
        break;
      }
    }
  };

  setTimeout(function() {
    window.vimeoGAJS.init();
  }, 2500);
})(jQuery);