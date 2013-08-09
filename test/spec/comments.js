describe('Angular Comments', function () {
	var $compile
		, $rootScope
		, $injector
		, tpl = '<div comments="element"></div>';

	beforeEach(module('mvd.comments'));

	beforeEach(module(function($provide) {
		var commentService = {
			loadThread : function (slug, element, title, url) {

			},
			loadCount : function (slug, element, title, url) {
				dump('loadCount',slug);
			}
		};

		spyOn(commentService,'loadThread');
		spyOn(commentService,'loadCount');

		$provide.value('commentService', commentService);
	}));

	beforeEach(inject(function (_$compile_, _$rootScope_, _$injector_) {
		$compile = _$compile_;
		$rootScope = _$rootScope_;
		$injector = _$injector_;
	}));

	it('should compile the template', function () {
		var $scope = $rootScope.$new();
		$scope.element = "test";

		var $element = $compile(tpl)($scope);

		expect($element.html()).toContain('thread');
	});

	it('should register an element string', function () {
		var $scope = $rootScope.$new();
		$scope.element = 'testSlug';

		var $element = $compile(tpl)($scope);

		var elScope = $element.scope();

		var commentService = $injector.get('commentService');

		elScope.$apply();

		expect(elScope.commentElement).toEqual(jasmine.any(String));
		expect(commentService.loadCount).toHaveBeenCalledWith('testSlug', $element);
	});

	it('should register an element object', function () {
		var $scope = $rootScope.$new();
		var el = {
			slug : 'testSlug',
			title : 'Test Title',
			url : 'test-url'
		};

		$scope.element = el;

		var $element = $compile(tpl)($scope);
		var elScope = $element.scope();
		var commentService = $injector.get('commentService');

		elScope.$apply();

		expect(elScope.commentElement).toEqual(jasmine.any(Object));
		expect(commentService.loadCount).toHaveBeenCalledWith(el.slug, $element, el.title, el.url);
	});
});