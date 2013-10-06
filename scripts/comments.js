(function (angular) {
  angular.module('mvd.comments', ['mvd.tunnels'])
  .factory('commentConfig', function ($location, mvdTunnelMap) {
    var siteId
      , provider
      , displayOnLoad = true
      , baseUrl
      , showCommentCount = true
      , userCallbacks = {}
      , loadingText = 'Loading comment count...'
      , commentTextMap = {
        '0' : 'No comments yet',
        '1' : 'One comment',
        'other' : '{} comments'
      }
      , callbacks = {
        onCommentPosted : angular.noop,
        onCommentCountUpdated : function (slug, count) {
          mvdTunnelMap.send('comments','comment-count-updated', slug, count);
          mvdTunnelMap.send('comments','comment-count-updated-' + slug, slug, count);
        },
        onThreadLoaded : function (slug, container) {
          mvdTunnelMap.send('comments','thread-loaded', slug);
          mvdTunnelMap.send('comments','thread-loaded-' + slug);
        }
      }
      , methods = {
      setSiteId : function (id) {
        siteId = id;
        return methods;
      },
      getSiteId : function () {
        return siteId;
      },
      //Alias for Disqus
      setForumName : function (name) {
        return methods.setSiteId(name);
      },
      setProvider : function (prov) {
        provider = prov;
        return methods;
      },
      getProvider : function () {
        return provider;
      },
      setDisplayOnLoad : function (val) {
        displayOnLoad = val;
        return methods
      },
      getDisplayOnLoad : function () {
        return displayOnLoad;
      },
      setShowCommentCount : function (val) {
        showCommentCount = val;
        return methods;
      },
      getShowCommentCount : function () {
        return showCommentCount;
      },
      getBaseUrl : function () {
        return baseUrl || $location.protocol() + '://' + $location.host() + '/';
      },
      setBaseUrl : function (url) {
        if (url.charAt(url.length - 1) != '/') {
          url += '/';
        };
        baseUrl = url;
        return methods;
      },
      setCommentTextMap : function (map) {
        commentTextMap = map;
        return methods;
      },
      getCommentTextMap : function () {
        var map = angular.copy(commentTextMap);
        map['-1'] = methods.getLoadingText();
        return map;
      },
      setLoadingText : function (text) {
        loadingText = text;
        return methods;
      },
      getLoadingText : function () {
        return loadingText;
      },
      setCallback : function (callback, fn) {
        if (angular.isObject(callback)) {
          return setCallbacks(callback);
        } else {
          userCallbacks[callback] = fn;
          return methods;
        }
      },
      setCallbacks : function (cbs) {
        for (cb in cbs) {
          if (!cbs.hasOwnProperty(cb)) {
            continue;
          };
          methods.setCallback(cb, cbs[cb]);
        }
        return methods;
      },
      getCallbacks : function() {
        return callbacks;
      },
      getCallback : function (callback) {
        var intCB = callbacks[callback] || angular.noop;
        var fullCB =  !userCallbacks[callback] ? intCB : 
          function () {
            intCB.apply(this, arguments);
            userCallbacks[callback].apply(this, arguments);
          }
        return fullCB;
      }
    };

    return methods;
  })
  .factory('livefyre', function (commentConfig, mvdTunnelMap) {
    var widget
      , container
      , lastSlug
      , loaded = false
      , siteId = commentConfig.getSiteId()
      , baseUrl = commentConfig.getBaseUrl()
      , displayOnLoad = commentConfig.getDisplayOnLoad();

    (function () {
      var s = document.createElement('script'); s.async = true;
      s.type = 'text/javascript';
      s.src = 'http://zor.livefyre.com/wjs/v3.0/javascripts/livefyre.js';
      (document.getElementsByTagName('HEAD')[0] || document.getElementsByTagName('BODY')[0]).appendChild(s);
      var c = document.createElement('script'); c.async = true;
      c.type = 'text/javascript';
      c.src = 'http://zor.livefyre.com/wjs/v1.0/javascripts/CommentCount.js';
      (document.getElementsByTagName('HEAD')[0] || document.getElementsByTagName('BODY')[0]).appendChild(c);
    })();

    var loadCount = function (slug, $element, title, url, countOnly) {
      if (!siteId) {
        throw Error("Must specify siteId before initializing lifefyre");
      };
      if (!window.LF) {
        setTimeout(function () {
          loadCount(slug, $element, title, url, countOnly);
        }, 100);
        return;
      };
      LF.CommentCount.fetch([{
        site_id : siteId,
        article_id : slug
      }], function (response) {
        if (response[siteId][slug]) {
          var count = response[siteId][slug].total;
          commentConfig.getCallback('onCommentCountUpdated')(slug, count);
        }
      });

      if (displayOnLoad && !lastSlug && !countOnly) {
        loadThread(slug, $element, title, url);
      };
    }

    var loadCollection = function (collection, $thread) {
      if (!container) {
        container = angular.element('<div id="livefyre-comments"></div>');
      };
      if (!widget) {
        container.appendTo($thread);
        fyre.conv.load({}, [collection], function(w) {
          widget = w;
          widget.on('commentPosted', function (data) {
            commentConfig.getCallback('onCommentPosted')(lastSlug, data);
          });

          widget.on('commentCountUpdated', function (data) {
            commentConfig.getCallback('onCommentCountUpdated')(lastSlug, data);
          });

          widget.on('initialRenderComplete', function () {
            commentConfig.getCallback('onThreadLoaded')(lastSlug, container);
          });
        });
      } else {
        var off = mvdTunnelMap.listen('comments', 'thread-loaded-'+collection.articleId, function () {
          container.appendTo($thread);
          off();
        });
        widget.changeCollection(collection);
      }
    };

    var loadThread = function (slug, $element, title, url) {
      if (!siteId) {
        throw Error("Must specify siteId before initializing lifefyre");
      };
      if (!window.fyre) {
        setTimeout(function () {
          loadThread(slug, $element, title, url);
        }, 100);
        return;
      };
      lastSlug = slug;
      var $thread = $element.find('.thread');
      if (!$thread.length) {
        setTimeout(function () {
          loadThread(slug, $element);
        }, 100);
        return;
      }

      var collection = {
        el: 'livefyre-comments',
        network: "livefyre.com",
        siteId: siteId,
        articleId: lastSlug,
        signed: false,
        collectionMeta: {
          articleId: lastSlug,
          url: fyre.conv.load.makeCollectionUrl(url || baseUrl + slug),
          title : title
        }
      }

      loadCollection(collection, $thread);
    };

    return {
      loadCount : loadCount,
      loadThread : loadThread
    }
  })
  .factory('disqus', function (commentConfig, mvdTunnelMap, $http) {
    var container
      , lastSlug
      , siteId = commentConfig.getSiteId()
      , baseUrl = commentConfig.getBaseUrl()
      , displayOnLoad = commentConfig.getDisplayOnLoad();
    
    window.disqus_shortname = siteId;

    window.disqus_config = function () {
      this.callbacks.onReady.push(function () {
        commentConfig.getCallback('onThreadLoaded')(lastSlug, container);
      });

      this.callbacks.onNewComment.push(function (comment) {
        commentConfig.getCallback('onCommentPosted')(lastSlug, comment);
      });
    }

    //Load main disqus file
    var loadDisqus = function() {
      var dsq = document.createElement('script'); dsq.type = 'text/javascript'; dsq.async = true;
      dsq.src = '//' + siteId + '.disqus.com/embed.js';
      (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(dsq);
    };

    var loadThread = function (slug, $element, title, url) {
      if (!siteId) {
        throw Error("Must specify siteId before initializing disqus");
      };
      if (!container) {
        container = angular.element('<div id="disqus_thread"></div>');
      };
      var $thread = $element.find('.thread');
      if (!$thread.length) {
        setTimeout(function () {
          loadThread(slug, $element, title, url);
        }, 100);
        return;
      }
      if (lastSlug) {
        var oldSlug = lastSlug;
        setTimeout(function () {
          loadCount(oldSlug);
        })
      };
      lastSlug = slug;
      if (!window.DISQUS) {
        container.appendTo($thread);
        window.disqus_identifier = slug;
        if (url) {
          window.disqus_url = url;
        };
        if (title) {
          window.disqus_title = title;
        };
        loadDisqus();
      } else {
        var off = mvdTunnelMap.listen('comments', 'thread-loaded-'+slug, function () {
          container.appendTo($thread);
          off();
        });
        DISQUS.reset({
          reload : true,
          config : function () {
            this.page.identifier = slug;
            this.page.url = url;
            this.page.title = title;
          }
        });
      }
    }

    var loadCountFile = function () {
      var s = document.createElement('script'); s.async = true;
      s.type = 'text/javascript';
      s.src = 'http://' + siteId + '.disqus.com/count.js';
      (document.getElementsByTagName('HEAD')[0] || document.getElementsByTagName('BODY')[0]).appendChild(s);
    };

    var setupWidget = function () {
      //Overloading regular callback
      window.DISQUSWIDGETS = {
        displayCount : function (data) {
          var textMap = data.text;
          var counts = data.counts;
          if (!counts || !counts.length) {
            return;
          };
          for (var i = 0, ii = counts.length; i < ii; i++) {
            var c = counts[i];
            var slug = loads[c.uid];
            commentConfig.getCallback('onCommentCountUpdated')(slug, c.comments);
          }
        }
      }
    }

    var lastLoad = -1;

    var loads = {};

    var loadCount = function (slug, $element, title, url, countOnly) {
      if (!siteId) {
        throw Error("Must specify siteId before initializing disqus");
      };
      if (!window.DISQUSWIDGETS) {
        setupWidget();
      }
      var uid = (++lastLoad);
      var s = document.createElement('script'); s.async = true;
      s.type = 'text/javascript';
      s.src = 'http://'+siteId + '.disqus.com/count-data.js?q=1&' + uid + '=1,'+encodeURIComponent(slug);
      (document.getElementsByTagName('HEAD')[0] || document.getElementsByTagName('BODY')[0]).appendChild(s);

      loads[uid] = slug;

      if (displayOnLoad && !lastSlug && !countOnly) {
        //Auto load first comment thread
        loadThread(slug, $element, title, url);
      };
    }

    return {
      loadCount : loadCount,
      loadThread : loadThread
    }
  })
  .factory('commentService', function (commentConfig, $injector) {
    var commentProviderName = commentConfig.getProvider();
    if (!commentProviderName) {
      throw Error("Must specify provider name: (disqus/livefyre)");
    };

    return $injector.get(commentProviderName);
  })
  .directive('comments', function (commentService, commentConfig, mvdTunnelMap) {
    var whenStmt = angular.toJson(commentConfig.getCommentTextMap())
      .replace(/\\\"/g,'&quot;')
      .replace(/\"/g, '\'')
    var tpl = '<div class="comments">' + 
      (commentConfig.getShowCommentCount() ?
        ('<p class="comment-count" ng-hide="threadLoaded">' + 
          '<span ng-click="loadThread()" ng-pluralize count="numComments" when="' + whenStmt + '"></span>' + 
          '<span class="loader" ng-show="loadingThread"><img src="themes/clean-blog/images/loader-small.gif" /></span>' + 
        '</p>')
        : ('<p class="show-comments" ng-hide="threadLoaded">' + 
          '<span ng-click="loadThread()">Show comments</span>' + 
          '<span class="loader" ng-show="loadingThread"><img src="themes/clean-blog/images/loader-small.gif" /></span>' + 
        '</p>'))
      + 
      '<div class="thread" ng-show="threadLoaded">' + 
      '</div>' + 
    '</div>';

    return {
      template : tpl,
      replace : true,
      scope : {
        'commentElement' : '=comments'
      },
      link : function ($scope, $element, $attrs) {
        $scope.numComments = -1;
        $scope.threadLoaded = false;
        $scope.loadingThread = false;

        var namespace = 'comments';

        var slug;

        var attachListeners = function (slug) {
          mvdTunnelMap.listen(namespace, 'comment-count-updated-'+slug, function (ev, targetSlug, count) {
            if (angular.isUndefined(count)) {
              return;
            };
            $scope.numComments = count;
          });

          mvdTunnelMap.listen(namespace, 'thread-loaded', function (ev, targetSlug) {
            $scope.threadLoaded = (targetSlug == slug);
            $scope.loadingThread = false;
          });
        }

        var objectWatch = function (elSlug) {
          slug = elSlug;
          var title = $scope.commentElement.title || $scope.commentElement.name;
          var url = $scope.commentElement.url || undefined;
          attachListeners(slug);
          commentService.loadCount(slug, $element, title, url);
        }

        var off = $scope.$watch('commentElement', function (nv, ov) {
          if (!nv) {
            return;
          };
          if (angular.isObject(nv)) {
            off();
            objectWatch(nv.slug);
            off = $scope.$watch('commentElement.slug', objectWatch);
            return;
          };
          slug = nv;
          attachListeners(nv);
          commentService.loadCount(nv, $element);
        });

        $scope.loadThread = function () {
          $scope.loadingThread = true;
          var title = $scope.commentElement && $scope.commentElement.title || undefined;
          var url = $scope.commentElement && $scope.commentElement.url || undefined;
          commentService.loadThread(slug, $element, title, url);
        };
      }
    }
  })
  .directive('commentCount', function(commentService, mvdTunnelMap) {
    return {
      template : '{{count}}',
      scope : {
        'commentElement' : '=commentCount'
      },
      link : function ($scope, $element, $attrs) {
        $scope.count = 0;

        var off;

        var attachListeners = function (slug) {
          mvdTunnelMap.listen('comments', 'comment-count-updated-'+slug, function (ev, targetSlug, count) {
            if (angular.isUndefined(count)) {
              return;
            };
            $scope.count = count;
          });
        }

        var watcher = function (nv, ov) {
          if (!nv) {
            return;
          };
          if (angular.isObject(nv)) {
            off();
            off = $scope.$watch('commentElement.slug', watcher);
            return;
          };
          slug = nv;
          attachListeners(nv);
          commentService.loadCount(nv, null, null, null, true);
        }

        off = $scope.$watch('commentElement', watcher);
      }
    }
  });
})(angular);