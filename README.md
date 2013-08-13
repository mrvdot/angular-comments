# Angular Comments

Angular commenting component that allows you to easily integrate the Disqus and Livefyre commenting systems into your website. To read more about why this component was created and some of the problems it solves, see the original announcement post [here](http://www.mrvdot.com/all/multi-platform-commenting-with-angular/).

## Installation
To get started with Angular Comments, you can just use `bower install angular-comments` or clone it from here. Once installed, be sure to include the `comments.js` file in your page, require `mvd.comments` in your main app module, and then set your configuration values within the run block for your app. For example:

```javascript
angular.module('myApp',['mvd.comments'])//require comments module
    .run(function (commentConfig) {
        commentConfig
        .setForumName("my-site")//Specify our forum name/site id for this site
        .setProvider('disqus')//Specify we want to use disqus
    ...
  });
```

Then, all we have to do is attach the comments directive to the appropriate element and pass in that post's metadata:

```html
<div comments="article"></div>
```

Where article is a scoped variable that can be either a string representing the article ID itself (eg `'my-awesome-article'`) or a full object:

```javascript
$scope.article = {
  slug : 'my-awesome-article',//ID used to uniquely identify this post for livefyre/disqus
  title : 'My awesome article',//Title string passed on to third-party service
  url : 'http://example.com/my-awesome-article'//URL to directly access this post
};
```

That's all there is to installing this component and getting a third-party commenting system up and running. The directive itself takes care of grabbing the necessary javascript files for Disqus/Livefyre and including them into your page when you need them.

## Configuration

In addition to the basic settings necessary for connecting your site to Disqus/Livefyre, Angular Comments provides several other API options you can use to further customize your setup:

* **setSiteId**: Specify the site Id or forum name for your site
    * required
* **setForumName**: Alias for `setSiteId` to confirm with Disqus terminology
* **setProvider**: Specify which commenting platform you want to use (currently supported values: `livefyre` and `disqus`)
    * required
* **setDisplayOnLoad**: Enable/disable whether or not to load comment thread immediately
    * optional
    * default: `true`
    * _If you have multiple posts on a single page and your platform doesn't support showing multiple comment threads at once, only the first thread will be loaded_
* **setShowCommentCount**: Enable/disable display of comment count when thread is hidden
    * optional
    * default: `true`
    * _If your platform includes a comment count as part of the thread, this paragraph will be hidden when the thread is visible_
    * _Note: Right now clicking on this comment count element is the only way to load a thread that isn't already visible, so be sure `displayOnLoad` is set to `true` if you use this_
* **setBaseUrl**: If no article URL is passed in, URL is calculated as `baseUrl + articleId`.
    * optional
    * default: `$location.get('protocol') + '://' + $location.get('host') + '/'`
* **setCommentTextMap**: Specify text map for comment count display. Follows same pattern as `ng-pluralize` `when` attribute
    * optional
    * default: `{
        '0' : 'No comments yet',
        '1' : 'One comment',
        'other' : '{} comments'
      }`
* **setLoadingText**: Text to display while loading comment count/thread
    * optional
    * default: 'Loading comments...'
* **setCallback**: Attach a callback function to an event
    * optional
    * supported callbacks: 
        * onCommentPosted
            * Params: `articleId`, `data` (*data is specific to each platform*)
        * onCommentCountUpdated
            * Params: `articleId`, `count`
        * onThreadLoaded
            * Params: `articleId`, `container` (*jqLite object of DOM element containing thread*)
    * example:

```javascript
commentConfig.setCallback('onCommentPosted', function (slug, data) {
    analytics.track('commentPosted', slug);
});
```